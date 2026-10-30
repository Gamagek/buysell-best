// Monetag vignette is deliberately NOT inserted unconditionally into HTML:
// a first-party deferred controller enforces page dwell, scroll engagement,
// once-per-24h local frequency cap, and no overlap with the Adsterra dialog.
export const VIGNETTE_CONTROLLER_PATH = "/js/monetag-vignette.js?v=20261030-ux1";
export const VIGNETTE_HEAD =
  '<script id="bsb-monetag-vignette" src="'+VIGNETTE_CONTROLLER_PATH+'" defer></script>';

export function vignetteEligible(request,response) {
  const path=new URL(request.url).pathname;
  if(request.method!=="GET" || response.status!==200 ||
     !response.headers.get("content-type")?.toLowerCase().includes("text/html")) return false;
  // No vignette on forms, legal pages, protected operations, or 404 documents.
  if(/^(?:\/__ops\/|\/api\/|\/post-ad(?:\/|\.html|$)|\/contact(?:\/|\.html|$)|\/privacy(?:\/|\.html|$)|\/terms(?:\/|\.html|$)|\/404(?:\/|\.html|$))/.test(path))return false;
  return true;
}

export function withCarefulVignette(request,response) {
  if(!vignetteEligible(request,response))return response;
  const headers=new Headers(response.headers);
  for(const key of ["content-length","etag","content-md5","digest"])headers.delete(key);
  return new HTMLRewriter().on("head",{
    element(head){head.append(VIGNETTE_HEAD,{html:true});}
  }).transform(new Response(response.body,{
    status:response.status,statusText:response.statusText,headers
  }));
}
