(function(){
function initVipAnalyzer(){
  const button=document.getElementById("vipLauncher");
  const win=document.getElementById("vipWindow");
  const close=document.getElementById("closeVIP");
  const header=document.getElementById("vipHeader");
  const frame=document.getElementById("vipFrame");
  const fallback=document.getElementById("vipFrameFallback");
  if(!button||!win||!close||!header||!frame)return;

  let moving=false,offsetX=0,offsetY=0,dragStartX=0,dragged=false;

  function openVIP(event){
    if(event){event.preventDefault();event.stopPropagation();}
    const section=document.getElementById("vipAnalyzerSection");
    // Keep the premium CTA physically close to Global Shopping and make the action obvious.
    section?.scrollIntoView({behavior:"smooth",block:"center"});
    button.classList.add("hideButton");
    win.style.display="block";
    document.body.classList.add("vip-modal-open");
    requestAnimationFrame(()=>win.classList.add("active"));
  }

  function closeVIP(){
    win.classList.remove("active");
    document.body.classList.remove("vip-modal-open");
    window.setTimeout(()=>{
      win.style.display="none";
      button.classList.remove("hideButton");
      win.style.left="";
      win.style.top="";
      win.style.transform="";
    },350);
  }

  frame.setAttribute("title","PRO VIP Intelligence Upgrade Engine");
  frame.setAttribute("referrerpolicy","strict-origin-when-cross-origin");
  frame.addEventListener("error",()=>{if(fallback)fallback.hidden=false;});

  button.addEventListener("click",openVIP);
  button.addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key===" "){e.preventDefault();openVIP(e);}
  });

  document.addEventListener("click",e=>{
    const trigger=e.target.closest("[data-vip-open]");
    if(trigger){openVIP(e);return;}
    if(e.target.closest("[data-vip-direct-open]")){
      e.preventDefault();
      window.open("https://upgrade.megasale.win/","_blank","noopener,noreferrer");
    }
  });

  close.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();closeVIP();});

  fallback?.addEventListener("click",()=>{
    window.open("https://upgrade.megasale.win/","_blank","noopener,noreferrer");
  });

  win.addEventListener("click",e=>{
    if(e.target===win)closeVIP();
  });

  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&win.classList.contains("active"))closeVIP();
  });

  header.addEventListener("pointerdown",e=>{
    if(e.target.closest("#closeVIP"))return;
    if(window.matchMedia("(max-width:600px)").matches)return;
    moving=true;dragged=false;dragStartX=e.clientX;
    header.setPointerCapture?.(e.pointerId);
    const rect=win.getBoundingClientRect();
    offsetX=e.clientX-rect.left;offsetY=e.clientY-rect.top;
    header.classList.add("is-moving");
  });
  header.addEventListener("pointermove",e=>{
    if(!moving)return;
    if(Math.abs(e.clientX-dragStartX)>4)dragged=true;
    const maxX=Math.max(8,window.innerWidth-win.offsetWidth-8);
    const maxY=Math.max(8,window.innerHeight-win.offsetHeight-8);
    const x=Math.max(8,Math.min(maxX,e.clientX-offsetX));
    const y=Math.max(8,Math.min(maxY,e.clientY-offsetY));
    win.style.left=x+"px";win.style.top=y+"px";win.style.transform="none";
  });
  const endMove=e=>{
    if(!moving)return;
    moving=false;header.releasePointerCapture?.(e.pointerId);header.classList.remove("is-moving");
  };
  header.addEventListener("pointerup",endMove);
  header.addEventListener("pointercancel",endMove);

  window.openVipAnalyzer=openVIP;
  window.closeVipAnalyzer=closeVIP;
}
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",initVipAnalyzer,{once:true});
}else{
  initVipAnalyzer();
}
})();