const DEFAULT_EBAY_PROMO = {
  id: "ebay-app15web-2026",
  store: "eBay",
  title: "$15 off $100+ on eligible items",
  code: "APP15WEB",
  promoType: "coupon",
  valueText: "$15 off",
  url: "https://pages.ebay.com/promo/2026/app15web/",
  country: "MULTI",
  terms: "Valid on eligible eBay purchases; expiry and eligibility are controlled by eBay. Verify the checkout terms.",
  startsAt: "2026-07-15T09:00:00-06:00",
  expiresAt: "2026-09-30T23:59:00-06:00",
  source: "eBay official promotion page",
  sourceItemId: "APP15WEB"
};

export function fallbackPromos(nowMs = Date.now()) {
  const expires = Date.parse(DEFAULT_EBAY_PROMO.expiresAt);
  return expires > nowMs ? [DEFAULT_EBAY_PROMO] : [];
}

export async function ensurePromoTable(env) {
  if (!env?.DB) return false;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS promo_codes (" +
    "id TEXT PRIMARY KEY," +
    "store TEXT NOT NULL," +
    "title TEXT NOT NULL," +
    "code TEXT," +
    "promo_type TEXT NOT NULL DEFAULT 'deal'," +
    "value_text TEXT," +
    "url TEXT NOT NULL," +
    "country TEXT," +
    "terms TEXT," +
    "starts_at TEXT," +
    "expires_at TEXT," +
    "source TEXT NOT NULL," +
    "source_item_id TEXT," +
    "verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP," +
    "status TEXT NOT NULL DEFAULT 'active'," +
    "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP," +
    "updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP," +
    "UNIQUE(store, source, source_item_id)" +
    ")"
  ).run();

  await env.DB.batch([
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_promo_codes_active_expiry ON promo_codes(status, expires_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_promo_codes_store ON promo_codes(store, updated_at DESC)")
  ]);
  return true;
}

async function getEbayToken(env) {
  if (!env?.EBAY_CLIENT_ID || !env?.EBAY_CLIENT_SECRET) return null;
  const basic = btoa(String(env.EBAY_CLIENT_ID) + ":" + String(env.EBAY_CLIENT_SECRET));
  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + basic,
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Language": "en-US"
    },
    body: "grant_type=client_credentials&scope=" +
      encodeURIComponent("https://api.ebay.com/oauth/api_scope")
  });
  if (!response.ok) throw new Error("eBay authentication failed");
  const data = await response.json();
  return data.access_token || null;
}

function cleanText(value, max = 500) {
  return String(value ?? "").replace(/[<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function asIso(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function mapEbayCoupon(event) {
  const coupons = Array.isArray(event?.applicableCoupons) ? event.applicableCoupons : [];
  return coupons.map((coupon, index) => {
    const code = cleanText(coupon?.redemptionCode || coupon?.code, 120);
    if (!code) return null;

    const eventId = cleanText(event?.eventId || event?.id || "event", 120);
    const sourceItemId = eventId + ":" + code + ":" + index;
    const title = cleanText(event?.eventDescription || event?.name || "eBay promotional coupon", 180);
    const valueText = cleanText(
      coupon?.discountValue ||
      coupon?.discount ||
      coupon?.description ||
      event?.eventDescription ||
      "Promotional coupon",
      220
    );

    return {
      id: "ebay-" + sourceItemId.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 170),
      store: "eBay",
      title,
      code,
      promoType: "coupon",
      valueText,
      url: "https://www.ebay.com/e/deals",
      country: "MULTI",
      terms: cleanText(event?.eventTerms || coupon?.terms || "Eligibility and exclusions are controlled by eBay.", 900),
      startsAt: asIso(event?.startDate || event?.startTime),
      expiresAt: asIso(event?.endDate || event?.endTime),
      source: "eBay Deal API",
      sourceItemId
    };
  }).filter(Boolean);
}

async function fetchEbayPromos(env) {
  const token = await getEbayToken(env);
  if (!token || String(env.EBAY_DEAL_API_ENABLED || "").toLowerCase() !== "true") {
    return { configured: false, items: [] };
  }

  const marketplace = String(env.EBAY_MARKETPLACE_ID || "EBAY_US");
  const url = new URL("https://api.ebay.com/buy/deal/v1/event");
  url.searchParams.set("marketplace_id", marketplace);
  url.searchParams.set("limit", "50");

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": "Bearer " + token,
      "Accept": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": marketplace
    }
  });

  if (!response.ok) throw new Error("eBay Deal API request failed");
  const data = await response.json();
  const events = data?.events || data?.eventSummaries || data?.event || [];

  const results = [];
  for (const summary of Array.isArray(events) ? events : []) {
    const eventId = summary?.eventId || summary?.id;
    if (!eventId) continue;

    const detailUrl = "https://api.ebay.com/buy/deal/v1/event/" + encodeURIComponent(String(eventId));
    const detailResponse = await fetch(detailUrl, {
      headers: {
        "Authorization": "Bearer " + token,
        "Accept": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": marketplace
      }
    });
    if (!detailResponse.ok) continue;

    const detail = await detailResponse.json();
    results.push(...mapEbayCoupon(detail));
  }

  return { configured: true, items: results };
}

