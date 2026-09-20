const handlers = {
  health: () => import("./functions/api/health.js"),
  view: () => import("./functions/api/view.js"),
  stats: () => import("./functions/api/stats.js"),
  reaction: () => import("./functions/api/reaction.js"),
  events: () => import("./functions/api/events.js"),
  recommendations: () => import("./functions/api/recommendations.js"),
  currency: () => import("./functions/api/currency.js"),
  privacyReset: () => import("./functions/api/privacy-reset.js"),
  deals: () => import("./functions/api/deals.js"),
  listings: () => import("./functions/api/listings.js"),
  relatedDeals: () => import("./functions/api/related-deals.js")
};

function route(pathname) {
  if (pathname === "/api/health") return "health";
  if (pathname === "/api/view") return "view";
  if (pathname === "/api/stats") return "stats";
  if (pathname === "/api/reaction") return "reaction";
  if (pathname === "/api/events") return "events";
  if (pathname === "/api/recommendations") return "recommendations";
  if (pathname === "/api/currency") return "currency";
  if (pathname === "/api/privacy-reset") return "privacyReset";
  if (pathname === "/api/deals") return "deals";
  if (pathname === "/api/listings") return "listings";
  if (pathname === "/api/deals/related") return "relatedDeals";
  return null;
}

function methodName(request) {
  const method = request.method.toUpperCase();
  if (method === "GET") return "onRequestGet";
  if (method === "POST") return "onRequestPost";
  if (method === "OPTIONS") return "onRequestOptions";
  return null;
}

async function serveAsset(request, env) {
  const response = await env.ASSETS.fetch(request);
  const path = new URL(request.url).pathname;
  if (path.endsWith(".js") || path.endsWith(".html")) {
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-cache, no-store, must-revalidate");
    headers.set("pragma", "no-cache");
    headers.set("expires", "0");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const name = route(url.pathname);
    if (!name) return serveAsset(request, env);

    const mod = await handlers[name]();
    const action = methodName(request);
    const fn = action ? mod[action] : null;

    if (!fn) {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: "GET, POST, OPTIONS" }
      });
    }

    return fn({request, env, ctx});
  }
};
