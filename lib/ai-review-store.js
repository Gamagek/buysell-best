import {verifyReviewIdentity} from "./github-oidc-review.js";
// D1-backed AI-assisted buying guides. Auto publishing is allowed only for
// text grounded in the existing real product feed and passed through a
// conservative automated screening; do not label it a hands-on review.
const ORIGIN="https://buysell.best";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const norm=(s,n)=>String(s??"").replace(/[\u0000-\u001f<>]/g," ").replace(/\s+/g," ").trim().slice(0,n);
const restricted=/\b(?:we tested|i tested|i bought|we purchased|hands.on tested|hands.on review|personally tested|guaranteed|proven durable|best in class|authentic product|five.star|5.star|perfect fit|fits all|unbreakable|absolutely safe|waterproof|original manufacturer certified)\b/i;
const reUrl=/^https:\/\/[a-z0-9.-]+(?:\/[^?#\s]*)?$/i;
const MAX_DAILY=300;
async function schema(db){
 await db.batch([
  db.prepare("CREATE TABLE IF NOT EXISTS bulk_ai_reviews (slug TEXT PRIMARY KEY, summary TEXT NOT NULL, buyer_checks_json TEXT NOT NULL, verdict TEXT NOT NULL, sources_json TEXT NOT NULL, model TEXT NOT NULL, published_at TEXT NOT NULL)"),
  db.prepare("CREATE TABLE IF NOT EXISTS bulk_ai_review_attempts (slug TEXT PRIMARY KEY, tried_at TEXT NOT NULL, result TEXT NOT NULL)")
 ]);
}
export function screening(payload,product){
 const reasons=[];
 const slug=norm(payload?.slug,160),summary=norm(payload?.summary,900),verdict=norm(payload?.verdict,520);
 const checks=Array.isArray(payload?.buyer_checks)?payload.buyer_checks.map(v=>norm(v,300)):[];
 const rawSources=Array.isArray(payload?.sources)?payload.sources:[];
 const sources=rawSources.slice(0,3).map(v=>({url:norm(v?.url,600),title:norm(v?.title,150)}));
 if(!product||slug!==product.slug||!/^[a-z0-9-]{8,150}$/.test(slug))reasons.push("product_mismatch");
 if(!summary||summary.length<80||summary.length>850)reasons.push("summary");
 if(verdict.length<60||verdict.length>500)reasons.push("verdict");
 if(checks.length!==4||checks.some(v=>v.length<35||v.length>270))reasons.push("checks");
 const all=[summary,...checks,verdict].join(" ");
 if(restricted.test(all))reasons.push("fabricated_testing_or_certainty");
 // Explicit, plainly visible explanation of evidence limits is always added
 // by the server-side renderer; the AI need not repeat boilerplate each time.
 if(!all.toLowerCase().includes(String(product?.title||"").slice(0,18).toLowerCase()))
  reasons.push("identity");
 if(/https?:\/\/|www\./i.test(all))reasons.push("unverified_url_in_prose");
 if(sources.length>3||sources.some(v=>{
  try{const u=new URL(v.url);return u.protocol!=="https:"||u.username||u.password||!reUrl.test(v.url)||!v.title;}catch{return true;}
 }))reasons.push("source_urls");
 if(!/^(?:ggml-org\/Qwen3|Qwen3)/.test(String(payload?.model||"")))reasons.push("model");
 return {ok:reasons.length===0,reasons,clean:{slug,summary,buyer_checks:checks,verdict,sources,model:norm(payload?.model,90)}};
}
export function renderAiReview(review){
 if(!review)return "";
 let checks=[],sources=[];
 try{checks=JSON.parse(review.buyer_checks_json);sources=JSON.parse(review.sources_json);}catch{return "";}
 if(!Array.isArray(checks)||checks.length!==4)return "";
 const citations=Array.isArray(sources)&&sources.length?
   '<h3>Related external reading</h3><ul>'+sources.filter(x=>/^https:\/\//i.test(x?.url||"")).slice(0,3)
    .map(x=>'<li><a href="'+esc(x.url)+'" rel="nofollow noopener noreferrer" target="_blank">'+esc(x.title)+'</a> <small>(search reference; not independently verified)</small></li>').join("")+'</ul>':"";
 return '<section class="flash-product-research ai-assisted-research" aria-label="AI-assisted buying analysis">'+
  '<h2>AI-assisted buying analysis</h2>'+
  '<p class="flash-notice">Prepared from the verified affiliate listing and optional web-search context. This is a buying guide, not a first-hand test. Specifications, seller claims, reviews and final checkout prices have not been independently verified.</p>'+
  '<h3>What to consider</h3><p>'+esc(review.summary)+'</p>'+
  '<h3>Four practical checks before buying</h3><ol>'+checks.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol>'+
  '<h3>Editorial conclusion</h3><p>'+esc(review.verdict)+'</p>'+
  citations+'<p><small>AI-assisted source-limited summary · '+esc(String(review.published_at||"").slice(0,10))+
  '. Merchant listing and buyer feedback should be checked before purchase.</small></p></section>';
}
export async function readAiReview(env,slug){
 if(!env?.DB||!/^[a-z0-9-]{8,150}$/.test(slug))return null;
 try{return await env.DB.prepare("SELECT summary,buyer_checks_json,verdict,sources_json,model,published_at FROM bulk_ai_reviews WHERE slug=?").bind(slug).first();}
 catch{return null;}
}
async function boundedJSON(request){
 if(!request.body)throw Error("missing-body");
 const reader=request.body.getReader(),decoder=new TextDecoder();
 let total=0,body="";
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.byteLength;if(total>12000)throw Error("body-too-large");
   body+=decoder.decode(value,{stream:true});
  }
  return JSON.parse(body+decoder.decode());
 }finally{try{await reader.cancel();}catch{}}
}
const reply=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store","x-robots-tag":"noindex","x-content-type-options":"nosniff"}});
export async function reviewOperations(request,env){
 if(request.method!=="POST")return reply({error:"method-not-allowed"},405);
 if(!await verifyReviewIdentity(request))return reply({error:"unauthorized"},401);
 if(!env?.DB)return reply({error:"db-unavailable"},503);
 const path=new URL(request.url).pathname;
 await schema(env.DB);
 if(path==="/__ops/reviews/candidates"){
  const dayAgo=new Date(Date.now()-86400_000).toISOString();
  const rows=await env.DB.prepare(
   "SELECT p.slug,p.external_id,p.title,p.category,p.price,p.currency,p.description FROM bulk_products p "+
   "LEFT JOIN bulk_ai_reviews r ON r.slug=p.slug LEFT JOIN bulk_ai_review_attempts a ON a.slug=p.slug "+
   "WHERE r.slug IS NULL AND (a.tried_at IS NULL OR a.tried_at<?) AND (p.sale_end IS NULL OR p.sale_end>?) "+
   "ORDER BY p.published_at DESC,p.slug DESC LIMIT 8"
  ).bind(dayAgo,new Date().toISOString()).all();
  return reply({items:(rows.results||[]).map(x=>({...x,url:ORIGIN+"/flash-sale/product/"+x.slug+"/"}))});
 }
 if(path==="/__ops/reviews/publish"||path==="/__ops/reviews/failed"){
  let input;
  try{input=await boundedJSON(request);}catch{return reply({error:"invalid-body"},400);}
  const slug=String(input?.slug||"");
  if(!/^[a-z0-9-]{8,150}$/.test(slug))return reply({error:"invalid-slug"},400);
  const p=await env.DB.prepare("SELECT slug,title,destination,price FROM bulk_products WHERE slug=?").bind(slug).first();
  if(!p||!String(p.destination).startsWith("https://rzekl.com/g/"))return reply({error:"source-product-not-found"},404);
  if(path==="/__ops/reviews/failed"){
   await env.DB.prepare("INSERT INTO bulk_ai_review_attempts(slug,tried_at,result) VALUES(?,?,?) ON CONFLICT(slug) DO UPDATE SET tried_at=excluded.tried_at,result=excluded.result")
    .bind(slug,new Date().toISOString(),"rejected").run();
   return reply({status:"review-skipped"});
  }
  const test=screening(input,p);
  if(!test.ok)return reply({error:"quality-gate",reasons:test.reasons},422);
  const today=new Date().toISOString().slice(0,10);
  const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM bulk_ai_reviews WHERE substr(published_at,1,10)=?").bind(today).first();
  if(Number(count?.n||0)>=MAX_DAILY)return reply({error:"daily-review-quota"},429);
  const d=test.clean,now=new Date().toISOString();
  // Atomic, idempotent insert; don't overwrite a completed review with more AI.
  const inserted=await env.DB.prepare(
   "INSERT OR IGNORE INTO bulk_ai_reviews(slug,summary,buyer_checks_json,verdict,sources_json,model,published_at) VALUES(?,?,?,?,?,?,?)"
  ).bind(slug,d.summary,JSON.stringify(d.buyer_checks),d.verdict,JSON.stringify(d.sources),d.model,now).run();
  return reply({status:inserted.meta?.changes?"published":"already-published",url:ORIGIN+"/flash-sale/product/"+slug+"/"});
 }
 return reply({error:"not-found"},404);
}
