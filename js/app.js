const LISTINGS=[
{id:"demo-iphone-15",slug:"apple-iphone-15-128gb-colombo",title:"Apple iPhone 15 128GB",brand:"Apple",category:"phones",price:145000,currency:"LKR",location:"Colombo",condition:"Used",emoji:"📱",description:"Demo listing for the BuySell.Best starter site. Replace this with real, moderated listings when D1 is connected."},
{id:"demo-s24",slug:"samsung-galaxy-s24-256gb-kandy",title:"Samsung Galaxy S24 256GB",brand:"Samsung",category:"phones",price:158000,currency:"LKR",location:"Kandy",condition:"Used",emoji:"📱",description:"Demo listing with a clear title, price, location and condition."},
{id:"demo-laptop",slug:"lenovo-thinkpad-t14-galle",title:"Lenovo ThinkPad T14",brand:"Lenovo",category:"electronics",price:98000,currency:"LKR",location:"Galle",condition:"Used",emoji:"💻",description:"Demo laptop listing. Add real specifications, photos and seller details in production."},
{id:"demo-camera",slug:"mirrorless-camera-colombo",title:"Mirrorless Camera Kit",brand:"Sony",category:"electronics",price:125000,currency:"LKR",location:"Colombo",condition:"Used",emoji:"📷",description:"Demo camera listing for the marketplace interface."},
{id:"demo-car",slug:"toyota-aqua-hybrid-colombo",title:"Toyota Aqua Hybrid",brand:"Toyota",category:"vehicles",price:7850000,currency:"LKR",location:"Colombo",condition:"Used",emoji:"🚗",description:"Demo vehicle listing. Vehicle listings should use truthful, detailed information."},
{id:"demo-sofa",slug:"three-seat-sofa-negombo",title:"Three-seat Sofa",brand:"",category:"furniture",price:45000,currency:"LKR",location:"Negombo",condition:"Used",emoji:"🛋️",description:"Demo furniture listing."},
{id:"demo-land",slug:"small-land-plot-kurunegala",title:"Small Land Plot",brand:"",category:"property",price:3200000,currency:"LKR",location:"Kurunegala",condition:"New",emoji:"🏠",description:"Demo property listing. Verify ownership and legal details independently."},
{id:"demo-bike",slug:"motorbike-commuter-kalutara",title:"Commuter Motorbike",brand:"",category:"vehicles",price:420000,currency:"LKR",location:"Kalutara",condition:"Used",emoji:"🏍️",description:"Demo motorbike listing."}
];

const COUNTRY_NAMES={LK:"Sri Lanka",US:"United States",GB:"United Kingdom",IN:"India",AU:"Australia",CA:"Canada",NZ:"New Zealand",SG:"Singapore",MY:"Malaysia",JP:"Japan",KR:"South Korea",AE:"United Arab Emirates",ZA:"South Africa",BR:"Brazil",MX:"Mexico",DE:"Germany",FR:"France",IT:"Italy",ES:"Spain",IE:"Ireland",PK:"Pakistan",BD:"Bangladesh",NP:"Nepal",SA:"Saudi Arabia"};

