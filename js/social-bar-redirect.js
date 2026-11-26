/* A clear, fully skippable sponsored navigation step.
 * Social Bar is installed once in the page head by the Worker, not inside
 * this dialog. The Adsterra provider, not our redirect code, chooses creatives.
 */
(function(){
 "use strict";
 if(window.BuySellSocialBarRedirect)return;
 window.BuySellSocialBarRedirect=true;
 const COOLDOWN=10*60*1000;
 const KEY="bsb-social-bar-redirect-at-20261126";
 const HOSTS=["aliexpress.com","rzekl.com","admitad.com","admitad.link","s.click.aliexpress.com"];
 let onPage=false,active=null;
 const getDestination=(link)=>{
  if(!link||link.hasAttribute("download")||link.hasAttribute("data-sponsored-bypass")||
   link.closest(".bsb-social-step,.display-ad"))return null;
  let url;
  try{url=new URL(link.href,location.href);}catch{return null;}
  if(!["https:","http:"].includes(url.protocol)||url.username||url.password)return null;
  if(url.origin===location.origin)
   return link.getAttribute("data-sponsored-navigation")==="internal" &&
    ["/hotels/","/promo-codes/"].includes(url.pathname)?url.href:null;
  const explicit=link.hasAttribute("data-sponsored-navigation")||
    (link.getAttribute("rel")||"").split(/\s+/).includes("sponsored");
  return explicit||HOSTS.some(host=>url.hostname===host||url.hostname.endsWith("."+host))?url.href:null;
 };
 const eligible=()=>{
  if(onPage)return false;
  try{
   const s=sessionStorage.getItem(KEY);
   if(s!==null&&Number.isFinite(Number(s))&&Date.now()-Number(s)>=0&&Date.now()-Number(s)<COOLDOWN)return false;
  }catch{}
  return true;
 };
 function mark(){
  onPage=true;
  try{sessionStorage.setItem(KEY,String(Date.now()));}catch{}
 }
 function end(go){
  if(!active)return;
  const {wrap,link,href,overflow}=active;active=null;
  document.body.style.overflow=overflow;
  wrap.remove();
  if(go)location.assign(href);
  else if(link.isConnected)link.focus();
 }
 function open(link,href){
  mark();
  const wrap=document.createElement("div");
  wrap.className="bsb-social-step";
  const panel=document.createElement("section");
  panel.className="bsb-social-step-panel";
  panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");
  panel.setAttribute("aria-labelledby","bsb-social-step-title");
  panel.innerHTML='<div class="bsb-social-step-top"><span class="bsb-social-step-label">SPONSORED NAVIGATION</span>'+
   '<button type="button" class="bsb-social-step-close" aria-label="Continue to destination">×</button></div>'+
   '<h2 id="bsb-social-step-title">Continue to the original destination</h2>'+
   '<p>Optional Adsterra Social Bar advertisements may appear independently on this page. '+
   'You do not need to watch, click or open an advertisement to continue.</p>'+
   '<div class="bsb-social-step-actions"><a class="bsb-social-step-go" href="#" rel="nofollow noopener noreferrer">Continue now →</a>'+
   '<button type="button" class="bsb-social-step-stay">Stay on this page</button></div>';
  const go=panel.querySelector(".bsb-social-step-go");
  go.href=href; go.setAttribute("data-sponsored-bypass","");
  panel.querySelector(".bsb-social-step-close").addEventListener("click",()=>end(true));
  go.addEventListener("click",e=>{if(e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;e.preventDefault();end(true)});
  panel.querySelector(".bsb-social-step-stay").addEventListener("click",()=>end(false));
  panel.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();end(false);} if(e.key==="Tab"){const buttons=[...panel.querySelectorAll("a,button")];const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  wrap.append(panel);document.body.append(wrap);
  const overflow=document.body.style.overflow;
  active={wrap,href,link,overflow};
  document.body.style.overflow="hidden";
  go.focus();
 }
 document.addEventListener("click",e=>{
  if(!e.isTrusted||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||active||!eligible())return;
  const link=e.target?.closest?.("a[href]");
  const href=getDestination(link);
  if(!href)return;
  e.preventDefault();open(link,href);
 });
 window.addEventListener("pagehide",()=>{if(active)end(false)});
})();
