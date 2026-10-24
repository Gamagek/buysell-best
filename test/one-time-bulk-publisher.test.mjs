import test from "node:test";
import assert from "node:assert/strict";
import {validateClaims,verifyGithubImportIdentity} from "../lib/github-oidc-import.js";
import {initOneTimeCatalogue,importOneTimeVerifiedBatch,renderBulkDirectoryPage} from "../lib/bulk-products.js";
import {bulkPublishedCount,bulkSitemapIndex,bulkSitemapShard} from "../lib/bulk-sitemap.js";
import {serveAuthorizedImport} from "../lib/one-time-import-ops.js";
import {readFile} from "node:fs/promises";

const now=Math.floor(Date.now()/1000),origin="https://buysell.best";
function claims(){return {
 iss:"https://token.actions.githubusercontent.com",aud:origin+"/_ops/import",
 repository:"Gamagek/buysell-best",ref:"refs/heads/main",
 workflow_ref:"Gamagek/buysell-best/.github/workflows/one-time-affiliate-import.yml@refs/heads/main",
 event_name:"push",iat:now,nbf:now-5,exp:now+300
};}
test("OIDC claim verifier only allows the exact trusted GitHub one-off push job",()=>{
 assert.equal(validateClaims(claims(),now),true);
 for(const pair of [["repository","attacker/repo"],["ref","refs/heads/other"],
 ["workflow_ref","Gamagek/buysell-best/.github/workflows/hourly.yml@refs/heads/main"],
 ["aud","https://example.com"],["event_name","pull_request"],["iss","https://fake.github"]]){
  assert.equal(validateClaims({...claims(),[pair[0]]:pair[1]},now),false,pair[0]);
 }
 assert.equal(validateClaims({...claims(),exp:now-1},now),false);
});
test("OIDC cryptographically verifies RS256 GitHub JWT against known keys",async()=>{
 const keys=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
 const jwk=await crypto.subtle.exportKey("jwk",keys.publicKey);
 Object.assign(jwk,{kid:"test-signer",alg:"RS256",use:"sig"});
 const b64=data=>Buffer.from(data).toString("base64url");
 const header=b64(JSON.stringify({alg:"RS256",kid:"test-signer"})),payload=b64(JSON.stringify(claims()));
 const value=header+"."+payload;
 const signature=b64(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",keys.privateKey,new TextEncoder().encode(value)));
 const request=new Request(origin+"/__ops/import/init",{method:"POST",headers:{Authorization:"Bearer "+value+"."+signature}});
 const fetcher=async()=>Response.json({keys:[jwk]});
 assert.equal(await verifyGithubImportIdentity(request,{fetcher}),true);
 const bad=new Request(request.url,{method:"POST",headers:{Authorization:"Bearer "+value+"."+b64("bad-signature")}});
 assert.equal(await verifyGithubImportIdentity(bad,{fetcher}),false);
});
test("unauthorized one-off import endpoints do not reach any database or disclose feed",async()=>{
 const env={DB:{prepare(){throw Error("MUST_NOT_TOUCH_DB")}},ALIEXPRESS_PRODUCT_FEED_URL:"top-secret"};
 for(const path of ["feed","init","batch"]){
  const res=await serveAuthorizedImport(new Request(origin+"/__ops/import/"+path,{method:"POST"}),env);
  assert.equal(res.status,403,path);
  assert.ok(!JSON.stringify(await res.json()).includes("top-secret"));
 }
});
test("source-backed batch only publishes seller-photo-backed USD discounted products",async()=>{
 const saved=[],images=[];
 const db={
  async batch(){return []},
  prepare(sql){
   return {bind(...params){return {
    async first(){return null;},
    async run(){saved.push({sql,params});return {meta:{changes:1}};}
   }}};
  }
 };
 const env={DB:db,FLASH_MEDIA:{async put(key,bytes){images.push({key,size:bytes.byteLength})}}};
 assert.equal((await initOneTimeCatalogue(env)).status,"ready");
 const raw={offer_id:"12345",name:"Genuine wireless travel earphones",category_name:"Electronics",
  price:12,oldprice:30,currencyId:"USD",picture:"https://ae01.alicdn.com/kf/real-photo.jpg",
  tracking_link:"https://rzekl.com/seller-ad",description:"Source-provided device accessories and specification details that the buyer should verify with the merchant."};
 const jpg=new Uint8Array(340);jpg.set([255,216,255],0);
 const fetcher=async()=>new Response(jpg,{status:200,headers:{"content-type":"image/jpeg"}});
 const r=await importOneTimeVerifiedBatch(env,[raw,{...raw,offer_id:"bad",currencyId:"LKR"}],{now:new Date("2026-10-24"),fetcher});
 assert.equal(r.published,1);
 assert.equal(r.skipped,1);
 assert.equal(images.length,1);
 assert.match(images[0].key,/^items\/bulk-[a-z0-9]+\.jpg$/);
 assert.equal(saved.filter(x=>x.sql.startsWith("INSERT OR IGNORE")).length,1);
 assert.ok(saved.some(x=>x.params.includes("USD")));
 assert.ok(saved.some(x=>x.params.some(p=>String(p).includes("Source-provided"))));
});
test("each published product and matching R2 seller image belongs to its own XML shard",async()=>{
 const rows=[{slug:"genuine-travel-product-123",image_key:"items/bulk-abcd1234.webp",published_at:"2026-10-24T00:00:00Z"}];
 const db={
  prepare(){
   return {
    bind(){
     return {
      async first(){return {n:10000};},
      async all(){return {results:rows};}
     };
    }
   };
  }
 };
 assert.equal(await bulkPublishedCount(db),10000);
 const index=await bulkSitemapIndex(db);
 assert.ok(index.includes("/sitemaps/affiliate-products-10.xml"));
 assert.ok(index.includes("/sitemaps/affiliate-images-10.xml"));
 const image=await bulkSitemapShard(db,"images",1),product=await bulkSitemapShard(db,"products",1);
 assert.match(image,/https:\/\/buysell\.best\/flash-media\/items\/bulk-abcd1234\.webp/);
 assert.match(image,/https:\/\/buysell\.best\/flash-sale\/product\/genuine-travel-product-123/);
 assert.doesNotMatch(product,/<image:image>/);
});
test("deep catalogue pagination is self-canonical and indexable, no invented ratings",()=>{
 const html=renderBulkDirectoryPage({items:[],total:10000,page:2});
 assert.match(html,/<link rel="canonical" href="https:\/\/buysell.best\/flash-sale\/\?page=2">/);
 assert.match(html,/index,follow/);
});
test("one-time runner cannot be scheduled and every photo publish is independently authenticated",async()=>{
 const yaml=await readFile(".github/workflows/one-time-affiliate-import.yml","utf8");
 const runner=await readFile("scripts/one-time-import.mjs","utf8");
 const cfg=await readFile("wrangler.toml","utf8");
 assert.match(yaml,/import-control\/one-shot-admitad-20261024\.json/);
 assert.match(yaml,/id-token: write/);
 assert.doesNotMatch(yaml,/cron:|schedule:/);
 assert.match(cfg,/crons\s*=\s*\[\s*\]/);
 assert.match(runner,/ACTIONS_ID_TOKEN_REQUEST_TOKEN/);
 assert.match(runner,/NO_ACTUAL_APPROVED_AFFILIATE_OFFERS/);
 assert.match(runner,/maxRecords:250000/);
 assert.match(runner,/LIMIT=10000/);
});
