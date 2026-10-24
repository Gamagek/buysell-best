import test from "node:test";
import assert from "node:assert/strict";
import {streamVerifiedDeals} from "../lib/admitad-stream.js";
import {parseFeed,normalizeOffer} from "../lib/flash-sale.js";
const head="<yml_catalog><shop><offers>";
const item=(i)=>'<offer id="'+i+'"><name>Verified Bluetooth travel headphones model '+i+'</name><category_name>Electronics</category_name><price>10</price><oldprice>30</oldprice><currencyId>USD</currencyId><picture>https://ae01.alicdn.com/kf/test'+i+'.jpg</picture><url>https://rzekl.com/affiliate/'+i+'</url></offer>';
const xml=head+[item(1),item(2),item(3),item(4)].join("")+"</offers></shop></yml_catalog>";
const settings={parseFeed,normalizeOffer,now:new Date("2026-10-24T00:00:00Z"),maxRecords:2,categories:5,perCategory:3};
test("strict periodic parser still rejects record truncation, so previously published snapshot stays safe",async()=>{
 await assert.rejects(streamVerifiedDeals(new Response(xml),settings),{message:"FLASH_FEED_RECORD_LIMIT"});
});
test("owner one-shot scans bounded complete XML offers and yields genuine sale records",async()=>{
 const d=await streamVerifiedDeals(new Response(xml),{...settings,allowPartialRecordLimit:true});
 assert.equal(d.scanned,2);
 assert.equal(d.eligible,2);
 assert.equal(d.recordLimitReached,true);
 assert.equal(d.groups[0].offers.length,2);
 assert.deepEqual(d.groups[0].offers.map(p=>p.id),["1","2"]);
 assert.equal(d.groups[0].offers[0].currency,"USD");
});
test("one-shot exact limit (not exceeded) is complete and does not flag early exit",async()=>{
 const source=head+item(1)+"</offers></shop></yml_catalog>";
 const d=await streamVerifiedDeals(new Response(source),{...settings,allowPartialRecordLimit:true});
 assert.equal(d.scanned,1);
 assert.equal(d.recordLimitReached,false);
});
test("complete CSV record scan limit supports one-off mode but strict mode remains guarded",async()=>{
 const header="offer_id,name,category_name,price,oldprice,currencyId,picture,url";
 const lines=[1,2,3].map(i=>[i,"Verified travel headphone model "+i,"Electronics",10,30,"USD","https://ae01.alicdn.com/kf/test"+i+".jpg","https://rzekl.com/affiliate/"+i].join(","));
 const csv=header+"\n"+lines.join("\n")+"\n";
 await assert.rejects(streamVerifiedDeals(new Response(csv),settings),{message:"FLASH_FEED_RECORD_LIMIT"});
 const d=await streamVerifiedDeals(new Response(csv),{...settings,allowPartialRecordLimit:true});
 assert.equal(d.scanned,2);assert.equal(d.eligible,2);assert.equal(d.recordLimitReached,true);
});