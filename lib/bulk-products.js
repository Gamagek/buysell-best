// Progressive publisher-approved AliExpress import. Never infer offer urgency,
// fake a discount, or publish a page before a verified first-party photo exists.
import {parseFeed,normalizeOffer} from "./flash-sale.js";

const BASE="https://buysell.best";
export const HOURLY_PRODUCT_LIMIT=50;
export const DAILY_PRODUCT_LIMIT=1200;
const MAX_IMAGE_ATTEMPTS=85, MAX_SCAN_BYTES=50000000, MAX_SCANNED_RECORDS=50000;
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const strip=s=>String(s??"").replace(/\s+/g," ").trim();
const dayColombo=now=>new Date(now.getTime()+330*60000).toISOString().slice(0,10);
function idOf(product) {
  // Only normalized, proven feed product identifiers are used as D1 keys.
  return String(product.id).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,90);
}
function slugOf(product) {
  const name=strip(product.title).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,72);
  const id=idOf(product).toLowerCase().slice(0,40);
  return (name||"item")+"-"+id;
}
function validatedSource(url) {
  try {
    const parsed=new URL(String(url||""));
    return parsed.protocol==="https:"&&/(^|\.)admitad\.com$/i.test(parsed.hostname)&&!parsed.username&&!parsed.password;
  }catch{return false;}
}
function photoSource(url) {
  try{
    const parsed=new URL(url);
    return parsed.protocol==="https:"&&/(^|\.)alicdn\.com$|(^|\.)aliexpress-media\.com$|(^|\.)aliimg\.com$/i.test(parsed.hostname);
  }catch{return false;}
}
function hash(input) {
  const run=prefix=>{let n=2166136261;for(const ch of prefix+input)n=Math.imul(n^ch.charCodeAt(0),16777619);return (n>>>0).toString(36);};
  // Two independent 32-bit hashes make R2 filename collisions unlikely at 10k.
  return run("one:")+run("two:");
}
function validImageBytes(bytes,type) {
  const a=new Uint8Array(bytes);
  if(a.length<300||a.length>1400000)return false;
  if(type==="image/jpeg")return a[0]===255&&a[1]===216&&a[2]===255;
  if(type==="image/png")return a[0]===137&&a[1]===80&&a[2]===78&&a[3]===71;
  if(type==="image/webp")return String.fromCharCode(...a.slice(0,4))==="RIFF"&&String.fromCharCode(...a.slice(8,12))==="WEBP";
  if(type==="image/avif")return String.fromCharCode(...a.slice(4,8))==="ftyp";
  return false;
}
const EXT={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};
function xmlRows(buffer) {
  const result=[];
  let remaining=buffer;
  while(true) {
    const match=remaining.match(/<(offer|product)\b[^>]*>[\s\S]*?<\/\1\s*>/i);
    if(!match)break;
    const parsed=parseFeed(match[0]);
    if(parsed.length)result.push(parsed[0]);
    remaining=remaining.slice((match.index||0)+match[0].length);
  }
  return {result,remaining};
}
export async function scanVerifiedFeed(response,knownIds,{maxItems=85,maxRecords=MAX_SCANNED_RECORDS,maxBytes=MAX_SCAN_BYTES,now=new Date()}={}){
  if(!response?.ok||!response.body)throw new Error("BULK_FEED_UNAVAILABLE");
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let buffer="",bytes=0,scanned=0;const choices=[],unique=new Set();
  let finished=false;
  try{
    while(choices.length<maxItems&&scanned<maxRecords&&bytes<maxBytes){
      const {done,value}=await reader.read();
      if(done){finished=true;buffer+=decoder.decode();break;}
      bytes+=value?.byteLength||0;
      if(bytes>maxBytes)break;
      buffer+=decoder.decode(value,{stream:true});
      // A single oversize XML record is discarded; never build an unbounded buffer.
      if(buffer.length>2000000&&!buffer.includes("</offer>")&&!buffer.includes("</product>"))throw new Error("BULK_XML_RECORD_TOO_LARGE");
      const extracted=xmlRows(buffer);buffer=extracted.remaining.slice(-2200000);
      for(const row of extracted.result){
        if(++scanned>maxRecords)break;
        const item=normalizeOffer(row,now);
        if(!item||!photoSource(item.imageSource)||!item.title||item.title.length<12)continue;
        const id=idOf(item);
        if(!id||knownIds.has(id)||unique.has(id))continue;
        unique.add(id);choices.push(item);
        if(choices.length>=maxItems)break;
      }
    }
    if(finished&&buffer){
      const extracted=xmlRows(buffer);
      for(const row of extracted.result){
        if(choices.length>=maxItems)break;
        const item=normalizeOffer(row,now);
        if(!item||!photoSource(item.imageSource)||item.title.length<12)continue;
        const id=idOf(item);
        if(!id||knownIds.has(id)||unique.has(id))continue;
        unique.add(id);choices.push(item);
      }
    }
  }finally{await reader.cancel().catch(()=>{});}
  return {items:choices,scanned,bytes};
}
async function ensureTables(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS bulk_products (slug TEXT PRIMARY KEY, external_id TEXT UNIQUE NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL, image_key TEXT NOT NULL, destination TEXT NOT NULL, price REAL NOT NULL, original_price REAL, discount REAL NOT NULL, currency TEXT NOT NULL, description TEXT NOT NULL, sale_end TEXT, published_at TEXT NOT NULL, published_day TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS bulk_products_day_idx ON bulk_products(published_day)"),
    db.prepare("CREATE TABLE IF NOT EXISTS bulk_state (name TEXT PRIMARY KEY,value TEXT NOT NULL)")
  ]);
}
async function saveState(db,key,value){
  await db.prepare("INSERT INTO bulk_state(name,value) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(key,String(value)).run();
}
async function copyPhoto(product,r2,fetcher){
  const src=product.imageSource;
  if(!photoSource(src))return null;
  try{
    const res=await fetcher(src,{redirect:"manual",headers:{accept:"image/webp,image/jpeg,image/png,image/avif"}});
    const type=(res.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
    if(!res.ok||!EXT[type])return null;
    const length=Number(res.headers.get("content-length")||"0");
    if(length>1400000)return null;
    const bytes=await res.arrayBuffer();
    if(!validImageBytes(bytes,type))return null;
    const key="items/bulk-"+hash(idOf(product)+"-"+src)+"."+EXT[type];
    await r2.put(key,bytes,{httpMetadata:{contentType:type,cacheControl:"public,max-age=604800,immutable"}});
    return key;
  }catch{return null;}
}
export async function importHourlyBulkProducts(env,{now=new Date(),fetcher=fetch}={}){
  if(!env?.DB||!env?.FLASH_MEDIA||!env?.ALIEXPRESS_PRODUCT_FEED_URL)
    return {status:"not-configured",published:0};
  if(!validatedSource(env.ALIEXPRESS_PRODUCT_FEED_URL))
    return {status:"invalid-feed-host",published:0};
  const db=env.DB;
  await ensureTables(db);
  const day=dayColombo(now);
  const prev=await db.prepare("SELECT COUNT(*) AS n FROM bulk_products WHERE published_day=?").bind(day).first();
  const allowance=Math.min(HOURLY_PRODUCT_LIMIT,DAILY_PRODUCT_LIMIT-Number(prev?.n||0));
  if(allowance<=0)return {status:"daily-limit",published:0};
  let response;
  try{
    response=await fetcher(env.ALIEXPRESS_PRODUCT_FEED_URL,{redirect:"manual",
      headers:{accept:"application/xml,text/xml,text/csv,application/json"}});
    if(!response.ok)throw new Error("BULK_FEED_HTTP_"+response.status);
  }catch{
    await saveState(db,"last_error","BULK_FEED_UNAVAILABLE");
    return {status:"feed-error",published:0};
  }
  const existing=await db.prepare("SELECT external_id FROM bulk_products ORDER BY published_at DESC LIMIT 20000").all();
  const ids=new Set((existing.results||[]).map(x=>x.external_id));
  let scan;
  try{scan=await scanVerifiedFeed(response,ids,{maxItems:MAX_IMAGE_ATTEMPTS,now});}
  catch{
    await saveState(db,"last_error","BULK_XML_STREAM_ERROR");
    return {status:"parse-error",published:0};
  }
  let published=0,imageAttempts=0;
  const urls=[];
  for(const p of scan.items) {
    if(published>=allowance||imageAttempts>=MAX_IMAGE_ATTEMPTS)break;
    const slug=slugOf(p);
    if(!slug||!idOf(p))continue;
    imageAttempts++;
    const key=await copyPhoto(p,env.FLASH_MEDIA,fetcher);
    if(!key)continue;
    const row=await db.prepare("INSERT OR IGNORE INTO bulk_products (slug,external_id,title,category,image_key,destination,price,original_price,discount,currency,description,sale_end,published_at,published_day) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(
      slug,idOf(p),p.title,p.category,key,p.destination,p.price,p.originalPrice,p.discount,p.currency,p.description,p.saleEnd,now.toISOString(),day).run();
    if(row.meta?.changes){
      published++;urls.push(BASE+"/flash-sale/product/"+slug+"/");
    }
  }
  const total=await db.prepare("SELECT COUNT(*) AS n FROM bulk_products").first();
  const values={last_run:now.toISOString(),last_published:published,total_published:total?.n||0,scanned_offers:scan.scanned,last_error:""};
  for(const [key,value] of Object.entries(values))await saveState(db,key,value);
  return {status:published?"published":"no-new-verified-images",published,dayTotal:Number(prev?.n||0)+published,total:Number(total?.n||0),scanned:scan.scanned,urls};
}

// User-authorized one-time GitHub runner sends up to five VERIFIED SOURCE rows
// per request, signed by its GitHub OIDC job identity. This is not an hourly task.
export async function initOneTimeCatalogue(env){
 if(!env?.DB||!env?.FLASH_MEDIA)return {status:"not-configured"};
 await ensureTables(env.DB);
 return {status:"ready"};
}
export async function importOneTimeVerifiedBatch(env,rows,{now=new Date(),fetcher=fetch}={}){
 if(!env?.DB||!env?.FLASH_MEDIA||!Array.isArray(rows)||rows.length<1||rows.length>5)
  return {status:"invalid-batch",published:0,skipped:0};
 let published=0,skipped=0;
 const day=dayColombo(now);
 for(const raw of rows){
  const product=normalizeOffer(raw,now);
  if(!product||!photoSource(product.imageSource)||product.title.length<12){skipped++;continue;}
  const slug=slugOf(product),id=idOf(product);
  if(!id||!slug){skipped++;continue;}
  const existing=await env.DB.prepare("SELECT slug FROM bulk_products WHERE external_id=? LIMIT 1").bind(id).first();
  if(existing){skipped++;continue;}
  const key=await copyPhoto(product,env.FLASH_MEDIA,fetcher);
  if(!key){skipped++;continue;}
  const response=await env.DB.prepare(
   "INSERT OR IGNORE INTO bulk_products (slug,external_id,title,category,image_key,destination,price,original_price,discount,currency,description,sale_end,published_at,published_day) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(slug,id,product.title,product.category,key,product.destination,product.price,product.originalPrice,
    product.discount,product.currency,product.description,product.saleEnd,now.toISOString(),day).run();
  if(response.meta?.changes)published++;else skipped++;
 }
 return {status:"processed",published,skipped};
}

const SELECT="slug,external_id,title,category,image_key,destination,price,original_price,discount,currency,description,sale_end,published_at";
export async function bulkProduct(env,slug){
  if(!env?.DB||!/^[a-z0-9-]{5,140}$/.test(slug))return null;
  try{return await env.DB.prepare("SELECT "+SELECT+" FROM bulk_products WHERE slug=?").bind(slug).first();}
  catch{return null;}
}
export async function bulkDirectory(env,{page=1,size=60}={}){
  if(!env?.DB)return {total:0,items:[],page:1};
  const current=Math.max(1,Math.min(1000,Math.floor(Number(page)||1)));
  try{
    const n=await env.DB.prepare("SELECT COUNT(*) AS n FROM bulk_products").first();
    const rows=await env.DB.prepare("SELECT "+SELECT+" FROM bulk_products ORDER BY published_at DESC, slug DESC LIMIT ? OFFSET ?").bind(size,size*(current-1)).all();
    return {total:Number(n?.n||0),items:rows.results||[],page:current};
  }catch{return {total:0,items:[],page:1};}
}
export async function bulkSitemap(env){
  if(!env?.DB)return "";
  try{
    const rows=await env.DB.prepare("SELECT slug,image_key,published_at FROM bulk_products ORDER BY slug LIMIT 40000").all();
    return (rows.results||[]).map(row=>'<url><loc>'+BASE+'/flash-sale/product/'+escape(row.slug)+'/</loc><lastmod>'+escape(row.published_at.slice(0,10))+'</lastmod><image:image><image:loc>'+BASE+'/flash-media/'+escape(row.image_key)+'</image:loc></image:image></url>').join("");
  }catch{return "";}
}
export function bulkImagePath(row){return "/flash-media/"+row.image_key;}
function money(v,c){
  try{return new Intl.NumberFormat("en-US",{style:"currency",currency:c}).format(v);}
  catch{return escape(c)+" "+Number(v).toFixed(2);}
}
const ads='<link rel="stylesheet" href="/css/sponsored-click.css"><script id="bsb-sponsored-clicks" src="/js/sponsored-click.js" defer></script>';
function card(row){
  const path="/flash-sale/product/"+row.slug+"/";
  const img=bulkImagePath(row);
  return '<article class="flash-tile"><a href="'+path+'"><img src="'+escape(img)+'" alt="'+escape(row.title)+' — AliExpress listing photo" width="400" height="400" loading="lazy" decoding="async"></a>'+
  '<div class="flash-tile-body"><span class="flash-discount">'+escape(row.discount)+'% off*</span><h3><a href="'+path+'">'+escape(row.title)+'</a></h3>'+
  '<p class="flash-desc">'+escape(row.description)+'</p><p class="flash-price"><strong>'+escape(money(row.price,row.currency))+'</strong>'+
  (row.original_price?'<s>'+escape(money(row.original_price,row.currency))+'</s>':"")+'</p>'+
  (row.sale_end?'<p class="flash-end">Feed end: '+escape(row.sale_end.replace("T"," ").slice(0,16))+' UTC</p>':"")+
  '<a class="flash-shop" href="'+escape(row.destination)+'" data-sponsored-navigation rel="sponsored nofollow noopener noreferrer">View AliExpress ↗</a></div></article>';
}
export function renderBulkHome(items){
  if(!items.length)return "";
  return '<section class="flash-section" id="today-flash-sale"><div class="container"><div class="flash-heading"><div><span class="flash-eyebrow">APPROVED ALIEXPRESS FEED</span><h2>Latest verified-feed product picks</h2></div><a href="/flash-sale/">Browse full catalogue →</a></div>'+
    '<p class="flash-notice">*Feed-reported discounts; prices and availability may change. Verify the selected variant at the seller. No countdown is shown without a real deadline. Sponsored links use an optional skippable ad.</p>'+
    '<div class="flash-grid">'+items.slice(0,24).map(card).join("")+'</div></div></section>';
}
function shell(title,description,path,body,{index=true,image=null,structured=null}={}){
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<title>'+escape(title)+' | BuySell.Best</title><meta name="description" content="'+escape(description)+'">'+
   '<meta name="robots" content="'+(index?"index,follow,max-image-preview:large":"noindex,follow")+'"><link rel="canonical" href="'+BASE+path+'">'+
   (image?'<meta property="og:image" content="'+BASE+escape(image)+'"><meta name="twitter:card" content="summary_large_image">':"")+
   (structured?'<script type="application/ld+json">'+JSON.stringify(structured).replace(/</g,"\\u003c")+'</script>':"")+
   '<link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/flash-sale.css">'+ads+
   '</head><body><header class="site-header"><div class="container nav-wrap"><a class="brand" href="/">BuySell.Best</a><nav class="nav"><a href="/flash-sale/">Catalogue</a><a href="/products/">Buying guides</a></nav></div></header>'+
   '<main class="container flash-directory">'+body+'</main><footer class="site-footer"><div class="container"><a href="/">Home</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div></footer></body></html>';
}
export function renderBulkProductPage(p,now=new Date()){
  if(!p)return null;
  const path="/flash-sale/product/"+p.slug+"/",img=bulkImagePath(p);
  const expired=p.sale_end&&Date.parse(p.sale_end)<=now.getTime();
  const description="Compare "+p.title+" using an AliExpress feed listing: price, photographed product, seller details and practical buying checks.";
  const schema={"@context":"https://schema.org","@type":"Product",name:p.title,description:p.description,image:[BASE+img],
    url:BASE+path,offers:{"@type":"Offer",url:p.destination,priceCurrency:p.currency,price:p.price,
    ...(p.sale_end?{priceValidUntil:p.sale_end.slice(0,10)}:{})}};
  const body='<article class="flash-product-detail"><nav><a href="/flash-sale/">‹ Product Catalogue</a></nav><h1>'+escape(p.title)+'</h1>'+
    '<p class="flash-notice">Independent buying checklist using details supplied by an approved affiliate product feed; this is not a hands-on product review. Prices are feed-reported and must be rechecked on AliExpress.</p>'+
    '<div class="flash-product-overview"><figure><img src="'+escape(img)+'" alt="'+escape(p.title)+' — AliExpress seller listing photo" width="600" height="600" fetchpriority="high"><figcaption>Seller-provided listing image. Appearance and included accessories may differ by variant.</figcaption></figure>'+
    '<section><h2>Listing summary</h2><p>'+escape(p.description)+'</p><p><strong>Category:</strong> '+escape(p.category)+'</p>'+
    '<p class="flash-price"><strong>'+escape(money(p.price,p.currency))+'</strong>'+
    (p.original_price?'<s>'+escape(money(p.original_price,p.currency))+'</s>':"")+'</p>'+
    '<p><span class="flash-discount">'+escape(p.discount)+'% discount reported by affiliate feed</span></p>'+
    (p.sale_end?'<p>Feed promotion end: '+escape(p.sale_end.replace("T"," ").slice(0,16))+' UTC</p>':"")+
    (expired?'<p>Promotion deadline may have passed. Confirm current price and availability.</p>':"")+
    '<a class="flash-shop" href="'+escape(p.destination)+'" data-sponsored-navigation rel="sponsored nofollow noopener noreferrer">Check current AliExpress listing ↗</a></section></div>'+
    '<section class="flash-product-research"><h2>Buyer checks for this listing</h2><p>Verify the exact model or variation shown in the seller listing. Product photos and the headline may reflect different configurations, bundles or colours. Compare the description against the selected item and check dimensions, material or connections where relevant.</p>'+
    '<p>Confirm the full price after shipping and taxes, shipping eligibility to your country, recent feedback for the chosen variant, and return rules. The feed percentage is a snapshot; it does not prove the offer is still running or that the original price was the normal market price.</p>'+
    '<p>Use this page as a product-discovery aid rather than an independent performance test. No claims of first-hand use, product authenticity or warranty approval are made.</p></section></article>';
  return shell(p.title+" — AliExpress product buying checks",description,path,body,{image:img,structured:schema});
}
export function renderBulkDirectoryPage({items,total,page}){
  const path="/flash-sale/",pages=Math.max(1,Math.ceil(total/60));
  const nav='<div class="flash-pages">'+(page>1?'<a href="'+path+'?page='+(page-1)+'">← Previous</a>':"")+
    '<span>Page '+page+' of '+pages+'</span>'+(page<pages?'<a href="'+path+'?page='+(page+1)+'">Next →</a>':"")+'</div>';
  const body='<h1>AliExpress Product Catalogue</h1><p class="flash-notice">Explore '+total+' distinct source-backed listings with saved seller images, reported prices and individual buying-check pages. Verify the current deal and availability with the merchant. These are not independent hands-on reviews.</p>'+
    '<p><a href="/products/">View detailed buying guides →</a></p><div class="flash-grid">'+items.map(card).join("")+'</div>'+nav;
  return shell("AliExpress Product Catalogue","Real AliExpress seller listings with descriptions, photos and feed-reported discounts.",path,body,{index:page===1});
}
