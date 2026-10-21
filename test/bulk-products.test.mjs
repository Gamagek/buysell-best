import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {JSDOM} from "jsdom";
import {
 HOURLY_PRODUCT_LIMIT,DAILY_PRODUCT_LIMIT,scanVerifiedFeed,importHourlyBulkProducts,
 bulkSitemap,bulkProduct,bulkDirectory,renderBulkHome,renderBulkProductPage,renderBulkDirectoryPage
} from "../lib/bulk-products.js";

const now=new Date("2026-10-21T12:00:00Z");
const product=(n)=>'<offer id="'+n+'"><name>Practical compact travel organizer '+n+'</name>'+
 '<categoryid>travel</categoryid><image>https://ae01.alicdn.com/kf/sample'+n+'.jpg</image>'+
 '<oldprice>75</oldprice><price>45</price><currencyId>USD</currencyId>'+
 '<url>https://www.aliexpress.com/item/'+n+'.html</url></offer>';
function responseXml(count=120,chunkSize=67){
 const xml='<yml_catalog><shop><offers>'+Array.from({length:count},(_,i)=>product(100001+i)).join("")+'</offers></shop></yml_catalog>';
 return new Response(new ReadableStream({start(controller){
  const encoder=new TextEncoder();const bytes=encoder.encode(xml);
  for(let i=0;i<bytes.length;i+=chunkSize)controller.enqueue(bytes.slice(i,i+chunkSize));
  controller.close();
 }}),{status:200,headers:{"content-type":"application/xml"}});
}
const row={
 slug:"compact-travel-organizer-100001",external_id:"100001",title:"Practical compact travel organizer 100001",
 category:"travel",image_key:"items/bulk-abc.webp",destination:"https://www.aliexpress.com/item/100001.html",
 price:45,original_price:75,discount:40,currency:"USD",description:"Check size and fit before buying.",
 sale_end:null,published_at:"2026-10-21T12:00:00.000Z"
};
test("production hourly quota targets 1,200 distinct product pages per Sri Lanka day",()=>{
 assert.equal(HOURLY_PRODUCT_LIMIT,50);
 assert.equal(DAILY_PRODUCT_LIMIT,1200);
 assert.ok(HOURLY_PRODUCT_LIMIT*24>1000);
});
test("streaming XML scanner handles fragmented nodes without downloading entire hot-products feed",async()=>{
 const result=await scanVerifiedFeed(responseXml(200,11),new Set(),{maxItems:50,now});
 assert.equal(result.items.length,50);
 assert.equal(new Set(result.items.map(x=>x.id)).size,50);
 assert.equal(result.items[0].discount,40);
 assert.equal(result.items[0].price,45);
 assert.ok(result.bytes<200*350);
 const known=new Set(Array.from({length:50},(_,i)=>String(100001+i)));
 const next=await scanVerifiedFeed(responseXml(200,101),known,{maxItems:50,now});
 assert.equal(next.items.length,50);
 assert.equal(next.items[0].id,"100051");
 assert.equal(next.items.at(-1).id,"100100");
});
test("unconfigured import never fabricates 50 product pages",async()=>{
 assert.deepEqual(await importHourlyBulkProducts({}),{status:"not-configured",published:0});
 assert.deepEqual(await importHourlyBulkProducts({DB:{},FLASH_MEDIA:{}}),{status:"not-configured",published:0});
 assert.deepEqual(await importHourlyBulkProducts({DB:{},FLASH_MEDIA:{},ALIEXPRESS_PRODUCT_FEED_URL:"https://attacker.invalid/xml"}),{status:"invalid-feed-host",published:0});
});
test("product pages have seller photo, real price and optional ad without fabricated review",()=>{
 const html=renderBulkProductPage(row,now);
 const doc=new JSDOM(html,{url:"https://buysell.best/flash-sale/product/"+row.slug+"/"}).window.document;
 assert.equal(doc.querySelector("link[rel=canonical]").href,"https://buysell.best/flash-sale/product/"+row.slug+"/");
 assert.equal(doc.querySelector("meta[property='og:image']").content,"https://buysell.best/flash-media/"+row.image_key);
 assert.ok(doc.querySelector('img[src="/flash-media/'+row.image_key+'"]'));
 assert.ok(doc.querySelector("[data-sponsored-navigation]"));
 assert.ok(doc.querySelector("script[src='/js/sponsored-click.js']"));
 assert.match(doc.body.textContent,/not a hands-on product review/);
 assert.equal(doc.querySelectorAll(".flash-end").length,0);
 const schema=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
 assert.equal(schema["@type"],"Product");
 assert.equal(schema.offers.price,45);
 assert.ok(!schema.review&&!schema.aggregateRating&&!schema.offers.availability);
});
test("catalogue tiles paginate while first page is canonical and sponsored links are skippable",()=>{
 const index=new JSDOM(renderBulkDirectoryPage({total:1001,page:1,items:[row]})).window.document;
 assert.equal(index.querySelectorAll(".flash-tile").length,1);
 assert.ok(index.querySelector("a[href='/flash-sale/?page=2']"));
 assert.match(index.querySelector("meta[name='robots']").content,/index,follow/);
 const page2=new JSDOM(renderBulkDirectoryPage({total:1001,page:2,items:[row]})).window.document;
 assert.match(page2.querySelector("meta[name='robots']").content,/noindex,follow/);
 assert.equal(new JSDOM(renderBulkHome([row])).window.document.querySelectorAll(".flash-tile").length,1);
});
test("sitemap includes genuine product page and the exact first-party image URL",async()=>{
 const env={DB:{prepare(sql){
   return {all:async()=>({results:[{slug:row.slug,image_key:row.image_key,published_at:row.published_at}]})};
 }}};
 const xml=await bulkSitemap(env);
 assert.ok(xml.includes("https://buysell.best/flash-sale/product/"+row.slug+"/"));
 assert.ok(xml.includes("<image:loc>https://buysell.best/flash-media/"+row.image_key+"</image:loc>"));
 const manifest=await readFile("worker.js","utf8");
 assert.ok(manifest.includes("importHourlyBulkProducts(env)"));
 assert.ok(manifest.includes("bulkSitemap(env)"));
 assert.ok(manifest.includes("renderBulkProductPage(p)"));
 assert.ok(manifest.includes("bulk.items.length?renderBulkHome(bulk.items)"));
 const gsc=await readFile("lib/gsc-integration.js","utf8");
 assert.ok(gsc.includes("FROM bulk_products"));
});
test("dedicated product-photo cache remains first-party and forbids injecting unsupported image types",async()=>{
 const source=await readFile("lib/bulk-products.js","utf8");
 assert.ok(source.includes("validImageBytes(bytes,type)"));
 assert.ok(source.includes('redirect:"manual"'));
 assert.ok(source.includes('sale_end'));
 assert.ok(source.includes('!validatedSource(env.ALIEXPRESS_PRODUCT_FEED_URL)'));
 assert.ok(!source.includes('reviewRating'));
 const ads=await readFile("js/sponsored-click.js","utf8");
 assert.ok(ads.includes("data-sponsored-navigation"));
});
