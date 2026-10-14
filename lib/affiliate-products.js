// Add future curated products here. Pages, homepage cards and the image sitemap
// use this catalog; priceVerified must only be true after checking the seller.
export const AFFILIATE_PRODUCTS = [{
  id: "1005013267651702",
  slug: "7-3-inch-android-15-smartphone",
  title: "7.3-inch Android 15 Smartphone",
  category: "phones",
  merchant: "AliExpress",
  price: 30666.35,
  currency: "LKR",
  priceVerified: false,
  priceCapturedAt: "2026-10-14",
  updatedAt: "2026-10-14",
  description: "Explore this seller-advertised 7.3-inch Android 15 smartphone on AliExpress. View 10 product images, the shared LKR reference price, advertised specifications and practical checks before buying.",
  affiliateUrl: "https://rzekl.com/g/1e8d1144948a33a283af16525dc3e8/?ulp=https%3A%2F%2Fwww.aliexpress.com%2Fitem%2F1005013267651702.html%3Fspm%3Da2g0n.detail.platformRecommendH5.15.68f5sghtsghtOM%26gps-id%3DplatformRecommendH5%26scm%3D1007.40196.439370.0%26scm_id%3D1007.40196.439370.0%26scm-url%3D1007.40196.439370.0%26pvid%3D0fecb173-b608-4468-9d15-1437dc0fc658%26_t%3Dgps-id%253AplatformRecommendH5%252Cscm-url%253A1007.40196.439370.0%252Cpvid%253A0fecb173-b608-4468-9d15-1437dc0fc658%252Ctpp_buckets%253A668%25232846%25238107%25231934%26pdp_ext_f%3D%257B%2522order%2522%253A%2522156%2522%252C%2522eval%2522%253A%25221%2522%252C%2522sceneId%2522%253A%25228499%2522%252C%2522fromPage%2522%253A%2522recommend%2522%257D%26pdp_npi%3D6%2540dis%2521LKR%252165090.69%252130666.35%2521%2521%25211161.50%2521547.22%2521%25402140ec2d17919722756005153e106c%252112000060679615691%2521rec%2521LK%2521%2521ABX%25211%25210%2521n_tag%253A-29910%253Bd%253A9bc85d4d%253Bm03_new_user%253A-29895%253BpisId%253A5000000219362506%26utparam-url%3Dscene%253AplatformRecommendH5%257Cquery_from%253A%257Cx_object_id%253A1005013267651702%257C_p_origin_prod%253A%26m_page_id%3D0zy2izzuk2ucadro1a139deed8ebd480c0c156811a%26aff_trace_key%3Ddfe5476d27464b7481f0c056f051f9ed-1791972174020-06386-_c3KnEy3H%26aff_platform%3Dmsite",
  sellerUrl: "https://www.aliexpress.com/item/1005013267651702.html",
  images: [
    ["smartphone-gold-front-back.jpg", "Seller image showing the gold smartphone from the front and back"],
    ["smartphone-7-3-inch-display.jpg", "Seller illustration advertising a 7.3-inch display and 1440 by 3040 resolution"],
    ["smartphone-screen-size-comparison.jpg", "Seller illustration comparing the advertised 7.3-inch screen with a 6-inch screen"],
    ["smartphone-8000mah-battery.jpg", "Seller illustration advertising an 8000mAh battery"],
    ["smartphone-dual-sim-microsd.jpg", "Seller illustration advertising dual SIM and a microSD card slot"],
    ["smartphone-gps-navigation.jpg", "Seller illustration of the phone with GPS navigation"],
    ["smartphone-android-15-memory-storage.jpg", "Seller image advertising Android 15, 16GB memory and 1TB storage"],
    ["smartphone-rear-camera.jpg", "Seller illustration advertising a 108MP rear camera"],
    ["smartphone-front-camera.jpg", "Seller illustration advertising a 72MP front camera"],
    ["smartphone-processor-claim.jpg", "Seller illustration advertising a Snapdragon 8 gen4 processor"]
  ].map(([file, alt]) => ({src: "/assets/products/7-3-inch-android-15/" + file, alt})),
  specs: [
    ["Display", "7.3 inches; up to 1440 × 3040 pixels"],
    ["Software", "Android 15"],
    ["Memory / storage", "16GB memory and 1TB storage advertised; confirm the selected variant and physical capacity"],
    ["Battery", "8000mAh; fast charging advertised without a confirmed wattage"],
    ["Cameras", "108MP rear and 72MP front advertised; sensor details not confirmed"],
    ["SIM / expansion", "Dual SIM and dedicated microSD slot advertised"],
    ["Network / navigation", "5G / LTE and GPS advertised; exact supported bands not confirmed"],
    ["Processor", "“Snapdragon 8 gen4” stated in a seller image; exact chipset not independently confirmed"]
  ]
}];

