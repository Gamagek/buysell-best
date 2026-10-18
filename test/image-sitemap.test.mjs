import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import path from "node:path";
import {JSDOM} from "jsdom";
import {Miniflare,convertV4MiniflareOptions} from "miniflare";
import {imageSitemapFromCanonical,imageSitemapStats,IMAGE_SITEMAP_URL} from "../lib/image-sitemap.js";
import {submitSitemap} from "../lib/gsc-integration.js";

const ORIGIN="https://buysell.best";
async function filesIn(dir){
 const list=[];
 for(const item of await readdir(dir,{withFileTypes:true})){
  const filename=path.join(dir,item.name);
  if(item.isDirectory())list.push(...await filesIn(filename));
  else if(item.isFile())list.push(filename);
 }
 return list;
}

test("every editorial site image is linked from a crawlable content page",async()=>{
 const canonical=await readFile("sitemap.xml","utf8");
 const imageXML=await readFile("image-sitemap.xml","utf8");
 assert.equal(imageXML,imageSitemapFromCanonical(canonical),"static image sitemap must never drift from canonical sitemap");
 const dom=new JSDOM(imageXML,{contentType:"application/xml"}).window.document;
 assert.ok(!dom.querySelector("parsererror"));
 const entries=[...dom.querySelectorAll("url")];
 const srcs=new Set();
 let count=0;
 for(const entry of entries){
  const loc=entry.getElementsByTagName("loc")[0]?.textContent;
  assert.ok(loc?.startsWith(ORIGIN+"/"),loc);
  const imgs=[...entry.getElementsByTagNameNS("http://www.google.com/schemas/sitemap-image/1.1","loc")];
  assert.ok(imgs.length>0);
  const seen=new Set();
  for(const tag of imgs){
   const url=tag.textContent;
   assert.ok(url.startsWith(ORIGIN+"/assets/"),url);
   assert.match(url,/\.(?:jpe?g|png|gif|svg|avif|webp)$/i);
   assert.ok(!seen.has(url),"duplicate image on "+loc);seen.add(url);
   const local=url.replace(ORIGIN+"/","");
   assert.equal((await readFile(local)).length>0,true,url+" is missing on disk");
   srcs.add(url);count++;
  }
 }
 const all=await filesIn("assets");
 const pictures=all.filter(x=>/\.(?:jpe?g|png|gif|svg|avif|webp)$/i.test(x));
 const referenced=pictures.map(x=>ORIGIN+"/"+x.replaceAll("\\","/"));
 assert.deepEqual(referenced.filter(url=>!srcs.has(url)),[],"new first-party pictures should be included in sitemap");
 assert.ok(srcs.size>=87);
 assert.equal(count,imageSitemapStats(imageXML).entries);
 assert.equal(entries.length,imageSitemapStats(imageXML).pages);
 assert.equal(srcs.size,imageSitemapStats(imageXML).uniqueImages);
});

test("image sitemap extracts published page associations, rejects foreign image URLs and de-duplicates images",()=>{
 const input='<urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+
   '<url><loc>https://buysell.best/products/example/</loc>'+
   '<image:image><image:loc>https://buysell.best/assets/a.webp</image:loc></image:image>'+
   '<image:image><image:loc>https://buysell.best/assets/a.webp</image:loc></image:image>'+
   '<image:image><image:loc>https://other.example/hotlink.webp</image:loc></image:image>'+
   '</url><url><loc>https://other.example/hijacked/</loc>'+
   '<image:image><image:loc>https://buysell.best/assets/b.jpg</image:loc></image:image></url>'+
   '<url><loc>https://buysell.best/plain/</loc></url></urlset>';
 const result=imageSitemapFromCanonical(input),stats=imageSitemapStats(result);
 assert.equal(stats.pages,1);
 assert.equal(stats.entries,1);
 assert.equal(stats.uniqueImages,1);
 assert.ok(result.includes("https://buysell.best/assets/a.webp"));
 assert.ok(!result.includes("other.example"));
});

test("Worker serves a dynamic sitemap with the same image associations and HEAD behavior",async()=>{
 const worker=new Miniflare(convertV4MiniflareOptions({
  modules:true,scriptPath:path.resolve(".test-build/worker.js"),
  compatibilityDate:"2026-09-20",
  serviceBindings:{ASSETS:async()=>new Response("Not found",{status:404})}
 }));
 try{
  const canonical=await worker.dispatchFetch(ORIGIN+"/sitemap.xml");
  assert.equal(canonical.status,200);
  const image=await worker.dispatchFetch(IMAGE_SITEMAP_URL);
  assert.equal(image.status,200);
  assert.match(image.headers.get("content-type"),/application\/xml/);
  const dynamic=imageSitemapFromCanonical(await canonical.text());
  const actual=await image.text();
  assert.equal(actual,dynamic);
  const head=await worker.dispatchFetch(IMAGE_SITEMAP_URL,{method:"HEAD"});
  assert.equal(head.status,200);
  assert.equal(await head.text(),"");
 } finally {await worker.dispose();}
});

test("Google sitemap API securely accepts both site feeds and rejects unrelated URL destinations",async()=>{
 for(const siteUrl of ["sc-domain:buysell.best","https://buysell.best/"]){
  for(const url of [ORIGIN+"/sitemap.xml",IMAGE_SITEMAP_URL]){
   const result=await submitSitemap(siteUrl,"write-token",async(endpoint,init)=>{
    assert.equal(init.method,"PUT");
    assert.equal(init.headers.authorization,"Bearer write-token");
    assert.equal(endpoint,"https://www.googleapis.com/webmasters/v3/sites/"+encodeURIComponent(siteUrl)+"/sitemaps/"+encodeURIComponent(url));
    return new Response(null,{status:204});
   },url);
   assert.deepEqual(result,{submitted:true,url});
  }
 }
 await assert.rejects(
  ()=>submitSitemap("sc-domain:buysell.best","token",async()=>new Response(null,{status:204}),"https://evil.example/sitemap.xml"),
  /GSC_SITEMAP_URL_INVALID/
 );
});
