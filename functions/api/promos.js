import { fallbackPromos } from "../../lib/promo-sync.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300"
    }
  });
}

function cleanCountry(value) {
  const s = String(value || "").trim().toUpperCase().slice(0, 2);
  return /^[A-Z]{2}$/.test(s) ? s : "";
}

function responseItems(items) {
  return (items || []).map(x => ({
    id: x.id,
    store: x.store,
    title: x.title,
    code: x.code || "",
    promoType: x.promo_type || x.promoType || "deal",
    valueText: x.value_text || x.valueText || "",
    url: x.url,
    country: x.country || "GLOBAL",
    terms: x.terms || "",
    startsAt: x.starts_at || x.startsAt || "",
    expiresAt: x.expires_at || x.expiresAt || "",
    source: x.source || "",
    verifiedAt: x.verified_at || x.verifiedAt || "",
    updatedAt: x.updated_at || x.updatedAt || ""
  }));
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const requestedCountry = cleanCountry(url.searchParams.get("country"));
  const country = requestedCountry || cleanCountry(request.headers.get("CF-IPCountry")) || "US";
  const limit = Math.min(24, Math.max(4, Number(url.searchParams.get("limit") || 12)));

  if (!env?.DB) {
    return json({
      ok: true,
      country,
      items: fallbackPromos().slice(0, limit),
      syncedAt: null,
      sourceMode: "fallback"
    });
  }

  try {
    // Do not create tables during a normal page request. The scheduled sync
    // creates the table; a missing table falls back instantly instead of hanging.
    const result = await env.DB.prepare(
      "SELECT id,store,title,code,promo_type,value_text,url,country,terms,starts_at,expires_at,source,verified_at,updated_at " +
      "FROM promo_codes " +
      "WHERE status='active' AND (expires_at IS NULL OR datetime(expires_at) > datetime('now')) " +
      "AND (country IN ('GLOBAL','MULTI',?) OR country IS NULL OR country='') " +
      "ORDER BY CASE WHEN code IS NOT NULL AND code!='' THEN 0 ELSE 1 END, datetime(updated_at) DESC, datetime(expires_at) ASC " +
      "LIMIT ?"
    ).bind(country, limit).all();

    const items = responseItems(result.results || []);

    return json({
      ok: true,
      country,
      items: items.length ? items : fallbackPromos().slice(0, limit),
      syncedAt: items[0]?.updatedAt || null,
      sourceMode: items.length ? "d1" : "fallback"
    });
  } catch (error) {
    return json({
      ok: true,
      country,
      items: fallbackPromos().slice(0, limit),
      syncedAt: null,
      sourceMode: "fallback",
      warning: String(error?.message || "Promo database unavailable")
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Origin": "*"
    }
  });
}