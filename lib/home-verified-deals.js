// Homepage merchandising for real, first-party-cached Admitad deals and sourced coupons.
// No fallback prices, discounts, merchant stock, promotion codes or deadlines are invented.
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[char]));
const USD = new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",maximumFractionDigits:2});
const SAFE_IMAGE = /^\/flash-media\/items\/(?:bulk-)?[a-z0-9]+\.(?:jpg|png|webp|avif)$/;
const SAFE_COUPON_HOST = /(^|\.)(?:admitad\.com|aliexpress\.com|rzekl\.com|ebay\.com|booking\.com|agoda\.com|expedia\.com|hotels\.com|trip\.com)$/i;

function eligible(offer, now) {
  return offer && offer.currency === "USD" && Number(offer.discount) >= 20 &&
    Number(offer.discount) < 100 && Number(offer.price) > 0 &&
    Number(offer.originalPrice) > Number(offer.price) &&
    SAFE_IMAGE.test(String(offer.image || "")) &&
    (!offer.saleEnd || Date.parse(offer.saleEnd) > now);
}
function categoryHref(group) {
  return "/flash-sale/category/" + encodeURIComponent(group.slug) + "/";
}
export function selectCategoryDiscounts(groups, limit=24, now=Date.now()) {
  const active = (Array.isArray(groups) ? groups : []).map(group=>({
    name:String(group.name || "").slice(0,76),
    slug:String(group.slug || ""),
    items:(group.offers || []).filter(item=>eligible(item,now))
      .sort((a,b)=>b.discount-a.discount || a.price-b.price)
  })).filter(group=>group.items.length && /^[a-z0-9-]{1,80}$/.test(group.slug));
  const head = active.map(group=>({...group.items[0],groupName:group.name,groupSlug:group.slug}))
    .sort((a,b)=>b.discount-a.discount);
  const rest = active.flatMap(group=>group.items.slice(1).map(p=>({...p,groupName:group.name,groupSlug:group.slug})))
    .sort((a,b)=>b.discount-a.discount);
  return [...head,...rest].slice(0,Math.max(0,Math.min(120,limit)));
}
function expiry(offer) {
  if(!offer.saleEnd || !Number.isFinite(Date.parse(offer.saleEnd)))return "";
  return '<p class="flash-end">Offer ends: <time datetime="'+esc(offer.saleEnd)+'">'+
    esc(offer.saleEnd.slice(0,16).replace("T"," ")+" UTC")+'</time></p>';
}
function tile(offer) {
  return '<article class="flash-tile flash-daily-tile">'+
    '<a class="flash-card-image" href="'+esc(categoryHref({slug:offer.groupSlug}))+'" aria-label="See '+esc(offer.groupName)+' deals">'+
    '<img src="'+esc(offer.image)+'" alt="'+esc(offer.title)+' — supplier product photo" width="400" height="400" loading="lazy" decoding="async"></a>'+
    '<div class="flash-tile-body"><span class="flash-discount">'+esc(offer.discount)+'% OFF</span>'+
    '<span class="flash-category-label">'+esc(offer.groupName)+'</span><h3>'+esc(offer.title)+'</h3>'+
    '<p class="flash-price"><strong>'+esc(USD.format(offer.price))+'</strong><s>'+esc(USD.format(offer.originalPrice))+'</s></p>'+
    expiry(offer)+
    '<a class="flash-shop" href="'+esc(offer.destination)+'" data-sponsored-navigation rel="sponsored nofollow noopener noreferrer">View verified offer ↗</a>'+
    '</div></article>';
}
export function renderDailyDiscountShelf(groups) {
  const rows=selectCategoryDiscounts(groups,16);
  if(!rows.length)return "";
  const links=[...new Map(rows.map(p=>[p.groupSlug,p.groupName])).entries()]
    .map(([slug,name])=>'<a href="/flash-sale/category/'+esc(slug)+'/">'+esc(name)+'</a>').join("");
  return '<section class="flash-section flash-home-featured" aria-labelledby="daily-discount-title">'+
    '<div class="container"><div class="flash-heading"><div><span class="flash-eyebrow">ADMITAD PRODUCT DEALS · USD</span>'+
    '<h2 id="daily-discount-title">Highest verified discounts by category</h2></div>'+
    '<a href="/flash-sale/">All product categories →</a></div>'+
    '<p class="flash-notice">Actual feed prices and discounts, with seller photos. Offers and delivery prices may vary by location; the final AliExpress checkout is authoritative.</p>'+
    '<nav class="flash-categories" aria-label="Verified deal categories">'+links+'</nav>'+
    '<div class="flash-grid">'+rows.map(tile).join("")+'</div></div></section>';
}
export function renderHomeGlobalDeals(groups) {
  const rows=selectCategoryDiscounts(groups,24);
  if(!rows.length)return null;
  return '<div data-curated-products class="flash-global-deals"><p class="flash-notice">'+
    'Showing verified Admitad feed deals in USD, ranked by discount with category coverage. Prices may change at checkout.'+
    '</p><div class="flash-grid">'+rows.map(tile).join("")+'</div></div>';
}
export function renderDailyPulse(groups) {
  const rows=selectCategoryDiscounts(groups,4);
  if(!rows.length)return "";
  return '<section class="flash-pulse-summary" aria-label="Daily verified marketplace offers"><div class="container">'+
    '<div class="flash-heading"><div><span class="flash-eyebrow">DAILY GLOBAL DEALS · USD</span>'+
    '<h2>Today’s biggest verified discounts</h2></div><a href="/flash-sale/">Browse all deals →</a></div>'+
    '<div class="flash-grid">'+rows.map(tile).join("")+'</div></div></section>';
}
function validPromoDestination(value){
  try {
    const u=new URL(value);
    return u.protocol==="https:" && !u.username && !u.password && SAFE_COUPON_HOST.test(u.hostname) ? u.href : null;
  } catch {return null;}
}
export async function loadVerifiedCoupons(env,{now=new Date(),limit=8}={}) {
  if(!env?.DB)return [];
  try {
    const rows=await env.DB.prepare(
      "SELECT store,title,code,promo_type,value_text,url,country,terms,expires_at,starts_at,verified_at "+
      "FROM promo_codes WHERE status='active' AND code IS NOT NULL AND code!='' "+
      "AND expires_at IS NOT NULL AND datetime(expires_at) > datetime(?) "+
      "AND (starts_at IS NULL OR datetime(starts_at) <= datetime(?)) "+
      "AND datetime(verified_at) >= datetime(?, '-48 hours') "+
      "ORDER BY datetime(verified_at) DESC LIMIT ?"
    ).bind(now.toISOString(),now.toISOString(),now.toISOString(),Math.min(Math.max(limit,1),12)).all();
    return (rows.results||[]).filter(row=>validPromoDestination(row.url)).map(row=>({
      store:row.store,title:row.title,code:row.code,
      valueText:row.value_text,terms:row.terms,country:row.country,
      url:validPromoDestination(row.url),expiresAt:row.expires_at,
      verifiedAt:row.verified_at
    }));
  }catch{return [];}
}
export function renderVerifiedCouponPanel(coupons=[]) {
  const valid=(Array.isArray(coupons)?coupons:[]).filter(p=>p && p.code && p.url && p.expiresAt);
  const cards=valid.map(p=>'<article class="flash-coupon-card">'+
    '<span class="flash-category-label">'+esc(p.store)+'</span>'+
    '<h3>'+esc(p.title)+'</h3>'+
    (p.valueText?'<p>'+esc(p.valueText)+'</p>':"")+
    '<p class="flash-coupon-code">Code: <code>'+esc(p.code)+'</code></p>'+
    '<p class="flash-end">Ends: <time datetime="'+esc(p.expiresAt)+'">'+esc(String(p.expiresAt).slice(0,16).replace("T"," ")+" UTC")+'</time></p>'+
    (p.terms?'<p class="flash-coupon-terms">'+esc(p.terms)+'</p>':"")+
    '<a class="flash-shop" href="'+esc(p.url)+'" data-sponsored-navigation rel="sponsored nofollow noopener noreferrer">Check coupon terms ↗</a></article>').join("");
  return '<section class="flash-coupon-section" id="verified-coupons" aria-labelledby="verified-coupons-heading">'+
    '<div class="container"><div class="flash-heading"><div><span class="flash-eyebrow">SOURCE-VERIFIED PROMOTIONS</span>'+
    '<h2 id="verified-coupons-heading">Promo codes &amp; coupons</h2></div>'+
    '<a href="/promo-codes/">Explore coupon sources →</a></div>'+
    (valid.length?'<p class="flash-notice">Codes are sourced from recent official/approved feeds, but checkout eligibility still must be verified.</p>'+
      '<div class="flash-coupon-grid">'+cards+'</div>':
      '<p class="flash-notice">No active, recently sourced checkout codes are available. We never invent coupon codes or expiry dates. Browse current official offer sources instead.</p>')+
    '</div></section>';
}
