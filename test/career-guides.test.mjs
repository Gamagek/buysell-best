import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {JSDOM} from "jsdom";
import {
 CAREER_GUIDES,CAREER_COUNTRIES,CAREER_SECTORS,
 renderCareerGuide,renderCareerIndex,careerSitemapEntries,careerGuidePath,findCareerGuide
} from "../lib/career-guides.js";

const BASE="https://buysell.best";
const officialHosts=new Set([
 "careers.microsoft.com","www.amazon.jobs","careers.salesforce.com",
 "jobs.citi.com","www.hsbc.com","www.deloitte.com",
 "careers.roche.com","www.siemens.com","www.accenture.com"
]);

test("50 distinct country-specialty guides cover 10 locations and five fields",()=>{
 assert.equal(CAREER_COUNTRIES.length,10);
 assert.equal(CAREER_SECTORS.length,5);
 assert.equal(CAREER_GUIDES.length,50);
 assert.equal(new Set(CAREER_GUIDES.map(g=>g.slug)).size,50);
 assert.equal(new Set(CAREER_GUIDES.map(g=>g.title)).size,50);
 assert.equal(new Set(CAREER_GUIDES.map(g=>g.focus)).size,50);
 for(const guide of CAREER_GUIDES){
  assert.equal(findCareerGuide(guide.slug),guide);
  assert.equal(careerGuidePath(guide),guide.path);
  assert.equal(guide.country.roles.length,5);
  assert.ok(guide.focus.length>100,guide.slug);
  assert.ok(guide.path.startsWith("/careers/"));
 }
});

test("every guide is crawlable, topical, useful and points to true employer-owned portals",()=>{
 for(const guide of CAREER_GUIDES){
  const doc=new JSDOM(renderCareerGuide(guide),{url:BASE+guide.path}).window.document;
  assert.equal(doc.querySelector("h1").textContent,guide.title);
  assert.equal(doc.querySelector('link[rel="canonical"]').href,BASE+guide.path);
  assert.equal(doc.querySelector('meta[name="robots"]').content,"index,follow,max-image-preview:large");
  assert.ok(doc.querySelector('meta[name="description"]').content.length>135);
  assert.ok(doc.querySelectorAll(".career-checklist li").length===4);
  assert.ok(doc.querySelector(".career-disclosure").textContent.includes("not"));
  assert.ok(doc.querySelector(".career-more").textContent.includes("More Interested Fields"));
  assert.ok(doc.querySelector(".career-worksheet"));
  assert.ok(doc.querySelectorAll(".career-related li").length>=4);
  const prose=doc.querySelector("main").textContent.trim().split(/\s+/);
  assert.ok(prose.length>=450,guide.slug+" has only "+prose.length+" words");
  const links=[...doc.querySelectorAll(".career-employer-list a.career-apply")];
  assert.equal(links.length,3,guide.slug);
  for(const link of links){
   const u=new URL(link.href);
   assert.equal(u.protocol,"https:");
   assert.ok(officialHosts.has(u.hostname),link.href);
   assert.equal(link.getAttribute("data-sponsored-navigation"),"job-destination");
   assert.ok(link.textContent.includes("official job search"));
  }
  const ld=[...doc.querySelectorAll('script[type="application/ld+json"]')].map(x=>JSON.parse(x.textContent));
  assert.ok(ld.some(x=>x["@type"]==="Article"),guide.slug);
  assert.ok(ld.some(x=>x["@type"]==="BreadcrumbList"),guide.slug);
  assert.ok(ld.every(x=>x["@type"]!=="JobPosting"),"No unauthorized JobPosting markup");
  assert.equal(ld[0].datePublished,"2026-10-17");
  assert.equal(doc.querySelector("time").dateTime,"2026-10-17");
 }
});

test("index and both sitemaps expose all 50 research pages plus /careers/ hub",async()=>{
 const doc=new JSDOM(renderCareerIndex()).window.document;
 assert.equal(doc.querySelectorAll(".career-country").length,10);
 assert.equal(doc.querySelectorAll(".career-grid li > a").length,50);
 assert.equal(new Set([...doc.querySelectorAll(".career-grid li > a")].map(x=>x.href)).size,50);
 assert.equal(doc.querySelector('link[rel="canonical"]').href,BASE+"/careers/");
 const sitemap=careerSitemapEntries();
 assert.equal((sitemap.match(/<url>/g)||[]).length,51);
 const fallback=await readFile("sitemap.xml","utf8");
 for(const path of ["/careers/",...CAREER_GUIDES.map(g=>g.path)]){
  const needle="<loc>"+BASE+path+"</loc>";
  assert.equal(sitemap.split(needle).length,2,path);
  assert.equal(fallback.split(needle).length,2,path);
 }
 const worker=await readFile("worker.js","utf8");
 const wrangler=await readFile("wrangler.toml","utf8");
 assert.ok(worker.includes("careerSitemapEntries()"));
 assert.ok(worker.includes("renderCareerGuide(career)"));
 assert.ok(wrangler.includes('"/careers/*"'));
});

test("career routes skip full-page display ads but keep the single consent-free sponsored step",async()=>{
 const worker=await readFile("worker.js","utf8");
 const sponsored=await readFile("js/sponsored-click.js","utf8");
 assert.ok(worker.includes('path.startsWith("/careers/")'));
 assert.ok(worker.includes("return withSponsoredSupport(seoResponse)"));
 assert.ok(sponsored.includes("data-sponsored-navigation"));
 assert.ok(sponsored.includes("You never need to open or click an ad to continue."));
 assert.ok(sponsored.includes('destinationLink.focus()'));
});
