import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {JSDOM} from "jsdom";
import {vignetteEligible,VIGNETTE_HEAD,VIGNETTE_CONTROLLER_PATH} from "../lib/monetag-vignette.js";

const url="https://buysell.best";
const html=()=>new Response("<!doctype html><html><head><title>Product</title></head><body><main>Verified product page</main></body></html>",{headers:{"content-type":"text/html; charset=UTF-8"}});
test("only public HTML content is eligible, including every affiliate product and category page",()=>{
 for(const path of ["/","/index.html","/products/","/products/test/","/item/listing-x","/flash-sale/",
    "/flash-sale/product/source-backed-item/","/flash-sale/?page=2","/guides/product-buying/","/sitemap-helper.html"]){
   assert.equal(vignetteEligible(new Request(url+path),html()),true,path);
 }
 for(const path of ["/privacy.html","/terms.html","/contact.html","/post-ad.html","/404.html",
    "/__ops/import/init","/api/listings","/privacy/","/post-ad/"]){
   assert.equal(vignetteEligible(new Request(url+path),html()),false,path);
 }
 assert.equal(vignetteEligible(new Request(url+"/products/",{method:"POST"}),html()),false);
 assert.equal(vignetteEligible(new Request(url+"/products/"),new Response("missing",{status:404,headers:{"content-type":"text/html"}})),false);
 assert.equal(vignetteEligible(new Request(url+"/sitemap.xml"),new Response("<urlset/>",{headers:{"content-type":"application/xml"}})),false);
 assert.equal(vignetteEligible(new Request(url+"/flash-media/items/a.jpg"),new Response("image",{headers:{"content-type":"image/jpeg"}})),false);
});
test("root controller is injected by Worker, not added to static pages or duplicated with the Adsterra dialog",async()=>{
 const worker=await readFile("worker.js","utf8");
 const sponsor=await readFile("js/sponsored-click.js","utf8");
 const root=await readFile("sw.js","utf8");
 assert.match(worker,/return withCarefulVignette\(request, response\)/);
 assert.equal((worker.match(/withCarefulVignette\(request, response\)/g)||[]).length,1);
 assert.ok(VIGNETTE_HEAD.includes(VIGNETTE_CONTROLLER_PATH));
 assert.match(sponsor,/bsb-sponsored-prompt-at-v7/);
 assert.match(root,/zoneId": 12151278/);
 assert.doesNotMatch(root,/12151474/,"Monetag service-worker verification zone stays separate");
 const wrangler=await readFile("wrangler.toml","utf8");
 assert.match(wrangler,/crons\s*=\s*\[\s*\]/,"scheduled publisher remains paused");
});
function simulate(path="/products/example/"){
 const dom=new JSDOM("<!doctype html><html><head></head><body><main>Browse genuine products</main></body></html>",{
   url:url+path,runScripts:"outside-only",pretendToBeVisual:true
 });
 let now=1_800_000_000_000;
 const {window}=dom;
 Object.defineProperty(window.document,"hasFocus",{configurable:true,value:()=>true});
 Object.defineProperty(window,"scrollY",{configurable:true,writable:true,value:0});
 window.Date.now=()=>now;
 window.setTimeout=()=>0;
 const advance=ms=>{now+=ms;};
 const scroll=px=>{window.scrollY=px;window.dispatchEvent(new window.Event("scroll"));};
 const scripts=()=>[...window.document.querySelectorAll('script[src="https://n6wxm.com/vignette.min.js"]')];
 return {window,advance,scroll,scripts,dom};
}
test("vignette is never loaded on entry; first needs >=45s and meaningful browsing, then caps at one",async()=>{
 const code=await readFile("js/monetag-vignette.js","utf8");
 const t=simulate();
 try{
  t.window.eval(code);
  assert.equal(t.scripts().length,0);
  t.scroll(250);
  assert.equal(t.scripts().length,0,"not immediately on first scroll");
  t.advance(46_000);
  t.scroll(250);
  assert.equal(t.scripts().length,1);
  assert.equal(t.scripts()[0].dataset.zone,"12151474");
  assert.equal(t.window.localStorage.getItem("bsb-monetag-vignette-at-v1"),String(t.window.Date.now()));
  assert.equal(t.window.sessionStorage.getItem("bsb-sponsored-prompt-at-v7"),String(t.window.Date.now()));
  t.window.eval(code);
  t.advance(90_000);t.scroll(250);
  assert.equal(t.scripts().length,1,"must not insert a second vendor script");
 }finally{t.window.close();}
});
test("recent Adsterra prompt or an open modal prevents Monetag overlay overlap",async()=>{
 const code=await readFile("js/monetag-vignette.js","utf8");
 const t=simulate();
 try{
  t.window.sessionStorage.setItem("bsb-sponsored-prompt-at-v7",String(t.window.Date.now()));
  t.window.eval(code);
  t.advance(46_000);t.scroll(220);
  assert.equal(t.scripts().length,0);
  t.advance(10*60_000);
  const dialog=t.window.document.createElement("dialog");dialog.setAttribute("open","");
  t.window.document.body.appendChild(dialog);
  t.scroll(220);
  assert.equal(t.scripts().length,0);
  dialog.remove();t.scroll(220);
  assert.equal(t.scripts().length,1,"loads only after previous dialog ends and cooldown passes");
 }finally{t.window.close();}
});
test("24-hour local cap persists across page loads; blocked storage fails closed",async()=>{
 const code=await readFile("js/monetag-vignette.js","utf8");
 const t=simulate();
 try{
  t.window.localStorage.setItem("bsb-monetag-vignette-at-v1",String(t.window.Date.now()));
  t.window.eval(code);
  t.advance(46_000);t.scroll(220);
  assert.equal(t.scripts().length,0);
 }finally{t.window.close();}
 const blocked=simulate();
 try{
  Object.defineProperty(blocked.window,"localStorage",{get(){throw Error("blocked storage");}});
  blocked.window.eval(code);
  blocked.advance(46_000);blocked.scroll(220);
  assert.equal(blocked.scripts().length,0);
 }finally{blocked.window.close();}
});
test("no overlay is fetched during form editing, hidden document, or data-saver mode",async()=>{
 const code=await readFile("js/monetag-vignette.js","utf8");
 const t=simulate();
 try{
  const input=t.window.document.createElement("input");t.window.document.body.appendChild(input);
  t.window.eval(code);
  t.advance(46_000);t.scroll(230);input.focus();
  t.scroll(230);assert.equal(t.scripts().length,0);
  input.blur();
  Object.defineProperty(t.window.document,"visibilityState",{configurable:true,value:"hidden"});
  t.scroll(230);assert.equal(t.scripts().length,0);
  Object.defineProperty(t.window.document,"visibilityState",{configurable:true,value:"visible"});
  Object.defineProperty(t.window.navigator,"connection",{configurable:true,value:{saveData:true}});
  t.scroll(230);assert.equal(t.scripts().length,0);
 }finally{t.window.close();}
});
