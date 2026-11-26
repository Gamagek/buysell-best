import test from "node:test";
import assert from "node:assert/strict";
import {evaluateD1Budget,inspectD1Quota,DAILY_D1_ROWS_READ_LIMIT,DAILY_D1_ROWS_WRITTEN_LIMIT} from "../lib/d1-account-quota-guard.js";
import {importHourlyBulkProducts,importOneTimeVerifiedBatch} from "../lib/bulk-products.js";
const now=new Date("2026-11-26T08:30:00.000Z");
const own="822532f2-1e71-41c5-8d3b-0b678c903e0a";
const other="d1a91eb2-1c41-44b8-aff1-24166f2c91f4";
const rows=(read=0,written=0,extraRead=0,extraWritten=0)=>[
  {dimensions:{date:"2026-11-26",databaseId:own},sum:{rowsRead:read,rowsWritten:written}},
  {dimensions:{date:"2026-11-26",databaseId:other},sum:{rowsRead:extraRead,rowsWritten:extraWritten}}
];
test("account-wide 75% D1 reads threshold includes OTHER databases",()=>{
 assert.equal(DAILY_D1_ROWS_READ_LIMIT,5_000_000);
 let gate=evaluateD1Budget(rows(3_600_000,100,151_000),now);
 assert.equal(gate.allowed,false);
 assert.equal(gate.rowsRead,3_751_000);
 assert.equal(gate.hourlyMax,0);
 assert.equal(gate.status,"daily-d1-75pct-limit");
 gate=evaluateD1Budget(rows(4_031_249,1662,434_480,200),now);
 assert.equal(gate.readPercent,89.31);
 assert.equal(gate.allowed,false);
});
test("account-wide write quota also independently blocks new pages",()=>{
 assert.equal(DAILY_D1_ROWS_WRITTEN_LIMIT,100_000);
 const gate=evaluateD1Budget(rows(100_000,74_900,100_000,100),now);
 assert.equal(gate.allowed,false);
 assert.equal(gate.writePercent,75);
});
test("adaptive allowance reduces batch size BEFORE threshold",()=>{
 assert.equal(evaluateD1Budget(rows(1_000_000),now).hourlyMax,50);
 assert.equal(evaluateD1Budget(rows(3_100_000),now).hourlyMax,20);
 assert.equal(evaluateD1Budget(rows(3_550_000),now).hourlyMax,5);
 assert.equal(evaluateD1Budget(rows(3_750_000),now).hourlyMax,0);
});
test("invalid analytics, stale date, missing own DB and duplicate DB fail closed",()=>{
 assert.equal(evaluateD1Budget([],now).allowed,false);
 assert.equal(evaluateD1Budget([{...rows()[0],dimensions:{date:"2026-11-25",databaseId:own}}],now).allowed,false);
 assert.equal(evaluateD1Budget([rows()[1]],now).allowed,false);
 assert.equal(evaluateD1Budget([rows()[0],rows()[0]],now).allowed,false);
 assert.equal(evaluateD1Budget(rows("100"),now).allowed,false);
});
test("query uses a restricted Cloudflare account read token and sums actual GraphQL response",async()=>{
 let calls=0,checkedAuth=false;
 const fake=async (url,opts)=>{
  calls++;
  assert.equal(url,"https://api.cloudflare.com/client/v4/graphql");
  checkedAuth=opts.headers.authorization==="Bearer "+"x".repeat(25);
  assert.equal(JSON.parse(opts.body).variables.day,"2026-11-26");
  return Response.json({data:{viewer:{accounts:[{d1AnalyticsAdaptiveGroups:rows(1_200_000,1000,20_000,80)}]}}});
 };
 const out=await inspectD1Quota({D1_ANALYTICS_READ_TOKEN:"x".repeat(25)},{now,fetcher:fake});
 assert.equal(calls,1);
 assert.equal(checkedAuth,true);
 assert.equal(out.allowed,true);
 assert.equal(out.hourlyMax,50);
});
test("no token or failing Cloudflare GraphQL cannot publish new products",async()=>{
 const env={DB:{prepare(){throw Error("D1_SHOULD_NOT_BE_READ")}},FLASH_MEDIA:{put(){throw Error("R2_SHOULD_NOT_BE_WRITTEN")}},ALIEXPRESS_PRODUCT_FEED_URL:"https://export.admitad.com/feed"};
 const noToken=await inspectD1Quota(env,{now});
 assert.equal(noToken.allowed,false);
 const hourly=await importHourlyBulkProducts(env,{now,fetcher:()=>{throw Error("UNSAFE_FEED_FETCH")}});
 assert.equal(hourly.status,"d1-quota-paused");
 const oneTime=await importOneTimeVerifiedBatch(env,[{name:"Test Product"}],{now});
 assert.equal(oneTime.status,"d1-quota-paused");
 assert.equal((await inspectD1Quota({D1_ANALYTICS_READ_TOKEN:"x".repeat(25)},{now,fetcher:async()=>new Response("error",{status:503})})).allowed,false);
});
test("test upstream GraphQL query failure fails closed",async()=>{
 const out=await inspectD1Quota({D1_ANALYTICS_READ_TOKEN:"x".repeat(25)},{now,fetcher:async()=>Response.json({errors:[{message:"unavailable"}]})});
 assert.equal(out.allowed,false);
 assert.equal(out.status,"analytics-graphql-error");
});
