// Temporary network switch: retain all original vendor files and ad IDs
// for one-click rollback. Legacy source snapshot lives at
// backup/adsterra-monetag-full-setup-20261126 (2026-11-26).
//
// Newor / Google AdX require human approval and supplied ad tags. Never
// fabricate AdX inventory, load fake tags, or replace old click popups with
// undisclosed Google ads.
export const AD_PROVIDER_MODE = "adsterra_social_bar";
// Modes: "newor_pending" (no ads), "adsterra_social_bar" (only the official
// owner-supplied Social Bar script, if configured), "legacy" (full archived
// ad behaviour). Newor MCM requires new approved tags before activation.
export const NEWOR_PLACEMENT_PLAN = Object.freeze([
 "top", "in-content", "sidebar", "bottom", "outstream-video",
 "web-interstitial"
]);
const LEGACY_EXTERNAL_AD_HOSTS = [
 "highrevenueformat.com","profitableratecpmnetwork.com",
 "deludersottage.com","n6wxm.com","pl31870182."
];
const remove = {element(element){element.remove();}};
export function isReviewOrProductPath(path){
 return /^\/(?:flash-sale\/product\/|products\/[^/]+\/|guides\/[^/]+\/)/.test(path);
}
export function shouldPrepareNeworSlots(path){
 return path === "/" || path === "/index.html" ||
  /^\/(?:flash-sale(?:\/|$)|products\/|guides\/|insights\/|hotels\/|promo-codes\/|careers\/)/.test(path);
}
function placeholder(kind){
 return '<div data-newor-slot="'+kind+'" data-provider="newor" data-status="awaiting-mcm-approval" hidden aria-hidden="true"></div>';
}
export function withPendingNeworStructure(request,response){
 if(AD_PROVIDER_MODE==="legacy")return response;
 if(request.method!=="GET"||response.status!==200||
    !response.headers.get("content-type")?.toLowerCase().includes("text/html"))return response;
 const path=new URL(request.url).pathname;
 const enabled=AD_PROVIDER_MODE==="newor_pending" && shouldPrepareNeworSlots(path);
 const rich=isReviewOrProductPath(path);
 const headers=new Headers(response.headers);
 for(const key of ["content-length","etag","content-md5","digest"])headers.delete(key);
 // Keep the legacy click/redirect scripts in Git, but strip them at the last
 // response boundary, including from HTML cached before this deployment.
 let top=false,bottom=false;
 const rw=new HTMLRewriter()
  .on("#bsb-monetag-vignette",remove)
  .on("#bsb-sponsored-clicks",remove)
  .on("#bsb-optional-popup-offer",remove)
  .on("#bsb-popup-offer-loader",remove)
  .on("#bsb-popup-offer-style",remove)
  .on("#bsb-display-ad-style",remove)
  .on(".display-ad",remove)
  .on('link[href*="/css/sponsored-click.css"]',remove)
  .on('link[href*="/css/display-ads.css"]',remove)
  .on('script[src*="/js/sponsored-click.js"]',remove)
  .on('script[src*="/js/monetag-vignette.js"]',remove)
  .on('a[href*="profitableratecpmnetwork.com"]',remove)
  .on("head",{element(el){el.append('<meta name="bsb-ad-provider" content="'+(AD_PROVIDER_MODE==="newor_pending"?"newor-pending":"adsterra-social-bar")+'">',{html:true});}})
  .on("main",{element(el){
   if(!enabled||top)return;top=true;
   el.prepend(placeholder("top")+placeholder("sidebar"),{html:true});
   el.append(placeholder("in-content")+(rich?placeholder("outstream-video"):""),{html:true});
  }})
  .on("footer.site-footer",{element(el){
   if(!enabled||bottom)return;bottom=true;
   el.before(placeholder("bottom"),{html:true});
  }});
 // Legacy ad scripts are not executable in pending mode even on old cache.
 for(const host of LEGACY_EXTERNAL_AD_HOSTS)
  rw.on('script[src*="'+host+'"]',remove);
 return rw.transform(new Response(response.body,{status:response.status,
  statusText:response.statusText,headers}));
}
