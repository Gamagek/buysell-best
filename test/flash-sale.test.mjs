import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {JSDOM} from "jsdom";
import {parseFeed,normalizeOffer,chooseOffers,renderFlashHome,renderFlashPage,flashSaleSitemap,syncFlashSale,serveFlashMedia} from "../lib/flash-sale.js";

const now=new Date("2026-10-21T00:00:00.000Z");
const basic={offer_id:"12345678",name:"Wireless keyboard with a compact carrying case",category_name:"Gaming keyboards",price:"25.00",oldprice:"50.00",currencyId:"USD",picture:"https://ae01.alicdn.com/kf/test.jpg",url:"https://www.aliexpress.com/item/12345678.html",description:"Portable gaming keyboard with a compact layout"};
test("approved discounts are calculated from feed data without making up prices or sale times",()=>{
 const p=normalizeOffer(basic,now);
 assert.equal(p.discount,50);assert.equal(p.price,25);assert.equal(p.originalPrice,50);
 assert.equal(p.saleEnd,null);assert.equal(p.source,"Approved AliExpress affiliate product feed");
 assert.equal(normalizeOffer({...basic,oldprice:"24"},now),null);
 assert.equal(normalizeOffer({...basic,oldprice:"100"},now)?.discount,75);
 assert.equal(normalizeOffer({...basic,oldprice:"800"},now),null);
 assert.equal(normalizeOffer({...basic,oldprice:"28"},now),null);
 assert.equal(normalizeOffer({...basic,picture:"https://evil.example/photo.jpg"},now),null);
 assert.equal(normalizeOffer({...basic,url:"http://www.aliexpress.com/item/12345678.html"},now),null);
 assert.equal(normalizeOffer({...basic,name:"THC vape accessory"},now),null);
 assert.equal(normalizeOffer({...basic,end_date:"2020-01-01T00:00:00Z"},now),null);
 assert.equal(normalizeOffer({...basic,price_discount:"20",oldprice:"50",discount_percent:"20"},now),null);
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
 assert.equal(flashSaleSitemap([]),"");
});

test("R2 image endpoint requires a valid cached key and returns safe content type",async()=>{
 const env={FLASH_MEDIA:{get:async key=>key==="items/123.jpg"?{body:new Uint8Array([1,2,3]),httpMetadata:{contentType:"image/jpeg"}}:null}};
 const good=await serveFlashMedia(new Request("https://buysell.best/flash-media/items/123.jpg"),env,"items/123.jpg");
 assert.equal(good.status,200);
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
 assert.ok(w.includes('bulk.items.length?renderBulkHome(bulk.items):renderFlashHome(flash)'));
 assert.ok(w.includes('event.cron === \'0 * * * *\') ctx.waitUntil(importHourlyBulkProducts'));
 assert.ok(w.includes('event.cron === \'0 */6 * * *\') ctx.waitUntil(syncPromos'));
 assert.ok(w.includes('flashSaleSitemap(flashSale)'));
 assert.ok(wr.includes('binding = "FLASH_MEDIA"'));
 assert.ok(ads.includes("data-sponsored-navigation"));
 assert.ok(ads.includes("Continue to "));
 const adm=await readFile("lib/display-ads.js","utf8");
 assert.ok(adm.includes("DISPLAY_AD_UNITS"));
});
