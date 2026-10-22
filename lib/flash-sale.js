import {renderCuratedHome,renderCuratedPage} from "./product-catalog-fallback.js";
// Verified, advertiser-approved product feeds only. Never manufacture sales,
// offers, sale deadlines, prices, thumbnails, affiliate links or engagement.
const BASE="https://buysell.best";
const MAX_CATEGORIES=150,MAX_OFFERS_PER_CATEGORY=10,IMAGES_PER_RUN=24;
const ALLOWED_MEDIA=/^(?:[a-z0-9-]+\.)*(?:alicdn\.com|aliexpress-media\.com|aliimg\.com)$/i;
const BLOCKED=/(?:\badult\b|\bsex toys?\b|\bvap(?:e|ing)\b|\btobacco\b|\bcigarettes?\b|\bmarijuana\b|\b(?:thc|cbd)\b|\bgun\b|\bammunition\b|\bknife\b|\bsteroid\b|\bgambling\b|\bpoison\b|\bpesticide\b)/i;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const label=s=>String(s??"").replace(/<[^>]*>/g," ").replace(/[\u0000-\u001f]+/g," ").replace(/\s+/g," ").trim();
const first=(o,names)=>{for(const n of names)if(o[n]!==undefined&&o[n]!==null&&String(o[n]).trim())return o[n];return null;};
const num=x=>x!==null&&x!==""&&Number.isFinite(Number(x))?Number(x):null;
const originUrl=(input,pattern)=>{
 try{const u=new URL(String(input||""));return u.protocol==="https:"&&pattern.test(u.hostname)&&!u.username&&!u.password?u.href:null;}catch{return null;}
};
const isAliExpress=x=>originUrl(x,/(^|\.)aliexpress\.(?:com|us|ru)$/i);
const isAffiliate=x=>originUrl(x,/(^|\.)(?:rzekl\.com|admitad\.com|admitad\.com\.tr|ali\.ski|aliexpress\.(?:com|us))$/i);
const mediaSource=x=>originUrl(x,ALLOWED_MEDIA);
const feedURL=x=>originUrl(x,/(^|\.)admitad\.com$/i);
const invalidDate=x=>{if(!x)return null;const d=typeof x==="number"||/^\d{10,13}$/.test(String(x))?new Date(Number(x)*(String(x).length===10?1000:1)):new Date(x);return Number.isFinite(d.getTime())?d.toISOString():null;};
const textLimit=(v,n)=>label(v).slice(0,n);
function encodeEntity(s){return String(s||"").replace(/&(?:amp|lt|gt|quot|apos|#(\d+)|#x([0-9a-f]+));/gi,(m,dec,hex)=>dec?String.fromCodePoint(Number(dec)):hex?String.fromCodePoint(parseInt(hex,16)):( {"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&apos;":"'"}[m.toLowerCase()]||m));}
function csvRows(input){
 const rows=[];let row=[],value="",quoted=false;
 for(let i=0;i<input.length;i++){
  const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(value);value="";}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(value);value="";if(row.some(x=>x.trim()))rows.push(row);row=[];}
  else value+=c;
 }
 row.push(value);if(row.some(x=>x.trim()))rows.push(row);
 const head=(rows.shift()||[]).map(x=>x.trim().toLowerCase().replace(/^\ufeff/,""));
 return rows.map(row=>Object.fromEntries(head.map((x,i)=>[x,row[i]||""])));
}
function xmlEntries(xml){
 const offers=[...xml.matchAll(/<(?:offer|product)\b([^>]*)>([\s\S]*?)<\/(?:offer|product)>/gi)].slice(0,30000);
 return offers.map((match)=>{
  const row={},body=match[2];
  for(const kv of match[1].matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g))row[kv[1].toLowerCase()]=encodeEntity(kv[2]);
  for(const tag of body.matchAll(/<([\w-]+)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)){
   const key=tag[1].toLowerCase();if(!row[key])row[key]=encodeEntity(tag[2].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1"));
  }
  return row;
 });
}
export function parseFeed(input){
 const src=String(input||"").trim();
 if(src.startsWith("[")||src.startsWith("{")){const data=JSON.parse(src);return Array.isArray(data)?data:Array.isArray(data.products)?data.products:Array.isArray(data.offers)?data.offers:[];}
 if(src.startsWith("<"))return xmlEntries(src);
 return csvRows(src);
}
function stableId(text){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0).toString(36);}
function normalizedCategory(value){
 const name=textLimit(value||"Other products",76);
 const safe=name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,58)||"other-products";
 return {name,slug:safe+"-"+stableId(name.toLowerCase())};
}
export function normalizeOffer(row,now=new Date()){
 const r=Object.fromEntries(Object.entries(row||{}).map(([k,v])=>[k.toLowerCase(),v]));
 const title=textLimit(first(r,["name","title","product_title","product_name"]),115);
 const category=normalizedCategory(first(r,["category_name","category","product_category","categoryid","typeprefix"]));
 const price=num(first(r,["price_discount","sale_price","current_price","price"]));
 const oldPrice=num(first(r,["oldprice","old_price","price_old","original_price","price_original"]));
 const rawDiscount=num(first(r,["discount_percent","discount","discountpercentage"]));
 const calculated=oldPrice>price&&price>0?Math.round(10000*(oldPrice-price)/oldPrice)/100:null;
 const discount=calculated; // Source-backed percentage requires both before and sale prices.
 const currency=textLimit(first(r,["currencyid","currency","currency_id"]),3).toUpperCase();
 const image=mediaSource(first(r,["picture","image","image_url","imageurl","photo","main_image"]));
 const dest=isAffiliate(first(r,["tracking_link","affiliate_link","deeplink","product_url","url","link","url_address"]));
 const id=textLimit(first(r,["offer_id","product_id","id","productid","vendorcode"])||stableId(title+"|"+dest),80);
 const saleEnd=invalidDate(first(r,["sale_end","sale_end_time","end_time","promotion_end","saleend","end_date"]));
 if(!id||!title||!image||!dest||!price||price<=0||!Number.isFinite(discount)||discount<20||discount>=100||currency!=="USD"||oldPrice===null||BLOCKED.test(title+" "+category.name)|| (saleEnd && Date.parse(saleEnd)<=now.getTime()))return null;
 if(oldPrice!==null&&oldPrice<=price)return null;
 if(rawDiscount!==null&&Math.abs(calculated-rawDiscount)>2)return null;
 return {id,category:category.name,slug:category.slug,title,price,originalPrice:oldPrice,discount:Math.round(discount*10)/10,currency,
  imageSource:image,destination:dest,description:textLimit(first(r,["description","sales_notes","short_description"])||"Compare the exact variant, shipping and final price on AliExpress.",160),
  saleEnd,source:"Approved AliExpress affiliate product feed"};
}
export function chooseOffers(records,now=new Date()){
 const groups=new Map(),seen=new Set();
 for(const row of records){
  const p=normalizeOffer(row,now);if(!p||seen.has(p.id))continue;seen.add(p.id);
  const group=groups.get(p.slug)||{name:p.category,slug:p.slug,offers:[]};
  group.offers.push(p);groups.set(p.slug,group);
 }
 return [...groups.values()].map(group=>({...group,offers:group.offers.sort((a,b)=>b.discount-a.discount||a.price-b.price).slice(0,MAX_OFFERS_PER_CATEGORY)}))
 .sort((a,b)=>b.offers.length-a.offers.length||a.name.localeCompare(b.name)).slice(0,MAX_CATEGORIES);
}
async function schema(db){
 await db.batch([
  db.prepare("CREATE TABLE IF NOT EXISTS flash_categories (slug TEXT PRIMARY KEY, title TEXT NOT NULL, offers_json TEXT NOT NULL, content_hash TEXT NOT NULL, modified_at TEXT NOT NULL)"),
  db.prepare("CREATE TABLE IF NOT EXISTS flash_media (source_url TEXT PRIMARY KEY, image_key TEXT NOT NULL, content_type TEXT NOT NULL, stored_at TEXT NOT NULL)"),
  db.prepare("CREATE TABLE IF NOT EXISTS flash_state (name TEXT PRIMARY KEY, value TEXT NOT NULL)")
 ]);
}
async function state(db,key,val){
 await db.prepare("INSERT INTO flash_state(name,value) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(key,String(val)).run();
}
function errorCode(err){return /^FLASH_[A-Z0-9_]{1,50}$/.test(String(err?.message))?err.message:"FLASH_SYNC_ERROR";}
async function cacheImages(db,r2,groups,fetcher,now){
 if(!r2)return 0;
 const cached=await db.prepare("SELECT source_url FROM flash_media LIMIT 6000").all();
 const seen=new Set((cached.results||[]).map(v=>v.source_url));
 let done=0,attempts=0;
 // Round-robin by category to avoid caching an entire category first.
 for(let position=0;position<10&&done<IMAGES_PER_RUN;position++){
  for(const group of groups){
   const item=group.offers[position];if(!item||seen.has(item.imageSource))continue;
   seen.add(item.imageSource);
   if(++attempts>48)return done;
   try{
    const res=await fetcher(item.imageSource,{redirect:"manual",headers:{accept:"image/webp,image/jpeg,image/png,image/avif"}});
    const length=num(res.headers.get("content-length")),type=(res.headers.get("content-type")||"").split(";")[0].toLowerCase();
    if(!res.ok|| (length!==null&&length>1200000)||!["image/jpeg","image/png","image/webp","image/avif"].includes(type))continue;
    const bytes=await res.arrayBuffer();if(bytes.byteLength<300||bytes.byteLength>1200000)continue;
    const ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"})[type];
    const key="items/"+stableId(item.imageSource)+"."+ext;
    await r2.put(key,bytes,{httpMetadata:{contentType:type,cacheControl:"public, max-age=604800, immutable"}});
    await db.prepare("INSERT INTO flash_media(source_url,image_key,content_type,stored_at) VALUES(?,?,?,?) ON CONFLICT(source_url) DO UPDATE SET image_key=excluded.image_key,content_type=excluded.content_type,stored_at=excluded.stored_at").bind(item.imageSource,key,type,now.toISOString()).run();
    done++;
   }catch(_){/* Unavailable vendor image is never shown as a broken product photo. */}
   if(done>=IMAGES_PER_RUN)break;
  }
 }
 return done;
}
export async function syncFlashSale(env,opts={}){
 if(!env?.DB)return {status:"db-unavailable"};
 if(!env.ALIEXPRESS_PRODUCT_FEED_URL)return {status:"feed-not-configured"};
 const db=env.DB,now=opts.now||new Date(),fetcher=opts.fetcher||fetch,source=feedURL(env.ALIEXPRESS_PRODUCT_FEED_URL);
 await schema(db);
 if(!source){await state(db,"error","FLASH_FEED_HOST_INVALID");return {status:"invalid-feed-host"};}
 let groups;
 try{
  const response=await fetcher(source,{redirect:"manual",headers:{accept:"text/csv,application/xml,text/xml,application/json"}});
  const len=num(response.headers.get("content-length"));
  if(!response.ok)throw new Error("FLASH_FEED_HTTP_"+response.status);
   if(len>25000000)throw new Error("FLASH_FEED_TOO_LARGE");
  const input=await response.text();if(input.length>25000000)throw new Error("FLASH_FEED_TOO_LARGE");
  groups=chooseOffers(parseFeed(input),now);if(!groups.length)throw new Error("FLASH_FEED_NO_VERIFIED_SALES");
 }catch(error){
  await state(db,"error",errorCode(error));
  return {status:"error",code:errorCode(error)};
 }
 let total=0;
 // SQL upserts do not rewrite lastmod for unchanged price, discount or source.
 for(const group of groups){
  const data=JSON.stringify(group.offers);
  const hash=stableId(data);
  await db.prepare("INSERT INTO flash_categories (slug,title,offers_json,content_hash,modified_at) VALUES (?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,offers_json=excluded.offers_json,content_hash=excluded.content_hash,modified_at=CASE WHEN flash_categories.content_hash=excluded.content_hash THEN flash_categories.modified_at ELSE excluded.modified_at END").bind(group.slug,group.name,data,hash,now.toISOString()).run();
  total+=group.offers.length;
 }
 const active=groups.map(g=>g.slug);
 const existing=await db.prepare("SELECT slug FROM flash_categories").all();
 for(const row of existing.results||[])if(!active.includes(row.slug))
  await db.prepare("DELETE FROM flash_categories WHERE slug=?").bind(row.slug).run();
 const images=await cacheImages(db,env.FLASH_MEDIA,groups,fetcher,now);
 await state(db,"last_success",now.toISOString());
 await state(db,"error","");
 await state(db,"offers_count",total);
 await state(db,"category_count",groups.length);
 return {status:"ok",offers:total,categories:groups.length,imagesCached:images};
}
export async function loadFlashSale(env,opts={}){
 if(!env?.DB)return [];
 try{
  const now=opts.now||new Date();
  const last=await env.DB.prepare("SELECT value FROM flash_state WHERE name='last_success'").first();
  if(!last?.value||now.getTime()-Date.parse(last.value)>30*3600000)return [];
  const [rows,media]=await Promise.all([
   env.DB.prepare("SELECT slug,title,offers_json,modified_at FROM flash_categories ORDER BY title LIMIT 150").all(),
   env.DB.prepare("SELECT source_url,image_key FROM flash_media LIMIT 6000").all()
  ]);
  const available=new Map((media.results||[]).map(x=>[x.source_url,x.image_key]));
  return (rows.results||[]).map(row=>{
   let offers;try{offers=JSON.parse(row.offers_json);}catch{return null;}
   return {slug:row.slug,name:row.title,modifiedAt:row.modified_at,
    offers:offers.filter(p=>(!p.saleEnd||Date.parse(p.saleEnd)>now.getTime())&&available.has(p.imageSource)).map(p=>({...p,image:"/flash-media/"+available.get(p.imageSource)}))};
  }).filter(c=>c?.offers?.length);
 }catch{return [];}
}
function money(v,c){try{return new Intl.NumberFormat("en-US",{style:"currency",currency:c,maximumFractionDigits:2}).format(v);}catch{return esc(c)+" "+Number(v).toFixed(2);}}
function tile(p){
 return '<article class="flash-tile"><img src="'+esc(p.image)+'" alt="'+esc(p.title)+' — verified feed product photo" width="400" height="400" loading="lazy" decoding="async">'+
  '<div class="flash-tile-body"><span class="flash-discount">'+esc(p.discount)+'% off</span>'+
  '<h3>'+esc(p.title)+'</h3><p class="flash-desc">'+esc(p.description)+'</p>'+
  '<p class="flash-price"><strong>'+esc(money(p.price,p.currency))+'</strong>'+(p.originalPrice?'<s>'+esc(money(p.originalPrice,p.currency))+'</s>':"")+'</p>'+
  (p.saleEnd?'<p class="flash-end">Offer ends: <time datetime="'+esc(p.saleEnd)+'">'+esc(p.saleEnd.replace("T"," ").slice(0,16))+' UTC</time></p>':"")+
  '<a class="flash-shop" href="'+esc(p.destination)+'" data-sponsored-navigation rel="sponsored nofollow noopener noreferrer" aria-label="View '+esc(p.title)+' on AliExpress">View AliExpress offer ↗</a></div></article>';
}
const intro='<p class="flash-notice">Real USD prices and discounts come from an approved affiliate feed, checked daily when available. Regional prices, stock and delivery fees may change at checkout. Sponsored links may earn commissions; the optional ad can be skipped immediately.</p>';
export function renderFlashHome(groups){
 if(!groups.some(c=>c.offers?.length))return renderCuratedHome();
 const all=groups.flatMap(c=>c.offers.map(p=>({...p,group:c.name}))).sort((a,b)=>b.discount-a.discount).slice(0,36);
 return '<section class="flash-section" id="today-flash-sale"><div class="container"><div class="flash-heading"><div><span class="flash-eyebrow">ALIEXPRESS DEAL WATCH</span><h2>Today’s highest verified AliExpress discounts</h2></div><a href="/flash-sale/">Browse categories →</a></div>'+
 (all.length?intro+'<div class="flash-grid">'+all.map(tile).join("")+'</div>':
 '<p class="flash-notice">Live sale prices are not available yet. We never display invented discounts. <a href="/products/">Browse researched products →</a></p>')+'</div></section>';
}
export function renderFlashPage(groups,slug=null,page=1){
 if(!groups.some(c=>c.offers?.length))return page===1?renderCuratedPage(slug):null;
 const category=slug?groups.find(g=>g.slug===slug):null;
 if(slug&&!category)return null;
 const list=category?category.offers:groups.flatMap(c=>c.offers);
 const count=Math.max(1,Math.ceil(list.length/60));
 if(!Number.isInteger(page)||page<1||page>count)return null;
 const current=page;
 const items=list.slice((current-1)*60,current*60);
 const title=category?category.name+" — AliExpress verified discounts":"AliExpress Flash Sale Catalogue — verified USD discounts";
 const path=category?"/flash-sale/category/"+category.slug+"/":"/flash-sale/";
 const desc=category?"Browse currently verified "+category.name+" offers and compare live seller prices.":"Discover verified AliExpress affiliate feed discounts across product categories.";
 const canonical=BASE+path+(current>1?"?page="+current:"");
 const nav=!category?'<nav class="flash-categories">'+groups.map(c=>'<a href="/flash-sale/category/'+esc(c.slug)+'/">'+esc(c.name)+' ('+c.offers.length+')</a>').join("")+'</nav>':"";
 const paging=count>1?'<nav class="flash-pages">'+(current>1?'<a href="'+path+'?page='+(current-1)+'">← Previous</a>':"")+' <span>Page '+current+' of '+count+'</span> '+(current<count?'<a href="'+path+'?page='+(current+1)+'">Next →</a>':"")+'</nav>':"";
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+' | BuySell.Best</title><meta name="description" content="'+esc(desc)+'"><link rel="canonical" href="'+canonical+'">'+
 '<meta name="robots" content="'+"index,follow,max-image-preview:large"+'"><link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/flash-sale.css"></head><body>'+
 '<header class="site-header"><div class="container"><a href="/">BuySell.Best</a> · <a href="/flash-sale/">Flash Sale</a> · <a href="/products/">Buying Guides</a></div></header><main class="container flash-directory"><h1>'+esc(title)+'</h1>'+intro+nav+
 (items.length?'<div class="flash-grid">'+items.map(tile).join("")+'</div>':'<p>No currently verified sale products with first-party images. Check back after the next feed refresh.</p>')+paging+
 '</main><footer class="site-footer"><div class="container"><a href="/">Home</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div></footer></body></html>';
}
export function flashSaleSitemap(groups){
 const active=groups.filter(c=>c.offers?.length);
 if(!active.length)return "";
 const xml=[];
 // The live catalogue replaces the curated fallback; index its own real, cached photos.
 const images=[...new Set(active.flatMap(c=>c.offers.map(p=>p.image)))].filter(path=>/^\/flash-media\/items\/(?:bulk-)?[a-z0-9]+\.(?:jpg|png|webp|avif)$/.test(path));
 const hubImages=images.slice(0,200).map(path=>'<image:image><image:loc>'+BASE+esc(path)+'</image:loc></image:image>').join("");
 xml.push('<url><loc>'+BASE+'/flash-sale/</loc>'+hubImages+'</url>');
 for(const c of active){
  if(!c.offers.length)continue;
  const path=BASE+"/flash-sale/category/"+encodeURIComponent(c.slug)+"/";
  const last=String(c.modifiedAt||"").slice(0,10);
  xml.push('<url><loc>'+path+'</loc>'+(last?'<lastmod>'+last+'</lastmod>':"")+
   c.offers.map(p=>'<image:image><image:loc>'+BASE+esc(p.image)+'</image:loc></image:image>').join("")+'</url>');
 }
 return xml.join("");
}
export async function serveFlashMedia(request,env,key){
 if(!env?.FLASH_MEDIA||!/^items\/(?:bulk-)?[a-z0-9]+\.(?:jpg|png|webp|avif)$/.test(key))return new Response("Not found",{status:404});
 const object=await env.FLASH_MEDIA.get(key);
 if(!object)return new Response("Not found",{status:404});
 return new Response(request.method==="HEAD"?null:object.body,{
  headers:{"content-type":object.httpMetadata?.contentType||"image/jpeg","cache-control":"public, max-age=604800, immutable","x-content-type-options":"nosniff"}});
}
