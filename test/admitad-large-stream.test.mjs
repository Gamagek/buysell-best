import test from "node:test";
import assert from "node:assert/strict";
import {gzipSync} from "node:zlib";
import {ReadableStream as NativeStream} from "node:stream/web";
import {streamVerifiedDeals} from "../lib/admitad-stream.js";
import {parseFeed,normalizeOffer,fetchApprovedFeed} from "../lib/flash-sale.js";

const now=new Date("2026-10-24T00:00:00Z");
const head="offer_id,name,category_name,price,oldprice,currencyId,picture,url";
const cols=[
 "Valid photo", "Sports", "15", "60", "USD",
 "https://ae01.alicdn.com/kf/realitem.jpg",
 "https://www.aliexpress.com/item/123.html"
];
const item=(id,price="15",category="Sports",old="60")=>[id,cols[0],category,price,old,...cols.slice(4)].join(",");
const opts={parseFeed,normalizeOffer,now,categories:10,perCategory:3};
const reader=(parts)=>new Response(new ReadableStream({start(controller){for(const p of parts)controller.enqueue(typeof p==="string"?new TextEncoder().encode(p):p);controller.close();}}));

test("genuine USD deals are streamed and ranked across categories, not all held in memory",async()=>{
 const res=reader([head+"\n"+item("A")+"\n"+item("B","30","Sports")+"\n"+item("C","12","Home")+"\n"+item("D","40","Sports")+"\n"]);
 const result=await streamVerifiedDeals(res,opts);
 assert.equal(result.format,"csv");
 assert.equal(result.scanned,4);
 assert.equal(result.groups.length,2);
 const sports=result.groups.find(x=>x.name==="Sports");
 assert.ok(sports);
 assert.deepEqual(sports.offers.map(x=>x.id),["A","B","D"]);
 assert.ok(result.groups.every(g=>g.offers.every(p=>p.currency==="USD"&&p.discount>=20)));
});
test("CSV multiline quoted descriptions across chunks are parsed as one source record",async()=>{
 const headers="offer_id,name,description,category_name,price,oldprice,currencyId,picture,url\n";
 const parts=[
  headers+'a1,Travel adapter,"Fits multiple \n',
  'socket types",Travel,12,40,USD,https://ae01.alicdn.com/kf/test.jpg,',
  'https://www.aliexpress.com/item/adapter.html\n'
 ];
 const r=await streamVerifiedDeals(reader(parts),opts);
 assert.equal(r.scanned,1);
 assert.equal(r.groups[0].offers[0].description,"Fits multiple socket types");
});
test("XML offer records can cross data chunks without loading whole export",async()=>{
 const start='<yml_catalog><shop><offers>',end='</offers></shop></yml_catalog>';
 const p='<offer id="x1"><name>Travel adapter</name><category_name>Travel</category_name>'+
 '<price>10</price><oldprice>30</oldprice><currencyId>USD</currencyId>'+
 '<picture>https://ae01.alicdn.com/kf/test.jpg</picture>'+
 '<url>https://www.aliexpress.com/item/adapter.html</url></offer>';
 const r=await streamVerifiedDeals(reader([start+p.slice(0,40),p.slice(40)+end]),opts);
 assert.equal(r.format,"xml");
 assert.equal(r.scanned,1);
 assert.equal(r.groups[0].offers[0].id,"x1");
});
test("compressed gzip source exports decompress incrementally before matching offers",async()=>{
 const csv=head+"\n"+item("z1")+"\n";
 const zipped=gzipSync(csv);
 const r=await streamVerifiedDeals(reader([zipped]),opts);
 assert.equal(r.groups[0].offers[0].id,"z1");
});
test("large Content-Length is no longer rejected before streaming, while true excessive size is blocked",async()=>{
 const medium=await fetchApprovedFeed("https://export.admitad.com/feed.csv",async()=>new Response(head+"\n"+item("large"),{
  status:200,headers:{"content-length":"30000000"}}));
 const r=await streamVerifiedDeals(medium,opts);
 assert.equal(r.groups.length,1);
 await assert.rejects(fetchApprovedFeed("https://export.admitad.com/feed.csv",async()=>new Response(head,{
  status:200,headers:{"content-length":"2000000001"}})),{message:"FLASH_FEED_RAW_TOO_LARGE"});
});
test("batches stop at a finite record count and never publish silently truncated datasets",async()=>{
 const r=reader([head+"\n"+item("a")+"\n"+item("b")+"\n"]);
 await assert.rejects(streamVerifiedDeals(r,{...opts,maxRecords:1}),{message:"FLASH_FEED_RECORD_LIMIT"});
});
test("oversized single records are rejected; API login HTML and unsupported huge JSON never become products",async()=>{
 const oversized=reader([head+"\n"+"X".repeat(257000)+"\n"]);
 await assert.rejects(streamVerifiedDeals(oversized,opts),{message:"FLASH_FEED_ROW_TOO_LONG"});
 await assert.rejects(streamVerifiedDeals(reader(["<html><body>login required</body></html>"]),opts),
  {message:"FLASH_FEED_LOGIN_OR_HTML"});
 const bigJson=reader(["["+" ".repeat(25000001)]);
 await assert.rejects(streamVerifiedDeals(bigJson,opts),{message:"FLASH_FEED_JSON_TOO_LARGE"});
});
test("feed prioritizes actual eligible products and not non-USD or false markdowns",async()=>{
 const source=[head,item("usd"),item("fake","25","Home","24"),item("discount10","20","Office","21")].join("\n");
 const r=await streamVerifiedDeals(reader([source]),opts);
 assert.equal(r.groups.length,1);
 assert.equal(r.groups[0].offers[0].id,"usd");
});
test("streaming reader consumes a simulated >25MB XML export without buffering all metadata",async()=>{
 const comment="<!--"+"x".repeat(250000)+"-->";
 const offer='<offer id="final"><name>Travel adapter</name><category_name>Travel</category_name>'+
 '<price>10</price><oldprice>40</oldprice><currencyId>USD</currencyId>'+
 '<picture>https://ae01.alicdn.com/kf/test.jpg</picture>'+
 '<url>https://www.aliexpress.com/item/adapter.html</url></offer>';
 const parts=["<yml_catalog><offers>",...Array.from({length:110},()=>comment),offer,"</offers></yml_catalog>"];
 assert.ok(comment.length*110>25000000);
 const r=await streamVerifiedDeals(reader(parts),opts);
 assert.equal(r.format,"xml");
 assert.equal(r.groups.length,1);
 assert.equal(r.groups[0].offers[0].id,"final");
 assert.equal(r.scanned,1);
});
