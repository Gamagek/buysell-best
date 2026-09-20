const handlers = {
  health: () => import("./functions/api/health.js"),
  view: () => import("./functions/api/view.js"),
  stats: () => import("./functions/api/stats.js"),
  reaction: () => import("./functions/api/reaction.js"),
  events: () => import("./functions/api/events.js"),
  recommendations: () => import("./functions/api/recommendations.js"),
  currency: () => import("./functions/api/currency.js"),
  privacyReset: () => import("./functions/api/privacy-reset.js"),
  deals: () => import("./functions/api/deals.js"),
  listings: () => import("./functions/api/listings.js"),
  relatedDeals: () => import("./functions/api/related-deals.js")
};

function route(pathname) {
  if (pathname === "/api/health") return "health";
  if (pathname === "/api/view") return "view";
  if (pathname === "/api/stats") return "stats";
  if (pathname === "/api/reaction") return "reaction";
  if (pathname === "/api/events") return "events";
  if (pathname === "/api/recommendations") return "recommendations";
  if (pathname === "/api/currency") return "currency";
  if (pathname === "/api/privacy-reset") return "privacyReset";
  if (pathname === "/api/deals") return "deals";
  if (pathname === "/api/listings") return "listings";
  if (pathname === "/api/deals/related") return "relatedDeals";
  return null;
}

