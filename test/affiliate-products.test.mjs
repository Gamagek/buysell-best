import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";
import path from "node:path";
import {JSDOM} from "jsdom";
import {Miniflare, convertV4MiniflareOptions} from "miniflare";
import {AFFILIATE_PRODUCTS, productPath, featuredCarouselItems} from "../lib/affiliate-products.js";
import {SHOPPING_GUIDES,SHOPPING_PRODUCTS,GUIDE_CATEGORIES,guidePath,categoryPath,guideImage,guidePreviewImage,shoppingDestination,SHOPPING_DETAIL_PRODUCTS,shoppingProductPath} from "../lib/shopping-guides.js";

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
  assert.equal(doc.querySelector('meta[name="google-adsense-account"]').content,"ca-pub-4485257027995607");
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
    assert.equal(doc.querySelector(selector).getAttribute("href"),product.affiliateUrl);
    assert.equal(doc.querySelector(selector).hasAttribute("data-sponsored-navigation"),true);
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

test("shopping click offers an optional separate sponsor and a direct merchant continuation",()=>{
  const h=adHarness();
  assert.equal(h.click().defaultPrevented,true);
  const doc=h.document, sponsor=doc.querySelector(".sponsored-step-sponsor");
  assert.ok(doc.querySelector("dialog[open]"));
  assert.equal(doc.querySelector("iframe"),null);
  assert.match(sponsor.href,/profitableratecpmnetwork\.com\/nugmu8qikp/);
  assert.equal(sponsor.target,"_blank");
  assert.ok(sponsor.rel.includes("noopener")&&sponsor.rel.includes("sponsored"));
  assert.equal(doc.querySelector(".sponsored-step-continue").href,product.affiliateUrl);
  assert.match(doc.querySelector("#sponsored-step-message").textContent,/not the merchant/);
  assert.equal(doc.querySelector(".sponsored-step-label").textContent,"OPTIONAL ADVERTISEMENT");
  assert.equal(h.opened,0);assert.equal(h.requests.length,0);
  doc.querySelector(".sponsored-step-close").click();
  assert.deepEqual(h.navigations,[product.affiliateUrl]);
  assert.equal(doc.querySelector(".sponsored-step-backdrop"),null);
  h.dom.window.close();
});

test("a normal same-tab sponsor link is available when a new tab is blocked, with no automatic requests",()=>{
  const h=adHarness();h.click();
  const sponsor=h.document.querySelector(".sponsored-step-sponsor");
  const fallback=h.document.querySelector(".sponsored-step-same-tab");
  assert.equal(fallback.href,sponsor.href);assert.equal(fallback.target,"");
  assert.equal(h.window.BuySellSponsoredClicks.destinationFor(fallback),null);
  assert.equal(h.window.BuySellSponsoredClicks.destinationFor(sponsor),null);
  h.tick(120000);
  assert.deepEqual(h.requests,[]);assert.deepEqual(h.navigations,[]);assert.equal(h.opened,0);
  h.document.querySelector(".sponsored-step-continue").click();
  assert.deepEqual(h.navigations,[product.affiliateUrl]);
  assert.equal(h.timers.size,0);h.dom.window.close();
});

test("every shopping click offers the sponsor choice, including later products in the same session",()=>{
  const h=adHarness();h.click();
  h.document.querySelector(".sponsored-step-stay").click();
  assert.equal(h.document.activeElement,h.link);
  h.link.href="https://www.aliexpress.com/item/1005012986658635.html";
  assert.equal(h.click().defaultPrevented,true);
  assert.equal(h.document.querySelector(".sponsored-step-continue").href,h.link.href);
  assert.equal(h.document.querySelectorAll("dialog").length,1);
  assert.equal(h.click().defaultPrevented,true);
  assert.equal(h.document.querySelectorAll("dialog").length,1);
  h.document.querySelector(".sponsored-step-stay").click();
  const next=adHarness({storage:h.storage});
  assert.equal(next.click().defaultPrevented,true);
  assert.ok(next.document.querySelector("dialog[open]"));
  assert.deepEqual(h.requests,[]);assert.equal(h.opened,0);
  h.dom.window.close();next.dom.window.close();
});

test("Escape, Back and restored pages dismiss the choice without a redirect",()=>{
  for(const eventType of ["cancel","popstate","pagehide","pageshow"]){
    const h=adHarness();h.click();
    if(eventType==="cancel")h.document.querySelector("dialog").dispatchEvent(new h.window.Event("cancel",{cancelable:true}));
    else {const event=new h.window.Event(eventType);if(eventType==="pageshow")Object.defineProperty(event,"persisted",{value:true});h.window.dispatchEvent(event);}
    assert.equal(h.document.querySelector("dialog"),null,eventType);
    assert.equal(h.document.querySelector(".sponsored-step-backdrop"),null,eventType);
    assert.deepEqual(h.navigations,[],eventType);assert.equal(h.click().defaultPrevented,true,eventType);
    h.dom.window.close();
  }
});

