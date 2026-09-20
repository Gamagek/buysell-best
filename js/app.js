const LISTINGS=[
{id:"demo-iphone-15",slug:"apple-iphone-15-128gb-colombo",title:"Apple iPhone 15 128GB",brand:"Apple",category:"phones",price:145000,currency:"LKR",location:"",condition:"Used",emoji:"📱",description:"Demo listing for the BuySell.Best starter site. Replace this with real, moderated listings when D1 is connected."},
{id:"demo-s24",slug:"samsung-galaxy-s24-256gb-kandy",title:"Samsung Galaxy S24 256GB",brand:"Samsung",category:"phones",price:158000,currency:"LKR",location:"",condition:"Used",emoji:"📱",description:"Demo listing with a clear title, price, location and condition."},
{id:"demo-laptop",slug:"lenovo-thinkpad-t14-galle",title:"Lenovo ThinkPad T14",brand:"Lenovo",category:"electronics",price:98000,currency:"LKR",location:"",condition:"Used",emoji:"💻",description:"Demo laptop listing. Add real specifications, photos and seller details in production."},
{id:"demo-camera",slug:"mirrorless-camera-colombo",title:"Mirrorless Camera Kit",brand:"Sony",category:"electronics",price:125000,currency:"LKR",location:"",condition:"Used",emoji:"📷",description:"Demo camera listing for the marketplace interface."},
{id:"demo-car",slug:"toyota-aqua-hybrid-colombo",title:"Toyota Aqua Hybrid",brand:"Toyota",category:"vehicles",price:7850000,currency:"LKR",location:"",condition:"Used",emoji:"🚗",description:"Demo vehicle listing. Vehicle listings should use truthful, detailed information."},
{id:"demo-sofa",slug:"three-seat-sofa-negombo",title:"Three-seat Sofa",brand:"",category:"furniture",price:45000,currency:"LKR",location:"",condition:"Used",emoji:"🛋️",description:"Demo furniture listing."},
{id:"demo-land",slug:"small-land-plot-kurunegala",title:"Small Land Plot",brand:"",category:"property",price:3200000,currency:"LKR",location:"",condition:"New",emoji:"🏠",description:"Demo property listing. Verify ownership and legal details independently."},
{id:"demo-bike",slug:"motorbike-commuter-kalutara",title:"Commuter Motorbike",brand:"",category:"vehicles",price:420000,currency:"LKR",location:"",condition:"Used",emoji:"🏍️",description:"Demo motorbike listing."}
];

const COUNTRY_NAMES={LK:"Sri Lanka",US:"United States",GB:"United Kingdom",IN:"India",AU:"Australia",CA:"Canada",NZ:"New Zealand",SG:"Singapore",MY:"Malaysia",JP:"Japan",KR:"South Korea",AE:"United Arab Emirates",ZA:"South Africa",BR:"Brazil",MX:"Mexico",DE:"Germany",FR:"France",IT:"Italy",ES:"Spain",IE:"Ireland",PK:"Pakistan",BD:"Bangladesh",NP:"Nepal",SA:"Saudi Arabia"};

