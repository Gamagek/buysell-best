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
  relatedDeals: () => import("./functions/api/related-deals.js")
};

function route(pathname) {
  if (pathname === "/api/health") return ["health", "onRequestGet"];
  if (pathname === "/api/view") return ["view", "method"];
  if (pathname === "/api/stats") return ["stats", "onRequestGet"];
  if (pathname === "/api/reaction") return ["reaction", "method"];
  if (pathname === "/api/events") return ["events", "method"];
  if (pathname === "/api/recommendations") return ["recommendations", "method"];
  if (pathname === "/api/currency") return ["currency", "onRequestGet"];
  if (pathname === "/api/privacy-reset") return ["privacyReset", "onRequestPost"];
  if (pathname === "/api/deals") return ["deals", "onRequestGet"];
  if (pathname === "/api/deals/related") return ["relatedDeals", "onRequestGet"];
  return null;
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const match = route(url.pathname);
    if (!match) return env.ASSETS.fetch(request);
    const [name, action] = match;
    const mod = await handlers[name]();
    const fn = mod[action];
    if (!fn) return new Response("Method Not Allowed",{status:405,headers:{allow:"GET"}});
    return fn({request,env,ctx});
  }
};
