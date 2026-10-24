import test from "node:test";
import assert from "node:assert/strict";
import {
 fetchApprovedFeed,readBoundedFeed,safeFeedError,syncFlashSale
} from "../lib/flash-sale.js";

const admitad="https://export.admitad.com/secure/products.csv?token=PRIVATE_TEST_TOKEN";
function dbWithSafeState() {
 const values={};
 return {values,db:{
  batch:async()=>[],
  prepare(sql){
   return {bind(...args){
    return {run:async()=>{
     if(sql.startsWith("INSERT INTO flash_state"))values[args[0]]=args[1];
     return {success:true};
    }};
   }};
  }
 }};
}
test("Admitad-controlled redirects are bounded, token-free diagnostics never expose the feed URL",async()=>{
 const called=[];
 const fetcher=async url=>{
  called.push(url);
  return called.length===1?
   new Response(null,{status:302,headers:{location:"https://files.admitad.com/exports/products.csv"}}):
   new Response("offer_id,name\n1,product",{status:200,headers:{"content-type":"text/csv"}});
 };
 const res=await fetchApprovedFeed(admitad,fetcher);
 assert.equal(res.status,200);
 assert.equal(called.length,2);
 assert.match(await readBoundedFeed(res),/offer_id/);
 assert.equal(safeFeedError(new TypeError("network connection failed "+admitad),"fetch"),"FLASH_FEED_FETCH_FAILED");
});
test("feed URLs can never redirect to arbitrary external hosts, http, or more than 2 hops",async()=>{
 await assert.rejects(
   fetchApprovedFeed(admitad,async()=>new Response(null,{status:302,headers:{location:"https://hostile.invalid/steal?token=hidden"}})),
   {message:"FLASH_FEED_REDIRECT_UNTRUSTED"}
 );
 const urls=[];
 await fetchApprovedFeed(admitad,async url=>{
   urls.push(url);
   return urls.length===1
     ?new Response(null,{status:302,headers:{location:"http://files.admitad.com/public.csv"}})
     :new Response("offer_id,name",{status:200});
 });
 assert.equal(urls[1],"https://files.admitad.com/public.csv","old Admitad http redirect must be upgraded, never requested over http");
 await assert.rejects(
   fetchApprovedFeed(admitad,async()=>new Response(null,{status:302,headers:{location:"/again"}})),
   {message:"FLASH_FEED_REDIRECT_LIMIT"}
 );
});
test("bounded feed reader limits big replies, and returns actionable status for HTTP errors",async()=>{
 await assert.rejects(
   fetchApprovedFeed(admitad,async()=>new Response("denied",{status:403})),
   {message:"FLASH_FEED_HTTP_403"}
 );
 await assert.rejects(
   fetchApprovedFeed(admitad,async()=>new Response("fake",{status:200,headers:{"content-length":"160000001"}})),
   {message:"FLASH_FEED_RAW_TOO_LARGE"}
 );
 await assert.rejects(
   fetchApprovedFeed(admitad,async()=>{throw new TypeError("Network error at "+admitad);}),
   {message:"FLASH_FEED_FETCH_FAILED"}
 );
 const long=new ReadableStream({start(controller){
  controller.enqueue(new Uint8Array(25000001));
  controller.close();
 }});
 await assert.rejects(readBoundedFeed({body:long}),{message:"FLASH_FEED_TOO_LARGE"});
});
test("failed scheduled source diagnosis stores only safe stage/error/attempt metadata",async()=>{
 const {db,values}=dbWithSafeState();
 const result=await syncFlashSale({DB:db,ALIEXPRESS_PRODUCT_FEED_URL:admitad},{
  now:new Date("2026-10-22T00:00:00Z"),
  fetcher:async()=>new Response('{"products": [',{status:200})
 });
 assert.equal(result.status,"error");
 assert.equal(result.code,"FLASH_FEED_PARSE_FAILED");
 assert.equal(values.error_stage,"parse");
 assert.equal(values.last_attempt,"2026-10-22T00:00:00.000Z");
 assert.equal(values.last_failure,"2026-10-22T00:00:00.000Z");
 assert.ok(!JSON.stringify(values).includes("PRIVATE_TEST_TOKEN"));
 const second=dbWithSafeState();
 const failed=await syncFlashSale({DB:second.db,ALIEXPRESS_PRODUCT_FEED_URL:admitad},{
  now:new Date("2026-10-22T00:00:00Z"),
  fetcher:async()=>{throw new TypeError("fetch failed "+admitad)}
 });
 assert.equal(failed.code,"FLASH_FEED_FETCH_FAILED");
 assert.equal(second.values.error_stage,"fetch");
 assert.ok(!JSON.stringify(second.values).includes("PRIVATE_TEST_TOKEN"));
});
test("empty supported feeds do not create false sale data",async()=>{
 const {db,values}=dbWithSafeState();
 const result=await syncFlashSale({DB:db,ALIEXPRESS_PRODUCT_FEED_URL:admitad},{
  now:new Date("2026-10-22T00:00:00Z"),
  fetcher:async()=>new Response("offer_id,name,price,oldprice,currencyId,picture,url\n",{status:200})
 });
 assert.equal(result.code,"FLASH_FEED_EMPTY","a header-only feed has no product records");
 assert.equal(values.error_stage,"parse");
});