function money(value,currency,locale="en-US"){
  try{return new Intl.NumberFormat(locale,{style:"currency",currency:currency||"USD",maximumFractionDigits:0}).format(value)}
  catch{return (currency||"USD")+" "+Number(value).toLocaleString()}
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function displayText(value,fallback=""){
  const s=String(value??"").trim();
  return s&&s.toLowerCase()!=="null"&&s.toLowerCase()!=="undefined"?s:fallback;
}
function carouselCard(item,index){
  const image=item.image||item.image_url||"";
  const title=displayText(item.title,"Global product");
  const category=displayText(item.categoryLabel||item.category,"Global Market");
  const condition=displayText(item.condition,"Online offer");
  const url=displayText(item.url,"#");
  const media=image
    ? '<img class="carousel-image" src="'+escapeHtml(image)+'" alt="" loading="'+(index<3?"eager":"lazy")+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\';"><span class="carousel-emoji" style="display:none">🛍️</span>'
    : '<span class="carousel-emoji">🛍️</span>';
  return '<article class="carousel-card" data-carousel-index="'+index+'"><div class="carousel-card-inner"><a href="'+escapeHtml(url)+'" target="_blank" rel="noopener noreferrer nofollow"><div class="carousel-visual">'+media+'<span class="carousel-badge">GLOBAL MARKET</span></div><div class="carousel-body"><span class="carousel-tag">'+escapeHtml(category)+'</span><span class="carousel-title">'+escapeHtml(title)+'</span><span class="carousel-condition">'+escapeHtml(condition)+'</span><div class="carousel-price smart-price" data-price="'+Number(item.price||0)+'" data-currency="'+escapeHtml(item.currency||"USD")+'">'+money(Number(item.price||0),item.currency||"USD")+'</div></div></a></div></article>';
}
function setupCurrentListingsCarousel(items=[]){
  const root=document.querySelector("#current-listings-carousel"),track=document.querySelector("#current-listings-track"),dots=document.querySelector("#current-listings-dots"),prev=document.querySelector(".carousel-prev"),next=document.querySelector(".carousel-next"),pause=document.querySelector("#current-listings-pause");
  if(!root||!track)return;
  const valid=(items||[]).filter(x=>x&&String(x.title||"").trim()&&Number.isFinite(Number(x.price))&&Number(x.price)>0).slice(0,12);
  if(!valid.length){track.innerHTML='<div class="carousel-empty"><strong>No current listings yet.</strong><span>Global market offers will appear here automatically.</span></div>';if(dots)dots.innerHTML="";return;}
  track.innerHTML=valid.map(carouselCard).join("");
  const cards=[...track.querySelectorAll(".carousel-card")];let current=0,playing=true,timer=null,startX=0,dragging=false;
  function paint(){
    const n=cards.length;
    cards.forEach((card,i)=>{let d=i-current;if(d>n/2)d-=n;if(d<-n/2)d+=n;const abs=Math.abs(d);const x=d*Math.min(270,Math.max(190,track.clientWidth*.30));const z=abs===0?60:Math.max(0,40-abs*15);const scale=abs===0?1:Math.max(.72,1-abs*.09);const opacity=abs>2?.12:Math.max(.32,1-abs*.25);card.style.transform="translateX(calc(-50% + "+x+"px)) translateZ("+z+"px) rotateY("+(d*-18)+"deg) scale("+scale+")";card.style.opacity=opacity;card.style.zIndex=String(20-abs);card.classList.toggle("is-active",d===0);card.classList.toggle("is-dragging",dragging);});
    if(dots)dots.innerHTML=cards.map((_,i)=>'<button type="button" class="'+(i===current?"is-active":"")+'" data-carousel-dot="'+i+'" aria-label="Show listing '+(i+1)+'"></button>').join("");
  }
  function go(step){current=(current+step+cards.length)%cards.length;paint();}
  function stop(){if(timer){clearInterval(timer);timer=null;}}
  function start(){stop();if(!playing||cards.length<2)return;timer=setInterval(()=>go(1),3800);}
  prev?.addEventListener("click",()=>{go(-1);start()});next?.addEventListener("click",()=>{go(1);start()});
  pause?.addEventListener("click",()=>{playing=!playing;pause.textContent=playing?"Ⅱ Pause":"▶ Play";pause.setAttribute("aria-pressed",String(!playing));start();});
  dots?.addEventListener("click",e=>{const b=e.target.closest("[data-carousel-dot]");if(!b)return;current=Number(b.dataset.carouselDot)||0;paint();start();});
  const viewport=root.querySelector(".carousel-viewport");
  viewport?.addEventListener("pointerdown",e=>{dragging=true;startX=e.clientX;viewport.setPointerCapture?.(e.pointerId);stop();paint();});
  viewport?.addEventListener("pointerup",e=>{if(!dragging)return;const dx=e.clientX-startX;dragging=false;if(Math.abs(dx)>45)go(dx<0?1:-1);paint();start();});
  viewport?.addEventListener("pointercancel",()=>{dragging=false;paint();start()});
  root.addEventListener("mouseenter",stop);root.addEventListener("mouseleave",start);root.addEventListener("focusin",stop);root.addEventListener("focusout",e=>{if(!root.contains(e.relatedTarget))start()});
  if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)playing=false;
  paint();\n  requestAnimationFrame(paint);\n  decoratePrices(window.__bsbProfile||{currency:"USD"});\n  start();
}
function hideNullValues(root=document){
  const clean=node=>{
    if(node.nodeType===Node.TEXT_NODE){
      const cleaned=node.nodeValue.replace(/\b(?:null|undefined)\b/gi,"").replace(/[ \t]{2,}/g," ").trim();
      if(cleaned!==node.nodeValue)node.nodeValue=cleaned;
    }else if(node.nodeType===Node.ELEMENT_NODE){
      for(const attr of ["title","aria-label","alt"]){
        if(node.hasAttribute(attr)){
          const original=node.getAttribute(attr)||"";
          const value=original.replace(/\b(?:null|undefined)\b/gi,"").trim();
          if(value!==original)node.setAttribute(attr,value);
        }
      }
      node.childNodes.forEach(clean);
    }
  };
  if(root)clean(root);
}
function watchForNullValues(){
  hideNullValues(document.body);
  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      if(mutation.type==="childList")mutation.addedNodes.forEach(node=>hideNullValues(node));
      if(mutation.type==="characterData")hideNullValues(mutation.target);
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
}
async function fetchJson(url,ms=4500){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{
    const r=await fetch(url,{cache:"no-store",signal:controller.signal,headers:{Accept:"application/json"}});
    if(!r.ok)return null;
    return await r.json();
  }catch(_){return null}
  finally{clearTimeout(timer)}
}
async function loadCurrentListingsCarousel(){
  const root=document.querySelector("#current-listings-carousel");
  const track=document.querySelector("#current-listings-track");
  if(!root||!track)return;

  track.innerHTML='<div class="carousel-empty"><strong>Loading current listings…</strong><span>Checking BuySell.Best and the global market.</span></div>';

  const normalizeLocal=d=>(d?.items||[]).filter(x=>x&&x.status==="active"&&displayText(x.title)&&Number(x.price)>0).map(x=>({
    ...x,image:displayText(x.image||x.image_url,""),url:displayText(x.url,"ad.html?slug="+encodeURIComponent(x.slug||""))
  }));
  const normalizeGlobal=d=>(d?.items||[]).filter(x=>x&&displayText(x.title)&&Number(x.price)>0).map(x=>({...x,image:displayText(x.image||x.image_url,"")}));
  const show=(items,note)=>{
    if(!items.length)return false;
    setupCurrentListingsCarousel(items);
    const n=document.querySelector(".carousel-note");
    if(n&&note)n.textContent=note;
    return true;
  };

  // Fetch local and global in parallel. A slow local database must not block the carousel.
  const localPromise=fetchJson("/api/listings?limit=12",2500).then(normalizeLocal);
  const globalPromise=fetchJson("/api/deals?query=popular&limit=12",4500).then(d=>({items:normalizeGlobal(d),temporary:!!d?.temporary}));

  const localFirst=await Promise.race([
    localPromise.then(items=>({kind:"local",items})),
    new Promise(resolve=>setTimeout(()=>resolve({kind:"timeout",items:[]}),900))
  ]);
  if(localFirst.kind==="local"&&show(localFirst.items,"Live BuySell.Best listings — prices come from the listing records."))return;

  const globalResult=await globalPromise;
  if(globalResult&&show(globalResult.items,globalResult.temporary
    ?"No local listings yet — showing global market catalog media. Prices can change; verify the seller before buying."
    :"No local listings yet — showing current global market offers and their returned prices."))return;

  // Final direct media fallback when the Worker marketplace feed is temporarily unavailable.
  const direct=await fetchJson("https://dummyjson.com/products?limit=12",4500);
  const directItems=(direct?.products||[]).map(x=>({
    id:"global-"+x.id,
    title:displayText(x.title,"Product"),
    category:displayText(x.category,"Global Market"),
    condition:"Online offer",
    price:Number(x.price)||0,
    currency:"USD",
    image:displayText(x.thumbnail||x.images?.[0],""),
    url:"https://www.google.com/search?tbm=shop&q="+encodeURIComponent(displayText(x.title,"product"))
  })).filter(x=>x.image&&x.price>0);
  if(show(directItems,"No local listings yet — showing global market catalog media. Prices can change; verify the seller before buying."))return;

  // If local D1 responds after the global attempt and has real listings, use them.
  const lateLocal=await localPromise.catch(()=>[]);
  if(show(lateLocal,"Live BuySell.Best listings — prices come from the listing records."))return;

  setupCurrentListingsCarousel([]);
}

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
  const title=displayText(item.title,"Listing");
  const category=displayText(item.category,"Other");
  const condition=displayText(item.condition,"");
  const location=displayText(item.location,"");
  const image=displayText(item.image||item.image_url,"");
  const media=image
    ? '<img class="listing-real-image" src="'+escapeHtml(image)+'" alt="" loading="lazy" onerror="this.style.display=\'none\';">'
    : '<span class="listing-emoji">'+displayText(item.emoji,"🛍️")+'</span>';
  const meta=(location||condition)
    ? '<div class="listing-meta">'+(location?'<span>'+escapeHtml(location)+'</span>':"")+(condition?'<span>'+escapeHtml(condition)+'</span>':"")+'</div>'
    : "";
  return '<article class="listing-card" data-listing-id="'+escapeHtml(item.id)+'"><a class="listing-open" href="ad.html?slug='+encodeURIComponent(item.slug||"")+'"><div class="listing-image" aria-hidden="true">'+media+'</div><div class="listing-body"><div class="listing-tag">'+escapeHtml(category)+'</div><span class="listing-title">'+escapeHtml(title)+'</span>'+meta+'<div class="price smart-price" data-price="'+Number(item.price||0)+'" data-currency="'+escapeHtml(item.currency||"USD")+'">'+money(Number(item.price||0),item.currency||"USD")+'</div></div></a>'+reactionControls(item)+'<button class="more-like" type="button" data-more-like="'+escapeHtml(item.id)+'" aria-label="Show me more like this item">✨ More like this</button></article>';
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
  const rateCache={};
  async function rate(from,to){
    if(from===to)return 1;
    const key=from+"_"+to;
    if(rateCache[key])return rateCache[key];
    try{
      const r=await fetch("/api/currency?from="+encodeURIComponent(from)+"&to="+encodeURIComponent(to)+"&amount=1",{cache:"force-cache"});
      const d=await r.json();
      if(d.ok&&Number.isFinite(Number(d.rate))&&Number(d.rate)>0){rateCache[key]=Number(d.rate);return rateCache[key];}
    }catch(_){}
    return null;
  }
  const locale=target==="LKR"?"en-LK":"en-US";
  for(const node of nodes){
    const value=Number(node.dataset.price),from=String(node.dataset.currency||"USD").toUpperCase();
    if(!Number.isFinite(value))continue;
    const usdRate=await rate(from,"USD");
    const localRate=await rate(from,target);
    const usdValue=from==="USD"?value:(usdRate?value*usdRate:null);
    const localValue=from===target?value:(localRate?value*localRate:null);
    const usdText=usdValue!==null?money(usdValue,"USD","en-US"):null;
    const localText=localValue!==null?money(localValue,target,locale):null;
    if(from===target){
      node.innerHTML=localText+(usdText?'<small class="usd-price">≈ '+usdText+'</small>':"");
    }else if(target==="USD"){
      node.innerHTML=usdText+(localText?'<small class="local-price">≈ '+localText+'</small>':"");
    }else{
      node.innerHTML=localText+(usdText?'<small class="usd-price">≈ '+usdText+'</small>':"");
    }
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
  root.querySelectorAll("[data-reaction]").forEach(btn=>{
    if(btn.dataset.bound==="1")return; btn.dataset.bound="1";
    btn.addEventListener("click",async e=>{
      e.preventDefault();e.stopPropagation();
      const card=btn.closest("[data-listing-id]");
      const item=LISTINGS.find(x=>x.id===card?.dataset.listingId); if(!item)return;
      await react(item,btn.dataset.reaction,btn);
    });
  });
  root.querySelectorAll(".listing-open").forEach(link=>{
    if(link.dataset.bound==="1")return; link.dataset.bound="1";
    link.addEventListener("click",()=>{
      const card=link.closest("[data-listing-id]");
      const item=LISTINGS.find(x=>x.id===card?.dataset.listingId);
      if(item)sendView(item);
    });
  });
  hydrateStats(root);
}
function setupReset(){
  document.querySelectorAll("[data-reset-personalization]").forEach(btn=>btn.addEventListener("click",async()=>{
    const id=visitorId();
    try{await fetch("/api/privacy-reset",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({visitor_id:id})})}catch(_){}
    localStorage.removeItem("bsb_visitor_id");
    location.reload();
  }));
}
document.addEventListener("DOMContentLoaded",async()=>{\n  watchForNullValues();
  document.querySelectorAll("#year").forEach(el=>el.textContent=new Date().getFullYear());
  const home=document.querySelector("#home-listings");
  const personalized=document.querySelector("#personalized-listings");
  if(home){
    home.innerHTML=LISTINGS.slice(0,8).map(listingCard).join("");
    wireInteractions(home);
  }
  // Start immediately; do not wait for recommendations, currency lookup, or global deals.
  loadCurrentListingsCarousel();
  const profile=await getProfile();
  if(personalized){
    await loadRecommendations(personalized,LISTINGS);
    wireInteractions(personalized);
  }
  const detail=document.querySelector("#listing-detail");
  if(detail){
    const slug=new URLSearchParams(location.search).get("slug");
    const item=LISTINGS.find(x=>x.slug===slug)||LISTINGS[0];
    sendView(item);
    document.title=item.title+" | BuySell.Best";
    const meta=document.querySelector('meta[name="description"]');
    if(meta)meta.setAttribute("content",item.title+". "+displayText(item.condition,"Listing")+" on BuySell.Best.");
    detail.innerHTML='<div class="detail-grid"><div><div class="detail-photo" aria-label="'+escapeHtml(item.title)+'">'+item.emoji+'</div></div><div class="detail-card" data-listing-id="'+escapeHtml(item.id)+'"><div class="eyebrow">'+escapeHtml(item.category)+'</div><h1>'+escapeHtml(item.title)+'</h1><div class="detail-price smart-price" data-price="'+item.price+'" data-currency="'+escapeHtml(item.currency)+'">'+money(item.price,item.currency)+'</div><div class="detail-pills"><span class="pill">'+escapeHtml(item.condition)+'</span><span class="pill">Personalization enabled</span></div><p class="detail-muted">'+escapeHtml(item.description)+'</p>'+reactionControls(item)+'<div class="detail-actions"><button class="button" type="button" id="detail-more-like">✨ Show me more like this</button> <a class="button button-secondary" href="contact.html">Report / Contact</a></div></div></div>';
    wireInteractions(detail);
    const more=document.querySelector("#detail-more-like");
    more?.addEventListener("click",async()=>{await track("show_more",item);const s=document.querySelector("#similar-listings");if(s)await loadRecommendations(s,LISTINGS,item);more.textContent="✓ Showing more like this";more.disabled=true;});
    await loadRecommendations(document.querySelector("#similar-listings"),LISTINGS,item);
    wireInteractions(document.querySelector("#similar-listings")||document);
  }
  await decoratePrices(profile);
  if(window.renderGlobalDeals){const deals=document.querySelector("#global-deals");if(deals)await window.renderGlobalDeals(deals);}
  addFxAttribution();
  document.querySelectorAll("[data-personalization-profile]").forEach(el=>el.textContent="Personalized for "+(COUNTRY_NAMES[profile.country]||profile.country)+" · "+(profile.currency||"USD"));
  setupReset();
});

