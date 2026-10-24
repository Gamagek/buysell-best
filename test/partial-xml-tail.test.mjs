import test from "node:test";
import assert from "node:assert/strict";
import {streamVerifiedDeals} from "../lib/admitad-stream.js";
import {parseFeed,normalizeOffer} from "../lib/flash-sale.js";

const start='<yml_catalog><shop><offers>';
const close='</offers></shop></yml_catalog>';
function offer(id,usd="USD"){
 return '<offer id="'+id+'"><name>Certified long cable charging accessory</name>'+
 '<category_name>Phone accessories</category_name><price>9</price>'+
 '<oldprice>30</oldprice><currencyId>'+usd+'</currencyId>'+
 '<picture>https://ae01.alicdn.com/kf/sellerphoto.jpg</picture>'+
 '<tracking_link>https://rzekl.com/verified-affiliate-'+id+'</tracking_link></offer>';
}
const reader=content=>new Response(new ReadableStream({start(c){
 const encoded=new TextEncoder().encode(content);
 for(let i=0;i<encoded.length;i+=17)c.enqueue(encoded.slice(i,i+17));
 c.close();
}}));
const cfg={parseFeed,normalizeOffer,now:new Date("2026-10-24T12:00:00Z"),categories:20,perCategory:20};

test("normal scheduled XML feed rejects any incomplete trailing offer",async()=>{
 await assert.rejects(
  streamVerifiedDeals(reader(start+offer("123")+'<offer id="bad"><name>Incomplete'),cfg),
  {message:"FLASH_FEED_XML_INCOMPLETE"}
 );
});
test("explicit one-shot salvage preserves only complete eligible offers and marks partial",async()=>{
 const feed=start+offer("123")+offer("124","LKR")+'<offer id="last"><name>Partial';
 const result=await streamVerifiedDeals(reader(feed),{...cfg,allowPartialXmlAtEof:true});
 assert.equal(result.format,"xml");
 assert.equal(result.scanned,2);
 assert.equal(result.eligible,1);
 assert.equal(result.incompleteTail,true);
 assert.equal(result.groups.length,1);
 assert.deepEqual(result.groups[0].offers.map(x=>x.id),["123"]);
 assert.ok(result.groups[0].offers[0].destination.startsWith("https://rzekl.com/"));
});
test("complete XML without incomplete tail retains exact old behavior",async()=>{
 const result=await streamVerifiedDeals(reader(start+offer("125")+close),{...cfg,allowPartialXmlAtEof:true});
 assert.equal(result.incompleteTail,false);
 assert.equal(result.scanned,1);
 assert.equal(result.eligible,1);
});
test("truncated source with no complete records cannot publish",async()=>{
 await assert.rejects(
  streamVerifiedDeals(reader(start+'<offer id="bad"><name>Incomplete'),{...cfg,allowPartialXmlAtEof:true}),
  {message:"FLASH_FEED_XML_NO_OFFERS"});
});
test("oversize XML record remains rejected even when trailing salvage is opted in",async()=>{
 const feed=start+'<offer id="too-large"><name>'+"x".repeat(257000);
 await assert.rejects(
  streamVerifiedDeals(reader(feed),{...cfg,allowPartialXmlAtEof:true}),
  {message:"FLASH_FEED_ROW_TOO_LONG"});
});
