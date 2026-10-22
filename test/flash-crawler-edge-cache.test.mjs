import test from "node:test";
import assert from "node:assert/strict";
import {cachedPublicResponse} from "../lib/public-cache.js";
import {serveFlashMedia} from "../lib/flash-sale.js";

function memoryEdge(){
 const saved=new Map();
 return {
  saved,
  async match(req){return saved.get(req.url)?.clone()||null;},
  async put(req,res){saved.set(req.url,res.clone());}
 };
}
function html(){
 return new Response('<!doctype html><html lang="en"><head><title>Verified deal</title></head><body><h1>Seller offer</h1></body></html>',
  {headers:{"content-type":"text/html; charset=UTF-8"}});
}
function context(){
 const tasks=[];
 return {waitUntil(promise){tasks.push(promise);},async settle(){await Promise.all(tasks.splice(0));}};
}
test("crawler-facing verified flash-sale pages and paginated category pages are Cloudflare edge-cached",async()=>{
 const previous=globalThis.caches,cache=memoryEdge();globalThis.caches={default:cache};
 try{
  const ctx=context(),env={DB:{}};
  const routes=[
   "/flash-sale/",
   "/flash-sale/category/phones-12abc/",
   "/flash-sale/product/example-phone-x12/",
   "/flash-sale/?page=2",
   "/flash-sale/category/electronics-6ab/?page=2"
  ];
  for(const route of routes){
   let reads=0,req=new Request("https://buysell.best"+route);
   const loader=()=>{reads++;return html();};
   const first=await cachedPublicResponse(req,env,ctx,loader);
   assert.equal(first.headers.get("x-buysell-edge-cache"),"MISS",route);
   assert.equal(first.headers.get("cache-control"),"no-store","browser must not store HTML");
   await ctx.settle();
   const second=await cachedPublicResponse(req,env,ctx,loader);
   assert.equal(second.headers.get("x-buysell-edge-cache"),"HIT",route);
   assert.equal(reads,1,"repeat crawls should not reach D1 for "+route);
  }
 }finally{globalThis.caches=previous;}
});
test("flash-sale cache never persists visitor cookies, private headers, weird queries or missing pages",async()=>{
 const previous=globalThis.caches,cache=memoryEdge();globalThis.caches={default:cache};
 try{
  const ctx=context(),env={};
  const excluded=[
   new Request("https://buysell.best/flash-sale/product/abc-123/?page=2"),
   new Request("https://buysell.best/flash-sale/?page=1"),
   new Request("https://buysell.best/flash-sale/?page=0002"),
   new Request("https://buysell.best/flash-sale/?page=99999"),
   new Request("https://buysell.best/flash-sale/?page=2&page=3"),
   new Request("https://buysell.best/flash-sale/?session=private"),
   new Request("https://buysell.best/flash-sale/product/abc-123/",{headers:{Authorization:"Bearer private"}}),
   new Request("https://buysell.best/flash-sale/product/abc-123/",{headers:{Cookie:"session=secret"}})
  ];
  for(const req of excluded)assert.equal(await cachedPublicResponse(req,env,ctx,html),null,req.url);
  const absent=await cachedPublicResponse(new Request("https://buysell.best/flash-sale/product/missing-product/"),env,ctx,
   ()=>new Response("Product not found",{status:404}));
  assert.equal(absent.status,404);
  await ctx.settle();
  assert.equal(cache.saved.size,0,"never cache 404s, secrets or malformed requests");
 }finally{globalThis.caches=previous;}
});
test("seller's verified R2 photo is fetched once, kept at edge, with only short browser cache",async()=>{
 const previous=globalThis.caches,cache=memoryEdge();globalThis.caches={default:cache};
 try{
  const image=new Uint8Array([255,216,255,50,60,70]),ctx=context();
  let gets=0,heads=0;
  const env={FLASH_MEDIA:{
   async get(){gets++;return {body:image,httpMetadata:{contentType:"image/jpeg"}};},
   async head(){heads++;return {httpMetadata:{contentType:"image/jpeg"}};}
  }};
  const url="https://buysell.best/flash-media/items/bulk-source12.jpg";
  const first=await serveFlashMedia(new Request(url),env,"items/bulk-source12.jpg",ctx);
  assert.equal(first.status,200);
  assert.equal(first.headers.get("x-buysell-r2-edge"),"MISS");
  assert.match(first.headers.get("cache-control"),/max-age=3600/);
  assert.match(first.headers.get("cache-control"),/s-maxage=604800/);
  assert.equal((await first.arrayBuffer()).byteLength,image.length);
  await ctx.settle();
  const second=await serveFlashMedia(new Request(url),env,"items/bulk-source12.jpg",ctx);
  assert.equal(second.headers.get("x-buysell-r2-edge"),"HIT");
  assert.equal((await second.arrayBuffer()).byteLength,image.length);
  assert.equal(gets,1);
  const head=await serveFlashMedia(new Request(url,{method:"HEAD"}),env,"items/bulk-source12.jpg",ctx);
  assert.equal(head.status,200);
  assert.equal((await head.arrayBuffer()).byteLength,0);
  assert.equal(heads,1);
  assert.equal(gets,1,"HEAD should use R2 metadata only");
  assert.equal((await serveFlashMedia(new Request(url,{method:"POST"}),env,"items/bulk-source12.jpg")).status,405);
  assert.equal((await serveFlashMedia(new Request(url.replace(".jpg",".svg")),env,"items/bulk-source12.svg")).status,404);
 }finally{globalThis.caches=previous;}
});
