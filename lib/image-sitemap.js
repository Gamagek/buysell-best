// Google Image Sitemap: each image belongs to a real, crawlable content page.
// Derive this from the same canonical URL set as the primary sitemap. Do not
// submit bare asset URLs as page locs or include icons and decorative files.
export const IMAGE_SITEMAP_URL = "https://buysell.best/image-sitemap.xml";
const ORIGIN = "https://buysell.best";
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n'+
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '+
  'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

function safePage(value) {
  try {
    const url = new URL(value.replace(/&amp;/g,"&"));
    return url.origin===ORIGIN && url.protocol==="https:" && !url.hash &&
      !/[<>"']/u.test(value);
  } catch (_) { return false; }
}
function safeImage(value) {
  if(!safePage(value))return false;
  try {
    const url = new URL(value.replace(/&amp;/g,"&"));
    return /\.(?:jpe?g|png|webp|gif|avif|svg)$/i.test(url.pathname);
  } catch (_) { return false; }
}
function firstLoc(xml) {
  const loc=xml.match(/<loc>([^<]*)<\/loc>/);
  return loc?.[1]||"";
}
function imageLocs(urlXml) {
  const seen=new Set();
  for(const entry of urlXml.matchAll(/<image:image>([\s\S]*?)<\/image:image>/g)){
    const match=entry[1].match(/<image:loc>([^<]+)<\/image:loc>/);
    if(match && safeImage(match[1]))seen.add(match[1]);
  }
  return [...seen];
}
export function imageSitemapFromCanonical(canonicalSitemap){
  const pages=new Map();
  for(const block of String(canonicalSitemap).matchAll(/<url>([\s\S]*?)<\/url>/g)){
    const page=firstLoc(block[1]);
    if(!safePage(page))continue;
    const images=imageLocs(block[1]);
    if(!images.length)continue;
    const unique=pages.get(page)||new Set();
    for(const loc of images)unique.add(loc);
    pages.set(page,unique);
  }
  return XML_HEAD+[...pages].map(([page,images])=>
    '  <url><loc>'+page+'</loc>'+
    [...images].map(image=>' <image:image><image:loc>'+image+'</image:loc></image:image>').join('')+
    '</url>').join('\n')+'\n</urlset>\n';
}
export function imageSitemapStats(xml){
  const items=[...String(xml).matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(m=>m[1]);
  return {pages:(String(xml).match(/<url>/g)||[]).length,
    entries:items.length,uniqueImages:new Set(items).size};
}
