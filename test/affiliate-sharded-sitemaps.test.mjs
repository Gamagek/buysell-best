import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {JSDOM} from "jsdom";
import {
 affiliateIndexedProducts,affiliateShardCount,renderAffiliateShard,renderPublicSitemapIndex
} from "../lib/affiliate-sitemaps.js";
const now=new Date("2026-10-24T00:00:00Z");
const row=i=>({
 id:"feed-"+i,title:"Sourced travel gadget "+i,price:12,originalPrice:30,
 discount:60,currency:"USD",description:"Actual original seller description",
 image:"/flash-media/items/bulk-photo"+i+".webp",
 destination:"https://rzekl.com/shop/"+i
});
const group=records=>[{name:"Travel & Accessories",slug:"travel-accessories",offers:records}];
function xmlDoc(text){return new JSDOM(text,{contentType:"application/xml"}).window.document;}
test("separate canonical product and R2 photo sitemaps contain identical page associations",()=>{
 const actual=group([row(1),row(2)]);
 const product=renderAffiliateShard(actual,{kind:"products",now});
 const image=renderAffiliateShard(actual,{kind:"images",now});
 for(const x of [product,image])assert.ok(!xmlDoc(x).querySelector("parsererror"));
 assert.equal(xmlDoc(product).querySelectorAll("url").length,2);
 assert.equal(xmlDoc(image).querySelectorAll("url").length,2);
 const productPages=[...xmlDoc(product).querySelectorAll("url > loc")].map(x=>x.textContent);
 const imagePages=[...xmlDoc(image).querySelectorAll("url > loc")].map(x=>x.textContent);
 assert.deepEqual(productPages,imagePages);
 assert.ok(image.includes("<image:loc>https://buysell.best/flash-media/items/bulk-photo1.webp</image:loc>"));
 assert.ok(productPages.every(x=>x.startsWith("https://buysell.best/flash-sale/product/")));
});
test("10,000 verified page references split into 10 shards of 1,000 instead of one giant response",()=>{
 const tenThousand=group(Array.from({length:10000},(_,i)=>row(i+1)));
 assert.equal(affiliateShardCount(tenThousand,now),10);
 const index=renderPublicSitemapIndex(tenThousand,{now});
 assert.equal(xmlDoc(index).querySelectorAll("sitemap").length,22);
 assert.ok(index.includes("/sitemaps/affiliate-products-10.xml"));
 assert.ok(index.includes("/sitemaps/affiliate-images-10.xml"));
 const first=renderAffiliateShard(tenThousand,{kind:"products",page:1,now});
 const last=renderAffiliateShard(tenThousand,{kind:"images",page:10,now});
 assert.equal(xmlDoc(first).querySelectorAll("url").length,1000);
 assert.equal(xmlDoc(last).querySelectorAll("url").length,1000);
 assert.ok(!xmlDoc(last).querySelector("parsererror"));
 assert.equal(renderAffiliateShard(tenThousand,{kind:"products",page:11,now}),null);
});
test("only actual indexed source-backed products with valid first-party cached images appear",()=>{
 const a=row(1);
 const groups=group([a,{...row(2),discount:10},{...row(3),currency:"LKR"},
 {...row(4),price:0},{...row(5),image:"https://other.example/photo.jpg"},
 {...row(6),image:"/assets/missing.svg"},{...row(7),saleEnd:"2026-01-01T00:00:00Z"},a]);
 assert.equal(affiliateIndexedProducts(groups,now).length,1);
 assert.equal(affiliateShardCount([],now),0);
 assert.equal(renderAffiliateShard([],{now}),null);
 const index=renderPublicSitemapIndex([],{now});
 assert.ok(!index.includes("affiliate-products-1.xml"));
 assert.ok(index.includes("https://buysell.best/sitemap.xml"));
 assert.ok(index.includes("https://buysell.best/image-sitemap.xml"));
 assert.equal(xmlDoc(index).querySelectorAll("sitemap").length,2);
});
test("untrusted sitemap shard input and invalid pages do not publish fake URLs",()=>{
 const groups=group([row(1)]);
 for(const n of [0,-1,1.25,1000])assert.equal(renderAffiliateShard(groups,{page:n,now}),null);
 assert.equal(renderAffiliateShard(groups,{kind:"nonexistent",now}),null);
 assert.equal(renderAffiliateShard(groups,{kind:"images",page:1,shardSize:1001,now}),null);
});
test("robots advertises new sitemap index while original editorial image sitemap remains discoverable",async()=>{
 const robots=await readFile("robots.txt","utf8");
 const cfg=await readFile("wrangler.toml","utf8");
 const worker=await readFile("worker.js","utf8");
 assert.match(robots,/Sitemap: https:\/\/buysell\.best\/sitemap-index\.xml/);
 assert.match(robots,/Sitemap: https:\/\/buysell\.best\/image-sitemap\.xml/);
 assert.match(cfg,/\/sitemaps\/\*/);
 assert.match(worker,/renderPublicSitemapIndex/);
 assert.match(worker,/renderAffiliateShard/);
});
