// Safely normalize Admitad's ORIGINAL AliExpress catalogue (including products
// without a sale). Never manufacture prices, discounts or affiliate tracking.
const clean = (v, n=250) => String(v ?? '').replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const field = (r, keys) => { for (const key of keys) { const value=r[key]; if(value!==undefined && value!==null && String(value).trim()) return value; } return null; };
const prohibited = /(?:\badult\b|\bsex toys?\b|\bvap(?:e|ing)\b|\btobacco\b|\bcigarettes?\b|\bmarijuana\b|\b(?:thc|cbd)\b|\bgun\b|\bammunition\b|\bsteroid\b|\bgambling\b|\bpoison\b|\bpesticide\b)/i;
function approvedItemIdFromTracking(value) {
 try {
  const outer=new URL(String(value||""));
  if(outer.protocol!=="https:"||outer.hostname!=="rzekl.com"||outer.username||outer.password||!/^\/g\/[a-zA-Z0-9]+\//.test(outer.pathname))return null;
  const route=new URL(outer.searchParams.get("ulp")||"");
  if(route.protocol!=="https:"||route.username||route.password)return null;
  let item=route;
  // Admitad sometimes wraps AliExpress's own short-link intermediary.
  if(route.hostname==="s.click.aliexpress.com"&&route.pathname==="/deep_link.htm")
    item=new URL(route.searchParams.get("dl_target_url")||"");
  if(item.protocol!=="https:"||item.username||item.password||!/(^|\.)aliexpress\.com$/i.test(item.hostname))return null;
  return item.pathname.match(/^\/(?:item|i)\/(\d{8,25})\.html$/i)?.[1]||null;
 }catch{return null;}
}
function approvedAffiliate(value,expectedId=null) {
 const itemId=approvedItemIdFromTracking(value);
 if(!itemId||(expectedId&&itemId!==expectedId))return null;
 return String(value);
}
function approvedImage(value) {
  try {
    const u=new URL(String(value||''));
    return u.protocol==='https:' && !u.username && !u.password && /(^|\.)(?:alicdn\.com|aliexpress-media\.com|aliimg\.com)$/i.test(u.hostname) ? u.href : null;
  } catch { return null; }
}
const number = x => x===null || x==='' || !Number.isFinite(Number(x)) ? null : Number(x);
export function normalizeCatalogOffer(record, now=new Date()) {
  if(!record || typeof record!=='object') return null;
  const r=Object.fromEntries(Object.entries(record).map(([k,v])=>[k.toLowerCase(),v]));
  const title=clean(field(r,['name','title','product_title','product_name']),120);
  const rawId=clean(field(r,['offer_id','product_id','id','productid','vendorcode']),90);
  const destination=approvedAffiliate(field(r,['tracking_link','affiliate_link','deeplink','url','link']),/^\d{8,25}$/.test(rawId)?rawId:null);
  const imageSource=approvedImage(field(r,['picture','image','image_url','imageurl']));
  const price=number(field(r,['price','sale_price','price_discount']));
  const old=number(field(r,['oldprice','old_price','original_price']));
  const currency=clean(field(r,['currencyid','currency','currency_id']),3).toUpperCase();
  const id=rawId||approvedItemIdFromTracking(destination);
  const category=clean(field(r,['category_name','category','typeprefix','categoryid']),75)||'General shopping';
  const description=clean(field(r,['description','short_description','sales_notes']),500);
  let saleEnd=null;
  const end=field(r,['sale_end','end_date','promotion_end']);
  if(end) {const t=Date.parse(String(end));if(Number.isFinite(t))saleEnd=new Date(t).toISOString();}
  if(saleEnd && Date.parse(saleEnd)<=now.getTime())return null;
  if(!/^[a-zA-Z0-9_-]{3,90}$/.test(id)||title.length<12||!destination||!imageSource||price===null||price<=0||currency!=='USD'||prohibited.test(title+' '+category)) return null;
  const actualDiscount=old!==null && old>price ? Math.round(1000*(old-price)/old)/10 : 0;
  return {id,title,category,imageSource,destination,price,originalPrice:actualDiscount>0?old:null,
    discount:actualDiscount,currency,description:description||'Seller feed lists this item; verify its detailed specifications and variant before ordering.',saleEnd,
    source:'Admitad AliExpress WW approved product feed'};
}
