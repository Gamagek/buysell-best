import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {JSDOM} from "jsdom";
import {Miniflare,convertV4MiniflareOptions} from "miniflare";
import path from "node:path";
import {AD_PROVIDER_MODE} from "../lib/ad-provider-switch.js";
import {verifiedSocialBarScript,socialBarEligible} from "../lib/adsterra-social-bar.js";

const EXAMPLE="https://pl12345678.example.org/social.js";
test("Social Bar stays dormant until owner sets authentic script in worker config",()=>{
 assert.equal(AD_PROVIDER_MODE,"adsterra_social_bar");
 assert.equal(verifiedSocialBarScript({}),null);
 assert.equal(verifiedSocialBarScript({ADSTERRA_SOCIAL_BAR_SCRIPT_URL:EXAMPLE}),EXAMPLE);
 for(const unsafe of ["","javascript:alert(1)","http://x.example/social.js",
   "//pl.example/social.js","https://x.example/social.js?ref=1","https://u:p@x.example/social.js",
   "https://x.example:4000/social.js","https://x.example/social.html"]){
  assert.equal(verifiedSocialBarScript({ADSTERRA_SOCIAL_BAR_SCRIPT_URL:unsafe}),null,unsafe);
 }
 const html=new Response("<html><body></body></html>",{status:200,headers:{"content-type":"text/html"}});
 assert.ok(socialBarEligible(new Request("https://buysell.best/products/"),html));
 for(const forbidden of ["/api/currency","/contact.html","/privacy/","/post-ad.html","/__ops/reviews/publish"]){
  assert.equal(socialBarEligible(new Request("https://buysell.best"+forbidden),html),false,forbidden);
 }
});
async function exampleWorker(){
 return new Miniflare(convertV4MiniflareOptions({
  modules:true,scriptPath:path.resolve(".test-build/worker.js"),
  compatibilityDate:"2026-09-20",
  bindings:{ADSTERRA_SOCIAL_BAR_SCRIPT_URL:EXAMPLE},
  serviceBindings:{ASSETS:async request=>{
   const p=new URL(request.url).pathname;
   const name=p==="/"?"index.html":p.slice(1);
   try{const bytes=await readFile(path.resolve(name));
    return new Response(bytes,{headers:{"content-type":name.endsWith(".html")?"text/html":"text/plain"}});
   }catch{return new Response("Not Found",{status:404});}
  }}
 }));
}
test("approved Social Bar script is inserted once and legacy redirects stay disabled",async()=>{
 const worker=await exampleWorker();
 try{
  for(const p of ["/","/about.html","/guides/"]){
   const resp=await worker.dispatchFetch("https://buysell.best"+p);
   assert.equal(resp.status,200,p);
   const doc=new JSDOM(await resp.text()).window.document;
   assert.equal(doc.querySelectorAll('#bsb-adsterra-social-bar[src="'+EXAMPLE+'"]').length,1,p);
   assert.equal(doc.querySelectorAll("#bsb-social-bar-redirect").length,1,p);
   assert.equal(doc.querySelectorAll("#bsb-sponsored-clicks, #bsb-monetag-vignette,.display-ad").length,0,p);
   assert.equal(doc.querySelector('meta[name="bsb-ad-provider"]')?.content,"adsterra-social-bar");
  }
  for(const p of ["/contact.html","/privacy.html","/post-ad.html","/api/currency"]){
   const resp=await worker.dispatchFetch("https://buysell.best"+p);
   assert.equal((await resp.text()).includes("bsb-adsterra-social-bar"),false,p);
  }
 }finally{await worker.dispose();}
});
