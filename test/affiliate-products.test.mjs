import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";
import path from "node:path";
import {JSDOM} from "jsdom";
import {Miniflare, convertV4MiniflareOptions} from "miniflare";
import {AFFILIATE_PRODUCTS, productPath, featuredCarouselItems} from "../lib/affiliate-products.js";
import {SHOPPING_GUIDES,SHOPPING_PRODUCTS,GUIDE_CATEGORIES,guidePath,categoryPath,guideImage,shoppingDestination} from "../lib/shopping-guides.js";

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
        const mime=filename.endsWith(".html")?"text/html":filename.endsWith(".jpg")?"image/jpeg":filename.endsWith(".webp")?"image/webp":"text/plain";
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
  assert.equal(doc.querySelectorAll("#shopping-guides-spotlight .shopping-card").length,GUIDE_CATEGORIES.length);
  for(const selector of ["#affiliate-product-spotlight .offer-button","#current-listings-track .carousel-buy","#global-deals .affiliate-mini-tile .offer-button"]){
    assert.equal(doc.querySelector(selector).getAttribute("href"),productPath(product));
    assert.equal(doc.querySelector(selector).hasAttribute("data-sponsored-navigation"),false);
  }
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
function adHarness({storage=new Map(),storageFails=false}={}){
  const dom=new JSDOM('<!doctype html><body><a id="buy">Buy</a></body>',{url:origin+"/"});
  const {window}=dom,document=window.document;
  const listeners=[],timers=new Map(),navigations=[],requests=[];
  let now=0,id=0,opened=0;
  window.open=()=>{opened++;throw new Error("External ad tabs must never open");};
  Object.defineProperty(window,"sessionStorage",{value:{
    getItem:key=>{if(storageFails)throw new Error("Storage blocked");return storage.get(key)??null;},
    setItem:(key,value)=>{if(storageFails)throw new Error("Storage blocked");storage.set(key,value);}
  }});
  const nativeCreate=document.createElement.bind(document);
  document.createElement=(tag,...args)=>{
    const element=nativeCreate(tag,...args);
    if(tag==="iframe") Object.defineProperty(element,"src",{
      get:()=>element.getAttribute("src")||"",
      set:value=>{requests.push(value);element.setAttribute("src",value);}
    });
    return element;
  };
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
  return {dom,window,document,link,requests,navigations,timers,storage,click,tick,get opened(){return opened;}};
}

test("one visitor click shows a visible sandboxed ad; × follows the exact destination without an external tab",()=>{
  const h=adHarness();
  assert.equal(h.requests.length,0);
  assert.equal(h.click().defaultPrevented,true);
  const frame=h.document.querySelector(".sponsored-step-frame");
  assert.equal(h.requests.length,1);
  assert.match(frame.src,/profitableratecpmnetwork\.com\/nugmu8qikp/);
  assert.ok(frame.closest("dialog[open]"));
  const sandbox=frame.getAttribute("sandbox").split(" ");
  assert.ok(sandbox.includes("allow-scripts"));
  for(const unsafe of ["allow-top-navigation","allow-top-navigation-by-user-activation","allow-popups","allow-popups-to-escape-sandbox","allow-top-navigation-to-custom-protocols"])assert.equal(sandbox.includes(unsafe),false);
  assert.equal(h.document.querySelector(".sponsored-step-continue").textContent,"Continue to AliExpress →");
  assert.equal(h.document.querySelector(".sponsored-step-continue").href,product.affiliateUrl);
  assert.deepEqual(h.navigations,[]);
  h.document.querySelector(".sponsored-step-close").click();
  assert.deepEqual(h.navigations,[product.affiliateUrl]);
  assert.equal(h.document.querySelector("iframe"),null);
  assert.equal(h.opened,0);
  assert.equal(h.timers.size,0);
  h.dom.window.close();
});

test("repeated ad load/error events keep × and the destination available without retries or automatic redirects",()=>{
  const h=adHarness();h.click();
  const frame=h.document.querySelector("iframe"),destination=h.document.querySelector(".sponsored-step-continue");
  for(let i=0;i<12;i++)frame.dispatchEvent(new h.window.Event("load"));
  frame.dispatchEvent(new h.window.Event("error"));
  assert.match(h.document.querySelector("#sponsored-step-message").textContent,/could not be displayed/);
  assert.ok(h.document.querySelector(".sponsored-step-close"));
  assert.ok(destination.isConnected);
  assert.equal(destination.href,product.affiliateUrl);
  assert.equal(h.requests.length,1);
  h.tick(120000);
  assert.deepEqual(h.navigations,[]);
  destination.click();
  assert.deepEqual(h.navigations,[product.affiliateUrl]);
  assert.equal(h.requests.length,1);
  assert.equal(h.opened,0);
  h.dom.window.close();
});

