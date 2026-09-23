(function(){
  const button=document.getElementById("vipLauncher");
  const win=document.getElementById("vipWindow");
  const close=document.getElementById("closeVIP");
  const header=document.getElementById("vipHeader");
  const frame=document.getElementById("vipFrame");
  const inlineButtons=[...document.querySelectorAll("[data-vip-open]")];
  if(!button||!win||!close||!header||!frame)return;

  let moving=false;
  let offsetX=0;
  let offsetY=0;

  frame.setAttribute("title","PRO VIP Intelligence Upgrade Engine");
  frame.setAttribute("referrerpolicy","strict-origin-when-cross-origin");

  function openVIP(){
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
    },350);
  }

  button.addEventListener("click",openVIP);
  inlineButtons.forEach(el=>el.addEventListener("click",openVIP));
  close.addEventListener("click",closeVIP);

  win.addEventListener("click",e=>{
    if(e.target===win)closeVIP();
  });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&win.classList.contains("active"))closeVIP();
  });

  header.addEventListener("pointerdown",e=>{
    if(e.target.closest("#closeVIP"))return;
    if(window.matchMedia("(max-width: 600px)").matches)return;
    moving=true;
    header.setPointerCapture?.(e.pointerId);
    const rect=win.getBoundingClientRect();
    offsetX=e.clientX-rect.left;
    offsetY=e.clientY-rect.top;
    header.classList.add("is-moving");
  });
  header.addEventListener("pointermove",e=>{
    if(!moving)return;
    const x=Math.max(8,Math.min(window.innerWidth-win.offsetWidth-8,e.clientX-offsetX));
    const y=Math.max(8,Math.min(window.innerHeight-win.offsetHeight-8,e.clientY-offsetY));
    win.style.left=x+"px";
    win.style.top=y+"px";
    win.style.transform="none";
  });
  const endMove=e=>{
    if(!moving)return;
    moving=false;
    header.releasePointerCapture?.(e.pointerId);
    header.classList.remove("is-moving");
  };
  header.addEventListener("pointerup",endMove);
  header.addEventListener("pointercancel",endMove);

  // Keep the floating launcher useful but avoid covering the very bottom of the page.
  const pulseSection=document.getElementById("global-market-pulse");
  const analyzerSection=document.getElementById("vipAnalyzerSection");
  if(window.IntersectionObserver&&analyzerSection){
    button.classList.add("vip-launcher-ready");
    const io=new IntersectionObserver(entries=>{
      const visible=entries.some(x=>x.isIntersecting);
      button.classList.toggle("vip-launcher-nearby",visible);
    },{threshold:.08,rootMargin:"0px 0px -15% 0px"});
    io.observe(analyzerSection);
  }else{
    button.classList.add("vip-launcher-ready");
  }

  // Clicking the inline CTA remains the most direct path from the global-deals section.
})();
