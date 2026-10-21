// Rebuild generated catalogue entries without duplicating existing canonical URLs.
// Preserve manually maintained URLs and their original publication metadata.
const GENERATED_PAGE = /<url>\s*<loc>https:\/\/buysell\.best\/(?:guides|shopping-methodology|products|hotels|promo-codes|insights|flash-sale)(?:\/|<)[\s\S]*?<\/url>/g;
export function replaceGeneratedSitemapSections(originalXml, generatedEntries) {
  const xml = String(originalXml);
  if (!xml.includes("</urlset>")) throw new Error("SITEMAP_ROOT_MISSING");
  const preserved = xml.replace(GENERATED_PAGE, "");
  const refreshed = preserved.replace("</urlset>", String(generatedEntries) + "</urlset>");
  const locations = [...refreshed.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  if (locations.length !== new Set(locations).size) throw new Error("SITEMAP_DUPLICATE_CANONICAL_URL");
  return refreshed;
}
