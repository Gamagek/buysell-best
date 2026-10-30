import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {JSDOM} from "jsdom";
import {
  vignetteEligible,withCarefulVignette,VIGNETTE_HEAD,MONETAG_ZONE
} from "../lib/monetag-vignette.js";

const site="https://buysell.best";
const response=(type="text/html; charset=UTF-8",status=200)=>
  new Response("<!doctype html><html><head><title>Content</title></head><body><main>Offer</main></body></html>",{status,headers:{"content-type":type}});
const expectedVendorCode=
  "(function(s){s.dataset.zone='12151474',s.src='https://n6wxm.com/vignette.min.js'})"+
  "([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))";
test("homepage source has exact inline Monetag publisher tag near opening head, without waiting for interaction",async()=>{
  const html=await readFile("index.html","utf8");
  const head=html.slice(html.indexOf("<head>"),html.indexOf("</head>"));
  const doc=new JSDOM(html).window.document;
  const tags=[...doc.querySelectorAll('head > script[id="bsb-monetag-vignette"]')];
  assert.equal(tags.length,1);
  assert.equal(tags[0].getAttribute("data-cfasync"),"false");
  assert.equal(tags[0].textContent,expectedVendorCode);
  assert.equal(MONETAG_ZONE,"12151474");
  assert.equal(head.indexOf('id="bsb-monetag-vignette"') < 100,true,"keep verification tag high in head");
  assert.ok(!head.includes('src="/js/monetag-vignette.js"'));
});
test("Worker rewriter uses same exact head tag for all other eligible content pages",async()=>{
  const tagDoc=new JSDOM("<html><head>"+VIGNETTE_HEAD+"</head></html>").window.document;
  const tag=tagDoc.querySelector("head > script");
  assert.equal(tag?.textContent,expectedVendorCode);
  assert.equal(tag?.getAttribute("data-cfasync"),"false");
  const worker=await readFile("worker.js","utf8");
  assert.match(worker,/return withCarefulVignette\(request, response\)/);
  const helper=await readFile("lib/monetag-vignette.js","utf8");
  assert.match(helper,/head\.prepend\(VIGNETTE_HEAD/);
});
test("no duplicate Monetag tag on root and no ad loading on API or legal/form pages",()=>{
  for(const path of ["/","/index.html","/contact.html","/privacy.html","/terms.html","/post-ad.html","/404.html","/__ops/import/init","/api/listings"]){
    assert.equal(vignetteEligible(new Request(site+path),response()),false,path);
  }
  for(const path of ["/products/","/products/seller-offer/","/flash-sale/","/flash-sale/product/item-x/",
    "/category/electronics","/item/seller-listed-phone","/guides/shopping/","/hotels/","/promo-codes/"]){
    assert.equal(vignetteEligible(new Request(site+path),response()),true,path);
  }
  assert.equal(vignetteEligible(new Request(site+"/flash-sale/",{method:"HEAD"}),response()),false);
  assert.equal(vignetteEligible(new Request(site+"/flash-sale/"),response("application/xml")),false);
  assert.equal(vignetteEligible(new Request(site+"/flash-sale/"),response("text/html",404)),false);
  assert.equal(withCarefulVignette(new Request(site+"/"),response()) instanceof Response,true);
});
test("Adsterra original click prompt, separate Monetag root service worker zone, and paused cron all remain",async()=>{
  const sponsor=await readFile("js/sponsored-click.js","utf8");
  const sw=await readFile("sw.js","utf8");
  const wrangler=await readFile("wrangler.toml","utf8");
  assert.match(sponsor,/bsb-sponsored-prompt-at-v7/);
  assert.match(sponsor,/PROMPT_COOLDOWN = 10 \* 60 \* 1000/);
  assert.match(sw,/12151278/);
  assert.doesNotMatch(sw,/12151474/);
  assert.match(wrangler,/crons\s*=\s*\[\s*\]/);
});
test("insertion is at server HTML response stage, not delayed client-side interaction",async()=>{
  const helper=await readFile("lib/monetag-vignette.js","utf8");
  const html=await readFile("index.html","utf8");
  assert.doesNotMatch(helper,/VIGNETTE_CONTROLLER_PATH|MIN_STAY_MS|scrollEngaged/);
  assert.match(html,/https:\/\/n6wxm\.com\/vignette\.min\.js/);
  assert.equal((html.match(/id="bsb-monetag-vignette"/g)||[]).length,1);
});
