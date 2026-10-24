// Sharded SEO entries for published first-party seller photos.
// Query the actual indexed D1 product rows, not hypothetical feed candidates.
const ORIGIN="https://buysell.best";
const MAX=1000;
const xml=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const HEAD='<?xml version="1.0" encoding="UTF-8"?>\n';
const IMG=/^items\/bulk-[a-z0-9]+\.(jpg|jpeg|png|webp|avif)$/;
export async function bulkPublishedCount(db,now=new Date()){
 if(!db)return 0;
 try{
  const row=await db.prepare("SELECT COUNT(*) AS n FROM bulk_products WHERE sale_end IS NULL OR sale_end>?").bind(now.toISOString()).first();
  return Math.min(10000,Math.max(0,Number(row?.n)||0));
 }catch{return 0;}
}
export async function bulkSitemapIndex(db,{now=new Date()}={}){
 const n=await bulkPublishedCount(db,now);
 const refs=[ORIGIN+"/sitemap.xml",ORIGIN+"/image-sitemap.xml"];
 for(let page=1;page<=Math.ceil(n/MAX);page++){
  refs.push(ORIGIN+"/sitemaps/affiliate-products-"+page+".xml");
  refs.push(ORIGIN+"/sitemaps/affiliate-images-"+page+".xml");
 }
 return HEAD+'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
  refs.map(u=>'  <sitemap><loc>'+xml(u)+'</loc></sitemap>').join("\n")+"\n</sitemapindex>\n";
}
export async function bulkSitemapShard(db,kind,page,{now=new Date()}={}){
 if(!db||!["products","images"].includes(kind)||!Number.isInteger(page)||page<1||page>10)return null;
 const rows=await db.prepare(
 "SELECT slug,image_key,published_at FROM bulk_products WHERE sale_end IS NULL OR sale_end>? ORDER BY slug LIMIT ? OFFSET ?"
 ).bind(now.toISOString(),MAX,(page-1)*MAX).all();
 const items=(rows.results||[]).filter(x=>/^[a-z0-9-]{5,140}$/.test(x.slug)&&IMG.test(x.image_key));
 if(items.length===0)return null;
 const name=kind==="products"?'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">':
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';
 return HEAD+name+"\n"+items.map(row=>
  '<url><loc>'+ORIGIN+'/flash-sale/product/'+xml(row.slug)+'/</loc>'+
  (row.published_at?'<lastmod>'+xml(row.published_at.slice(0,10))+'</lastmod>':"")+
  (kind==="images"?'<image:image><image:loc>'+ORIGIN+'/flash-media/'+xml(row.image_key)+'</image:loc></image:image>':"")+
  '</url>').join("\n")+"\n</urlset>\n";
}