test("one session spans product navigation and Buy clicks without reopening the Smartlink",()=>{
  const h=adHarness();h.click();
  h.document.querySelector(".sponsored-step-stay").click();
  assert.equal(h.document.activeElement,h.link);
  assert.equal(h.click().defaultPrevented,false);
  assert.equal(h.requests.length,1);
  const nextPage=adHarness({storage:h.storage});
  assert.equal(nextPage.click().defaultPrevented,false);
  assert.equal(nextPage.requests.length,0);
  assert.equal(nextPage.document.querySelector("dialog"),null);
  assert.equal(nextPage.link.href,product.affiliateUrl);
  h.dom.window.close();nextPage.dom.window.close();
});

test("Escape, Back and restored pages dismiss the ad without navigating or reopening it",()=>{
  for(const eventType of ["cancel","popstate","pagehide","pageshow"]){
    const h=adHarness();h.click();
    if(eventType==="cancel")h.document.querySelector("dialog").dispatchEvent(new h.window.Event("cancel",{cancelable:true}));
    else{
      const event=new h.window.Event(eventType);
      if(eventType==="pageshow")Object.defineProperty(event,"persisted",{value:true});
      h.window.dispatchEvent(event);
    }
    assert.equal(h.document.querySelector("dialog"),null,eventType);
    assert.equal(h.document.querySelector("iframe"),null,eventType);
    assert.deepEqual(h.navigations,[],eventType);
    assert.equal(h.click().defaultPrevented,false,eventType);
    assert.equal(h.requests.length,1,eventType);
    h.dom.window.close();
  }
});

test("blocked session storage preserves destination controls and still caps the current page",()=>{
  const h=adHarness({storageFails:true});h.click();
  assert.ok(h.document.querySelector(".sponsored-step-continue"));
  h.document.querySelector(".sponsored-step-stay").click();
  assert.equal(h.click().defaultPrevented,false);
  assert.equal(h.requests.length,1);
  assert.equal(h.opened,0);
  h.dom.window.close();
});

test("external shopping links use the default flow; internal, modified and unsafe links do not",()=>{
  const h=adHarness();const classify=h.window.BuySellSponsoredClicks.destinationFor;
  h.link.rel="";h.link.href="/products/future-product/";assert.equal(classify(h.link),null);
  h.link.href="https://rzekl.com/g/future/";assert.equal(classify(h.link),h.link.href);
  h.link.href="/about.html";assert.equal(classify(h.link),null);
  h.link.href="https://rzekl.com.evil.test/";assert.equal(classify(h.link),null);
  h.link.rel="sponsored";h.link.href="javascript:alert(1)";assert.equal(classify(h.link),null);
  h.link.href=product.affiliateUrl;h.click({ctrlKey:true});h.click({isTrusted:false});assert.equal(h.requests.length,0);
  h.click();
  assert.equal(classify(h.document.querySelector(".sponsored-step-continue")),null);
  h.document.querySelector(".sponsored-step-stay").click();
  h.dom.window.close();
});

test("internal guides and product tiles do not consume the sponsored step before an outbound shopping click",()=>{
  const h=adHarness();
  for(const path of ["/", "/guides/",guidePath(SHOPPING_GUIDES[0]),categoryPath(GUIDE_CATEGORIES[0]),productPath(product)]){
    h.link.href=path;h.link.rel="sponsored";h.link.setAttribute("data-sponsored-navigation","");
    assert.equal(h.click().defaultPrevented,false,path);
    assert.equal(h.requests.length,0,path);
    assert.equal(h.storage.size,0,path);
  }
  const destination=shoppingDestination(SHOPPING_PRODUCTS[0]);
  h.link.href=destination;
  assert.equal(h.click().defaultPrevented,true);
  assert.equal(h.requests.length,1);
  assert.equal(h.document.querySelector(".sponsored-step-continue").href,destination);
  assert.equal(h.document.querySelector(".sponsored-step-label").textContent,"ADVERTISEMENT");
  assert.equal(h.document.querySelector("iframe").title,"Sponsored content");
  h.document.querySelector(".sponsored-step-close").click();
  assert.deepEqual(h.navigations,[destination]);
  assert.equal(h.opened,0);
  h.dom.window.close();
});

