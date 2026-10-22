import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {JSDOM} from "jsdom";
import {
  selectCategoryDiscounts,renderDailyDiscountShelf,renderHomeGlobalDeals,renderDailyPulse,
  loadVerifiedCoupons,renderVerifiedCouponPanel
} from "../lib/home-verified-deals.js";

const original={
  id:"123",title:"Wireless travel adapter",discount:42,
  price:29,originalPrice:50,currency:"USD",
  image:"/flash-media/items/verified123.webp",
  destination:"https://rzekl.com/discounted-adapter",
  saleEnd:"2026-12-31T12:00:00Z"
};
const first={name:"Travel",slug:"travel",offers:[original,{...original,id:"124",title:"Additional adapter",discount:50}]};
const second={name:"Home",slug:"home",offers:[{...original,id:"125",title:"Kitchen accessory",discount:38}]};

test("category-inclusive deals use only real cached photos, USD and source-backed >=20% offers",()=>{
 const fake={
   name:"Unverified",slug:"unverified",
   offers:[
    {...original,id:"bad1",currency:"LKR"},
    {...original,id:"bad2",discount:10},
    {...original,id:"bad3",image:"https://external.example/photo.jpg"},
    {...original,id:"bad4",saleEnd:"2026-01-01T00:00:00Z"},
    {...original,id:"bad5",originalPrice:0}
   ]
 };
 const rows=selectCategoryDiscounts([first,second,fake],3,Date.parse("2026-10-22T00:00:00Z"));
 assert.equal(rows.length,3);
 assert.equal(new Set(rows.map(p=>p.groupSlug)).size,2);
 assert.ok(rows.every(p=>p.currency==="USD" && p.discount>=20 && p.image.startsWith("/flash-media/items/")));
 assert.equal(rows[0].discount,50);
});
test("rendered homepage sections are mobile-friendly, marked as sponsored and keep genuine expiry only",()=>{
 const group=[first,second];
 const shelf=new JSDOM(renderDailyDiscountShelf(group)).window.document;
 assert.equal(shelf.querySelectorAll(".flash-daily-tile").length,3);
 assert.equal(shelf.querySelectorAll(".flash-categories a").length,2);
 assert.ok([...shelf.querySelectorAll(".flash-price strong")].every(e=>e.textContent.startsWith("$")));
 assert.ok([...shelf.querySelectorAll(".flash-shop")].every(e=>e.hasAttribute("data-sponsored-navigation")));
 assert.equal(shelf.querySelectorAll("time[datetime]").length,3);
 assert.ok(renderHomeGlobalDeals(group).includes("data-curated-products"));
 assert.ok(renderDailyPulse(group).includes("DAILY GLOBAL DEALS"));
 assert.equal(renderHomeGlobalDeals([]),null);
 assert.equal(renderDailyDiscountShelf([]),"");
 assert.equal(renderDailyPulse([]),"");
 const noEnd=renderHomeGlobalDeals([{...first,offers:[{...original,saleEnd:null}]}]);
 assert.doesNotMatch(noEnd,/Offer ends/);
});
test("coupon panels never create a fabricated coupon and preserve source/truthfulness",()=>{
 const empty=new JSDOM(renderVerifiedCouponPanel([])).window.document;
 assert.equal(empty.querySelectorAll(".flash-coupon-card").length,0);
 assert.match(empty.body.textContent,/never invent coupon codes/i);
 const example={store:"eBay",title:"Official test coupon",code:"EXAMPLE10",
   url:"https://www.ebay.com/offer",expiresAt:"2026-12-15T00:00:00Z",
   terms:"Subject to eligibility"};
 const page=new JSDOM(renderVerifiedCouponPanel([example])).window.document;
 assert.equal(page.querySelector(".flash-coupon-code code").textContent,"EXAMPLE10");
 assert.equal(page.querySelector(".flash-coupon-card time").getAttribute("datetime"),example.expiresAt);
 assert.ok(page.querySelector(".flash-coupon-card a").getAttribute("rel").includes("sponsored"));
});
test("recent official promo records only; dangerous destinations and expired rows are rejected",async()=>{
 const inputs=[
   {store:"eBay",title:"Valid verified offer",code:"HELLO",url:"https://www.ebay.com/offers",
     expires_at:"2026-12-01T00:00:00Z",verified_at:"2026-10-22T00:00:00Z"},
   {store:"Unknown",title:"Phishing",code:"FAKE",url:"https://evil.example/offer",
     expires_at:"2026-12-01T00:00:00Z",verified_at:"2026-10-22T00:00:00Z"}
 ];
 let statement="";
 const env={DB:{prepare(sql){statement=sql;return {bind(){return {all:async()=>({results:inputs})};}};}}};
 const result=await loadVerifiedCoupons(env,{now:new Date("2026-10-22T00:00:00Z")});
 assert.equal(result.length,1);
 assert.equal(result[0].code,"HELLO");
 assert.match(statement,/datetime\(verified_at\)/);
 assert.deepEqual(await loadVerifiedCoupons({}),[]);
});
test("daily schedule never silently re-enables hourly product importing or changes Adsterra popup",async()=>{
 const wrangler=await readFile("wrangler.toml","utf8");
 const worker=await readFile("worker.js","utf8");
 const popup=await readFile("js/sponsored-click.js","utf8");
 assert.ok(wrangler.includes('"15 1 * * *"'));
 assert.ok(worker.includes("event.cron === '15 1 * * *'"));
 assert.ok(worker.includes("event.cron === '0 * * * *'"));
 assert.doesNotMatch(worker,/event\.cron === '0 \* \* \* \*'\) ctx\.waitUntil\(syncFlashSale/);
 assert.ok(popup.includes("data-sponsored-navigation"));
 assert.ok(worker.includes("renderVerifiedCouponPanel"));
 assert.ok(worker.includes("renderDailyDiscountShelf"));
});
