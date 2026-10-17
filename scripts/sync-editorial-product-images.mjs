import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const CATALOG=join(ROOT,'content/shopping-catalog.json');
const OUTPUT=join(ROOT,'assets/products/editorial');
const REPORT=join(ROOT,'content/image-audit-report.json');
const categories={
 st:['Sports & travel','#e6f5e9','#d8ecdf','#17725f'],
 ed:['Technology & entertainment','#e8f0ff','#d8e4fd','#3452ad'],
 hp:['Home & daily essentials','#fff0e4','#fbe4d2','#9a5b34']
};
const esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const safeId=value=>String(value??'').toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').slice(0,94);
const broken=image=>!image||!String(image.src||'').startsWith('/assets/')||!image.alt;
const fixedPublication='2026-10-17';
const iconByProduct=name=>{
  const v=name.toLowerCase();
  if(/keyboard/.test(v))return 'keyboard';
  if(/controller|gamepad/.test(v))return 'controller';
  if(/headphone|earphone|speaker|audio/.test(v))return 'audio';
  if(/microphone|mic\b/.test(v))return 'mic';
  if(/projector|display light/.test(v))return 'projector';
  if(/phone|android|redmi|galaxy|screen protector|phone case/.test(v))return 'phone';
  if(/hub|cable|adapter|usb|strap|clip|ties/.test(v))return 'cable';
  if(/tripod|mount|stand/.test(v))return 'stand';
  if(/lamp|light bar|cabinet puck|sensor light/.test(v))return 'light';
  if(/scale|spoon|cup/.test(v))return 'scale';
  if(/jar|container|storage|box|caddy/.test(v))return 'container';
  if(/bag|cover|sleeve|case|backpack|sack/.test(v))return 'bag';
  return 'gear';
};
const glyphs={
 keyboard:'<rect x="-205" y="-95" width="410" height="182" rx="24"/><g fill="#fff" stroke="none">'+Array.from({length:36},(_,i)=>'<rect x="'+(-180+(i%9)*40)+'" y="'+(-72+Math.floor(i/9)*37)+'" width="32" height="26" rx="5"/>').join('')+'</g>',
 controller:'<path d="M-200 80Q-230 30-190-74Q-175-110-125-100L-15-75H15L125-100Q175-110 190-74Q230 30 200 80Q175 128 123 83L73 38H-73L-123 83Q-175 128-200 80Z"/><g fill="#fff" stroke="none"><rect x="-137" y="-35" width="18" height="74" rx="8"/><rect x="-165" y="-7" width="74" height="18" rx="8"/><circle cx="115" cy="-23" r="14"/><circle cx="149" cy="12" r="14"/></g>',
 audio:'<path d="M-165 30V-40A165 165 0 0 1 165-40V30"/><rect x="-199" y="-32" width="68" height="134" rx="25"/><rect x="131" y="-32" width="68" height="134" rx="25"/><path d="M-110 58H110" opacity=".3"/>',
 mic:'<rect x="-56" y="-153" width="112" height="212" rx="55"/><path d="M-101-10Q-101 104 0 104Q101 104 101-10M0 105V174M-68 174H68" fill="none" stroke-width="17"/>',
 projector:'<rect x="-200" y="-95" width="400" height="190" rx="30"/><circle cx="67" cy="0" r="62"/><circle cx="67" cy="0" r="32" opacity=".6"/><rect x="-156" y="-36" width="72" height="25" rx="9"/>',
 phone:'<rect x="-101" y="-169" width="202" height="338" rx="30"/><rect x="-74" y="-132" width="148" height="251" rx="9" fill="#fff" stroke="none"/><circle cx="0" cy="143" r="10" fill="#fff" stroke="none"/>',
 cable:'<path d="M-130 10C-240-102-65-184 15-76C97 35-12 129 75 146C147 160 171 96 148 55" fill="none" stroke-width="27"/><rect x="-174" y="-25" width="60" height="90" rx="13"/><rect x="117" y="6" width="62" height="80" rx="12"/>',
 stand:'<rect x="-180" y="-145" width="360" height="225" rx="19"/><path d="M0 80V155M-120 155H120" fill="none" stroke-width="24"/>',
 light:'<rect x="-180" y="-92" width="360" height="80" rx="27"/><path d="M-142 23Q0 143 142 23" fill="none" stroke-width="10"/><path d="M-110 70L-147 135M110 70L147 135" fill="none" stroke-width="12"/>',
 scale:'<rect x="-185" y="-135" width="370" height="265" rx="28"/><rect x="-105" y="-94" width="210" height="92" rx="12" fill="#fff" stroke="none"/><path d="M0 0V62" fill="none" stroke-width="16"/>',
 container:'<rect x="-165" y="-88" width="330" height="235" rx="22"/><rect x="-180" y="-126" width="360" height="50" rx="14"/><path d="M-90 12H90" fill="none" stroke-width="12"/>',
 bag:'<rect x="-145" y="-105" width="290" height="255" rx="34"/><path d="M-72-103V-133Q-72-178 0-178Q72-178 72-133V-103" fill="none" stroke-width="19"/><rect x="-90" y="-24" width="180" height="65" rx="15"/>',
 gear:'<circle cx="0" cy="0" r="128"/><circle cx="0" cy="0" r="49" fill="#fff" stroke="none"/><path d="M-150 0H150M0-150V150" fill="none" stroke-width="14"/>'
};
function lines(name){
  const words=String(name).replace(/\s+/g,' ').trim().split(' ');
  const output=[];let current='';
  for(const word of words){
    if((current+' '+word).trim().length>34 && current){output.push(current);current=word;}
    else current=(current+' '+word).trim();
  }
  if(current) output.push(current);
  return output.slice(0,3);
}
function generate(product){
  const prefix=product.id.split('-')[0], [label,bg,inner,accent]=categories[prefix]||categories.hp;
  const type=iconByProduct(product.name);
  const display=lines(product.name);
  const fontSize=display.length>2?43:49;
  const title=display.map((v,i)=>'<text x="82" y="'+(585+i*57)+'" font-family="system-ui,Arial,sans-serif" font-size="'+fontSize+'" font-weight="750" fill="#18304c">'+esc(v)+'</text>').join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-label="'+esc('Editorial illustration for '+product.name)+'">'+
    '<title>'+esc(product.name)+' — editorial concept image</title><desc>Original vector art illustrating the category only; not the actual AliExpress seller item or a verified product photo.</desc>'+
    '<rect width="1200" height="800" fill="'+bg+'"/><circle cx="1000" cy="280" r="235" fill="'+inner+'"/>'+
    '<rect x="55" y="46" width="450" height="63" rx="31.5" fill="#fff" opacity=".94"/>'+
    '<text x="87" y="86" font-family="system-ui,Arial,sans-serif" font-weight="700" font-size="27" fill="'+accent+'">'+esc(label)+'</text>'+
    '<g transform="translate(902 307) rotate(-7)" stroke="'+accent+'" stroke-width="17" stroke-linejoin="round" stroke-linecap="round" fill="'+accent+'" fill-opacity=".12">'+glyphs[type]+'</g>'+
    '<path d="M55 510H1145" stroke="'+accent+'" stroke-opacity=".18" stroke-width="3"/>'+title+
    '<rect x="80" y="732" width="970" height="40" rx="13" fill="#fff" fill-opacity=".87"/>'+
    '<text x="101" y="757" font-family="system-ui,Arial,sans-serif" font-size="22" fill="#4c6176">EDITORIAL CONCEPT • NOT AN ACTUAL SELLER PRODUCT PHOTO</text>'+
    '</svg>\n';
}
async function exists(path){try{await access(path);return true;}catch{return false;}}
const catalog=JSON.parse(await readFile(CATALOG,'utf8'));
await mkdir(OUTPUT,{recursive:true});
const audited=catalog.products.length;
const missing=catalog.products.filter(p=>broken(p.image));
const added=[];
for(const product of missing){
  // Detailed seller-product pages already require a verified, source-attributed
  // photograph. Never replace one with a misleading concept image.
  if(product.details)continue;
  const filename=safeId(product.id)+'.svg';
  const out=join(OUTPUT,filename), src='/assets/products/editorial/'+filename;
  if(!await exists(out))await writeFile(out,generate(product),'utf8');
  product.image={
    src,alt:'Original editorial illustration for '+product.name+'; not a photograph of a seller product',
    width:1200,height:800,kind:'editorial-concept',credit:'BuySell.Best original vector illustration',
    generatedAt:fixedPublication
  };
  added.push({id:product.id,name:product.name,src});
}
if(added.length){
  catalog.editorialImageUpdatedAt=fixedPublication;
  await writeFile(CATALOG,JSON.stringify(catalog,null,2)+'\n');
}
const detailProducts=catalog.products.filter(p=>p.details);
const sellerPhotos=detailProducts.filter(p=>p.image?.sourceUrl).length;
const missingRemaining=catalog.products.filter(p=>broken(p.image)).map(p=>({id:p.id,name:p.name,hasPage:!!p.details}));
const report={
  inventory:{products:audited,publishedProductDetailPages:detailProducts.length,realSellerPhotos:sellerPhotos,
    editorialConceptImages:catalog.products.filter(p=>p.image?.kind==='editorial-concept').length,
    withoutImages:missingRemaining.length},
  remaining:missingRemaining,
  // Never claim this job fetched photos, checked product stock, or gained indexing.
  note:'Original SVG concept thumbnails for guide options; actual product images require approved product-specific source files. Google controls image indexing.'
};
const oldReport=await readFile(REPORT,'utf8').catch(()=>'');
if(oldReport!==JSON.stringify(report,null,2)+'\n')
  await writeFile(REPORT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({newImages:added.length,summary:report.inventory,generated:added.map(x=>x.id)},null,2));
