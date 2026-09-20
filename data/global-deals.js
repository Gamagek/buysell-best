const GLOBAL_DEALS=[
  {
    id:"deal-galaxy-s26-256",
    category:"phones",
    title:"Samsung Galaxy S26 5G 256GB Dual SIM Unlocked",
    merchant:"eBay",
    price:699.99,
    currency:"USD",
    signal:"28 sold on this listing",
    signalType:"sold",
    note:"New · Global unlocked model",
    url:"https://www.ebay.com/itm/257383323159",
    amazon:"https://www.amazon.com/s?k=Samsung+Galaxy+S26+256GB+unlocked",
    aliexpress:"https://www.aliexpress.com/w/wholesale-Samsung-Galaxy-S26-256GB.html",
    emoji:"📱",
    checked:"Checked from a current eBay listing"
  },
  {
    id:"deal-thinkpad-t14-16-512",
    category:"electronics",
    title:"Lenovo ThinkPad T14 Gen 1 Ryzen 5 Pro · 16GB · 512GB",
    merchant:"eBay",
    price:172.79,
    currency:"USD",
    signal:"297 sold · 401 watching",
    signalType:"demand",
    note:"Used · Grade C · free shipping shown",
    url:"https://www.ebay.com/itm/187720005607",
    amazon:"https://www.amazon.com/s?k=Lenovo+ThinkPad+T14",
    aliexpress:"https://www.aliexpress.com/w/wholesale-Lenovo-ThinkPad-T14.html",
    emoji:"💻",
    checked:"Checked from a current eBay listing"
  },
  {
    id:"deal-thinkpad-t14-i5-256",
    category:"electronics",
    title:"Lenovo ThinkPad T14 Gen 1 Core i5 · 16GB · 256GB SSD",
    merchant:"eBay",
    price:234.99,
    currency:"USD",
    signal:"277 sold · 576 watching",
    signalType:"demand",
    note:"Used · current listing",
    url:"https://www.ebay.com/itm/298583199831",
    amazon:"https://www.amazon.com/s?k=Lenovo+ThinkPad+T14+16GB",
    aliexpress:"https://www.aliexpress.com/w/wholesale-Lenovo-ThinkPad-T14-16GB.html",
    emoji:"💻",
    checked:"Checked from a current eBay listing"
  },
  {
    id:"deal-levis-501",
    category:"fashion",
    title:"Levi's 501 Original Shrink-to-Fit Button Fly Jeans",
    merchant:"eBay",
    price:59.88,
    currency:"USD",
    signal:"1,514 sold · 1,665 watching",
    signalType:"demand",
    note:"New with tags · multiple sizes shown",
    url:"https://www.ebay.com/itm/203605954545",
    amazon:"https://www.amazon.com/s?k=Levis+501+Original+Jeans",
    aliexpress:"https://www.aliexpress.com/w/wholesale-Levis-501-jeans.html",
    emoji:"👖",
    checked:"Checked from an eBay listing"
  },
  {
    id:"deal-ikea-desk",
    category:"furniture",
    title:"IKEA MICKE Desk White",
    merchant:"eBay",
    price:194.99,
    currency:"USD",
    signal:"2 available · current listing",
    signalType:"fresh",
    note:"New · free standard shipping shown on the listing",
    url:"https://www.ebay.com/itm/188266290615",
    amazon:"https://www.amazon.com/s?k=IKEA+MICKE+desk",
    aliexpress:"https://www.aliexpress.com/w/wholesale-IKEA-desk.html",
    emoji:"🪑",
    checked:"Checked from an eBay listing"
  },
  {
    id:"deal-hyperx-cloud-iii",
    category:"electronics",
    title:"HyperX Cloud III Wired Gaming Headset",
    merchant:"eBay",
    price:79.99,
    currency:"USD",
    signal:"New · just listed",
    signalType:"fresh",
    note:"New · free shipping shown",
    url:"https://www.ebay.com/itm/128084981357",
    amazon:"https://www.amazon.com/s?k=HyperX+Cloud+III",
    aliexpress:"https://www.aliexpress.com/w/wholesale-HyperX-Cloud-III.html",
    emoji:"🎧",
    checked:"Checked from a current eBay listing"
  }
];

function dealMoney(value,currency,locale="en-US"){
  try{return new Intl.NumberFormat(locale,{style:"currency",currency,maximumFractionDigits:0}).format(value)}
  catch{return currency+" "+Number(value).toLocaleString()}
}

async function renderGlobalDeals(container){
  if(!container)return;
  container.innerHTML=GLOBAL_DEALS.map(d=>'<article class="deal-card">'+
    '<div class="deal-icon" aria-hidden="true">'+d.emoji+'</div>'+
    '<div class="deal-body"><div class="deal-top"><span class="listing-tag">'+escapeHtml(d.category)+'</span><span class="deal-merchant">'+escapeHtml(d.merchant)+'</span></div>'+
    '<h3>'+escapeHtml(d.title)+'</h3>'+
    '<div class="deal-price smart-price" data-price="'+d.price+'" data-currency="'+escapeHtml(d.currency)+'">'+dealMoney(d.price,d.currency)+'</div>'+
    '<div class="deal-signal">'+escapeHtml(d.signal)+'</div><p>'+escapeHtml(d.note)+'</p>'+
    '<div class="deal-actions"><a class="button" href="'+escapeHtml(d.url)+'" target="_blank" rel="noopener noreferrer">View listing ↗</a><a class="deal-link" href="'+escapeHtml(d.amazon)+'" target="_blank" rel="noopener noreferrer">Amazon</a><a class="deal-link" href="'+escapeHtml(d.aliexpress)+'" target="_blank" rel="noopener noreferrer">AliExpress</a></div>'+
    '<small class="deal-checked">'+escapeHtml(d.checked)+'. Prices, stock, shipping and availability can change.</small></div></article>'
  ).join("");
  await decoratePrices(window.__bsbProfile||await getProfile());
}