async function sendView(item){
  try{
    await fetch("/api/view",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({visitor_id:visitorId(),listing_id:item.id,category:item.category,brand:item.brand||"",item_price:item.price,item_currency:item.currency,item_location:item.location}),keepalive:true});
  }catch(_){}
}
function reactionControls(item){
  return '<div class="reaction-row"><button type="button" data-reaction="like" aria-pressed="false">❤️ Like</button><button type="button" data-reaction="interested" aria-pressed="false">⭐ Interested</button><button type="button" data-reaction="save" aria-pressed="false">🔖 Save</button></div><div class="listing-stats" aria-label="Listing activity"><span>👁 0</span><span>❤️ 0</span><span>⭐ 0</span><span>🔖 0</span></div>';
}
async function hydrateStats(root=document){
  const ids=[...new Set([...root.querySelectorAll("[data-listing-id]")].map(x=>x.dataset.listingId).filter(Boolean))];
  if(!ids.length)return;
  try{
    const r=await fetch("/api/stats?ids="+encodeURIComponent(ids.join(","))+"&visitor_id="+encodeURIComponent(visitorId()),{cache:"no-store"});
    const d=await r.json(); if(!d.ok)return;
    root.querySelectorAll("[data-listing-id]").forEach(card=>{const stats=d.stats?.[card.dataset.listingId];if(stats)renderStats(card,stats);});
  }catch(_){}
}
function renderStats(card,stats){
  const bar=card?.querySelector(".listing-stats"); if(!bar)return;
  bar.innerHTML='<span>👁 '+Number(stats.view_count||0).toLocaleString()+'</span><span>❤️ '+Number(stats.like_count||0).toLocaleString()+'</span><span>⭐ '+Number(stats.interested_count||0).toLocaleString()+'</span><span>🔖 '+Number(stats.save_count||0).toLocaleString()+'</span>';
  card.querySelectorAll("[data-reaction]").forEach(btn=>{
    const active=!!stats.mine?.[btn.dataset.reaction];
    btn.classList.toggle("is-active",active);btn.setAttribute("aria-pressed",String(active));
  });
}
async function react(item,type,button){
  if(button)button.disabled=true;
  try{
    const r=await fetch("/api/reaction",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({visitor_id:visitorId(),listing_id:item.id,reaction_type:type,category:item.category,brand:item.brand||""})});
    const d=await r.json();
    if(d.ok){
      const stats={...d,mine:d.mine||{[type]:!!d.active}};
      document.querySelectorAll("[data-listing-id]").forEach(card=>{if(card.dataset.listingId===item.id)renderStats(card,stats);});
    }
  }catch(_){}
  if(button)button.disabled=false;
}
