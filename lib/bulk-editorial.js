// Product-specific, clearly labelled editorial research. No fabricated tests,
// buyer ratings or AI-generated photos disguised as the actual merchandise.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const topics=[
  {re:/phone|smartphone|tablet|android|iphone/i,name:'Phones and tablets',checks:['Confirm the exact chipset and supported cellular bands for your country.','Compare battery capacity and charging standard with the selected variant.','Check display size, physical memory and storage rather than headline marketing claims.','Review OS update policy, warranty and customs obligations.']},
  {re:/earbuds|headphone|earphone|speaker|bluetooth|microphone/i,name:'Audio accessories',checks:['Confirm Bluetooth codec, connector type and device compatibility.','Check whether quoted battery life includes the charging case.','Inspect available microphone samples and return conditions, when supplied.','Compare comfort, replaceable parts and shipping costs with alternatives.']},
  {re:/usb|charger|cable|power bank|ssd|hard drive|keyboard|mouse|adapter|hub/i,name:'Computer accessories',checks:['Verify connector standards, transfer speeds or charging protocols for the exact model.','Check supported operating systems and accessory dimensions.','Compare the seller warranty and certification claims against documented evidence.','Review total landed cost and return restrictions for electronics.']},
  {re:/shirt|dress|shoes|jacket|bag|wallet|fashion|backpack|luggage/i,name:'Clothing and travel gear',checks:['Check the item measurements rather than choosing from an unfamiliar size label.','Confirm fabric or material composition for the selected variant.','Check colour, included pieces and the seller image against the written listing.','Compare delivery cost, returns and packaging for your destination.']},
  {re:/kitchen|lamp|light|storage|home|cleaner|furniture|bottle/i,name:'Home and living',checks:['Measure your intended space and compare the actual item dimensions.','Confirm power requirements, materials and cleaning instructions where relevant.','Check product options and whether pictured accessories are included.','Compare shipping charges and the seller return terms.']},
  {re:/bike|cycle|sport|fitness|exercise|gym|racket|running|camp/i,name:'Sports and outdoor gear',checks:['Check fit and product measurements against your equipment or body size.','Verify weather resistance and safety claims in original documentation.','Confirm included parts and whether accessories shown are optional.','Inspect durability evidence, shipping costs and return policy.']}
];
export function researchCategory(product){
  const text=String(product?.title||'')+' '+String(product?.category||'');
  return topics.find(t=>t.re.test(text))||{name:'General product',checks:['Confirm the exact item variant, components and dimensions.','Check the merchant photo against the selected listing option.','Look for reliable specifications and recent buyer feedback on the seller page.','Compare total shipping, taxes, warranty and return rules.']};
}
export function renderBuyingResearch(product){
  const t=researchCategory(product),title=esc(product.title),checks=t.checks.map(x=>'<li>'+esc(x)+'</li>').join('');
  return '<section class="flash-product-research" aria-labelledby="buying-research-title">'+
    '<h2 id="buying-research-title">How to assess '+title+' before buying</h2>'+
    '<p>BuySell.Best reviewed the listing data for a '+esc(t.name.toLowerCase())+' purchase decision. This is an editorial buying guide based on the affiliate feed, not a first-hand test or a claim about actual product quality.</p>'+
    '<h3>Four checks specific to this product type</h3><ol>'+checks+'</ol>'+
    '<h3>What the available evidence does and does not establish</h3>'+
    '<p>The source identifies this listing and provides its seller picture, category and a USD reference price. The marketplace listing—not this page—is the source for actual configuration, availability, regional delivery, tax and recent buyer experiences. We do not invent specifications, star ratings, performance scores or discount deadlines.</p>'+
    '<h3>Who should consider this listing?</h3><p>It may be a starting point for shoppers comparing '+esc(t.name.toLowerCase())+'. Before choosing this specific '+title+', compare at least two alternatives on compatibility, dimensions, material, seller terms and the final checkout amount.</p>'+
    '<h3>Buying decision</h3><p>Shortlist this item only after matching the exact variation to your needs. Check current price, recent seller feedback and return protection on AliExpress before paying. The site may earn a commission if you purchase through its clearly labelled affiliate link.</p></section>';
}
export function renderEditorialVisual(product){
  const t=researchCategory(product),name=String(product.title||'').replace(/\s+/g,' ').slice(0,85);
  const chunks=name.match(/.{1,30}(?:\s|$)/g)||[name];const lines=chunks.slice(0,3);
  const text=lines.map((line,i)=>'<text x="74" y="'+(245+i*51)+'" font-size="36" font-weight="750" fill="#fff">'+esc(line.trim())+'</text>').join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Editorial product research graphic, not a photograph">'+
  '<defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#101f41"/><stop offset="1" stop-color="#176f7a"/></linearGradient></defs>'+
  '<rect width="960" height="540" rx="32" fill="url(#g)"/>'+
  '<circle cx="820" cy="80" r="180" fill="#ffffff" opacity=".06"/><circle cx="880" cy="420" r="230" fill="#ffffff" opacity=".04"/>'+
  '<text x="74" y="95" font-size="22" font-family="Arial,sans-serif" font-weight="700" letter-spacing="3" fill="#a7f3d0">BUYSELL.BEST RESEARCH</text>'+
  '<text x="74" y="158" font-size="24" font-family="Arial,sans-serif" fill="#d1fae5">'+esc(t.name)+'</text>'+
  '<g font-family="Arial,sans-serif">'+text+'</g>'+
  '<rect x="65" y="453" width="830" height="52" rx="14" fill="#ffffff" opacity=".13"/>'+
  '<text x="82" y="485" font-size="20" font-family="Arial,sans-serif" fill="#fff">Editorial infographic · not an actual product photo</text></svg>';
}
