import test from "node:test";
import assert from "node:assert/strict";
import {approvedAdmitadDestination,extractVerifiedListing,reviewQualityGate,createDraftRecord,buildEvidencePrompt} from "../scripts/hf-source-review.mjs";
import {readFile} from "node:fs/promises";
const fixture=JSON.parse(await readFile("test/fixtures/hf-review-source-snapshot.json","utf8"));
const url=fixture.source_page;
const real="https://rzekl.com/g/verified123/?ulp=https%3A%2F%2Fwww.aliexpress.com%2Fitem%2F1005010507993958.html";
const inner="https://s.click.aliexpress.com/deep_link.htm?aff_short_key=example&dl_target_url="+encodeURIComponent("https://www.aliexpress.com/item/"+fixture.id+".html");
const nested="https://rzekl.com/g/verified123/?ulp="+encodeURIComponent(inner);
const html=(destination=real,image=fixture.seller_image,canonical=url)=>{
 const schema={"@context":"https://schema.org","@type":"Product",name:fixture.title,description:fixture.description,image:[image],url,offers:{"@type":"Offer",url:destination,price:fixture.price,priceCurrency:"USD"}};
 return '<!doctype html><html><head><link rel="canonical" href="'+canonical+'"><script type="application/ld+json">'+JSON.stringify(schema)+'</script></head><body>'+"Source page content. ".repeat(30)+'</body></html>';
};
test("feed-backed product page is accepted only with exact canonical, source image, official tracking and valid price",()=>{
 const product=extractVerifiedListing(html(),url);
 assert.equal(product.title,fixture.title);
 assert.equal(product.price,0.07);
 assert.equal(product.source_page,url);
 assert.equal(product.independent_sources_verified,0);
 assert.equal(product.id,fixture.id);
 assert.equal(product.affiliate_destination_verified,true);
});
test("direct AliExpress and untrusted redirect links fail closed",()=>{
 assert.equal(approvedAdmitadDestination("https://www.aliexpress.com/item/1005010507993958.html"),false);
 assert.equal(approvedAdmitadDestination("https://evil.example/path"),false);
 assert.equal(approvedAdmitadDestination(real),true);
 assert.equal(approvedAdmitadDestination(nested,fixture.id),true);
 assert.equal(extractVerifiedListing(html(nested),url).id,fixture.id);
 assert.equal(approvedAdmitadDestination(nested,"9999999999999999"),false);
 assert.throws(()=>extractVerifiedListing(html("https://www.aliexpress.com/item/1005010507993958.html"),url),/TRACKED_DESTINATION/);
 assert.throws(()=>extractVerifiedListing(html("https://rzekl.com/g/x/?ulp=https%3A%2F%2Fbad.example%2Fitem%2F123.html"),url),/TRACKED_DESTINATION/);
});
test("untrusted media and mismatched canonical fail closed",()=>{
 assert.throws(()=>extractVerifiedListing(html(real,"https://images.example.com/photo.jpg"),url),/SOURCE_IMAGE/);
 assert.throws(()=>extractVerifiedListing(html(real,fixture.seller_image,"https://buysell.best/"),url),/CANONICAL/);
 assert.throws(()=>extractVerifiedListing(html(),url+"?utm_source=x"),/INVALID_PAGE_URL/);
});
test("human source-review is mandatory even if draft passes conservative quality gate",()=>{
 const good=fixture.title+" is described in the seller feed at USD 0.07, not a confirmed final checkout price. Verify model compatibility and dimensions directly from the merchant; check installation method and return terms. Specifications and buyer reviews are not independently verified. Compare the selected option before deciding.";
 const doc=createDraftRecord(fixture,good,"Qwen3 GGUF");
 assert.equal(doc.review_status,"DRAFT_REQUIRES_HUMAN_SOURCE_REVIEW");
 assert.equal(doc.auto_publish,false);
 assert.equal(doc.quality_gate.passed,true);
 assert.equal(reviewQualityGate("Excellent durable guaranteed high-quality material that fits all cars.",fixture).passed,false);
 assert.match(buildEvidencePrompt(fixture),/No invented features/);
});