test("blocked storage and missing native dialog support retain accessible skip and close controls",()=>{
  const h=adHarness({storageFails:true});
  h.window.HTMLDialogElement.prototype.showModal=undefined;
  h.click();
  assert.equal(h.document.querySelector("dialog").getAttribute("aria-modal"),"true");
  const first=h.document.querySelector(".sponsored-step-close"),last=h.document.querySelector(".sponsored-step-stay");
  first.focus();first.dispatchEvent(new h.window.KeyboardEvent("keydown",{key:"Tab",shiftKey:true,bubbles:true,cancelable:true}));
  assert.equal(h.document.activeElement,last);
  last.click();assert.equal(h.click().defaultPrevented,true);assert.deepEqual(h.requests,[]);
  h.document.querySelector(".sponsored-step-stay").click();
  assert.equal(h.document.body.style.overflow,"");h.dom.window.close();
});

test("internal, source, modified, synthetic and unsafe links keep normal navigation",()=>{
  const h=adHarness(),classify=h.window.BuySellSponsoredClicks.destinationFor;
  for(const path of ["/", "/guides/",guidePath(SHOPPING_GUIDES[0]),categoryPath(GUIDE_CATEGORIES[0]),productPath(product)]){
    h.link.href=path;h.link.rel="sponsored";h.link.setAttribute("data-sponsored-navigation","");
    assert.equal(h.click().defaultPrevented,false,path);assert.equal(h.storage.size,0,path);
  }
  h.link.removeAttribute("data-sponsored-navigation");h.link.rel="";
  h.link.href="https://rzekl.com.evil.test/";assert.equal(classify(h.link),null);
  h.link.rel="sponsored";h.link.href="javascript:alert(1)";assert.equal(classify(h.link),null);
  h.link.href="https://user:pass@www.aliexpress.com/";assert.equal(classify(h.link),null);
  h.link.href=product.affiliateUrl;
  for(const extra of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{button:1},{isTrusted:false}])assert.equal(h.click(extra).defaultPrevented,false);
  h.link.setAttribute("data-sponsored-bypass","");assert.equal(h.click().defaultPrevented,false);
  h.link.removeAttribute("data-sponsored-bypass");assert.equal(h.click().defaultPrevented,true);
  assert.equal(classify(h.document.querySelector(".sponsored-step-continue")),null);
  h.document.querySelector(".sponsored-step-stay").click();h.dom.window.close();
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
    assert.equal(image.getAttribute("width"),String(guidePreviewImage(guide).width));
    assert.match(doc.querySelector(".shopping-article-image figcaption").textContent,guidePreviewImage(guide).sourceUrl?/Seller listing/:/AI-generated/);
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
    const expectedImages=new Set([guidePreviewImage(guide).src,...guide.selection.map(c=>SHOPPING_PRODUCTS.find(p=>p.id===c.productId)?.image?.src).filter(Boolean)]);
    assert.equal(entry.getElementsByTagNameNS("http://www.google.com/schemas/sitemap-image/1.1","loc").length,expectedImages.size);
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
  assert.equal(document.querySelector(".affiliate-carousel-card .carousel-buy").getAttribute("href"),product.affiliateUrl);
  assert.equal(document.querySelector(".affiliate-carousel-card .carousel-buy").hasAttribute("data-sponsored-navigation"),true);
  document.querySelector("#current-listings-carousel").__carouselCleanup();
  dom.window.close();
});

test("the first 20 document rows preserve product IDs and resolve to their exact replacement merchant items",async()=>{
  const batch=JSON.parse(await readFile("content/affiliate-import-2026-10-15.json","utf8"));
  assert.equal(batch.products.length,20);assert.equal(batch.suppliedTrackingLinks,19);assert.equal(batch.constructedTrackingLinks,1);
  assert.equal(SHOPPING_DETAIL_PRODUCTS.length,20);
  for(const [i,row] of batch.products.entries()){
    assert.equal(row.row,i+1);
    const item=SHOPPING_PRODUCTS.find(item=>item.id===row.productId);
    const tracked=new URL(shoppingDestination(item));
    assert.equal(tracked.hostname,"rzekl.com");
    assert.equal(tracked.pathname,"/g/1e8d1144948a33a283af16525dc3e8/");
    assert.equal(new URL(tracked.searchParams.get("ulp")).pathname,"/item/"+row.merchantItemId+".html");
    assert.equal(new URL(item.merchantUrl).pathname,"/item/"+row.merchantItemId+".html");
    assert.equal(row.productPage,shoppingProductPath(item));
  }
  assert.equal(batch.products[12].source,"same-campaign-deeplink-template");
  assert.equal(product.affiliateUrl,shoppingDestination(SHOPPING_PRODUCTS.find(p=>p.id==="hp-android-listing")));
});