const ORIGIN = "https://buysell.best";
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const json = value => JSON.stringify(value).replace(/</g, "\\u003c");
export const productPath = product => "/products/" + encodeURIComponent(product.slug) + "/";
export const productPrice = product => product.currency + " " + Number(product.price).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});
export const findProduct = slug => AFFILIATE_PRODUCTS.find(product => product.slug === slug);

export function featuredCarouselItems() {
  return AFFILIATE_PRODUCTS.map(product => ({
    ...product, featuredAffiliate:true, url:productPath(product), image:product.images[0].src,
    imageAlt:product.images[0].alt, priceLabel:productPrice(product), condition:"Shared price · check seller"
  }));
}

export function renderProductTile(product) {
  return `<article class="affiliate-tile">
    <a class="affiliate-tile-image" href="${productPath(product)}" data-sponsored-navigation aria-label="View ${esc(product.title)}; sponsored message first"><img src="${esc(product.images[0].src)}" alt="${esc(product.images[0].alt)}" width="960" height="960" loading="lazy"></a>
    <div class="affiliate-tile-copy"><span class="offer-label">ALIEXPRESS PICK</span><h3><a href="${productPath(product)}" data-sponsored-navigation>${esc(product.title)}</a></h3><p>Seller-advertised large display. Explore the full gallery and buying guide.</p><div class="offer-price">${productPrice(product)}</div><small class="offer-price-note">Shared price on ${product.priceCapturedAt} · final price may change.</small><a class="offer-button" href="${esc(product.affiliateUrl)}" rel="sponsored noopener noreferrer" data-sponsored-navigation>Buy now · check price ↗</a><a class="offer-details-link" href="${productPath(product)}" data-sponsored-navigation>View product &amp; 10 images →</a><small class="offer-click-note">One sponsored message per session · continue anytime.</small></div>
  </article>`;
}

export function renderSpotlight() {
  return `<div class="section-head"><div><div class="eyebrow">CURATED ALIEXPRESS FIND</div><h2>Your next phone? Take a closer look.</h2></div><a class="text-link" href="/products/">All featured products →</a></div><div class="affiliate-tile-grid">${AFFILIATE_PRODUCTS.map(renderProductTile).join("")}</div><p class="affiliate-disclosure">Affiliate links: BuySell.Best may earn a commission from qualifying purchases. Orders, delivery and returns are handled by the seller.</p>`;
}

export function renderMiniProductTile(product) {
  return `<article class="deal-card affiliate-mini-tile"><a class="deal-media" href="${productPath(product)}" data-sponsored-navigation aria-label="View ${esc(product.title)}; sponsored message first"><img src="${esc(product.images[0].src)}" alt="${esc(product.images[0].alt)}" width="1536" height="1536" loading="lazy"></a><div class="deal-body"><span class="offer-label">ALIEXPRESS PICK</span><h3><a href="${productPath(product)}" data-sponsored-navigation>${esc(product.title)}</a></h3><div class="offer-price">${productPrice(product)}</div><small class="offer-price-note">Shared price · verify current offer.</small><a class="offer-button" href="${esc(product.affiliateUrl)}" rel="sponsored noopener noreferrer" data-sponsored-navigation>Buy now · check price ↗</a><a class="offer-details-link" href="${productPath(product)}" data-sponsored-navigation>Photos &amp; buying guide →</a><small class="offer-click-note">Affiliate link · ad may appear once per session.</small></div></article>`;
}

