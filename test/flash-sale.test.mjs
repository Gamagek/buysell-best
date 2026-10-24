import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {JSDOM} from "jsdom";
import {parseFeed,normalizeOffer,chooseOffers,renderFlashHome,renderFlashPage,flashSaleSitemap,syncFlashSale,serveFlashMedia,flashProductPath,findFlashProduct,renderFlashProductPage} from "../lib/flash-sale.js";

const now=new Date("2026-10-21T00:00:00.000Z");
const basic={offer_id:"12345678",name:"Wireless keyboard with a compact carrying case",category_name:"Gaming keyboards",price:"25.00",oldprice:"50.00",currencyId:"USD",picture:"https://ae01.alicdn.com/kf/test.jpg",url:"https://www.aliexpress.com/item/12345678.html",description:"Portable gaming keyboard with a compact layout"};
test("approved discounts are calculated from feed data without making up prices or sale times",()=>{
 const p=normalizeOffer(basic,now);
 assert.equal(p.discount,50);assert.equal(p.price,25);assert.equal(p.originalPrice,50);
 assert.equal(p.saleEnd,null);assert.equal(p.source,"Approved AliExpress affiliate product feed");
 assert.equal(normalizeOffer({...basic,oldprice:"24"},now),null);
 assert.equal(normalizeOffer({...basic,oldprice:"30"},now),null,"discounts below 20% rejected");
 assert.equal(normalizeOffer({...basic,currencyId:"LKR"},now),null,"no LKR in affiliate feed deals");
 assert.equal(normalizeOffer({...basic,currencyId:"EUR"},now),null);
 assert.equal(normalizeOffer({...basic,oldprice:""},now),null,"original source price required");
 assert.equal(normalizeOffer({...basic,discount_percent:"20"},now),null,"mismatched source discount rejected");
 assert.equal(normalizeOffer({...basic,oldprice:"100"},now).discount,75);
 assert.equal(normalizeOffer({...basic,picture:"https://evil.example/photo.jpg"},now),null);
 assert.equal(normalizeOffer({...basic,url:"http://www.aliexpress.com/item/12345678.html"},now),null);
 assert.equal(normalizeOffer({...basic,name:"THC vape accessory"},now),null);
 assert.equal(normalizeOffer({...basic,end_date:"2020-01-01T00:00:00Z"},now),null);
 assert.equal(normalizeOffer({...basic,price_discount:"20",oldprice:"50",discount_percent:"60"},now).discount,60);
 const withEnd=normalizeOffer({...basic,end_date:"2026-10-22T00:00:00Z"},now);
 assert.equal(withEnd.saleEnd,"2026-10-22T00:00:00.000Z");
});

test("JSON, Admitad CSV and product-feed XML map to the same verified offer",()=>{
 const csv="offer_id,name,category_name,price,oldprice,currencyId,picture,url\n"+
 "12345678,Wireless keyboard with a compact carrying case,Gaming keyboards,25,50,USD,https://ae01.alicdn.com/kf/test.jpg,https://www.aliexpress.com/item/12345678.html\n";
 const xml='<yml_catalog><shop><offers><offer id="12345678"><name>Wireless keyboard with a compact carrying case</name><category_name>Gaming keyboards</category_name><price>25</price><oldprice>50</oldprice><currencyId>USD</currencyId><picture>https://ae01.alicdn.com/kf/test.jpg</picture><url>https://www.aliexpress.com/item/12345678.html</url></offer></offers></shop></yml_catalog>';
 const j=JSON.stringify({products:[basic]});
 for(const rows of [parseFeed(csv),parseFeed(xml),parseFeed(j)]){
  assert.equal(rows.length,1);
  const offer=normalizeOffer(rows[0],now);
  assert.ok(offer);assert.equal(offer.price,25);assert.equal(offer.discount,50);
 }
});

