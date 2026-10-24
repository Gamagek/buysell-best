// Separate, paginated, verified affiliate-product and seller-image XML sitemaps.
// Static editorial images remain in /image-sitemap.xml; this module emits only
// real crawlable FIRST-PARTY R2 seller photo URLs that are tied to a product page.
import {flashProductPath} from "./flash-sale.js";
const ORIGIN="https://buysell.best";
const MAX_PER_FILE=1000;
const PHOTO=/^\/flash-media\/items\/(?:bulk-)?[a-z0-9]+\.(?:jpg|png|webp|avif)$/;
const HEADER='<?xml version="1.0" encoding="UTF-8"?>\n';
const URLSET='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
const IMAGESET='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';
function xml(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function eligible(row){
 return row&&row.currency==="USD"&&Number(row.discount)>=20&&
  Number(row.price)>0&&Number(row.originalPrice)>Number(row.price)&&
  PHOTO.test(String(row.image||""))&&typeof row.destination==="string";
}
export function affiliateIndexedProducts(groups,now=new Date()){
 const out=[],seen=new Set(),limit=10000;
 for(const group of Array.isArray(groups)?groups:[]){
  if(!group?.slug||!/^[a-z0-9-]+$/.test(group.slug))continue;
  for(const p of group.offers||[]){
   if(!eligible(p)||(p.saleEnd&&Date.parse(p.saleEnd)<=now.getTime()))continue;
   const path=flashProductPath(p);
   if(!/^\/flash-sale\/product\/[a-z0-9-]+\/$/.test(path)||seen.has(path))continue;
   seen.add(path);
   out.push({url:ORIGIN+path,image:ORIGIN+p.image});
   if(out.length>limit)throw new Error("AFFILIATE_SITEMAP_PAGE_LIMIT");
  }
 }
 out.sort((a,b)=>a.url.localeCompare(b.url));
 return out;
}
export function affiliateShardCount(groups,now=new Date(),shardSize=MAX_PER_FILE){
 return Math.ceil(affiliateIndexedProducts(groups,now).length/shardSize);
}
export function renderAffiliateShard(groups,{kind="products",page=1,shardSize=MAX_PER_FILE,now=new Date()}={}){
 if(!["products","images"].includes(kind)||!Number.isInteger(page)||page<1||
 !Number.isInteger(shardSize)||shardSize<1||shardSize>MAX_PER_FILE)return null;
 const products=affiliateIndexedProducts(groups,now);
 const from=(page-1)*shardSize;
 if(from>=products.length)return null;
 const entries=products.slice(from,from+shardSize);
 return HEADER+(kind==="products"?URLSET:IMAGESET)+"\n"+
  entries.map(entry=>kind==="products"?
   '<url><loc>'+xml(entry.url)+'</loc></url>':
   '<url><loc>'+xml(entry.url)+'</loc><image:image><image:loc>'+xml(entry.image)+
   '</image:loc></image:image></url>').join("\n")+"\n</urlset>\n";
}
export function renderPublicSitemapIndex(groups,{now=new Date()}={}){
 const refs=[ORIGIN+"/sitemap.xml",ORIGIN+"/image-sitemap.xml"];
 const count=affiliateShardCount(groups,now);
 for(let i=1;i<=count;i++){
  refs.push(ORIGIN+"/sitemaps/affiliate-products-"+i+".xml");
  refs.push(ORIGIN+"/sitemaps/affiliate-images-"+i+".xml");
 }
 return HEADER+'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
  refs.map(ref=>'<sitemap><loc>'+xml(ref)+'</loc></sitemap>').join("\n")+
  '\n</sitemapindex>\n';
}
