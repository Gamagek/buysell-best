// Safely normalize Admitad's ORIGINAL AliExpress catalogue (including products
// without a sale). Never manufacture prices, discounts or affiliate tracking.
const clean = (v, n=250) => String(v ?? '').replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const field = (r, keys) => { for (const key of keys) { const value=r[key]; if(value!==undefined && value!==null && String(value).trim()) return value; } return null; };
const prohibited = /(?:\badult\b|\bsex toys?\b|\bvap(?:e|ing)\b|\btobacco\b|\bcigarettes?\b|\bmarijuana\b|\b(?:thc|cbd)\b|\bgun\b|\bammunition\b|\bsteroid\b|\bgambling\b|\bpoison\b|\bpesticide\b)/i;
function approvedAffiliate(value) {
  try {
    const u = new URL(String(value||''));
    if(u.protocol!=='https:' || u.username || u.password) return null;
    // This publisher's approved feed uses rzekl.com/g/.../?ulp=...
    if(u.hostname!=='rzekl.com' || !/^\/g\/[a-zA-Z0-9]+\//.test(u.pathname)) return null;
    const merchant=new URL(u.searchParams.get('ulp')||'');
    if(merchant.protocol!=='https:' || merchant.username || merchant.password || !/(^|\.)aliexpress\.com$/i.test(merchant.hostname)) return null;
    if(!/\/(?:item|i)\/\d+\.html/i.test(merchant.pathname)) return null;
    return u.href;
  } catch { return null; }
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
  const destination=approvedAffiliate(field(r,['tracking_link','affiliate_link','deeplink','url','link']));
  const imageSource=approvedImage(field(r,['picture','image','image_url','imageurl']));
  const price=number(field(r,['price','sale_price','price_discount']));
  const old=number(field(r,['oldprice','old_price','original_price']));
  const currency=clean(field(r,['currencyid','currency','currency_id']),3).toUpperCase();
  const rawId=clean(field(r,['offer_id','product_id','id','productid','vendorcode']),90);
  let id=rawId;
  if(!id && destination) { try {const u=new URL(new URL(destination).searchParams.get('ulp')); id=u.pathname.match(/\/(?:item|i)\/(\d+)\.html/i)?.[1]||'';} catch {} }
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