const EXTERNAL_FEEDS_ENV = "PROMO_FEED_URLS";

function feedList(env) {
  const raw = String(env?.[EXTERNAL_FEEDS_ENV] || "").trim();
  if (!raw) return [];
  return raw.split(",").map(x => x.trim()).filter(Boolean).slice(0, 12);
}

async function fetchJsonFeed(url) {
  const response = await fetch(url, {
    headers: { "Accept": "application/json" },
    cf: { cacheTtl: 300, cacheEverything: false }
  });
  if (!response.ok) throw new Error("Promo feed failed: " + response.status);
  const data = await response.json();
  return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
}

function normalizeExternalPromo(item, sourceUrl, index) {
  const store = cleanText(item?.store || item?.merchant || "Marketplace", 80);
  const title = cleanText(item?.title || item?.name || "Promotion", 180);
  const code = cleanText(item?.code || item?.couponCode || "", 120);
  const url = cleanText(item?.url || item?.offerUrl || sourceUrl, 900);
  if (!/^https?:\/\//i.test(url)) return null;

  const expiresAt = asIso(item?.expiresAt || item?.expiry || item?.endTime);
  if (!expiresAt) return null;

  return {
    id: cleanText(item?.id || (store + "-" + index + "-" + code), 180).replace(/[^a-zA-Z0-9:_-]/g, "-"),
    store,
    title,
    code: code || null,
    promoType: cleanText(item?.promoType || (code ? "coupon" : "deal"), 40),
    valueText: cleanText(item?.valueText || item?.discount || item?.saving || "", 240),
    country: cleanText(item?.country || "GLOBAL", 20).toUpperCase(),
    terms: cleanText(item?.terms || "Verify eligibility, exclusions and expiry at the source.", 900),
    startsAt: asIso(item?.startsAt || item?.startTime),
    expiresAt,
    url,
    source: cleanText(item?.source || sourceUrl, 300),
    sourceItemId: cleanText(item?.sourceItemId || item?.id || (store + ":" + index), 180)
  };
}

async function upsertPromos(env, items) {
  if (!env?.DB || !items.length) return 0;
  let count = 0;

  for (const item of items) {
    await env.DB.prepare(
      "INSERT INTO promo_codes " +
      "(id,store,title,code,promo_type,value_text,url,country,terms,starts_at,expires_at,source,source_item_id,verified_at,status,updated_at) " +
      "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) " +
      "ON CONFLICT(store,source,source_item_id) DO UPDATE SET " +
      "title=excluded.title,code=excluded.code,promo_type=excluded.promo_type,value_text=excluded.value_text," +
      "url=excluded.url,country=excluded.country,terms=excluded.terms,starts_at=excluded.starts_at," +
      "expires_at=excluded.expires_at,verified_at=CURRENT_TIMESTAMP,status=excluded.status,updated_at=CURRENT_TIMESTAMP"
    ).bind(
      item.id,item.store,item.title,item.code,item.promoType,item.valueText,item.url,item.country,item.terms,
      item.startsAt,item.expiresAt,item.source,item.sourceItemId,"active"
    ).run();
    count++;
  }
  return count;
}

export async function syncPromos(env) {
  const now = Date.now();
  const fallback = fallbackPromos(now);

  if (!env?.DB) {
    return { ok: true, synced: 0, fallback: fallback.length, reason: "D1 unavailable" };
  }

  await ensurePromoTable(env);

  const results = [];
  results.push(...fallback);

  try {
    const ebay = await fetchEbayPromos(env);
    results.push(...ebay.items);
  } catch (_) {}

  for (const url of feedList(env)) {
    try {
      const items = await fetchJsonFeed(url);
      for (let i = 0; i < items.length; i++) {
        const item = normalizeExternalPromo(items[i], url, i);
        if (item) results.push(item);
      }
    } catch (_) {}
  }

  const unique = new Map();
  for (const item of results) {
    if (!item?.store || !item?.title || !item?.expiresAt) continue;
    if (Date.parse(item.expiresAt) <= now) continue;
    const key = item.store + "|" + String(item.code || item.sourceItemId || item.title).toLowerCase();
    unique.set(key, item);
  }

  const synced = await upsertPromos(env, Array.from(unique.values()));

  await env.DB.prepare(
    "UPDATE promo_codes SET status='expired',updated_at=CURRENT_TIMESTAMP " +
    "WHERE expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now') AND status!='expired'"
  ).run();

  return {
    ok: true,
    synced,
    totalCurrent: unique.size,
    syncedAt: new Date().toISOString()
  };
}