function methodName(request) {
  const method = request.method.toUpperCase();
  if (method === "GET") return "onRequestGet";
  if (method === "POST") return "onRequestPost";
  if (method === "OPTIONS") return "onRequestOptions";
  return null;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function clean(value, fallback="") {
  const s=String(value ?? "").trim();
  return s && !/^(null|undefined)$/i.test(s) ? s : fallback;
}

function slugSafe(value) {
  return encodeURIComponent(clean(value));
}

function textSnippet(value, max=220) {
  const s=clean(value).replace(/\s+/g," ").trim();
  return s.length>max ? s.slice(0,max-1).trim()+"…" : s;
}

function categoryLabel(value) {
  const map={
    phones:"Phones",
    electronics:"Electronics",
    vehicles:"Vehicles",
    property:"Property",
    fashion:"Fashion",
    furniture:"Furniture",
    services:"Services",
    other:"Other"
  };
  const key=clean(value).toLowerCase();
  return map[key] || (key ? key.charAt(0).toUpperCase()+key.slice(1) : "Marketplace");
}

function jsonLd(data) {
  return JSON.stringify(data).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");
}

async function getActiveListing(env, slug) {
  if (!env?.DB || !slug) return null;
  try {
    return await env.DB.prepare(
      "SELECT id,slug,title,brand,category,price,currency,condition,description,image_url,status,location,video_url,video_embed_url,video_thumbnail_url,video_duration,video_upload_date,created_at,updated_at FROM listings WHERE slug=? AND COALESCE(status,'active')='active' LIMIT 1"
    ).bind(slug).first();
  } catch (_) {
    try {
      return await env.DB.prepare(
        "SELECT id,slug,title,brand,category,price,currency,condition,description,image_url,status,created_at,updated_at FROM listings WHERE slug=? AND COALESCE(status,'active')='active' LIMIT 1"
      ).bind(slug).first();
    } catch (_) {
      return null;
    }
  }
}

function validHttpUrl(value){const s=clean(value);if(!s)return "";try{const u=new URL(s);return /^https?:$/i.test(u.protocol)?u.toString():"";}catch(_){return "";}}

function isoDate(value,fallback=""){const s=clean(value);if(!s)return fallback;const d=new Date(s.includes("T")?s:s.replace(" ","T")+"Z");return Number.isNaN(d.getTime())?fallback:d.toISOString();}

function normalizeVideoEmbedUrl(value){
  const s=validHttpUrl(value);
  if(!s)return "";
  try{
    const u=new URL(s);
    const host=u.hostname.toLowerCase();
    if(host==="youtu.be"){
      const id=u.pathname.replace(/^\/+/,"").split("/")[0];
      return id?`https://www.youtube.com/embed/${encodeURIComponent(id)}`:"";
    }
    if(host==="youtube.com"||host==="www.youtube.com"||host==="m.youtube.com"){
      if(u.pathname==="/watch"){
        const id=u.searchParams.get("v");
        return id?`https://www.youtube.com/embed/${encodeURIComponent(id)}`:"";
      }
      if(u.pathname.startsWith("/embed/")) return s;
    }
    if(host==="vimeo.com"){
      const id=u.pathname.match(/^\/(\d+)/)?.[1];
      return id?`https://player.vimeo.com/video/${id}`:"";
    }
    if(host==="player.vimeo.com"&&u.pathname.startsWith("/video/")) return s;
    return s;
  }catch(_){return "";}
}

function directVideoUrl(value){const u=validHttpUrl(value);return /\.(mp4|webm|m4v|ogv|mov)(?:$|[?#])/i.test(u)?u:"";}

function renderItemPage(item){
  const title=clean(item.title,"Marketplace listing");
  const category=categoryLabel(item.category);
  const rawDescription=clean(item.description);
  const description=textSnippet(rawDescription,280)||`View ${title}, including the listed price and item details, on BuySell.Best.`;
  const canonical="https://buysell.best/item/"+slugSafe(item.slug);
  const image=validHttpUrl(item.image_url);
  const location=clean(item.location);
  const currency=clean(item.currency,"USD").toUpperCase();
  const price=Number(item.price);
  const priceText=Number.isFinite(price)?new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:0}).format(price):"";
  const condition=clean(item.condition,"For sale");
  const conditionSchema=/used|pre-owned/i.test(condition)?"https://schema.org/UsedCondition":"https://schema.org/NewCondition";
  const published=isoDate(item.created_at);
  const modified=isoDate(item.updated_at,published);
  const directVideo=directVideoUrl(item.video_url);
  const embedVideo=normalizeVideoEmbedUrl(item.video_embed_url || item.video_url);
  const videoThumbnail=validHttpUrl(item.video_thumbnail_url)||image;
  const videoDuration=clean(item.video_duration);
  const videoUploadDate=isoDate(item.video_upload_date,published);

  const product={"@context":"https://schema.org","@type":"Product","name":title,"url":canonical,"description":description,"category":category,
    ...(item.brand?{brand:{"@type":"Brand",name:clean(item.brand)}}:{}),
    ...(image?{image:[image]}:{}),
    offers:{"@type":"Offer",url:canonical,...(Number.isFinite(price)?{price}:{}),priceCurrency:currency,availability:"https://schema.org/InStock",itemCondition:conditionSchema}
  };
  const pageLd={"@context":"https://schema.org","@type":"WebPage","url":canonical,"name":title+" | BuySell.Best","description":description,"inLanguage":"en",
    ...(published?{datePublished:published}:{}),...(modified?{dateModified:modified}:{}),
    ...(image?{primaryImageOfPage:{"@type":"ImageObject","contentUrl":image,"url":image,"name":title+" image"}}:{})
  };
  const videoLd=(directVideo||embedVideo)&&videoThumbnail?{"@context":"https://schema.org","@type":"VideoObject","name":title,"description":rawDescription||description,"thumbnailUrl":[videoThumbnail],
    ...(videoUploadDate?{uploadDate:videoUploadDate}:{}),...(videoDuration?{duration:videoDuration}:{}),
    ...(directVideo?{contentUrl:directVideo}:{embedUrl:embedVideo})
  }:null;

  const mediaMarkup=directVideo
    ?`<section class="detail-video" aria-label="${escapeHtml(title)} video"><video controls preload="metadata"${videoThumbnail?` poster="${escapeHtml(videoThumbnail)}"`:""} width="1280" height="720"><source src="${escapeHtml(directVideo)}"></video></section>`
    :embedVideo
      ?`<section class="detail-video" aria-label="${escapeHtml(title)} video"><div class="video-embed-wrap"><iframe src="${escapeHtml(embedVideo)}" title="${escapeHtml(title)} video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div></section>`
      :"";
  const locationMarkup=location
    ?`<div class="detail-pills"><span class="pill">${escapeHtml(condition)}</span><span class="pill">${escapeHtml(location)}</span><span class="pill">BuySell.Best listing</span></div>`
    :`<div class="detail-pills"><span class="pill">${escapeHtml(condition)}</span><span class="pill">BuySell.Best listing</span></div>`;

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} | BuySell.Best</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-video-preview:large">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)} | BuySell.Best"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:site_name" content="BuySell.Best">
${image?`<meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:alt" content="${escapeHtml(title)}">`:""}
<meta name="twitter:card" content="${image?"summary_large_image":"summary"}"><meta name="twitter:title" content="${escapeHtml(title)} | BuySell.Best"><meta name="twitter:description" content="${escapeHtml(description)}">
${image?`<meta name="twitter:image" content="${escapeHtml(image)}">`:""}
<script type="application/ld+json">${jsonLd(product)}</script>
<script type="application/ld+json">${jsonLd(pageLd)}</script>
${videoLd?`<script type="application/ld+json">${jsonLd(videoLd)}</script>`:""}
<link rel="stylesheet" href="/css/style.css"></head><body>
<header class="site-header"><div class="container nav-wrap"><a class="brand" href="/"><span class="brand-mark">B</span><span>BuySell<span class="brand-dot">.Best</span></span></a><nav class="nav" aria-label="Primary navigation"><a href="/categories.html">Categories</a><a href="/search.html">Browse</a><a href="/deals.html">Global Deals</a><a class="nav-cta" href="/post-ad.html">+ Post Free Ad</a></nav></div></header>
<main><div class="container listing-detail-wrap">
<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/category/${slugSafe(item.category)}">${escapeHtml(category)}</a><span>›</span><span aria-current="page">${escapeHtml(title)}</span></nav>
<div id="listing-detail" data-ssr="1" data-listing-id="${escapeHtml(item.id)}"><div class="detail-grid"><div>
<div class="detail-photo" aria-label="${escapeHtml(title)}">${image?`<img class="detail-real-image" src="${escapeHtml(image)}" alt="${escapeHtml(title)}" width="1200" height="900" fetchpriority="high">`:"🛍️"}</div>
${mediaMarkup}</div>
<div class="detail-card" data-listing-id="${escapeHtml(item.id)}"><div class="eyebrow">${escapeHtml(category)}</div><h1>${escapeHtml(title)}</h1>
<div class="detail-price smart-price" data-price="${Number.isFinite(price)?String(price):"0"}" data-currency="${escapeHtml(currency)}">${escapeHtml(priceText)}</div>
${locationMarkup}
<p class="detail-muted">${escapeHtml(rawDescription||"No additional description was provided.")}</p>
<div class="reaction-row"><button type="button" data-reaction="like" aria-pressed="false">❤️ Like</button><button type="button" data-reaction="interested" aria-pressed="false">⭐ Interested</button><button type="button" data-reaction="save" aria-pressed="false">🔖 Save</button></div>
<div class="listing-stats" aria-label="Listing activity"><span>👁 0</span><span>❤️ 0</span><span>⭐ 0</span><span>🔖 0</span></div>
<div class="detail-actions"><a class="button button-secondary" href="/search.html?q=${encodeURIComponent(title)}">Find similar</a> <a class="button button-secondary" href="/contact.html">Report / Contact</a></div></div></div>
<section class="section similar-section"><div class="section-head"><div><div class="eyebrow">RELATED LISTINGS</div><h2>More listings like this</h2></div><a class="text-link" href="/category/${slugSafe(item.category)}">Browse ${escapeHtml(category)} →</a></div><div id="similar-listings" class="listing-grid"></div></section>
</div></div></main>
<footer class="site-footer"><div class="container footer-bottom"><span>© <span id="year"></span> BuySell.Best</span><span><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></span></div></footer>
<script src="/js/app.js"></script></body></html>`;
}

const CATEGORY_DESCRIPTIONS={
  phones:"Browse phones, smartphones and mobile devices listed on BuySell.Best.",
  electronics:"Browse laptops, cameras, audio gear and other electronics listed on BuySell.Best.",
  vehicles:"Browse cars, motorbikes, vans and other vehicle listings on BuySell.Best.",
  property:"Browse property, land, homes, rentals and related listings on BuySell.Best.",
  fashion:"Browse clothes, shoes, bags and fashion accessories listed on BuySell.Best.",
  furniture:"Browse home, office and furniture listings on BuySell.Best.",
  services:"Browse local services and professional help listings on BuySell.Best.",
  other:"Browse miscellaneous classified listings on BuySell.Best."
};

function renderCategoryPage(categorySlug,items) {
  const category=categoryLabel(categorySlug);
  const description=CATEGORY_DESCRIPTIONS[categorySlug] || `Browse ${category} listings on BuySell.Best.`;
  const canonical="https://buysell.best/category/"+slugSafe(categorySlug);
  const list=(items||[]).slice(0,40);
  const itemList={
    "@context":"https://schema.org",
    "@type":"ItemList",
    name:category+" listings on BuySell.Best",
    itemListElement:list.map((item,index)=>({
      "@type":"ListItem",
      position:index+1,
      url:"https://buysell.best/item/"+slugSafe(item.slug),
      name:clean(item.title,"Listing")
    }))
  };
  const breadcrumb={
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    itemListElement:[
      {"@type":"ListItem",position:1,name:"Home",item:"https://buysell.best/"},
      {"@type":"ListItem",position:2,name:"Categories",item:"https://buysell.best/categories.html"},
      {"@type":"ListItem",position:3,name:category,item:canonical}
    ]
  };
  const cards=list.map(item=>{
    const image=clean(item.image_url);
    const price=Number(item.price);
    const currency=clean(item.currency,"USD").toUpperCase();
    let priceText="";
    try{priceText=Number.isFinite(price)?new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:0}).format(price):"";}catch(_){priceText=Number.isFinite(price)?currency+" "+price.toLocaleString():"";}
    return `<article class="listing-card" data-listing-id="${escapeHtml(item.id)}"><a class="listing-open" href="/item/${slugSafe(item.slug)}"><div class="listing-image">${image?`<img class="listing-real-image" src="${escapeHtml(image)}" alt="${escapeHtml(clean(item.title,"Listing"))}" width="720" height="540" loading="lazy">`:"🛍️"}</div><div class="listing-body"><div class="listing-tag">${escapeHtml(category)}</div><span class="listing-title">${escapeHtml(clean(item.title,"Listing"))}</span>${clean(item.condition)?`<div class="listing-meta"><span>${escapeHtml(clean(item.condition))}</span></div>`:""}<div class="price">${escapeHtml(priceText)}</div></div></a></article>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(category)} Listings | BuySell.Best</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(category)} Listings | BuySell.Best"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:site_name" content="BuySell.Best"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escapeHtml(category)} Listings | BuySell.Best"><meta name="twitter:description" content="${escapeHtml(description)}"><script type="application/ld+json">${jsonLd(itemList)}</script><script type="application/ld+json">${jsonLd(breadcrumb)}</script><link rel="stylesheet" href="/css/style.css"></head><body><header class="site-header"><div class="container nav-wrap"><a class="brand" href="/"><span class="brand-mark">B</span><span>BuySell<span class="brand-dot">.Best</span></span></a><nav class="nav" aria-label="Primary navigation"><a href="/categories.html">Categories</a><a href="/search.html">Browse</a><a href="/deals.html">Global Deals</a><a class="nav-cta" href="/post-ad.html">+ Post Free Ad</a></nav></div></header><main><div class="container listing-detail-wrap"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/categories.html">Categories</a><span>›</span><span aria-current="page">${escapeHtml(category)}</span></nav><section class="page-hero"><div><div class="eyebrow">CATEGORY</div><h1>${escapeHtml(category)} Listings</h1><p>${escapeHtml(description)}</p></div></section><section class="section"><div class="section-head"><div><div class="eyebrow">ACTIVE ADS</div><h2>Latest ${escapeHtml(category.toLowerCase())}</h2></div><a class="text-link" href="/post-ad.html">+ Post an ad</a></div>${list.length?`<div class="listing-grid">${cards}</div>`:`<div class="empty-state"><h2>No active ${escapeHtml(category.toLowerCase())} listings yet</h2><p>New moderated listings will appear here when sellers publish them.</p><a class="button" href="/post-ad.html">Post a free ad</a></div>`}</section></div></main><footer class="site-footer"><div class="container footer-bottom"><span>© <span id="year"></span> BuySell.Best</span><span><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></span></div></footer><script src="/js/app.js"></script></body></html>`;
}

async function renderSitemap(env){
  const staticPaths=["/","/categories.html","/post-ad.html","/about.html","/contact.html","/privacy.html","/terms.html"];
  const categoryPaths=["phones","electronics","vehicles","property","fashion","furniture","services","other"];
  let dynamic="",latestAll="",latestByCategory={};
  if(env?.DB){
    try{
      const latest=await env.DB.prepare("SELECT MAX(COALESCE(updated_at,created_at)) AS latest FROM listings WHERE COALESCE(status,'active')='active'").first();
      latestAll=isoDate(latest?.latest);
    }catch(_){}
    try{
      const rows=await env.DB.prepare("SELECT category,MAX(COALESCE(updated_at,created_at)) AS latest FROM listings WHERE COALESCE(status,'active')='active' GROUP BY category").all();
      for(const row of rows.results||[])latestByCategory[String(row.category||"").toLowerCase()]=isoDate(row.latest);
    }catch(_){}
    const queries=[
      "SELECT slug,updated_at,image_url,video_url,video_embed_url,title,description,created_at FROM listings WHERE COALESCE(status,'active')='active' AND slug IS NOT NULL ORDER BY datetime(updated_at) DESC LIMIT 50000",
      "SELECT slug,updated_at,title,description,created_at FROM listings WHERE COALESCE(status,'active')='active' AND slug IS NOT NULL ORDER BY datetime(updated_at) DESC LIMIT 50000"
    ];
    for(const query of queries){
      try{
        const result=await env.DB.prepare(query).all();
        dynamic=(result.results||[]).map(item=>{
          const loc="https://buysell.best/item/"+slugSafe(item.slug);
          const last=isoDate(item.updated_at,isoDate(item.created_at));
          const image=validHttpUrl(item.image_url);
          const directVideo=directVideoUrl(item.video_url);
          const embedVideo=normalizeVideoEmbedUrl(item.video_embed_url||item.video_url);
          const video=(directVideo||embedVideo)&&image
            ?`<video:video><video:thumbnail_loc>${escapeHtml(image)}</video:thumbnail_loc><video:title>${escapeHtml(textSnippet(item.title,120)||"Untitled video")}</video:title><video:description>${escapeHtml(textSnippet(item.description,500)||"Video for "+clean(item.title,"this listing"))}</video:description>${directVideo?`<video:content_loc>${escapeHtml(directVideo)}</video:content_loc>`:`<video:player_loc>${escapeHtml(embedVideo)}</video:player_loc>`}${last?`<video:publication_date>${escapeHtml(last)}</video:publication_date>`:""}</video:video>`
            :"";
          let imageTag="";
          if(image){try{const u=new URL(image);if(u.hostname==="buysell.best"||u.hostname.endsWith(".buysell.best"))imageTag=`<image:image><image:loc>${escapeHtml(image)}</image:loc></image:image>`;}catch(_){}}
          return `<url><loc>${escapeHtml(loc)}</loc>${last?`<lastmod>${escapeHtml(last)}</lastmod>`:""}${imageTag}${video}</url>`;
        }).join("");
        break;
      }catch(_){}
    }
  }
  const urls=staticPaths.map(path=>`<url><loc>https://buysell.best${path}</loc>${path==="/"&&latestAll?`<lastmod>${escapeHtml(latestAll)}</lastmod>`:""}</url>`).join("");
  const cats=categoryPaths.map(path=>`<url><loc>https://buysell.best/category/${path}</loc>${latestByCategory[path]?`<lastmod>${escapeHtml(latestByCategory[path])}</lastmod>`:""}</url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${urls}${cats}${dynamic}</urlset>`;
}