test("all 20 product pages expose real images, useful buying checks, correct canonical URLs and truthful schema",async()=>{
  for(const item of SHOPPING_DETAIL_PRODUCTS){
    const path=shoppingProductPath(item);
    const response=await worker.dispatchFetch(origin+path);assert.equal(response.status,200,item.id);
    const dom=new JSDOM(await response.text(),{url:origin+path}),doc=dom.window.document;
    assert.equal(doc.querySelectorAll("h1").length,1);assert.equal(doc.querySelector("h1").textContent,item.name);
    assert.equal(doc.querySelector('link[rel="canonical"]').href,origin+path);
    assert.match(doc.querySelector('meta[name="robots"]').content,/index,follow/);
    assert.equal(doc.querySelector("[data-shopping-product]").href,shoppingDestination(item));
    assert.equal(doc.querySelector(".shopping-detail-image img").src,doc.querySelector('meta[property="og:image"]').content);
    assert.match(doc.querySelector(".shopping-detail-image figcaption").textContent,/Seller listing image/);
    assert.equal(doc.querySelector('meta[property="og:image:width"]').content,String(item.image.width));
    assert.ok(doc.querySelector("#buying-details").textContent.split(/\s+/).length>350,item.id);
    assert.ok(doc.querySelectorAll(".shopping-detail-prose a[href^='/guides/']").length>=1);
    const schemas=[...doc.querySelectorAll('script[type="application/ld+json"]')].map(n=>JSON.parse(n.textContent));
    assert.ok(schemas.some(n=>n["@type"]==="Article"));assert.ok(schemas.some(n=>n["@type"]==="BreadcrumbList"));
    assert.ok(!schemas.some(n=>n.aggregateRating||n.offers||n.review));
    const image=await worker.dispatchFetch(origin+item.image.src);assert.equal(image.status,200);
    const bytes=Buffer.from(await image.arrayBuffer());assert.equal(bytes.subarray(0,4).toString(),"RIFF");assert.equal(bytes.subarray(8,12).toString(),"WEBP");
    assert.ok(bytes.length<300000);assert.equal(bytes.length,item.image.sizeBytes);
    const head=await worker.dispatchFetch(origin+path,{method:"HEAD"});assert.equal(head.status,200);assert.equal(await head.text(),"");
    const redirect=await worker.dispatchFetch(origin+path.slice(0,-1),{redirect:"manual"});assert.equal(redirect.status,301);assert.equal(redirect.headers.get("location"),origin+path);
    dom.window.close();
  }
});

test("products index, guide cards and both sitemaps expose the new product pages and original seller image assets",async()=>{
  const response=await worker.dispatchFetch(origin+"/products/");const dom=new JSDOM(await response.text());
  assert.equal(dom.window.document.querySelectorAll(".shopping-product-index .shopping-card").length,20);
  for(const item of SHOPPING_DETAIL_PRODUCTS){
    assert.ok(dom.window.document.querySelector('a[href="'+shoppingProductPath(item)+'"]'));
    const buy=dom.window.document.querySelector('[data-shopping-product="'+item.id+'"]');
    assert.equal(buy.href,shoppingDestination(item));assert.ok(buy.hasAttribute("data-sponsored-navigation"));
  }
  dom.window.close();
  const live=await worker.dispatchFetch(origin+"/sitemap.xml");
  for(const text of [await live.text(),await readFile("sitemap.xml","utf8")]){
    const xml=new JSDOM(text,{contentType:"application/xml"});
    for(const item of SHOPPING_DETAIL_PRODUCTS){
      const entry=[...xml.window.document.querySelectorAll("url")].find(n=>n.querySelector("loc")?.textContent===origin+shoppingProductPath(item));
      assert.ok(entry,item.id);
      assert.equal(entry.getElementsByTagNameNS("http://www.google.com/schemas/sitemap-image/1.1","loc")[0].textContent,origin+item.image.src);
    }
    xml.window.close();
  }
  const home=await worker.dispatchFetch(origin+"/");const homeDoc=new JSDOM(await home.text()).window.document;
  assert.equal(homeDoc.querySelector('meta[name="google-adsense-account"]').content,"ca-pub-4485257027995607");
  assert.equal(homeDoc.querySelector('meta[name="admaven-placement"]').content,"BpdU5rTkH");
  assert.equal(homeDoc.querySelector('meta[name="mitgo-verification"]').content,"ed877f45-041a-44ad-b458-4f1265704c13");
});
