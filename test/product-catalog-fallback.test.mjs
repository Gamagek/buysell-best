import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {JSDOM} from "jsdom";
import {
 CURATED_PRODUCTS,CURATED_CATEGORIES,renderCuratedHome,renderCuratedPage,curatedSitemapEntries
} from "../lib/product-catalog-fallback.js";
import {renderFlashHome,renderFlashPage} from "../lib/flash-sale.js";
import {monitoredUrls} from "../lib/gsc-integration.js";

test("all forty verified-existing editorial product pages are accessible without a live affiliate sale feed",()=>{
 assert.equal(CURATED_PRODUCTS.length,40);
 assert.equal(new Set(CURATED_PRODUCTS.map(p=>p.path)).size,40);
 assert.equal(CURATED_CATEGORIES.reduce((n,c)=>n+c.products.length,0),40);
 const doc=new JSDOM(renderCuratedPage()).window.document;
 assert.equal(doc.querySelectorAll(".flash-research-tile").length,40);
 assert.equal(doc.querySelectorAll(".flash-discount").length,0);
 assert.ok(doc.querySelector("link[rel=canonical]").href.endsWith("/flash-sale/"));
 for(const p of CURATED_PRODUCTS){
  assert.ok(doc.querySelector('a[href="'+p.path+'"]'),p.path);
  assert.ok(doc.querySelector('img[src="'+p.image+'"]'),p.image);
  assert.ok(doc.querySelector('a[data-sponsored-navigation][href="'+p.destination.replace(/&/g,"&amp;")+'"]')||
    [...doc.querySelectorAll("a[data-sponsored-navigation]")].some(link=>link.href===p.destination),p.id);
  assert.equal(typeof p.isIllustration,"boolean");
 }
});
test("both homepage and standalone hub remain clearly discoverable in feed-unconfigured mode",async()=>{
 const home=new JSDOM(renderFlashHome([])).window.document;
 assert.equal(home.querySelectorAll(".flash-tile").length,24);
 assert.equal(home.querySelectorAll(".flash-discount").length,0);
 assert.ok(home.querySelector("h2").textContent.includes("AliExpress Product Catalogue"));
 const hub=new JSDOM(renderFlashPage([])).window.document;
 assert.equal(hub.querySelectorAll(".flash-tile").length,40);
 for(const c of CURATED_CATEGORIES){
  const doc=new JSDOM(renderFlashPage([],c.slug)).window.document;
  assert.equal(doc.querySelectorAll(".flash-tile").length,c.products.length);
 }
 assert.equal(renderFlashPage([],"non-existing-category"),null);
 const html=await readFile("index.html","utf8");
 assert.ok(html.includes('href="/flash-sale/"'));
});
test("catalogue and its first-party product images remain in both static and dynamic SEO queues",async()=>{
 const url="https://buysell.best/flash-sale/";
 const xml=await readFile("sitemap.xml","utf8");
 const image=await readFile("image-sitemap.xml","utf8");
 const entries=curatedSitemapEntries();
 assert.ok(xml.includes(entries));
 assert.ok(image.includes(url));
 assert.equal((entries.match(/<url>/g)||[]).length,1+CURATED_CATEGORIES.length);
 for(const c of CURATED_CATEGORIES){
  assert.ok(monitoredUrls().includes("https://buysell.best/flash-sale/category/"+c.slug+"/"));
 }
 for(const p of CURATED_PRODUCTS){
  assert.ok(xml.includes("https://buysell.best"+p.image));
  assert.ok(image.includes("https://buysell.best"+p.image));
 }
});
