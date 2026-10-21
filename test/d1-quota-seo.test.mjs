import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

function quotaContext() {
  let reads=0;
  return {
    get reads(){return reads;},
    env:{
      DB:{prepare() {reads++;throw new Error("D1_ERROR 7500: Your account has exceeded D1 free tier daily row read limit");}}
    },
    ctx:{waitUntil() {}}
  };
}

test("published item and category routes return retryable 503 instead of false 404/empty 200 on D1 quota",async()=>{
  const c=quotaContext();
  for(const path of ["/item/active-product", "/category/phones"]){
    const res=await worker.fetch(new Request("https://buysell.best"+path),c.env,c.ctx);
    assert.equal(res.status,503,path);
    assert.match(res.headers.get("x-robots-tag")||"",/noindex/);
    assert.equal(res.headers.get("retry-after"),"180");
    assert.equal(res.headers.get("cache-control"),"no-store");
    assert.ok(c.reads>0);
  }
});

test("sitemaps fail closed on D1 quota instead of delivering an incomplete indexable 200",async()=>{
  const c=quotaContext();
  for(const path of ["/sitemap.xml","/image-sitemap.xml"]){
    const res=await worker.fetch(new Request("https://buysell.best"+path),c.env,c.ctx);
    assert.equal(res.status,503,path);
    assert.match(res.headers.get("x-robots-tag")||"",/noindex/);
    assert.equal(res.headers.get("retry-after"),"180");
    assert.doesNotMatch(await res.text(),/<urlset|<url>/);
  }
});
