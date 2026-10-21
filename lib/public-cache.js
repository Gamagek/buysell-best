// Shared public-only Cloudflare cache. Keep PWA/browser storage minimal.
// Non-public APIs, visitor profiles, advert creatives, and mutations are excluded.
const VERSION = "20261022-v1";
const MAX_BYTES = 2_500_000;
const MAX_R2_AGE = 6 * 60 * 60 * 1000; // emergency sitemap recovery only
const flights = new Map();

function policyFor(request) {
  if (request.method !== "GET" || request.headers.has("Authorization") ||
      request.headers.has("Cookie")) return null;
  const u = new URL(request.url);
  if (u.hostname !== "buysell.best" || u.protocol !== "https:") return null;
  const path = u.pathname;
  const params = [...u.searchParams.keys()];
  let kind = "html", ttl = 300, snapshot = false;

  if (path === "/api/listings") {
    kind = "listings"; ttl = 90;
    if (params.some(k => !["slug", "limit"].includes(k))) return null;
    const slug = u.searchParams.get("slug");
    const limit = u.searchParams.get("limit");
    if (slug && (slug.length > 160 || limit !== null)) return null;
    if (limit && (!/^\d{1,2}$/.test(limit) || Number(limit) < 1 || Number(limit) > 20)) return null;
  } else if (path === "/sitemap.xml" || path === "/image-sitemap.xml") {
    kind = "xml"; ttl = 600; snapshot = true;
    if (params.length) return null;
  } else if (path === "/" || path === "/index.html") {
    ttl = 180;
    if (params.length) return null;
  } else if (/^\/(?:category|item)\/[a-z0-9-]+\/?$/.test(path)) {
    ttl = 90;
    if (params.length) return null;
  } else if (/^\/(?:guides|products|insights|careers|hotels|promo-codes|shopping-methodology)(?:\/[a-z0-9-]+)*\/?$/.test(path)) {
    ttl = 600;
    if (params.length) return null;
  } else return null;

  if (u.search.length > 250 || params.some(k => u.searchParams.getAll(k).length > 1)) return null;
  const key = new URL("/__bsb_edge_cache/" + VERSION + path, u.origin);
  key.search = new URLSearchParams([...u.searchParams.entries()].sort(([a],[b]) => a.localeCompare(b))).toString();
  return { key: key.toString(), kind, ttl, snapshot };
}

function validBody(policy, text) {
  if (!text || text.length > MAX_BYTES) return false;
  if (policy.kind === "listings") {
    try {
      const data = JSON.parse(text);
      return data?.ok === true && data.available !== false && Array.isArray(data.items) &&
        data.items.length <= 20;
    } catch { return false; }
  }
  if (policy.kind === "xml") return /^\s*<\?xml\b/i.test(text) && /<\/urlset>\s*$/i.test(text);
  return /<(?:!doctype html|html)\b/i.test(text) && /<\/html>\s*$/i.test(text);
}

function toBrowser(response, state) {
  const headers = new Headers(response.headers);
  // Browser storage should not grow with page/API payloads. Edge storage is separate.
  headers.set("Cache-Control", "no-store");
  headers.delete("Expires");
  headers.delete("Age");
  headers.delete("Set-Cookie");
  headers.set("X-BuySell-Edge-Cache", state);
  return new Response(response.body, {status:response.status, statusText:response.statusText, headers});
}

function getEdgeCache() {
  try { return typeof caches !== "undefined" ? caches.default : null; }
  catch { return null; }
}

async function r2Key(url) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
  return "public-seo-snapshots/" + VERSION + "/" +
    Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, "0")).join("") + ".json";
}

async function readSnapshot(env, policy) {
  if (!policy.snapshot || !env.FLASH_MEDIA?.get) return null;
  try {
    const object = await env.FLASH_MEDIA.get(await r2Key(policy.key));
    if (!object) return null;
    const value = await object.json();
    if (value?.key !== policy.key || !Number.isFinite(value.timestamp) ||
      Date.now() < value.timestamp || Date.now() - value.timestamp > MAX_R2_AGE ||
      !validBody(policy, value.body)) return null;
    return value;
  } catch { return null; }
}

function snapshotResponse(value, ttl) {
  return new Response(value.body, {status:200,headers:{
    "Content-Type":value.contentType,
    "Cache-Control":"public, max-age=" + ttl,
    "X-Content-Type-Options":"nosniff",
    ...(value.robots ? {"X-Robots-Tag":value.robots}:{}),
  }});
}

async function persist(env,ctx,policy,response,body,{writeR2=true}={}) {
  const tasks = [];
  const edge=getEdgeCache();
  if (edge) {
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "public, max-age=" + policy.ttl);
    headers.delete("Set-Cookie");
    headers.delete("Content-Length");
    tasks.push(edge.put(new Request(policy.key),new Response(body,{status:200,headers})));
  }
  if (writeR2 && policy.snapshot && env.FLASH_MEDIA?.put) {
    tasks.push((async()=>{
      const payload = {key:policy.key,timestamp:Date.now(),
        contentType:response.headers.get("Content-Type") || "application/xml; charset=utf-8",
        robots:response.headers.get("X-Robots-Tag") || "",body};
      await env.FLASH_MEDIA.put(await r2Key(policy.key),JSON.stringify(payload),{
        httpMetadata:{contentType:"application/json"}});
    })());
  }
  if (!tasks.length) return;
  const work = Promise.allSettled(tasks).then(() => undefined);
  if (ctx?.waitUntil) {
    try { ctx.waitUntil(work); } catch { await work; }
  } else await work;
}

async function originOrCache(request,env,ctx,origin,policy) {
  const cache = getEdgeCache();
  if (cache) {
    try {
      const hit=await cache.match(new Request(policy.key));
      if (hit?.ok) return toBrowser(hit,"HIT");
    } catch { /* continue to R2 or origin */ }
  }

  const saved = await readSnapshot(env,policy);
  if (saved && Date.now()-saved.timestamp <= policy.ttl*1000) {
    const response=snapshotResponse(saved,policy.ttl);
    await persist(env,ctx,policy,response,saved.body,{writeR2:false});
    return toBrowser(response,"R2-FRESH");
  }

  let response;
  try { response = await origin(); }
  catch (error) {
    if (saved) return toBrowser(snapshotResponse(saved,policy.ttl),"R2-STALE");
    throw error;
  }
  if (!response?.ok || response.status !== 200 || response.headers.has("Set-Cookie")) {
    if (saved && response?.status >= 500) return toBrowser(snapshotResponse(saved,policy.ttl),"R2-STALE");
    return response;
  }
  if (policy.kind === "listings" && !env.DB) return response;
  const type = (response.headers.get("Content-Type") || "").toLowerCase();
  if ((policy.kind === "listings" && !type.includes("json")) ||
    (policy.kind === "xml" && !type.includes("xml")) ||
    (policy.kind === "html" && !type.includes("text/html"))) return response;
  const body = await response.clone().text();
  if (!validBody(policy,body)) return response;
  await persist(env,ctx,policy,response,body);
  return toBrowser(response,"MISS");
}

export async function cachedPublicResponse(request,env,ctx,origin) {
  const policy=policyFor(request);
  if (!policy) return null;
  let flight = flights.get(policy.key);
  if (!flight) {
    flight = originOrCache(request,env,ctx,origin,policy);
    flights.set(policy.key,flight);
    flight.finally(()=>{if(flights.get(policy.key)===flight)flights.delete(policy.key);}).catch(()=>{});
  }
  return (await flight).clone();
}
