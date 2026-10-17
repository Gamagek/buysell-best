import catalog from "../content/shopping-catalog.json" with {type:"json"};
import affiliateLinks from "../content/affiliate-links.json" with {type:"json"};
const ORIGIN="https://buysell.best";
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const json=v=>JSON.stringify(v).replace(/</g,"\\u003c");
export const EDITORIAL_PRODUCTS=catalog.products.filter(p=>p.editorialPage===true&&!p.details&&p.slug&&p.image);
export const findEditorialProduct=slug=>EDITORIAL_PRODUCTS.find(p=>p.slug===slug);
export const editorialProductPath=p=>"/products/"+p.slug+"/";
const matchingGuides=p=>catalog.guides.map(g=>({guide:g,choice:g.selection.find(s=>s.productId===p.id)})).filter(g=>g.choice);
const isHttps=u=>typeof u==="string"&&u.startsWith("https://")&&!/[<>"' ]/.test(u);
const destination=p=>isHttps(affiliateLinks[p.id])?affiliateLinks[p.id]:p.merchantUrl;
const list=items=>"<ul>"+items.map(v=>"<li>"+safe(v)+"</li>").join("")+"</ul>";
function escapeAttr(v){return safe(v);}
function makeSchemas(p,title,desc,canonical){
  return [
    {"@context":"https://schema.org","@type":"Article",headline:title,description:desc,
      image:[ORIGIN+p.image.src],datePublished:"2026-10-17",inLanguage:"en",mainEntityOfPage:canonical,
      author:{"@type":"Organization",name:"BuySell.Best Editorial",url:ORIGIN+"/shopping-methodology/"},
      publisher:{"@type":"Organization",name:"BuySell.Best",url:ORIGIN+"/"}},
    {"@context":"https://schema.org","@type":"BreadcrumbList",
      itemListElement:[["Home","/"],["Products","/products/"],[p.name,editorialProductPath(p)]].map(([name,path],i)=>(
        {"@type":"ListItem",position:i+1,name,item:ORIGIN+path}))}
  ];
}
export function renderEditorialProductPage(p){
  const selected=matchingGuides(p);
  if(!selected.length)throw new Error("Candidate without supporting buying guide: "+p.id);
  const first=selected[0],choice=first.choice,guide=first.guide;
  const title=p.name+" — Buying Checks & AliExpress Research";
  const desc="Independent buying research for "+p.name+": practical fit, compatibility, alternatives and the exact seller listing. Original editorial illustration.";
  const canonical=ORIGIN+editorialProductPath(p);
  const picture=ORIGIN+p.image.src;
  const affiliate=destination(p);
  const search=p.linkKind==="search";
  const checks=[...new Set([...(choice.checks||[]),...(guide.checklist||[]).slice(0,4)])].slice(0,7);
  const compare=selected.map(x=>'<li><a href="/guides/'+safe(x.guide.slug)+'/">'+safe(x.guide.title)+'</a> — '+safe(x.choice.tradeoff)+'</li>').join("");
  const sources=guide.sources.slice(0,3).filter(s=>isHttps(s.url)).map(s=>'<li><a href="'+escapeAttr(s.url)+'" data-sponsored-bypass rel="nofollow noopener noreferrer" target="_blank">'+safe(s.title||s.name||"Independent source")+' ↗</a></li>').join("");
  const body=[
    '<header class="site-header"><div class="container nav-wrap"><a class="brand" href="/">BuySell<span class="brand-dot">.Best</span></a><nav class="nav"><a href="/products/">Products</a><a href="/guides/">Buying guides</a><a href="/shopping-methodology/">Methodology</a></nav></div></header>',
    '<main class="container shopping-wrap shopping-detail">',
    '<nav class="shopping-crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/products/">Products</a> › '+safe(p.name)+'</nav>',
    '<article><header class="shopping-detail-header"><span class="shopping-eyebrow">INDEPENDENT PRODUCT RESEARCH</span><h1>'+safe(title)+'</h1>',
    '<p class="shopping-deck">'+safe(choice.verdict)+'</p><p class="shopping-byline">BuySell.Best Editorial · Published <time datetime="2026-10-17">17 October 2026</time></p></header>',
    '<div class="shopping-detail-hero"><figure class="shopping-detail-image"><img src="'+escapeAttr(p.image.src)+'" alt="'+escapeAttr(p.image.alt)+'" width="'+p.image.width+'" height="'+p.image.height+'" fetchpriority="high" decoding="async">',
    '<figcaption>Original editorial SVG concept image for '+safe(p.name)+'. Not a seller photograph or a verified depiction of a branded item. See the actual seller photos before choosing.</figcaption></figure>',
    '<div class="shopping-detail-summary"><span class="shopping-eyebrow">CHOOSING THE RIGHT VERSION</span><h2>Key checks for this product</h2>'+list(checks)+
    '<p class="shopping-price-note">Price, stock, authenticity, warranty and compatibility have not been independently verified.</p>',
    '<p class="shopping-listing-note">Affiliate disclosure: BuySell.Best may earn a commission from qualifying purchases. The existing optional sponsored popup can be skipped immediately. Ads are not required to reach the seller.</p>',
    '<a class="shopping-button" data-shopping-product="'+escapeAttr(p.id)+'" data-sponsored-navigation href="'+escapeAttr(affiliate)+'" rel="sponsored nofollow noopener noreferrer">'+
      (search?"Search AliExpress for this product":"Visit the supplied AliExpress item")+' ↗</a>',
    '<p class="shopping-listing-note">'+(search?"No product-specific Admitad link was supplied for this record; this opens AliExpress search results.":"The supplied Admitad link identifies a specific merchant item but does not confirm current availability or commission eligibility.")+'</p>',
    '<a class="shopping-read" href="#buying-research">Read detailed checks ↓</a></div></div>',
    '<div class="shopping-prose shopping-detail-prose" id="buying-research">',
    '<section><h2>Who should consider this product?</h2><p>'+safe(choice.bestFor)+'</p>',
    '<p>A product name or attractive thumbnail is not enough to determine whether an accessory fits your equipment or routine. Start with the actual task, the size and connection requirements, and how often you expect to use it. Use the official documentation when available, and treat the marketplace listing as a separate offer that needs checking.</p>',
    '<p>When looking at '+safe(p.name)+', compare the options mentioned in the full guide with the exact seller version you have selected. Similar catalog names may refer to different generations, bundled accessories or regional variants. Make sure the feature that matters to you is clearly stated on the current seller page.</p></section>',
    '<section><h2>Main trade-off and what could go wrong</h2><p>'+safe(choice.tradeoff)+'</p>',
    '<p>Also consider maintenance, replacement parts, connection standards and where the item will be used. A lower advertised price may exclude essential accessories or change when shipping and import charges are included. A higher price is not, by itself, evidence of greater quality. Verify the full bundle contents and recent feedback about the matching variant.</p></section>',
    '<section><h2>Before buying: product-specific questions</h2><ol>'+checks.map(x=>'<li>'+safe(x)+'</li>').join("")+'</ol>',
    '<p>Check seller images of the actual listed version against the written specification, and verify dimensions, material, model number, included pieces and any supported devices. Confirm local shipping eligibility, tax, returns, and whether any warranty is enforceable where you live. Do not assume brand authenticity or product safety based on an illustrated buying guide.</p></section>',
    '<section><h2>References and original seller destination</h2>',
    '<p>'+(search?"The user-provided worksheet did not contain an Admitad deeplink for this product. The unmodified AliExpress search fallback remains available.":"The site owner supplied a dedicated Admitad destination for this reference product. We have not verified live stock, the selected model, product authenticity or commission approval.")+'</p>',
    '<p>These original SVG images are editorial explanations, not photos taken during a hands-on product test. Consult the original offer and the reference material below for primary-source details.</p>',
    '<ul>'+sources+'<li><a href="'+escapeAttr(p.merchantUrl)+'" data-sponsored-bypass rel="nofollow noopener noreferrer" target="_blank">Direct AliExpress reference / search ↗</a></li>',
    '<li><a href="/shopping-methodology/">Editorial methodology and disclosure</a></li></ul></section>',
    '<section><h2>Related comparison guides</h2><p>The larger guides discuss alternatives and practical buying trade-offs for this equipment category. Read them before treating a single affiliate listing as the best choice.</p><ul>'+compare+'</ul></section>',
    '</div></article></main>',
    '<footer class="site-footer"><div class="container shopping-footer"><a href="/guides/">Buying guides</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a></div></footer>'
  ].join("");
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>'+safe(title)+' | BuySell.Best</title><meta name="description" content="'+safe(desc)+'">'+
  '<link rel="canonical" href="'+safe(canonical)+'"><meta name="robots" content="index,follow,max-image-preview:large">'+
  '<meta property="og:type" content="article"><meta property="og:title" content="'+safe(title)+'"><meta property="og:description" content="'+safe(desc)+'">'+
  '<meta property="og:image" content="'+safe(picture)+'"><meta property="og:image:alt" content="'+safe(p.image.alt)+'">'+
  '<meta property="og:image:width" content="'+p.image.width+'"><meta property="og:image:height" content="'+p.image.height+'">'+
  '<meta property="og:url" content="'+safe(canonical)+'"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="'+safe(picture)+'">'+
  '<link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/shopping-guides.css">'+
  makeSchemas(p,title,desc,canonical).map(s=>'<script type="application/ld+json">'+json(s)+'</script>').join("")+
  '</head><body class="shopping-page">'+body+'</body></html>';
}
export function renderEditorialProductGrid(){
  return '<section class="shopping-section shopping-product-editorial" aria-labelledby="editorial-products-heading"><div class="shopping-section-head">'+
    '<h2 id="editorial-products-heading">More products to research</h2><a class="shopping-read" href="/guides/">Explore the buying guides →</a></div>'+
    '<p>Original category illustrations (not seller photos), independent checklists and merchant or marketplace links. Do not rely on these illustrations to identify the exact item.</p>'+
    '<div class="shopping-grid">'+EDITORIAL_PRODUCTS.map(p=>'<article class="shopping-card">'+
      '<a class="shopping-card-image" href="'+editorialProductPath(p)+'"><img src="'+safe(p.image.src)+'" alt="'+safe(p.image.alt)+'" width="1200" height="800" loading="lazy" decoding="async"></a>'+
      '<div class="shopping-card-copy"><span class="shopping-eyebrow">EDITORIAL RESEARCH</span><h3><a href="'+editorialProductPath(p)+'">'+safe(p.name)+'</a></h3>'+
      '<p>Original illustration. Compare the specific model, compatibility and seller terms before purchasing.</p>'+
      '<a class="shopping-read" href="'+editorialProductPath(p)+'">Read buying checks →</a>'+
      '<a class="shopping-button" data-shopping-product="'+safe(p.id)+'" data-sponsored-navigation href="'+safe(destination(p))+'" rel="sponsored nofollow noopener noreferrer">'+(p.linkKind==="search"?"Search AliExpress":"See AliExpress listing")+' ↗</a>'+
      '</div></article>').join("")+'</div></section>';
}
export function editorialSitemapEntries(){
  return EDITORIAL_PRODUCTS.map(p=>'<url><loc>'+ORIGIN+editorialProductPath(p)+'</loc><lastmod>'+safe(p.updatedAt||"2026-10-17")+'</lastmod>'+
     '<image:image><image:loc>'+ORIGIN+safe(p.image.src)+'</image:loc></image:image></url>').join("");
}
