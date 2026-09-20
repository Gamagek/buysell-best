document.addEventListener("DOMContentLoaded",async()=>{
  const form=document.querySelector("#search-form"),qInput=document.querySelector("#search-q"),cat=document.querySelector("#search-category"),sort=document.querySelector("#search-sort"),results=document.querySelector("#listing-results"),count=document.querySelector("#result-count"),note=document.querySelector("#result-note"),empty=document.querySelector("#empty-state"),params=new URLSearchParams(location.search);
  qInput.value=params.get("q")||"";cat.value=params.get("category")||"";sort.value=params.get("sort")||"newest";
  function render(){
    const q=qInput.value.trim().toLowerCase();
    let data=LISTINGS.filter(x=>{
      const hay=[x.title,x.description,x.category,x.location,x.brand].join(" ").toLowerCase();
      return (!q||hay.includes(q))&&(!cat.value||x.category===cat.value);
    });
    if(sort.value==="low")data.sort((a,b)=>a.price-b.price);
    else if(sort.value==="high")data.sort((a,b)=>b.price-a.price);
    results.innerHTML=data.map(listingCard).join("");
    count.textContent=data.length+" listing"+(data.length===1?"":"s");
    note.textContent=q?'for “'+qInput.value+'”':"";
    empty.hidden=data.length!==0;
    wireInteractions(results);
    decoratePrices(window.__bsbProfile||{currency:"USD"});
  }
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const p=new URLSearchParams();if(qInput.value)p.set("q",qInput.value);if(cat.value)p.set("category",cat.value);if(sort.value&&sort.value!=="newest")p.set("sort",sort.value);
    const query=p.toString();history.replaceState(null,"","search.html"+(query?"?"+query:""));track("search",null,{query:qInput.value.trim(),category:cat.value||null});render();
  });
  window.__bsbProfile=await getProfile();
  render();
});