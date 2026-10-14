import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const catalog = JSON.parse(await readFile(new URL("../content/shopping-catalog.json",import.meta.url),"utf8"));
const overrides = JSON.parse(await readFile(new URL("../content/affiliate-links.json",import.meta.url),"utf8"));
const categories = new Set(["sports-outdoors","entertainment","desk-setup","home-kitchen","travel","phone-accessories"]);
const ids = new Set(), slugs = new Set(), titles = new Set(), used = new Set();
function validHttps(value) { const url = new URL(value); assert.equal(url.protocol,"https:"); assert.ok(!url.username&&!url.password); return url; }
for(const product of catalog.products) {
  assert.ok(product.id&&!ids.has(product.id),"Duplicate or missing product id: "+product.id); ids.add(product.id);
  assert.ok(product.name?.length>5); assert.ok(["item","search"].includes(product.linkKind));
  const url=validHttps(product.merchantUrl);
  assert.ok(url.hostname==="aliexpress.com"||url.hostname.endsWith(".aliexpress.com"),"Unexpected merchant: "+url.hostname);
  if(product.linkKind==="item") assert.match(url.pathname,/^\/item\/\d+\.html$/);
  validHttps(product.referenceUrl);
}
for(const [id,value] of Object.entries(overrides)) { assert.ok(ids.has(id),"Unknown affiliate product id: "+id); validHttps(value); }
for(const guide of catalog.guides) {
  assert.match(guide.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(!slugs.has(guide.slug),"Duplicate guide: "+guide.slug); slugs.add(guide.slug);
  assert.ok(!titles.has(guide.title),"Duplicate guide title"); titles.add(guide.title);
  assert.ok(categories.has(guide.category));
  assert.ok(guide.description.length>=80&&guide.description.length<=240,"Description length: "+guide.slug);
  assert.ok(guide.selection.length>=3&&guide.sections.length>=3&&guide.faq.length>=3,"Incomplete guide: "+guide.slug);
  assert.ok(guide.lead.length>=2&&guide.checklist.length>=4&&guide.sources.length>=2);
  const selected=new Set();
  for(const choice of guide.selection) {
    assert.ok(ids.has(choice.productId),"Unknown product in "+guide.slug+": "+choice.productId);
    assert.ok(!selected.has(choice.productId),"Duplicate selection in "+guide.slug);
    selected.add(choice.productId); used.add(choice.productId);
    assert.ok(choice.checks.length>=2&&choice.bestFor&&choice.tradeoff&&choice.verdict);
  }
  assert.ok(guide.comparison.columns.length>=3&&guide.comparison.rows.length>=3);
  for(const row of guide.comparison.rows) assert.equal(row.length,guide.comparison.columns.length,"Incomplete comparison: "+guide.slug);
  for(const source of guide.sources) validHttps(source.url);
  const body=[...guide.lead,guide.quickAnswer,...guide.selection.flatMap(c=>[c.verdict,c.bestFor,c.tradeoff,...c.checks]),...guide.sections.flatMap(s=>s.paragraphs),...guide.checklist,...guide.faq.flatMap(f=>[f.q,f.a])].join(" ");
  const words=body.split(/\s+/).length;
  assert.ok(words>=600,"Guide needs more useful detail ("+words+" words): "+guide.slug);
  assert.ok(!/lorem ipsum|TODO|PLACEHOLDER|guaranteed (?:ranking|sales)|we (?:tested|measured|purchased)/i.test(body),"Unfinished or unsupported claim: "+guide.slug);
  console.log(guide.slug+": "+words+" words");
}
assert.ok(catalog.guides.length>=18,"Publication batch incomplete");
for(const id of ids) assert.ok(used.has(id),"Unused product: "+id);
for(const category of categories) assert.ok(catalog.guides.filter(g=>g.category===category).length>=3,"Category needs distinct guides: "+category);
console.log(JSON.stringify({guides:catalog.guides.length,products:ids.size,itemLinks:catalog.products.filter(p=>p.linkKind==="item").length,searchLinks:catalog.products.filter(p=>p.linkKind==="search").length,trackingLinks:Object.keys(overrides).length}));
