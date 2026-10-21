// Public, editorial product catalogue shown even before Admitad's official
// live discount feed is connected. Never call research picks "flash sales".
import catalog from "../content/shopping-catalog.json" with {type:"json"};
import affiliateLinks from "../content/affiliate-links.json" with {type:"json"};

const ORIGIN="https://buysell.best";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const CATEGORY={
 st:{slug:"sports-outdoors",name:"Sports & Outdoors"},
 ed:{slug:"electronics-entertainment",name:"Electronics & Entertainment"},
 hp:{slug:"home-essentials",name:"Home Essentials"}
};
const validAffiliate=x=>{try{const u=new URL(x);return u.protocol==="https:" && /(^|\.)(?:rzekl\.com|aliexpress\.com)$/.test(u.hostname)?u.href:null;}catch{return null;}};
export const CURATED_PRODUCTS=catalog.products
 .filter(p=>p.image?.src?.startsWith("/assets/")&&p.slug&&(p.details||p.editorialPage))
 .map(p=>({
  id:p.id,title:p.name,path:"/products/"+p.slug+"/",
  image:p.image.src,alt:p.image.alt,
  isIllustration:p.image.kind==="editorial-concept",
  destination:validAffiliate(affiliateLinks[p.id])||validAffiliate(p.merchantUrl),
  brief:p.details?.intro||"Compare specifications, item versions, fit and seller conditions before purchasing.",
  category:CATEGORY[p.id.split("-")[0]]||CATEGORY.hp
 }))
 .filter(p=>p.destination);
export const CURATED_CATEGORIES=Object.values(CATEGORY).map(c=>({
 ...c,products:CURATED_PRODUCTS.filter(p=>p.category.slug===c.slug)
})).filter(c=>c.products.length);

function card(p){
 return '<article class="flash-tile flash-research-tile">'+
 '<a href="'+esc(p.path)+'" class="flash-card-image"><img src="'+esc(p.image)+'" alt="'+esc(p.alt)+'" width="400" height="400" decoding="async" loading="lazy"></a>'+
 '<div class="flash-tile-body"><span class="flash-research-badge">'+(p.isIllustration?"EDITORIAL ILLUSTRATION":"SELLER LISTING PHOTO")+'</span>'+
 '<h3><a href="'+esc(p.path)+'">'+esc(p.title)+'</a></h3>'+
 '<p class="flash-desc">'+esc(p.brief)+'</p>'+
 '<p class="flash-price-note">Current price & discount: check seller</p>'+
 '<a class="flash-read" href="'+esc(p.path)+'">Product buying checks →</a>'+
 '<a class="flash-shop" href="'+esc(p.destination)+'" data-sponsored-navigation rel="sponsored nofollow noopener noreferrer">View AliExpress listing ↗</a>'+
 '</div></article>';
}
const message='<p class="flash-notice">These are established product research picks, <strong>not verified flash-sale offers</strong>. Current prices, discounts and deadlines require an approved live AliExpress affiliate feed. Listings, availability and prices may change. An optional sponsored message can be skipped instantly.</p>';
export function renderCuratedHome(){
 return '<section class="flash-section" id="today-flash-sale"><div class="container">'+
 '<div class="flash-heading"><div><span class="flash-eyebrow">40 PRODUCT BUYING GUIDES</span><h2>AliExpress Product Catalogue</h2></div>'+
 '<a href="/flash-sale/">Browse all '+CURATED_PRODUCTS.length+' products →</a></div>'+
 message+'<div class="flash-grid">'+CURATED_PRODUCTS.slice(0,24).map(card).join("")+'</div>'+
 '<p class="flash-footlink"><a href="/flash-sale/">View the complete product catalogue →</a> · <a href="/products/trending-100/">100 more product research ideas →</a></p>'+
 '</div></section>';
}
export function renderCuratedPage(categorySlug=null){
 const category=categorySlug?CURATED_CATEGORIES.find(c=>c.slug===categorySlug):null;
 if(categorySlug&&!category)return null;
 const products=category?category.products:CURATED_PRODUCTS;
 const title=category?category.name+" — Product Buying Catalogue":"AliExpress Product Catalogue — 40 Researched Products";
 const path=category?"/flash-sale/category/"+category.slug+"/":"/flash-sale/";
 const nav='<nav class="flash-categories" aria-label="Product catalogue categories">'+
 CURATED_CATEGORIES.map(c=>'<a href="/flash-sale/category/'+c.slug+'/">'+esc(c.name)+' ('+c.products.length+')</a>').join("")+'</nav>';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>'+esc(title)+' | BuySell.Best</title><meta name="description" content="Compare researched AliExpress product options with thumbnails, practical buying guidance and links to seller listings. Prices and discounts are verified at the merchant.">'+
 '<link rel="canonical" href="'+ORIGIN+path+'"><meta name="robots" content="index,follow,max-image-preview:large">'+
 '<link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/flash-sale.css"></head><body>'+
 '<header class="site-header"><div class="container nav-wrap"><a class="brand" href="/">BuySell.Best</a><nav class="nav"><a href="/flash-sale/">Product Catalogue</a><a href="/products/">Products</a><a href="/guides/">Buying Guides</a></nav></div></header>'+
 '<main class="container flash-directory"><h1>'+esc(title)+'</h1>'+message+nav+
 '<div class="flash-grid">'+products.map(card).join("")+'</div>'+
 '<p class="flash-footlink"><a href="/products/trending-100/">Explore another 100 trending product ideas →</a></p></main>'+
 '<footer class="site-footer"><div class="container"><a href="/">Home</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div></footer>'+
 '</body></html>';
}
export function curatedSitemapEntries(){
 return [
  ['https://buysell.best/flash-sale/',CURATED_PRODUCTS],
  ...CURATED_CATEGORIES.map(c=>['https://buysell.best/flash-sale/category/'+c.slug+'/',c.products])
 ].map(([page,products])=>'<url><loc>'+page+'</loc>'+
  [...new Set(products.map(p=>p.image))].map(image=>'<image:image><image:loc>'+ORIGIN+esc(image)+'</image:loc></image:image>').join("")+
 '</url>').join("");
}