test("category ranks cap at 10 per category; never fill to 1000 with fictional products",()=>{
 const many=Array.from({length:43},(_,i)=>({...basic,offer_id:""+(10000+i),name:"Keyboard "+i,category_name:"Keyboards category "+(i%3)}));
 const groups=chooseOffers(many,now);
 assert.equal(groups.length,3);
 assert.ok(groups.every(g=>g.offers.length<=10));
 assert.equal(groups.reduce((n,g)=>n+g.offers.length,0),30);
 assert.equal(chooseOffers([],now).length,0);
 assert.equal(new Set(groups.map(g=>g.slug)).size,3);
});

test("homepage tile adverts appear only with verified cached images, with honest disclosure and existing sponsored popups",()=>{
 const p={...normalizeOffer(basic,now),image:"/flash-media/items/image.jpg"};
 const groups=[{name:"Gaming keyboards",slug:p.slug,offers:[p],modifiedAt:now.toISOString()}];
 const doc=new JSDOM(renderFlashHome(groups)).window.document;
 const links=[...doc.querySelectorAll("a[data-sponsored-navigation]")];
 assert.equal(links.length,1);
 assert.equal(links[0].href,p.destination);
 assert.ok(links[0].getAttribute("rel").includes("sponsored"));
 assert.match(doc.querySelector(".flash-notice").textContent,/optional ad can be skipped immediately/);
 assert.equal(doc.querySelectorAll(".flash-discount").length,1);
 assert.ok(doc.querySelector(".flash-tile img").getAttribute("src").startsWith("/flash-media/items/"));
 assert.equal(doc.querySelectorAll(".flash-end").length,0);
 const unavailable=new JSDOM(renderFlashHome([])).window.document;
 assert.equal(unavailable.querySelectorAll(".flash-discount").length,0);
 assert.equal(unavailable.querySelectorAll(".flash-research-tile").length,24);
 assert.match(unavailable.body.textContent,/not verified flash-sale offers/);
 const hub=new JSDOM(renderFlashPage(groups)).window.document;
 assert.equal(hub.querySelectorAll(".flash-tile").length,1);
 assert.ok(flashSaleSitemap(groups).includes("<image:loc>https://buysell.best/flash-media/items/image.jpg</image:loc>"));
 assert.equal((flashSaleSitemap(groups).match(/<loc>https:\/\/buysell\.best\/flash-sale\/<\/loc>/g)||[]).length,1,"live catalogue hub must be indexed exactly once");
 assert.equal(flashSaleSitemap([]),"");
});

test("R2 image endpoint requires a valid cached key and returns safe content type",async()=>{
 const env={FLASH_MEDIA:{get:async key=>["items/123.jpg","items/bulk-123.jpg"].includes(key)?{body:new Uint8Array([1,2,3]),httpMetadata:{contentType:"image/jpeg"}}:null}};
 const good=await serveFlashMedia(new Request("https://buysell.best/flash-media/items/123.jpg"),env,"items/123.jpg");
 assert.equal(good.status,200);
 assert.equal((await serveFlashMedia(new Request("https://buysell.best/flash-media/items/bulk-123.jpg"),env,"items/bulk-123.jpg")).status,200,"bulk importer images must be crawlable");
 assert.equal(good.headers.get("content-type"),"image/jpeg");
 assert.equal((await good.arrayBuffer()).byteLength,3);
 assert.equal((await serveFlashMedia(new Request("https://buysell.best/flash-media/../secret"),env,"../secret")).status,404);
 assert.equal((await serveFlashMedia(new Request("https://buysell.best/flash-media/items/123.svg"),env,"items/123.svg")).status,404);
});

test("scheduled sync never invents products or calls external services without verified credentials",async()=>{
 assert.deepEqual(await syncFlashSale({}),{status:"db-unavailable"});
 assert.deepEqual(await syncFlashSale({DB:{}}),{status:"feed-not-configured"});
});

