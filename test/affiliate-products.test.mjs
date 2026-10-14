import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";
import path from "node:path";
import {JSDOM} from "jsdom";
import {Miniflare, convertV4MiniflareOptions} from "miniflare";
import {AFFILIATE_PRODUCTS, productPath, featuredCarouselItems} from "../lib/affiliate-products.js";

const origin="https://buysell.best";
const product=AFFILIATE_PRODUCTS[0];
let worker;
before(async()=>{
  worker=new Miniflare(convertV4MiniflareOptions({
    modules:true, scriptPath:path.resolve(".test-build/worker.js"), compatibilityDate:"2026-09-20",
    serviceBindings:{ASSETS:async request=>{
      const pathname=new URL(request.url).pathname;
      const filename=pathname==="/"?"index.html":pathname.slice(1);
      try{
        const content=await readFile(path.resolve(filename));
        const mime=filename.endsWith(".html")?"text/html":filename.endsWith(".jpg")?"image/jpeg":"text/plain";
        return new Response(content,{headers:{"content-type":mime}});
      }catch(_){return new Response("Not found",{status:404});}
    }}
  }));
});
after(async()=>{await worker?.dispose();});

test("product HTML contains crawlable content, ten pictures, canonical and truthful schema",async()=>{
  const response=await worker.dispatchFetch(origin+productPath(product));
  assert.equal(response.status,200);
  const dom=new JSDOM(await response.text());
  const doc=dom.window.document;
  assert.equal(doc.querySelector("h1").textContent,product.title);
  assert.equal(doc.querySelector('link[rel="canonical"]').href,origin+productPath(product));
  assert.equal(doc.querySelectorAll(".product-image-grid img").length,10);
  assert.equal(doc.querySelectorAll("[data-product-image]").length,10);
  assert.match(doc.querySelector(".offer-price").textContent,/30,666\.35/);
  assert.equal(doc.querySelector('meta[property="og:image:width"]').content,"1536");
  const ld=[...doc.querySelectorAll('script[type="application/ld+json"]')].map(x=>JSON.parse(x.textContent));
  const schema=ld.find(x=>x["@type"]==="Product");
  assert.equal(schema.image.length,10);
  assert.equal(schema.offers,undefined);
  assert.equal(schema.aggregateRating,undefined);
  assert.ok(ld.some(x=>x["@type"]==="BreadcrumbList"));
  assert.equal(doc.querySelector(".product-buy").href,product.affiliateUrl);
  assert.ok(doc.querySelector("#bsb-sponsored-clicks"));
  assert.match(doc.querySelector(".claims-note").textContent,/not been independently tested/);
  dom.window.close();
});

test("homepage serves the product, mini tile and first carousel frame without a feed or client script",async()=>{
  const response=await worker.dispatchFetch(origin+"/");
  const dom=new JSDOM(await response.text());
  const doc=dom.window.document;
  assert.equal(doc.querySelector('meta[name="mitgo-verification"]').content,"ed877f45-041a-44ad-b458-4f1265704c13");
  assert.ok(doc.querySelector("#affiliate-product-spotlight .offer-button"));
  assert.ok(doc.querySelector("#current-listings-track .affiliate-carousel-card .carousel-buy"));
  assert.ok(doc.querySelector("#global-deals .affiliate-mini-tile"));
  assert.equal(JSON.parse(doc.querySelector("#affiliate-products-data").textContent)[0].id,product.id);
  dom.window.close();
});

test("canonical redirects, HEAD, unknown products and image sitemap are correct",async()=>{
  const redirect=await worker.dispatchFetch(origin+productPath(product).slice(0,-1),{redirect:"manual"});
  assert.equal(redirect.status,301);
  assert.equal(redirect.headers.get("location"),origin+productPath(product));
  const head=await worker.dispatchFetch(origin+productPath(product),{method:"HEAD"});
  assert.equal(head.status,200);
  assert.equal(await head.text(),"");
  const missing=await worker.dispatchFetch(origin+"/products/unknown/");
  assert.equal(missing.status,404);
  assert.equal(missing.headers.get("x-robots-tag"),"noindex");
  const sitemapResponse=await worker.dispatchFetch(origin+"/sitemap.xml");
  assert.equal(sitemapResponse.status,200);
  const xml=new JSDOM(await sitemapResponse.text(),{contentType:"application/xml"});
  const urls=[...xml.window.document.querySelectorAll("url")];
  const entry=urls.find(x=>x.querySelector("loc")?.textContent===origin+productPath(product));
  assert.ok(entry);
  assert.equal(entry.getElementsByTagNameNS("http://www.google.com/schemas/sitemap-image/1.1","loc").length,10);
  for(const image of product.images){const bytes=await readFile("."+image.src);assert.equal(bytes.readUInt16BE(0),0xffd8);assert.ok(image.src.endsWith(".jpg"));}
  xml.window.close();
});

const adCode=await readFile("js/sponsored-click.js","utf8");
function adHarness(blocked=false){
  const dom=new JSDOM('<!doctype html><body><a id="buy">Buy</a></body>',{url:origin+"/"});
  const {window}=dom, document=window.document;
  const listeners=[],timers=new Map(),navigations=[],opened=[];
  let now=0,id=0;
  const popup={closed:false,opener:window,location:{replace:url=>opened.push(url)},close(){this.closed=true;}};
  window.open=()=>blocked?null:popup;
  const nativeAdd=document.addEventListener.bind(document);
  document.addEventListener=(type,fn,options)=>{if(type==="click")listeners.push(fn);return nativeAdd(type,fn,options);};
  const context=vm.createContext({window,document,URL,location:{href:origin+"/",origin,assign:url=>navigations.push(url)},Date:{now:()=>now},setInterval:fn=>{timers.set(++id,fn);return id;},clearInterval:id=>timers.delete(id)});
  vm.runInContext(adCode,context);
  const link=document.getElementById("buy");link.href=product.affiliateUrl;link.rel="sponsored";
  function click(modifiers={}){
    const event={target:link,isTrusted:true,defaultPrevented:false,button:0,ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,preventDefault(){this.defaultPrevented=true;},...modifiers};
    for(const listener of listeners)listener(event);
    return event;
  }
  function tick(ms){now+=ms;for(const timer of [...timers.values()])timer();}
  return {dom,window,document,link,popup,opened,navigations,timers,click,tick};
}

