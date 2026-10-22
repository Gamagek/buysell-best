// Static source shortcuts are NOT a claim that a sale is live.
// Actual daily verified USD deal cards are server-rendered from the Admitad snapshot.
const GLOBAL_MARKET_TIMELINE = [
  {id:"aliexpress",state:"CHECK",merchant:"AliExpress",label:"Current seller offers",date:"Confirm checkout",detail:"Regional prices and savings vary",url:"https://www.aliexpress.com/",tone:"watch"},
  {id:"ebay",state:"CHECK",merchant:"eBay",label:"Daily deals source",date:"Verify source",detail:"Check eligible items and delivery",url:"https://www.ebay.com/deals/daily/",tone:"watch"},
  {id:"daraz",state:"CHECK",merchant:"Daraz",label:"Official marketplace",date:"Verify source",detail:"Availability changes by country",url:"https://www.daraz.lk/",tone:"watch"},
  {id:"amazon",state:"CHECK",merchant:"Amazon",label:"Official shopping site",date:"Verify source",detail:"No unverified event countdowns",url:"https://www.amazon.com/",tone:"watch"},
  {id:"walmart",state:"CHECK",merchant:"Walmart",label:"Shopping deals source",date:"Verify source",detail:"Confirm current merchant terms",url:"https://www.walmart.com/shop/deals/",tone:"watch"},
  {id:"temu",state:"CHECK",merchant:"Temu",label:"Official marketplace",date:"Verify source",detail:"Confirm individual offers",url:"https://www.temu.com/",tone:"watch"},
  {id:"buysell",state:"EXPLORE",merchant:"BuySell.Best",label:"Verified product catalogue",date:"Daily feed checks",detail:"Only source-backed discounts appear",url:"/flash-sale/",tone:"watch"}
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
  let paused=false;
  let dragging=false;
  let startClientX=0;
  let startScroll=0;

  function resetLoop(){
    const half=track.scrollWidth/2;
    if(half>0 && root.scrollLeft>=half)root.scrollLeft-=half;
    if(root.scrollLeft<0)root.scrollLeft+=half;
  }
  function tick(){
    if(!paused&&!dragging&&window.innerWidth>620){
      root.scrollLeft+=0.45;
      resetLoop();
    }
    requestAnimationFrame(tick);
  }

  root.addEventListener("mouseenter",()=>paused=true);
  root.addEventListener("mouseleave",()=>paused=false);
  root.addEventListener("focusin",()=>paused=true);
  root.addEventListener("focusout",e=>{if(!root.contains(e.relatedTarget))paused=false;});

  root.addEventListener("pointerdown",e=>{
    dragging=true;paused=true;startClientX=e.clientX;startScroll=root.scrollLeft;
    root.setPointerCapture?.(e.pointerId);
    root.classList.add("is-dragging");
  });
  root.addEventListener("pointermove",e=>{
    if(!dragging)return;
    root.scrollLeft=startScroll-(e.clientX-startClientX);
    resetLoop();
  });
  const endDrag=e=>{
    if(!dragging)return;
    dragging=false;paused=false;
    root.releasePointerCapture?.(e.pointerId);
    root.classList.remove("is-dragging");
  };
  root.addEventListener("pointerup",endDrag);
  root.addEventListener("pointercancel",endDrag);

  root.addEventListener("click",e=>{if(Math.abs(startClientX-(e.clientX||startClientX))>8)e.preventDefault();},{capture:true});

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
