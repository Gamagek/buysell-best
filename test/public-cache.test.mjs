import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {cachedPublicResponse} from "../lib/public-cache.js";

function edge() {
  const map=new Map();
  return {
    map,
    async match(request) { return map.get(request.url)?.clone(); },
    async put(request,response) { map.set(request.url,response.clone()); }
  };
}
function r2() {
  const objects=new Map();
  return {
    objects,
    async get(key) {
      if(!objects.has(key))return null;
      return {async json(){return JSON.parse(objects.get(key));}};
    },
    async put(key,value) {objects.set(key,value);}
  };
}
function context() {
  const pending=[];
  return {
    waitUntil(task) {pending.push(task);},
    async flush() {while(pending.length)await Promise.all(pending.splice(0));}
  };
}
function html() {
  return new Response('<!doctype html><html><head><title>Home</title></head><body><a href="/products/">Products</a></body></html>',{
    status:200,headers:{"content-type":"text/html; charset=utf-8","x-robots-tag":"index,follow"}
  });
}
function xml() {
  return new Response('<?xml version="1.0"?><urlset><url><loc>https://buysell.best/</loc></url></urlset>',{
    status:200,headers:{"content-type":"application/xml; charset=utf-8"}
  });
}
function listings() {
  return new Response(JSON.stringify({ok:true,items:[{id:5,title:"Published listing"}]}),{
    status:200,headers:{"content-type":"application/json","cache-control":"no-store"}
  });
}

test("anonymous public HTML is stored at the edge, not in browser HTTP cache",async()=>{
  const before=globalThis.caches;
  globalThis.caches={default:edge()};
  try{
    const ctx=context(),env={FLASH_MEDIA:r2()},url=new Request("https://buysell.best/");
    let calls=0;
    const origin=()=>{calls++;return html();};
    const first=await cachedPublicResponse(url,env,ctx,origin);
    assert.equal(first.headers.get("Cache-Control"),"no-store");
    assert.equal(first.headers.get("X-BuySell-Edge-Cache"),"MISS");
    assert.match(await first.text(),/Products/);
    await ctx.flush();
    const second=await cachedPublicResponse(url,env,ctx,origin);
    assert.equal(second.headers.get("Cache-Control"),"no-store");
    assert.equal(second.headers.get("X-BuySell-Edge-Cache"),"HIT");
    assert.equal(calls,1);
    assert.equal(env.FLASH_MEDIA.objects.size,0,"home content is cached at edge only");
  }finally{globalThis.caches=before;}
});

test("published listing responses can be edge-cached without caching visitor data",async()=>{
  const before=globalThis.caches;
  globalThis.caches={default:edge()};
  try{
    const ctx=context(),env={DB:{},FLASH_MEDIA:r2()};
    let calls=0;
    const req=new Request("https://buysell.best/api/listings?limit=12");
    const fn=()=>{calls++;return listings();};
    assert.equal((await cachedPublicResponse(req,env,ctx,fn)).status,200);
    await ctx.flush();
    const again=await cachedPublicResponse(req,env,ctx,fn);
    assert.equal((await again.json()).items[0].id,5);
    assert.equal(again.headers.get("X-BuySell-Edge-Cache"),"HIT");
    assert.equal(again.headers.get("Cache-Control"),"no-store");
    assert.equal(calls,1);
  }finally{globalThis.caches=before;}
});

test("sitemaps persist a bounded R2 snapshot for cold edge and D1 outage",async()=>{
  const before=globalThis.caches;
  globalThis.caches={default:edge()};
  try {
    const ctx=context(),env={FLASH_MEDIA:r2()},req=new Request("https://buysell.best/sitemap.xml");
    await cachedPublicResponse(req,env,ctx,xml);
    await ctx.flush();
    assert.equal(env.FLASH_MEDIA.objects.size,1);
    globalThis.caches={default:edge()};
    let originCalls=0;
    const fresh=await cachedPublicResponse(req,env,ctx,()=>{
      originCalls++;throw Error("D1 should not be read for a fresh R2 snapshot");
    });
    assert.equal(fresh.headers.get("X-BuySell-Edge-Cache"),"R2-FRESH");
    assert.equal(originCalls,0);
    assert.match(await fresh.text(),/urlset/);
    await ctx.flush();

    for(const [key,text] of env.FLASH_MEDIA.objects){
      const data=JSON.parse(text);
      data.timestamp -= 20*60*1000;
      env.FLASH_MEDIA.objects.set(key,JSON.stringify(data));
    }
    globalThis.caches={default:edge()};
    const fallback=await cachedPublicResponse(req,env,ctx,()=>new Response("D1 outage",{status:503}));
    assert.equal(fallback.headers.get("X-BuySell-Edge-Cache"),"R2-STALE");
    assert.equal(fallback.status,200);
    assert.equal(fallback.headers.get("Cache-Control"),"no-store");
    assert.equal(env.FLASH_MEDIA.objects.size,1);
  }finally{globalThis.caches=before;}
});

test("fail closed for private interactions, unbounded parameters, and noncanonical domains",async()=>{
  const ctx=context(),env={DB:{},FLASH_MEDIA:r2()};
  const excluded=[
    new Request("https://buysell.best/api/stats?visitor_id=secret"),
    new Request("https://buysell.best/api/recommendations"),
    new Request("https://buysell.best/api/view",{method:"POST"}),
    new Request("https://buysell.best/api/listings",{headers:{Cookie:"session=private"}}),
    new Request("https://buysell.best/api/listings",{headers:{Authorization:"Bearer token"}}),
    new Request("https://buysell.best/api/listings?limit=999"),
    new Request("https://buysell.best/?q=personalised"),
    new Request("http://buysell.best/"),
    new Request("https://www.buysell.best/")
  ];
  for(const request of excluded){
    assert.equal(await cachedPublicResponse(request,env,ctx,html),null,request.url);
  }
  assert.equal(env.FLASH_MEDIA.objects.size,0);
});

test("API unavailability responses must never populate caches",async()=>{
  const before=globalThis.caches;
  globalThis.caches={default:edge()};
  try{
    const ctx=context(),env={DB:{},FLASH_MEDIA:r2()};
    const req=new Request("https://buysell.best/api/listings");
    const unavailable=new Response(JSON.stringify({ok:true,items:[],available:false}),{
      headers:{"content-type":"application/json"}
    });
    await cachedPublicResponse(req,env,ctx,()=>unavailable);
    await ctx.flush();
    assert.equal(globalThis.caches.default.map.size,0);
  }finally{globalThis.caches=before;}
});

test("service worker retains push notifications but no longer stores every GET in browser Cache Storage",()=>{
  const code=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
  assert.match(code,/notificationclick/);
  assert.match(code,/buysell-best-shell-/);
  assert.doesNotMatch(code,/addEventListener\(["']fetch["']/);
  assert.doesNotMatch(code,/cache\.put\(/);
  assert.doesNotMatch(code,/cache\.addAll\(/);
});
