const GLOBAL_MARKET_TIMELINE = [
  {
    id:"daraz-now",
    state:"NOW",
    merchant:"Daraz",
    label:"Flash Sale & On Sale Now",
    date:"Live now",
    detail:"Sri Lanka",
    url:"https://www.daraz.lk/",
    tone:"live"
  },
  {
    id:"ebay-now",
    state:"NOW",
    merchant:"eBay",
    label:"Daily Deals",
    date:"Live now",
    detail:"Daily marketplace offers",
    url:"https://www.ebay.com/deals/daily/",
    tone:"live"
  },
  {
    id:"amazon-now",
    state:"NOW",
    merchant:"Amazon",
    label:"Early Prime Big Deal Days offers",
    date:"Live before Oct 6",
    detail:"Early savings are available",
    url:"https://www.aboutamazon.com/prime-big-deal-days",
    tone:"live"
  },
  {
    id:"walmart-now",
    state:"NOW",
    merchant:"Walmart",
    label:"Fall deals warm-up",
    date:"Save now",
    detail:"More deals start Oct 5",
    url:"https://www.walmart.com/shop/deals/announce",
    tone:"live"
  },
  {
    id:"aliexpress-watch",
    state:"WATCH",
    merchant:"AliExpress",
    label:"Seasonal deal watch",
    date:"Check live",
    detail:"Promotions vary by market",
    url:"https://www.aliexpress.com/",
    tone:"watch"
  },
  {
    id:"temu-watch",
    state:"WATCH",
    merchant:"Temu",
    label:"Current promotion watch",
    date:"Check live",
    detail:"Promotions vary by market",
    url:"https://www.temu.com/",
    tone:"watch"
  },
  {
    id:"walmart-next",
    state:"NEXT",
    merchant:"Walmart",
    label:"Fall Deals event",
    date:"Oct 5, 2026",
    detail:"Starts 12am ET",
    url:"https://www.walmart.com/shop/deals/announce",
    tone:"next"
  },
  {
    id:"amazon-next",
    state:"NEXT",
    merchant:"Amazon",
    label:"Prime Big Deal Days",
    date:"Oct 6–7, 2026",
    detail:"48-hour event",
    url:"https://www.aboutamazon.com/prime-big-deal-days",
    tone:"next"
  },
  {
    id:"halloween-watch",
    state:"NEXT",
    merchant:"BuySell.Best",
    label:"Halloween shopping hub",
    date:"Oct 2026",
    detail:"Seasonal category discovery",
    url:"/seasonal/halloween-deals-2026",
    tone:"next"
  }
];

function renderGlobalMarketPulse() {
  const root=document.querySelector("#global-market-pulse");
  const track=document.querySelector("#global-market-pulse-track");
  if(!root||!track)return;

  const cards=[...GLOBAL_MARKET_TIMELINE,...GLOBAL_MARKET_TIMELINE];
  track.innerHTML=cards.map((x,i)=>`
    <a class="market-pulse-card market-pulse-${x.tone}" href="${escapeHtml(x.url)}" target="${x.url.startsWith("/")?"_self":"_blank"}" rel="${x.url.startsWith("/")?"":"noopener noreferrer nofollow"}" data-market-pulse-card="${i}">
      <span class="market-pulse-state">${escapeHtml(x.state)}</span>
      <span class="market-pulse-merchant">${escapeHtml(x.merchant)}</span>
      <strong>${escapeHtml(x.label)}</strong>
      <span class="market-pulse-date">${escapeHtml(x.date)}</span>
      <small>${escapeHtml(x.detail)}</small>
    </a>`).join("");

  const originalCount=GLOBAL_MARKET_TIMELINE.length;
  let x=0;
  let paused=false;
  let dragging=false;
  let startClientX=0;
  let startScroll=0;

  function resetLoop(){
    const half=track.scrollWidth/2;
    if(half>0 && track.scrollLeft>=half)track.scrollLeft-=half;
    if(track.scrollLeft<0)track.scrollLeft+=half;
  }
  function tick(){
    if(!paused&&!dragging&&window.innerWidth>620){
      track.scrollLeft+=0.45;
      resetLoop();
    }
    requestAnimationFrame(tick);
  }

  root.addEventListener("mouseenter",()=>paused=true);
  root.addEventListener("mouseleave",()=>paused=false);
  root.addEventListener("focusin",()=>paused=true);
  root.addEventListener("focusout",e=>{if(!root.contains(e.relatedTarget))paused=false;});

  track.addEventListener("pointerdown",e=>{
    dragging=true;paused=true;startClientX=e.clientX;startScroll=track.scrollLeft;
    track.setPointerCapture?.(e.pointerId);
    root.classList.add("is-dragging");
  });
  track.addEventListener("pointermove",e=>{
    if(!dragging)return;
    track.scrollLeft=startScroll-(e.clientX-startClientX);
    resetLoop();
  });
  const endDrag=e=>{
    if(!dragging)return;
    dragging=false;paused=false;
    track.releasePointerCapture?.(e.pointerId);
    root.classList.remove("is-dragging");
  };
  track.addEventListener("pointerup",endDrag);
  track.addEventListener("pointercancel",endDrag);

  if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){
    paused=true;
    track.scrollLeft=0;
  } else {
    requestAnimationFrame(tick);
  }
}
window.renderGlobalMarketPulse=renderGlobalMarketPulse;

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",renderGlobalMarketPulse,{once:true});
}else{
  renderGlobalMarketPulse();
}