test("every shopping guide serves substantive crawlable content, source links, accurate destinations and metadata",async()=>{
  const titles=new Set(),descriptions=new Set();
  for(const guide of SHOPPING_GUIDES){
    const response=await worker.dispatchFetch(origin+guidePath(guide));
    assert.equal(response.status,200,guide.slug);
    const dom=new JSDOM(await response.text(),{url:origin+guidePath(guide)}),doc=dom.window.document;
    assert.equal(doc.querySelectorAll("h1").length,1);
    assert.equal(doc.querySelector("h1").textContent,guide.title);
    assert.equal(doc.querySelector('link[rel="canonical"]').href,origin+guidePath(guide));
    const title=doc.title,description=doc.querySelector('meta[name="description"]').content;
    assert.equal(titles.has(title),false);titles.add(title);
    assert.equal(descriptions.has(description),false);descriptions.add(description);
    assert.match(doc.querySelector('meta[name="robots"]').content,/index,follow,max-image-preview:large/);
    assert.equal(doc.querySelectorAll("#bsb-sponsored-clicks").length,1);
    assert.equal(doc.querySelectorAll(".shopping-option").length,guide.selection.length);
    assert.ok(doc.querySelector(".shopping-prose").textContent.split(/\s+/).length>750,guide.slug);
    assert.ok(doc.querySelectorAll(".shopping-sources li a").length>=2);
    const buttons=[...doc.querySelectorAll("[data-shopping-product]")];
    for(const [i,button] of buttons.entries()){
      const selected=SHOPPING_PRODUCTS.find(p=>p.id===guide.selection[i].productId);
      assert.equal(button.href,shoppingDestination(selected));
      assert.equal(button.rel.includes("sponsored"),true);
      assert.equal(button.hasAttribute("data-sponsored-navigation"),true);
      assert.match(button.textContent,selected.linkKind==="search"?/Search AliExpress/:/View listing on AliExpress/);
    }
    const schemas=[...doc.querySelectorAll('script[type="application/ld+json"]')].map(x=>JSON.parse(x.textContent));
    assert.ok(schemas.some(x=>x["@type"]==="BreadcrumbList"));
    const article=schemas.find(x=>x["@type"]==="Article");
    assert.equal(article.headline,guide.title);
    assert.equal(article.mainEntityOfPage,origin+guidePath(guide));
    assert.equal(article.offers,undefined);assert.equal(article.aggregateRating,undefined);
    const image=doc.querySelector(".shopping-article-image img");
    assert.equal(image.src,doc.querySelector('meta[property="og:image"]').content);
    assert.equal(image.getAttribute("width"),"1536");
    assert.match(doc.querySelector(".shopping-article-image figcaption").textContent,/AI-generated/);
    dom.window.close();
  }
});

test("guide navigation, category hubs, image bytes and sitemap preserve all article URLs",async()=>{
  const index=await worker.dispatchFetch(origin+"/guides/");
  const indexDom=new JSDOM(await index.text());
  assert.equal(indexDom.window.document.querySelectorAll(".shopping-card").length,SHOPPING_GUIDES.length);
  indexDom.window.close();
  for(const category of GUIDE_CATEGORIES){
    const response=await worker.dispatchFetch(origin+categoryPath(category));
    assert.equal(response.status,200);
    const dom=new JSDOM(await response.text());
    assert.equal(dom.window.document.querySelectorAll(".shopping-card").length,SHOPPING_GUIDES.filter(g=>g.category===category.slug).length);
    dom.window.close();
    const bytes=await readFile("."+guideImage(category).src);
    assert.equal(bytes.subarray(0,4).toString(),"RIFF");assert.equal(bytes.subarray(8,12).toString(),"WEBP");
    assert.ok(bytes.length<400000,"Category illustration should stay compact");
  }
  const response=await worker.dispatchFetch(origin+"/sitemap.xml");
  const xml=new JSDOM(await response.text(),{contentType:"application/xml"});
  const entries=[...xml.window.document.querySelectorAll("url")];
  const locations=entries.map(entry=>entry.querySelector("loc").textContent);
  assert.equal(new Set(locations).size,locations.length);
  for(const guide of SHOPPING_GUIDES){
    const entry=entries.find(entry=>entry.querySelector("loc").textContent===origin+guidePath(guide));
    assert.ok(entry,guide.slug);
    assert.equal(entry.getElementsByTagNameNS("http://www.google.com/schemas/sitemap-image/1.1","loc").length,1);
  }
  assert.ok(locations.includes(origin+productPath(product)));
  assert.ok(locations.includes(origin+"/shopping-methodology/"));
  xml.window.close();
});

test("guide canonical redirects, HEAD and real 404 responses behave consistently",async()=>{
  for(const path of ["/guides/","/shopping-methodology/",guidePath(SHOPPING_GUIDES[0]),categoryPath(GUIDE_CATEGORIES[0])]){
    const redirect=await worker.dispatchFetch(origin+path.slice(0,-1),{redirect:"manual"});
    assert.equal(redirect.status,301);assert.equal(redirect.headers.get("location"),origin+path);
    const head=await worker.dispatchFetch(origin+path,{method:"HEAD"});
    assert.equal(head.status,200);assert.equal(await head.text(),"");
  }
  for(const path of ["/guides/missing/","/guides/category/missing/","/guides/invalid/nested/"]){
    const response=await worker.dispatchFetch(origin+path);
    assert.equal(response.status,404);assert.equal(response.headers.get("x-robots-tag"),"noindex");
  }
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
  assert.equal(document.querySelector(".affiliate-carousel-card .carousel-buy").getAttribute("href"),productPath(product));
  assert.equal(document.querySelector(".affiliate-carousel-card .carousel-buy").hasAttribute("data-sponsored-navigation"),false);
  document.querySelector("#current-listings-carousel").__carouselCleanup();
  dom.window.close();
});