test("Worker appends catalogue at bottom of main and retains existing Adsterra popup and six-hour cron",async()=>{
 const w=await readFile("worker.js","utf8"),wr=await readFile("wrangler.toml","utf8");
 const ads=await readFile("js/sponsored-click.js","utf8");
 assert.ok(w.includes('element.append(bulk.items.length?renderBulkHome(bulk.items):renderFlashHome(flash),{html:true})'));
 assert.ok(!w.includes("event.cron === \'0 * * * *\') ctx.waitUntil(syncFlashSale"),"hourly product sync remains paused");
 assert.ok(w.includes("new Date(event.scheduledTime).getUTCHours() === 0"),"daily refresh uses existing six-hour cron");
 assert.ok(w.includes('event.cron === \'0 */6 * * *\') ctx.waitUntil(syncPromos'));
 assert.ok(w.includes('flashSaleSitemap(flashSale)'));
 assert.ok(wr.includes('binding = "FLASH_MEDIA"'));
 assert.ok(ads.includes("data-sponsored-navigation"));
 assert.ok(ads.includes("Continue to "));
 const adm=await readFile("lib/display-ads.js","utf8");
 assert.ok(adm.includes("DISPLAY_AD_UNITS"));
});


test("each verified cached offer receives a canonical crawlable product page and matching image sitemap",()=>{
 const p={...normalizeOffer(basic,now),image:"/flash-media/items/verifiedproduct.webp"};
 const group={name:"Gaming keyboards",slug:p.slug,modifiedAt:"2026-10-21T00:00:00Z",offers:[p]};
 const productUrl="https://buysell.best"+flashProductPath(p);
 const found=findFlashProduct([group],flashProductPath(p).split("/")[3]);
 assert.ok(found);
 assert.equal(found.product.id,p.id);
 assert.equal(findFlashProduct([group],"not-real"),null);
 const doc=new JSDOM(renderFlashProductPage(p,group)).window.document;
 assert.equal(doc.querySelector("link[rel=canonical]").href,productUrl);
 assert.ok(doc.querySelector('meta[name="robots"]').content.includes("index"));
 assert.equal(doc.querySelector("img").getAttribute("src"),p.image);
 assert.ok(doc.querySelector(".flash-shop").getAttribute("rel").includes("sponsored"));
 const ld=[...doc.querySelectorAll('script[type="application/ld+json"]')].map(x=>JSON.parse(x.textContent));
 const schema=ld.find(x=>x["@type"]==="Product");
 assert.equal(schema.offers.priceCurrency,"USD");
 assert.equal(schema.offers.price,p.price);
 assert.equal(schema.offers.url,p.destination);
 assert.ok(!("aggregateRating" in schema));
 assert.ok(!("availability" in schema.offers));
 assert.ok(ld.some(x=>x["@type"]==="BreadcrumbList"));
 const sitemap=flashSaleSitemap([group]);
 const entry=[...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(x=>x[1]).find(x=>x.includes("<loc>"+productUrl+"</loc>"));
 assert.ok(entry,"product detail must be in canonical sitemap");
 assert.ok(entry.includes("<image:loc>https://buysell.best"+p.image+"</image:loc>"));
 const rendered=renderFlashPage([group]);
 assert.ok(rendered.includes(flashProductPath(p)),"category product tiles must link to detail");
 const expired={...p,saleEnd:"2026-01-01T00:00:00Z"};
 assert.equal(normalizeOffer({...basic,end_date:expired.saleEnd},now),null);
});

test("pagination canonical is self-referential and impossible pages are 404 candidates",()=>{
 const p={...normalizeOffer(basic,now),image:"/flash-media/items/verifiedproduct.webp"};
 const group={name:"Gaming keyboards",slug:p.slug,offers:Array.from({length:65},(_,i)=>({...p,id:""+i,title:"Product "+i}))};
 const second=new JSDOM(renderFlashPage([group],null,2)).window.document;
 assert.equal(second.querySelector("link[rel=canonical]").href,"https://buysell.best/flash-sale/?page=2");
 assert.match(second.querySelector('meta[name="robots"]').content,/index,follow/);
 assert.equal(renderFlashPage([group],null,3),null);
 assert.equal(renderFlashPage([group],null,-1),null);
});
