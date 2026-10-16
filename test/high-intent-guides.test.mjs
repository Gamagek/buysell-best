import test from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {readFile} from "node:fs/promises";
import {HIGH_INTENT_GUIDES,renderHighIntentArticle,renderHighIntentIndex,renderHighIntentSpotlight,highIntentSitemapEntries,highIntentPath,findHighIntentGuide} from "../lib/high-intent-guides.js";

const ORIGIN="https://buysell.best";
test("exactly 50 original, dated and navigable buyer guides have distinct coverage",()=>{
 assert.equal(HIGH_INTENT_GUIDES.length,50);
 assert.equal(new Set(HIGH_INTENT_GUIDES.map(g=>g.slug)).size,50);
 assert.equal(new Set(HIGH_INTENT_GUIDES.map(g=>g.title)).size,50);
 assert.equal(new Set(HIGH_INTENT_GUIDES.map(g=>g.intro)).size,50);
 assert.equal(new Set(HIGH_INTENT_GUIDES.map(g=>g.scenario)).size,50);
 assert.equal(new Set(HIGH_INTENT_GUIDES.map(g=>g.pitfall)).size,50);
 assert.equal(new Set(HIGH_INTENT_GUIDES.map(g=>g.categorySlug)).size,10);
 for(const g of HIGH_INTENT_GUIDES){
   assert.equal(findHighIntentGuide(g.slug),g);
   assert.equal(g.criteria.length,4);
   assert.ok(g.criteria.every(c=>c.length>35));
   assert.ok(g.intro.length>100&&g.scenario.length>85&&g.pitfall.length>60);
   assert.ok(g.reference.url.startsWith("https://"));
 }
});
test("each article renders substantive text, canonical, source disclosure and real internal links",()=>{
 const canonical=new Set();
 for(const g of HIGH_INTENT_GUIDES){
  const dom=new JSDOM(renderHighIntentArticle(g),{url:ORIGIN+highIntentPath(g)}),doc=dom.window.document;
  assert.equal(doc.querySelector("h1").textContent,g.title);
  const url=doc.querySelector('link[rel="canonical"]').href;
  assert.equal(url,ORIGIN+highIntentPath(g));
  assert.ok(!canonical.has(url));canonical.add(url);
  assert.equal(doc.querySelectorAll(".high-intent-checks li").length,4);
  assert.ok(doc.querySelector(".shopping-toc"));
  assert.ok(doc.querySelector("header.site-header"));
  assert.ok(doc.querySelector("footer.site-footer"));
  assert.ok(doc.querySelector(".shopping-prose").textContent.split(/\s+/).length>350,g.slug);
  assert.ok(doc.querySelector('#verification a[href="'+g.reference.url+'"]'));
  assert.ok(doc.querySelectorAll(".high-intent-related a[href^='/insights/']").length>=4);
  assert.ok(doc.querySelector('meta[name="description"]').content.length>100);
  assert.ok(doc.querySelector('meta[name="robots"]').content.includes("index"));
  const article=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
  assert.equal(article["@type"],"Article");
  assert.equal(article.mainEntityOfPage,url);
  assert.equal(article.datePublished,"2026-10-17");
 }
});
test("index, homepage, and sitemaps expose the same 50 canonical pages",async()=>{
 const dom=new JSDOM(renderHighIntentIndex()),doc=dom.window.document;
 assert.equal(doc.querySelectorAll(".high-intent-card").length,50);
 assert.equal(doc.querySelectorAll(".high-intent-cluster").length,10);
 assert.equal(new Set([...doc.querySelectorAll(".high-intent-card h3 a")].map(a=>a.href)).size,50);
 assert.equal(new JSDOM(renderHighIntentSpotlight()).window.document.querySelectorAll(".high-intent-home-grid a").length,6);
 const dynamic=new JSDOM('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+highIntentSitemapEntries()+'</urlset>',{contentType:"application/xml"});
 assert.equal(dynamic.window.document.querySelectorAll("url").length,51);
 const fallback=await readFile("sitemap.xml","utf8");
 for(const g of HIGH_INTENT_GUIDES)assert.equal(fallback.split("<loc>"+ORIGIN+highIntentPath(g)+"</loc>").length,2,g.slug);
 assert.equal(fallback.split("<loc>"+ORIGIN+"/insights/</loc>").length,2);
});