async function serveSeoPage(request,env) {
  const url=new URL(request.url);
  const pathname=url.pathname;

  if (request.method !== "GET") return null;

  if (pathname === "/sitemap.xml") {
    return new Response(await renderSitemap(env),{
      headers:{
        "content-type":"application/xml; charset=UTF-8",
        "cache-control":"public, max-age=300, s-maxage=300, stale-while-revalidate=600"
      }
    });
  }

  const categoryMatch=pathname.match(/^\/category\/([^/]+)\/?$/);
  if(categoryMatch){
    const categorySlug=decodeURIComponent(categoryMatch[1]).toLowerCase();
    const allowed=["phones","electronics","vehicles","property","fashion","furniture","services","other"];
    if(!allowed.includes(categorySlug))return new Response("Not found",{status:404,headers:{"x-robots-tag":"noindex"}});
    let items=[];
    if(env?.DB){
      try{
        const result=await env.DB.prepare("SELECT id,slug,title,brand,category,price,currency,condition,description,image_url,status FROM listings WHERE category=? AND COALESCE(status,'active')='active' ORDER BY datetime(created_at) DESC LIMIT 40").bind(categorySlug).all();
        items=result.results||[];
      }catch(_){}
    }
    return new Response(renderCategoryPage(categorySlug,items),{
      headers:{
        "content-type":"text/html; charset=UTF-8",
        "cache-control":"public, max-age=60, s-maxage=300, stale-while-revalidate=600"
      }
    });
  }

  const match=pathname.match(/^\/item\/([^/]+)\/?$/);
  if(match){
    const slug=decodeURIComponent(match[1]);
    const item=await getActiveListing(env,slug);
    if(!item){
      return new Response("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex,follow\"><title>Listing not found | BuySell.Best</title></head><body><main><h1>Listing not found</h1><p>This listing is no longer available.</p><a href=\"/search.html\">Browse listings</a></main></body></html>",{
        status:404,
        headers:{"content-type":"text/html; charset=UTF-8","x-robots-tag":"noindex,follow","cache-control":"no-store"}
      });
    }
    return new Response(renderItemPage(item),{
      status:200,
      headers:{
        "content-type":"text/html; charset=UTF-8",
        "cache-control":"public, max-age=60, s-maxage=300, stale-while-revalidate=600"
      }
    });
  }

  // Send only active D1 listings to the new crawlable item URLs.
  if(pathname === "/ad.html" && url.searchParams.get("slug") && env?.DB){
    const slug=clean(url.searchParams.get("slug"));
    const item=await getActiveListing(env,slug);
    if(item){
      return Response.redirect("https://buysell.best/item/"+slugSafe(slug),301);
    }
  }

  return null;
}

async function serveAsset(request, env) {
  const response = await env.ASSETS.fetch(request);
  const path = new URL(request.url).pathname;
  if (path.endsWith(".js") || path.endsWith(".html")) {
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-cache, no-store, must-revalidate");
    headers.set("pragma", "no-cache");
    headers.set("expires", "0");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const seoResponse=await serveSeoPage(request,env);
    if(seoResponse)return seoResponse;

    const url = new URL(request.url);
    const name = route(url.pathname);
    if (!name) return serveAsset(request, env);

    const mod = await handlers[name]();
    const action = methodName(request);
    const fn = action ? mod[action] : null;

    if (!fn) {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: "GET, POST, OPTIONS" }
      });
    }

    return fn({request, env, ctx});
  }
};
