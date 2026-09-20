const FALLBACK_DEALS = [
  {
    id:"fallback-s26",
    title:"Samsung Galaxy S26 5G 256GB",
    category:"phones",
    merchant:"eBay",
    price:699.99,
    currency:"USD",
    image:"",
    url:"https://www.ebay.com/sch/i.html?_nkw=Samsung+Galaxy+S26+256GB",
    note:"Live source will replace this card when the marketplace API is enabled."
  },
  {
    id:"fallback-t14",
    title:"Lenovo ThinkPad T14",
    category:"electronics",
    merchant:"eBay",
    price:0,
    currency:"USD",
    image:"",
    url:"https://www.ebay.com/sch/i.html?_nkw=Lenovo+ThinkPad+T14",
    note:"Live marketplace search."
  }
];

function dealMoney(value,currency,locale="en-US"){
  try{return new Intl.NumberFormat(locale,{style:"currency",currency,maximumFractionDigits:0}).format(value)}
  catch{return currency+" "+Number(value||0).toLocaleString()}
}
function dealImage(item){
  return item.image
    ? '<img class="deal-image" src="'+escapeHtml(item.image)+'" alt="'+escapeHtml(item.title)+'" loading="lazy" referrerpolicy="no-referrer">'
    : '<div class="deal-icon" aria-hidden="true">🛍️</div>';
}
function storeSearchLinks(title){
  const q=encodeURIComponent(title);
  const slug=encodeURIComponent(title.replace(/\s+/g,"-"));
  return '<a class="deal-link" href="https://www.amazon.com/s?k='+q+'" target="_blank" rel="noopener noreferrer">Amazon ↗</a>'+
         '<a class="deal-link" href="https://www.aliexpress.com/w/wholesale-'+slug+'.html" target="_blank" rel="noopener noreferrer">AliExpress ↗</a>'+
         '<a class="deal-link" href="https://www.ebay.com/sch/i.html?_nkw='+q+'" target="_blank" rel="noopener noreferrer">eBay ↗</a>'+
         '<a class="deal-link" href="https://www.google.com/search?tbm=shop&q='+q+'" target="_blank" rel="noopener noreferrer">Compare ↗</a>';
}
function renderDealCard(item,index){
  return '<article class="deal-card live-deal-card" data-deal-id="'+escapeHtml(item.id)+'" data-deal-query="'+escapeHtml(item.searchQuery||item.title)+'">'+
    '<div class="deal-media">'+dealImage(item)+'</div>'+
    '<div class="deal-body"><div class="deal-top"><span class="listing-tag">'+escapeHtml(item.category||"deal")+'</span><span class="deal-merchant">'+escapeHtml(item.merchant||"Marketplace")+'</span></div>'+
    '<button class="deal-select" type="button" data-deal-select="'+escapeHtml(item.id)+'" aria-expanded="false"><span class="deal-title">'+escapeHtml(item.title)+'</span><span class="deal-hint">Tap to see related prices ↓</span></button>'+
    '<div class="deal-price smart-price" data-price="'+Number(item.price||0)+'" data-currency="'+escapeHtml(item.currency||"USD")+'">'+dealMoney(item.price||0,item.currency||"USD")+'</div>'+
    (item.shipping?'<div class="deal-signal">'+escapeHtml(item.shipping)+'</div>':"")+
    '<p>'+escapeHtml(item.note||"Prices, stock and shipping can change on the source marketplace.")+'</p>'+
    '<div class="deal-actions"><a class="button" href="'+escapeHtml(item.url||"#")+'" target="_blank" rel="noopener noreferrer">Open source ↗</a>'+storeSearchLinks(item.title)+'</div>'+
    '<small class="deal-checked">'+escapeHtml(item.sourceLabel||"Marketplace source")+' · price and availability may change.</small>'+
    '<div class="related-deals" hidden><div class="related-loading">Finding related items with current prices…</div></div>'+
    '</div></article>';
}
function renderRelated(target,data){
  if(!target)return;
  if(!data?.configured){
    target.innerHTML='<div class="related-empty">Live marketplace data is ready, but the marketplace API connection still needs to be enabled in Cloudflare.</div>';
    return;
  }
  const items=(data.items||[]).slice(0,4);
  if(!items.length){
    target.innerHTML='<div class="related-empty">No current related items were returned.</div>';
    return;
  }
  target.innerHTML='<div class="related-head"><strong>Related current prices</strong><span>'+escapeHtml(data.source||"Marketplace")+'</span></div>'+
    '<div class="related-grid">'+items.map(x=>'<a class="related-item" href="'+escapeHtml(x.url)+'" target="_blank" rel="noopener noreferrer">'+
      (x.image?'<img src="'+escapeHtml(x.image)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="related-placeholder">🛍️</span>')+
      '<span class="related-copy"><b>'+escapeHtml(x.title)+'</b><span class="related-price smart-price" data-price="'+Number(x.price||0)+'" data-currency="'+escapeHtml(x.currency||"USD")+'">'+dealMoney(x.price||0,x.currency||"USD")+'</span><small>'+escapeHtml(x.merchant||"eBay")+'</small></span></a>').join("")+
    '</div>';
}
async function renderGlobalDeals(container){
  if(!container)return;
  const profile=window.__bsbProfile||await getProfile();
  const isDealsPage=location.pathname.endsWith("/deals.html");
  const feedLimit=isDealsPage?48:8;
  const live=await fetch("/api/deals?query=popular&limit="+feedLimit,{cache:"no-store"}).then(r=>r.json()).catch(()=>null);
  if(live?.ok&&live.items?.length){
    const status=live.temporary
      ? '<div class="marketplace-status"><strong>Temporary universal product catalog</strong><span>Prices and images are catalog-preview data for now. Use the store buttons to check the current seller price. Approved live feeds can replace this layer later.</span></div>'
      : '<div class="marketplace-status"><strong>Live marketplace deals</strong><span>Current marketplace items are shown from the connected live feed.</span></div>';
    container.innerHTML=status+(live.items||[]).map(renderDealCard).join("");
    if(!isDealsPage){container.innerHTML+='<div class="marketplace-more"><a class="button button-secondary" href="deals.html">View all product categories →</a></div>';}
  }else{
    container.innerHTML='<div class="marketplace-status"><strong>Marketplace preview</strong><span>Temporary catalog data could not be loaded right now.</span></div>'+FALLBACK_DEALS.map(renderDealCard).join("");
  }
  container.addEventListener("click",async event=>{
    const button=event.target.closest("[data-deal-select]");
    if(!button)return;
    const card=button.closest("[data-deal-id]");
    const target=card?.querySelector(".related-deals");
    if(!card||!target)return;
    const open=target.hidden;
    document.querySelectorAll("#global-deals .related-deals").forEach(x=>{if(x!==target)x.hidden=true;});
    document.querySelectorAll("#global-deals [data-deal-select]").forEach(x=>x.setAttribute("aria-expanded","false"));
    target.hidden=!open;
    button.setAttribute("aria-expanded",String(open));
    if(!open||target.dataset.loaded)return;
    target.dataset.loaded="1";
    const q=encodeURIComponent(card.dataset.dealQuery||"");
    const data=await fetch("/api/deals/related?query="+q+"&exclude="+encodeURIComponent(card.dataset.dealId),{cache:"no-store"}).then(r=>r.json()).catch(()=>null);
    renderRelated(target,data);
    await decoratePrices(profile||await getProfile());
  });
  await decoratePrices(profile);
}
window.renderGlobalDeals=renderGlobalDeals;