function money(value,currency,locale="en-US"){
  try{return new Intl.NumberFormat(locale,{style:"currency",currency:currency||"USD",maximumFractionDigits:0}).format(value)}
  catch{return (currency||"USD")+" "+Number(value).toLocaleString()}
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function visitorId(){
  let id=localStorage.getItem("bsb_visitor_id");
  if(!id){
    id=(globalThis.crypto?.randomUUID?.()||("v_"+Math.random().toString(36).slice(2)+Date.now().toString(36)));
    localStorage.setItem("bsb_visitor_id",id);
  }
  return id;
}
async function track(event_type,item=null,extra={}){
  try{
    const payload={visitor_id:visitorId(),event_type,...extra};
    if(item){
      payload.listing_id=item.id; payload.category=item.category; payload.brand=item.brand||"";
      payload.item_price=item.price; payload.item_currency=item.currency; payload.item_location=item.location;
    }
    await fetch("/api/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),keepalive:true});
  }catch(_){}
}
function candidatePayload(items=LISTINGS){return items.map(x=>({id:x.id,title:x.title,category:x.category,brand:x.brand||"",price:x.price,currency:x.currency,location:x.location}))}
function listingCard(item,opts={}){
  const seed=opts.seedId||"";
  return '<article class="listing-card" data-listing-id="'+escapeHtml(item.id)+'"><a class="listing-open" href="ad.html?slug='+encodeURIComponent(item.slug)+'" data-track-view="'+escapeHtml(item.id)+'"><div class="listing-image" aria-hidden="true">'+item.emoji+'</div><div class="listing-body"><div class="listing-tag">'+escapeHtml(item.category)+'</div><span class="listing-title">'+escapeHtml(item.title)+'</span><div class="listing-meta"><span>'+escapeHtml(item.location)+'</span><span>'+escapeHtml(item.condition)+'</span></div><div class="price smart-price" data-price="'+item.price+'" data-currency="'+escapeHtml(item.currency)+'">'+money(item.price,item.currency)+'</div></div></a><button class="more-like" type="button" data-more-like="'+escapeHtml(item.id)+'" aria-label="Show me more like this item">✨ More like this</button></article>';
}
async function getProfile(){
  try{
    const r=await fetch("/api/recommendations",{cache:"no-store"}),d=await r.json();
    return d&&d.country?d:{country:"US",currency:"USD"};
  }catch(_){return {country:"US",currency:"USD"}}
}
async function decoratePrices(profile){
  const target=profile?.currency||"USD";
  const nodes=[...document.querySelectorAll(".smart-price")];
  if(!nodes.length)return;
  const usdRateCache={};
  async function usdTo(currency){
    if(currency==="USD")return 1;
    if(usdRateCache[currency])return usdRateCache[currency];
    try{
      const r=await fetch("/api/currency?from=USD&to="+encodeURIComponent(currency)+"&amount=1",{cache:"force-cache"}),d=await r.json();
      if(d.ok&&Number(d.rate)>0){usdRateCache[currency]=Number(d.rate);return usdRateCache[currency]}
    }catch(_){}
    return null;
  }
  const rate=await usdTo(target);
  for(const node of nodes){
    const value=Number(node.dataset.price),from=node.dataset.currency;
    if(!Number.isFinite(value))continue;
    let html=money(value,from);
    if(from==="USD"&&target!=="USD"&&rate) html+='<small class="local-price">≈ '+money(value*rate,target)+'</small>';
    else if(from!==target&&target==="USD"&&from!=="USD"){
      const fromRate=await usdTo(from);
      if(fromRate) html+='<small class="local-price">≈ '+money(value/fromRate,"USD")+'</small>';
    }else if(from!==target&&rate){
      const fromRate=await usdTo(from);
      if(fromRate) html+='<small class="local-price">≈ '+money((value/fromRate)*rate,target)+'</small>';
    }
    node.innerHTML=html;
  }
}
async function loadRecommendations(target,items=LISTINGS,seedItem=null){
  if(!target)return;
  try{
    const r=await fetch("/api/recommendations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({visitor_id:visitorId(),candidates:candidatePayload(items),seed:seedItem?{id:seedItem.id,category:seedItem.category,brand:seedItem.brand}:{} })});
    const d=await r.json();
    if(!d.ok)return;
    const byId=new Map(items.map(x=>[x.id,x]));
    const ranked=(d.recommendations||[]).map(x=>byId.get(x.id)).filter(Boolean);
    if(ranked.length){target.innerHTML=ranked.slice(0,8).map(x=>listingCard(x,{seedId:seedItem?.id})).join("");wireInteractions(target);}
    await decoratePrices(d);
    const profileEls=document.querySelectorAll("[data-personalization-profile]");
    const name=COUNTRY_NAMES[d.country]||d.country||"your region";
    profileEls.forEach(el=>el.textContent="Personalized for "+name+" · "+(d.currency||"USD"));
    const interestWrap=document.querySelector("[data-interest-summary]");
    if(interestWrap){
      const names=(d.interests||[]).slice(0,3).map(x=>x.category).join(" · ");
      interestWrap.textContent=names?"Learning your interests: "+names:"Learning from what you view and choose";
    }
  }catch(_){await decoratePrices(await getProfile())}
}
function wireInteractions(root=document){
  root.querySelectorAll("[data-more-like]").forEach(btn=>{
    if(btn.dataset.bound==="1")return; btn.dataset.bound="1";
    btn.addEventListener("click",async e=>{
      e.preventDefault();e.stopPropagation();
      const item=LISTINGS.find(x=>x.id===btn.dataset.moreLike); if(!item)return;
      btn.disabled=true;btn.textContent="Learning…";
      await track("show_more",item);
      const section=document.querySelector("#personalized-listings")||document.querySelector("#similar-listings");
      if(section) await loadRecommendations(section,LISTINGS,item);
      btn.disabled=false;btn.textContent="✓ Showing more like this";
    });
  });
  root.querySelectorAll("[data-track-view]").forEach(link=>{
    if(link.dataset.bound==="1")return; link.dataset.bound="1";
    link.addEventListener("click",()=>{const item=LISTINGS.find(x=>x.id===link.dataset.trackView);if(item)track("view",item)});
  });
}
function setupReset(){
  document.querySelectorAll("[data-reset-personalization]").forEach(btn=>btn.addEventListener("click",async()=>{
    const id=visitorId();
    try{await fetch("/api/privacy-reset",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({visitor_id:id})})}catch(_){}
    localStorage.removeItem("bsb_visitor_id");
    location.reload();
  }));
}
document.addEventListener("DOMContentLoaded",async()=>{
  document.querySelectorAll("#year").forEach(el=>el.textContent=new Date().getFullYear());
  const home=document.querySelector("#home-listings");
  const personalized=document.querySelector("#personalized-listings");
  if(home){
    home.innerHTML=LISTINGS.slice(0,8).map(listingCard).join("");
    wireInteractions(home);
  }
  const profile=await getProfile();
  if(personalized){
    await loadRecommendations(personalized,LISTINGS);
    wireInteractions(personalized);
  }
  const detail=document.querySelector("#listing-detail");
  if(detail){
    const slug=new URLSearchParams(location.search).get("slug");
    const item=LISTINGS.find(x=>x.slug===slug)||LISTINGS[0];
    track("view",item);
    document.title=item.title+" for Sale in "+item.location+" | BuySell.Best";
    const meta=document.querySelector('meta[name="description"]');
    if(meta)meta.setAttribute("content",item.title+" for sale in "+item.location+". "+item.condition+" listing on BuySell.Best.");
    detail.innerHTML='<div class="detail-grid"><div><div class="detail-photo" aria-label="'+escapeHtml(item.title)+'">'+item.emoji+'</div></div><div class="detail-card"><div class="eyebrow">'+escapeHtml(item.category)+' · '+escapeHtml(item.location)+'</div><h1>'+escapeHtml(item.title)+'</h1><div class="detail-price smart-price" data-price="'+item.price+'" data-currency="'+escapeHtml(item.currency)+'">'+money(item.price,item.currency)+'</div><div class="detail-pills"><span class="pill">'+escapeHtml(item.condition)+'</span><span class="pill">'+escapeHtml(item.location)+'</span><span class="pill">Personalization enabled</span></div><p class="detail-muted">'+escapeHtml(item.description)+'</p><div class="detail-actions"><button class="button" type="button" id="detail-more-like">✨ Show me more like this</button> <a class="button button-secondary" href="contact.html">Report / Contact</a></div></div></div>';
    const more=document.querySelector("#detail-more-like");
    more?.addEventListener("click",async()=>{await track("show_more",item);const s=document.querySelector("#similar-listings");if(s)await loadRecommendations(s,LISTINGS,item);more.textContent="✓ Showing more like this";more.disabled=true;});
    await loadRecommendations(document.querySelector("#similar-listings"),LISTINGS,item);
    wireInteractions(document.querySelector("#similar-listings")||document);
  }
  await decoratePrices(profile);
  document.querySelectorAll("[data-personalization-profile]").forEach(el=>el.textContent="Personalized for "+(COUNTRY_NAMES[profile.country]||profile.country)+" · "+(profile.currency||"USD"));
  setupReset();
});