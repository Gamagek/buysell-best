import test from "node:test";
import assert from "node:assert/strict";
import {streamVerifiedDeals} from "../lib/admitad-stream.js";
import {parseFeed,normalizeOffer} from "../lib/flash-sale.js";

const offer=(id)=>'<offer id="'+id+'"><name>Genuine daily-use travel earphones</name><category_name>Accessories</category_name><price>12</price><oldprice>35</oldprice><currencyId>USD</currencyId><picture>https://ae01.alicdn.com/kf/source.jpg</picture><url>https://rzekl.com/shop/42</url></offer>';
const response=text=>new Response(text,{headers:{"content-type":"application/xml"}});
const opts={parseFeed,normalizeOffer,now:new Date("2026-10-24T00:00:00Z"),categories:50,perCategory:15};
test("strict XML snapshot still rejects an unfinished final offer",async()=>{
 const input="<yml_catalog><offers>"+offer("1")+"<offer id=\"2\"><name>unfinished";
 await assert.rejects(streamVerifiedDeals(response(input),opts),{message:"FLASH_FEED_XML_INCOMPLETE"});
});
test("one-time product import retains only complete verified offers and explicitly flags incomplete tail",async()=>{
 const input="<yml_catalog><offers>"+offer("1")+offer("2")+"<offer id=\"3\"><name>unfinished";
 const out=await streamVerifiedDeals(response(input),{...opts,allowIncompleteTrailingXml:true});
 assert.equal(out.scanned,2);
 assert.equal(out.eligible,2);
 assert.equal(out.partial,true);
 assert.equal(out.groups[0].offers.length,2);
 assert.deepEqual(out.groups[0].offers.map(p=>p.id),["1","2"]);
});
test("one-time XML still fails if there is no complete source offer",async()=>{
 await assert.rejects(streamVerifiedDeals(response("<offer id=\"1\"><name>incomplete"),{...opts,allowIncompleteTrailingXml:true}),{message:"FLASH_FEED_XML_NO_OFFERS"});
});
test("complete XML remains unflagged",async()=>{
 const out=await streamVerifiedDeals(response("<offers>"+offer("1")+"</offers>"),{...opts,allowIncompleteTrailingXml:true});
 assert.equal(out.partial,false);
 assert.equal(out.scanned,1);
});