export function renderInitialCarousel(product) {
  return `<article class="carousel-card affiliate-carousel-card is-active" data-carousel-index="0"><div class="carousel-card-inner"><a href="${productPath(product)}" data-sponsored-navigation><div class="carousel-visual"><img class="carousel-image" src="${esc(product.images[0].src)}" alt="${esc(product.images[0].alt)}" width="960" height="960" fetchpriority="high"><span class="carousel-badge">ALIEXPRESS PICK</span></div><div class="carousel-body"><span class="carousel-tag">Phones</span><span class="carousel-title">${esc(product.title)}</span><span class="carousel-condition">Shared price · check seller</span><div class="carousel-price">${productPrice(product)}</div></div></a><a class="offer-button carousel-buy" href="${esc(product.affiliateUrl)}" rel="sponsored noopener noreferrer" data-sponsored-navigation>Buy now · check price ↗</a></div></article>`;
}

function head(title, description, canonical, image) {
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | BuySell.Best</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="mitgo-verification" content="ed877f45-041a-44ad-b458-4f1265704c13"><link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="website"><meta property="og:site_name" content="BuySell.Best"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">${image?`<meta property="og:image" content="${esc(ORIGIN+image.src)}"><meta property="og:image:alt" content="${esc(image.alt)}"><meta property="og:image:width" content="1536"><meta property="og:image:height" content="1536"><meta name="twitter:image" content="${esc(ORIGIN+image.src)}">`:""}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/products.css">`;
}
const header = `<header class="site-header"><div class="container nav-wrap"><a class="brand" href="/"><span class="brand-mark">B</span><span>BuySell<span class="brand-dot">.Best</span></span></a><nav class="nav" aria-label="Primary navigation"><a href="/categories.html">Categories</a><a href="/products/">Featured products</a><a href="/deals/">Global Deals</a></nav></div></header>`;
const footer = `<footer class="site-footer"><div class="container footer-bottom"><span>BuySell.Best · product discovery</span><span><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></span></div></footer>`;

export function renderProductsIndex() {
  const description = "Explore curated AliExpress product picks with photo galleries, reference prices and practical buying guides on BuySell.Best.";
  return `<!doctype html><html lang="en"><head>${head("Featured AliExpress Products & Buying Guides",description,ORIGIN+"/products/",AFFILIATE_PRODUCTS[0]?.images[0])}</head><body>${header}<main class="container product-index"><div class="eyebrow">PRODUCT DISCOVERY</div><h1>Featured AliExpress finds</h1><p>${description}</p>${renderSpotlight()}</main>${footer}</body></html>`;
}

export function renderProductPage(product) {
  const path = productPath(product), canonical = ORIGIN + path, image = product.images[0];
  const schema = {
    "@context":"https://schema.org", "@type":"Product", "@id":canonical+"#product",
    name:product.title, description:product.description, url:canonical,
    productID:product.id, category:"Mobile phones", image:product.images.map(item => ORIGIN+item.src)
  };
  // An old URL price is not a live offer. Do not invent stock, reviews or expiry.
  if (product.priceVerified) schema.offers = {"@type":"Offer",url:product.affiliateUrl,price:product.price,priceCurrency:product.currency};
  const crumbs = {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[
    {"@type":"ListItem",position:1,name:"Home",item:ORIGIN+"/"},
    {"@type":"ListItem",position:2,name:"Featured products",item:ORIGIN+"/products/"},
    {"@type":"ListItem",position:3,name:product.title,item:canonical}
  ]};
  return `<!doctype html><html lang="en"><head>${head(product.title+" — AliExpress Price & Buying Guide",product.description,canonical,image)}<link rel="preload" as="image" href="${esc(image.src)}"><script type="application/ld+json">${json(schema)}</script><script type="application/ld+json">${json(crumbs)}</script></head><body>${header}
  <main class="container product-page"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/products/">Featured products</a><span>›</span><span aria-current="page">Smartphone</span></nav>
    <section class="product-hero"><div class="product-gallery"><figure class="product-main-image"><a id="product-image-original" href="${esc(image.src)}" target="_blank" rel="noopener"><img id="product-main-image" src="${esc(image.src)}" alt="${esc(image.alt)}" width="960" height="960" fetchpriority="high"></a><figcaption id="product-image-caption">${esc(image.alt)}</figcaption></figure><div class="product-thumbnails" aria-label="Product image gallery">${product.images.map((item,i)=>`<button type="button" class="product-thumbnail${i===0?" is-selected":""}" data-product-image="${esc(item.src)}" data-image-alt="${esc(item.alt)}" aria-label="Show image ${i+1}: ${esc(item.alt)}" aria-pressed="${i===0}"><img src="${esc(item.src)}" alt="" width="96" height="96" loading="lazy"></button>`).join("")}</div><p class="gallery-caption">10 seller-supplied images · tap to explore · open the main image for full size.</p></div>
    <div class="product-offer"><span class="offer-label">ALIEXPRESS PRODUCT SPOTLIGHT</span><h1>${esc(product.title)}</h1><p class="product-lead">Big-screen styling. An eye-catching seller listing. Check the details before making it your next phone.</p><div class="product-feature-chips"><span>7.3″ screen*</span><span>Android 15*</span><span>8000mAh*</span></div><p class="claims-note">*Advertised in the seller’s images; specifications have not been independently tested.</p>
      <div class="product-price-panel"><span class="offer-price-label">PRICE IN THE SHARED OFFER</span><div class="offer-price">${productPrice(product)}</div><p>Reference price captured from the shared link on <time datetime="${product.priceCapturedAt}">${product.priceCapturedAt}</time>. The selected version, currency, shipping, taxes and discounts can change the checkout total.</p></div>
      <p class="offer-prompt">Like this find? Check today’s seller offer before the price changes.</p><a class="offer-button product-buy" href="${esc(product.affiliateUrl)}" rel="sponsored noopener noreferrer" data-sponsored-navigation>Buy now · check AliExpress offer ↗</a><small class="offer-click-note">One sponsored message may appear per browsing session. Use × or Continue to AliExpress at any time.</small><a class="product-guide-link" href="#buying-guide">Read the buying guide ↓</a><p class="affiliate-disclosure">This is an Admitad affiliate link. BuySell.Best may receive a commission from qualifying purchases. BuySell.Best does not sell or ship this phone.</p>
    </div></section>
    <section id="buying-guide" class="product-content"><div class="product-guide"><div class="eyebrow">BEFORE YOU BUY</div><h2>A closer look at this large-screen phone</h2><p>The supplied AliExpress promotional images present this device as a large-screen Android smartphone with several colour finishes, a multi-lens-style rear camera design and a pill-shaped display cutout. The listing may appeal to shoppers who want a bigger screen for browsing, reading and watching videos. The images show what the seller advertises; they do not establish measured performance, genuine component specifications or the exact version included in your order.</p><p>Use this page to compare the images and keep your buying decision focused on the selected seller configuration. The seller’s marketing includes large memory, storage, camera and battery figures. Before relying on those figures, ask for the exact model, physical RAM and internal storage, processor identification and network band list. If a memory figure includes virtual RAM, compare the physical RAM separately. Do not assume all versions in the listing have the same hardware.</p>
      <h2>What the seller advertises</h2><p>These details are transcribed from the provided product images and remain seller claims.</p><div class="product-specs-wrap"><table class="product-specs"><thead><tr><th scope="col">Feature</th><th scope="col">Advertised information</th></tr></thead><tbody>${product.specs.map(([name,value])=>`<tr><th scope="row">${esc(name)}</th><td>${esc(value)}</td></tr>`).join("")}</tbody></table></div>
      <h2>How to evaluate the offer</h2><ul class="product-checks"><li><strong>Match the exact version.</strong> Select the colour and configuration you want, then check that the title, option description and order summary agree. Ask which accessories are included.</li><li><strong>Check real hardware.</strong> Look for recent buyer photos, device information screens and comments about storage, camera quality and daily use. The processor text in a promotional image alone does not verify the chipset.</li><li><strong>Check local mobile compatibility.</strong> Request the supported LTE and 5G bands for the chosen version and compare them with your operator’s requirements. A general “global 5G” graphic does not confirm compatibility with every network.</li><li><strong>Compare the complete cost.</strong> Use the seller’s current price for your delivery country. Include shipping, applicable import charges and any extra charger or accessories you need. The reference LKR price here is not a guaranteed checkout price.</li><li><strong>Read return and warranty terms.</strong> Review the seller’s current delivery estimate, return conditions and warranty wording before ordering. Check recent feedback for the same version rather than relying only on promotional images.</li></ul>
      <h2>Price, delivery and seller availability</h2><p>The shared link contains an LKR ${Number(product.price).toLocaleString("en-US",{minimumFractionDigits:2})} price snapshot. It does not provide a verified offer end time. This page therefore does not show an expiring countdown, a guaranteed discount or a claim of limited stock. Open the tracked seller link to see whether a current promotion applies to your account, configuration and country. Payment, fulfilment and customer service take place on the destination marketplace.</p>
      <h2>Questions shoppers often ask</h2><details class="product-faq"><summary>Is this an independently tested phone review?</summary><p>No. This is a product discovery and buying guide based on the supplied seller images and affiliate link. We have not tested the device or independently confirmed the specifications.</p></details><details class="product-faq"><summary>Is LKR 30,666.35 the final price?</summary><p>It is the reference price in the shared URL. Your final price depends on the selected version and the seller’s current checkout conditions.</p></details><details class="product-faq"><summary>Where do I place an order?</summary><p>Use the Buy now button. A closable sponsored message may appear once per browsing session. Use Continue to AliExpress to follow the original Admitad link, check the product and place an order.</p></details><details class="product-faq"><summary>Can I inspect all the product pictures?</summary><p>Yes. Use the gallery thumbnails to change the main picture, or open a picture at full size. Each image has descriptive text explaining the seller’s advertised feature.</p></details>
    </div><aside class="product-summary"><span class="offer-label">QUICK REMINDER</span><h2>Check the exact version.</h2><p>The bigger numbers in a seller image are a starting point for questions. Confirm the hardware, delivery and return terms before buying.</p><div class="offer-price">${productPrice(product)}</div><small class="offer-price-note">Shared price · check current seller price.</small><a class="offer-button" href="${esc(product.affiliateUrl)}" rel="sponsored noopener noreferrer" data-sponsored-navigation>Check today’s offer ↗</a></aside></section>
    <section class="product-all-images"><h2>All product images</h2><p>Seller promotional images for AliExpress item ${product.id}. Descriptions identify advertised features without claiming independent verification.</p><div class="product-image-grid">${product.images.map(item=>`<figure><a href="${esc(item.src)}" target="_blank" rel="noopener"><img src="${esc(item.src)}" alt="${esc(item.alt)}" width="960" height="960" loading="lazy"></a><figcaption>${esc(item.alt)}</figcaption></figure>`).join("")}</div></section>
  </main>${footer}<script src="/js/product-page.js" defer></script></body></html>`;
}

export function productSitemapEntries() {
  return `<url><loc>${ORIGIN}/products/</loc></url>` + AFFILIATE_PRODUCTS.map(product => `<url><loc>${ORIGIN}${productPath(product)}</loc><lastmod>${product.updatedAt}</lastmod>${product.images.map(image=>`<image:image><image:loc>${ORIGIN}${esc(image.src)}</image:loc></image:image>`).join("")}</url>`).join("");
}