test("sponsor opens only on a visitor click, removes opener and × continues to the exact affiliate URL",()=>{
  const h=adHarness();
  assert.equal(h.opened.length,0);
  assert.equal(h.click().defaultPrevented,true);
  assert.equal(h.opened.length,1);
  assert.match(h.opened[0],/profitableratecpmnetwork\.com\/nugmu8qikp/);
  assert.equal(h.popup.opener,null);
  assert.deepEqual(h.navigations,[]);
  h.document.querySelector(".sponsored-step-close").click();
  assert.deepEqual(h.navigations,[product.affiliateUrl]);
  assert.equal(h.popup.closed,true);
  assert.equal(h.timers.size,0);
  h.dom.window.close();
});

test("blocked popup has working manual continuation and one automatic continuation",()=>{
  const h=adHarness(true);h.click();
  assert.match(h.document.querySelector("#sponsored-step-message").textContent,/blocked/);
  assert.ok(h.document.querySelector("[data-sponsored-bypass]").href.startsWith("https://www.profitableratecpmnetwork.com/"));
  h.tick(6500);h.tick(6500);
  assert.deepEqual(h.navigations,[product.affiliateUrl]);
  h.dom.window.close();
});

test("visitor can pause automatic navigation, stay on the page, or close the sponsor to continue",()=>{
  const h=adHarness();h.click();
  h.document.querySelector("input").checked=false;
  h.tick(10000);assert.deepEqual(h.navigations,[]);
  h.document.querySelector(".sponsored-step-stay").click();
  assert.equal(h.document.querySelector("dialog"),null);
  assert.equal(h.document.activeElement,h.link);
  assert.equal(h.timers.size,0);
  h.popup.closed=false;h.click();h.popup.closed=true;h.tick(250);
  assert.deepEqual(h.navigations,[product.affiliateUrl]);
  h.dom.window.close();
});

test("future product and affiliate links use the default flow; ordinary, modified and unsafe links do not",()=>{
  const h=adHarness();const classify=h.window.BuySellSponsoredClicks.destinationFor;
  h.link.rel="";h.link.href="/products/future-product/";assert.equal(classify(h.link),origin+"/products/future-product/");
  h.link.href="https://rzekl.com/g/future/";assert.equal(classify(h.link),h.link.href);
  h.link.href="/about.html";assert.equal(classify(h.link),null);
  h.link.href="https://rzekl.com.evil.test/";assert.equal(classify(h.link),null);
  h.link.rel="sponsored";h.link.href="javascript:alert(1)";assert.equal(classify(h.link),null);
  h.link.href=product.affiliateUrl;h.click({ctrlKey:true});h.click({isTrusted:false});assert.equal(h.opened.length,0);
  h.dom.window.close();
});

test("gallery switches the full-size image and its accessible description",async()=>{
  const response=await worker.dispatchFetch(origin+productPath(product));
  const dom=new JSDOM(await response.text(),{url:origin+productPath(product),runScripts:"outside-only"});
  dom.window.eval(await readFile("js/product-page.js","utf8"));
  const button=dom.window.document.querySelectorAll("[data-product-image]")[3];button.click();
  assert.equal(dom.window.document.getElementById("product-main-image").src,origin+product.images[3].src);
  assert.equal(dom.window.document.getElementById("product-main-image").alt,product.images[3].alt);
  assert.equal(button.getAttribute("aria-pressed"),"true");
  dom.window.close();
});

test("carousel refresh cleans previous controls and keeps the shared price out of currency conversion",async()=>{
  const response=await worker.dispatchFetch(origin+"/");
  const dom=new JSDOM(await response.text(),{url:origin+"/"});const window=dom.window,document=window.document;
  document.addEventListener=()=>{};
  window.matchMedia=()=>({matches:false});
  const timers=new Set();let id=0;
  const context=vm.createContext({window,document,location:{...new URL(origin)},URL,Node:window.Node,AbortController:window.AbortController,requestAnimationFrame:fn=>fn(),setInterval:()=>{timers.add(++id);return id;},clearInterval:id=>timers.delete(id)});
  vm.runInContext(await readFile("js/app.js","utf8"),context);
  context.decoratePrices=()=>{};
  const items=[...featuredCarouselItems(),{id:"other",title:"Other product",price:10,currency:"USD",url:"/about.html"},{id:"third",title:"Third product",price:20,currency:"USD",url:"/about.html"}];
  context.setupCurrentListingsCarousel(items);context.setupCurrentListingsCarousel(items);
  assert.equal(timers.size,1);
  document.querySelector(".carousel-next").click();
  assert.equal(document.querySelector(".carousel-card.is-active").dataset.carouselIndex,"1");
  assert.equal(document.querySelector(".affiliate-carousel-card .carousel-price").classList.contains("smart-price"),false);
  document.querySelector("#current-listings-carousel").__carouselCleanup();
  dom.window.close();
});
