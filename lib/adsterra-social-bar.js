// Only install the site-specific, Adsterra-approved Social Bar script provided
// by the publisher. Never repurpose legacy banner, Native, Smartlink or VAST IDs.
export const SOCIAL_BAR_CONFIG_KEY = "ADSTERRA_SOCIAL_BAR_SCRIPT_URL";

export function verifiedSocialBarScript(env) {
 const value=env?.[SOCIAL_BAR_CONFIG_KEY];
 if(typeof value!=="string" || !value.trim()) return null;
 try{
  const url=new URL(value.trim());
  if(url.protocol!=="https:"||url.username||url.password||url.port||
     !url.hostname.includes(".")||!url.pathname.endsWith(".js")||
     url.search||url.hash) return null;
  return url.href;
 }catch{return null;}
}

export function socialBarEligible(request,response) {
 if(request.method!=="GET" || response.status!==200 ||
  !response.headers.get("content-type")?.toLowerCase().includes("text/html"))return false;
 const path=new URL(request.url).pathname;
 return !/^(?:\/__ops\/|\/api\/|\/post-ad(?:\/|\.html|$)|\/contact(?:\/|\.html|$)|\/privacy(?:\/|\.html|$)|\/terms(?:\/|\.html|$)|\/404(?:\/|\.html|$))/.test(path);
}

export function withAdsterraSocialBar(request,response,env) {
 const src=verifiedSocialBarScript(env);
 if(!src||!socialBarEligible(request,response))return response;
 const headers=new Headers(response.headers);
 for(const name of ["content-length","etag","content-md5","digest"])headers.delete(name);
 // Exact vendor-supplied code URL, loaded ONCE before the closing body tag. The vendor
 // selects whether an impression is a floating video, interstitial or other
 // Social Bar creative; we cannot force a video, click, refresh or ad display.
 // Do not inject the tag into any redirect/API/non-HTML response.
 const tag='<script id="bsb-adsterra-social-bar" type="text/javascript" src="'+
  src.replace(/&/g,"&amp;").replace(/"/g,"&quot;")+'" data-cfasync="false"></script>';
 const assets='<link rel="stylesheet" href="/css/social-bar-redirect.css?v=20261126">'+
  '<script id="bsb-social-bar-redirect" src="/js/social-bar-redirect.js?v=20261126" defer></script>';
 let seen=false;
 return new HTMLRewriter().on("body",{element(el){
  if(seen)return;seen=true;el.append(tag+assets,{html:true});
 }}).transform(new Response(response.body,{status:response.status,
  statusText:response.statusText,headers}));
}
