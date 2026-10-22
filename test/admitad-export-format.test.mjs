import test from "node:test";
import assert from "node:assert/strict";
import {parseFeed,normalizeOffer,normalizeFeedExportUrl,fetchApprovedFeed} from "../lib/flash-sale.js";
const now=new Date("2026-10-22T00:00:00Z");
const fields=["offer_id","name","category_name","price","oldprice","currencyId","picture","url"];
const values=["m47","Portable wireless earbuds","Electronics","12","40","USD",
 "https://ae01.alicdn.com/kf/official-product.jpg",
 "https://www.aliexpress.com/item/47.html"];
test("official Admitad comma, semicolon, pipe, tab, double dash feed CSV parses correctly",()=>{
 for(const sep of [",",";","|","\t","--"]){
  const csv=fields.join(sep)+"\n"+values.join(sep)+"\n";
  const parsed=parseFeed(csv);
  assert.equal(parsed.length,1,sep);
  const offer=normalizeOffer(parsed[0],now);
  assert.ok(offer,"valid verified product must remain eligible for "+JSON.stringify(sep));
  assert.equal(offer.currency,"USD");
  assert.equal(offer.discount,70);
  assert.equal(offer.title,values[1]);
 }
});
test("quoted product names containing delimiter and semicolon Excel headers stay intact",()=>{
 const csv='sep=;\n'+fields.join(";")+'\n'+['m48','"Earbuds; travel ready"',"Electronics","12","40","USD",values[6],values[7]].join(";")+'\n';
 const data=parseFeed(csv);
 assert.equal(data.length,1);
 assert.equal(data[0].name,"Earbuds; travel ready");
 assert.equal(normalizeOffer(data[0],now).discount,70);
});
test("feed URL supports official Admitad HTTP legacy export only by upgrading to HTTPS",()=>{
 const link="http://export.admitad.com/ru/webmaster/websites/23/products/export_adv_products/?user=test&code=secret";
 const secure=normalizeFeedExportUrl(link);
 assert.ok(secure.startsWith("https://export.admitad.com/"));
 assert.ok(secure.includes("code=secret"));
 assert.equal(normalizeFeedExportUrl("http://malicious.test/?code=secret"),null);
 assert.equal(normalizeFeedExportUrl("http://export.admitad.com.evil.test/?code=secret"),null);
 assert.equal(normalizeFeedExportUrl("ftp://export.admitad.com/file"),null);
 assert.equal(normalizeFeedExportUrl("https://user:pass@export.admitad.com/file"),null);
 assert.equal(normalizeFeedExportUrl("https://export.admitad.com:8443/file"),null);
 assert.equal(normalizeFeedExportUrl("https://export.admitad.com/file#token"),null);
});
test("feed fetch never sends the legacy export link over plaintext HTTP",async()=>{
 const source="http://export.admitad.com/feed.csv?secret=demo";
 const secure=normalizeFeedExportUrl(source);
 let seen;
 await fetchApprovedFeed(secure,async (url)=>{seen=url;return new Response(fields.join(","),{status:200});});
 assert.equal(seen,"https://export.admitad.com/feed.csv?secret=demo");
});
test("login HTML is rejected explicitly, without accidentally parsing it as products",()=>{
 assert.throws(()=>parseFeed("<!DOCTYPE html><html><body>Sign in</body></html>"),{message:"FLASH_FEED_LOGIN_OR_HTML"});
 assert.throws(()=>parseFeed("<html><body>Access denied</body></html>"),{message:"FLASH_FEED_LOGIN_OR_HTML"});
 assert.throws(()=>parseFeed("<yml_catalog><offers></offers></yml_catalog>"),{message:"FLASH_FEED_XML_NO_OFFERS"});
});
