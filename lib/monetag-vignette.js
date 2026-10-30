// The Vignette tag must be in the *server-delivered HTML head* for
// Monetag Installation Check to detect it. Deferring its creation until a
// user scrolls makes verification fail even if a client-side ad later loads.
//
// This is the unmodified publisher tag, with only Cloudflare's documented
// data-cfasync="false" compatibility attribute on the inline script.
// The provider controls creative timing/frequency after this tag initializes.
export const MONETAG_ZONE = "12151474";
export const VIGNETTE_HEAD =
  '<script id="bsb-monetag-vignette" data-cfasync="false">'+
  "(function(s){s.dataset.zone='12151474',s.src='https://n6wxm.com/vignette.min.js'})"+
  "([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))"+
  '</script>';

export function vignetteEligible(request,response) {
  const path=new URL(request.url).pathname;
  if(request.method!=="GET" || response.status!==200 ||
     !response.headers.get("content-type")?.toLowerCase().includes("text/html")) return false;
  // Root page has the exact tag directly in its HTML source, not via this
  // rewriter, so the source contains only one Monetag loader.
  if(path==="/"||path==="/index.html")return false;
  // No vignette on forms, legal pages, protected operations, or 404 documents.
  if(/^(?:\/__ops\/|\/api\/|\/post-ad(?:\/|\.html|$)|\/contact(?:\/|\.html|$)|\/privacy(?:\/|\.html|$)|\/terms(?:\/|\.html|$)|\/404(?:\/|\.html|$))/.test(path))return false;
  return true;
}

export function withCarefulVignette(request,response) {
  if(!vignetteEligible(request,response))return response;
  const headers=new Headers(response.headers);
  for(const key of ["content-length","etag","content-md5","digest"])headers.delete(key);
  // Prepend as high as possible in <head>, before deferred ad controllers.
  return new HTMLRewriter().on("head",{
    element(head){head.prepend(VIGNETTE_HEAD,{html:true});}
  }).transform(new Response(response.body,{
    status:response.status,statusText:response.statusText,headers
  }));
}
