import test from "node:test";
import assert from "node:assert/strict";
import {replaceGeneratedSitemapSections} from "../lib/sitemap-export.js";

test("catalogue export removes stale flash-sale and product entries before regenerating", () => {
  const page=(path,body="")=>'<url><loc>https://buysell.best'+path+'</loc>'+body+'</url>';
  const old='<?xml version="1.0"?><urlset>'+page("/","<lastmod>2026-10-01</lastmod>")+
    page("/flash-sale/","<image:image>old</image:image>")+
    page("/flash-sale/category/sports-outdoors/")+
    page("/products/example/")+
    page("/careers/","<lastmod>2026-10-01</lastmod>")+'</urlset>';
  const generated=page("/flash-sale/","<image:image><image:loc>https://buysell.best/assets/item.webp</image:loc></image:image>")+
    page("/flash-sale/category/sports-outdoors/")+page("/products/example/");
  const refreshed=replaceGeneratedSitemapSections(old,generated);
  assert.equal(refreshed,replaceGeneratedSitemapSections(refreshed,generated),"export must be idempotent");
  assert.equal((refreshed.match(/<url>/g)||[]).length,5);
  assert.equal((refreshed.match(/<loc>https:\/\/buysell\.best\/flash-sale\/<\/loc>/g)||[]).length,1);
  assert.match(refreshed,/assets\/item\.webp/);
  assert.match(refreshed,/<lastmod>2026-10-01<\/lastmod>/);
  assert.doesNotMatch(refreshed,/<image:image>old<\/image:image>/);
});
test("duplicate generated pages are rejected rather than silently submitted to Google",()=>{
  const entry='<url><loc>https://buysell.best/flash-sale/</loc></url>';
  assert.throws(()=>replaceGeneratedSitemapSections('<urlset></urlset>',entry+entry),/SITEMAP_DUPLICATE_CANONICAL_URL/);
  assert.throws(()=>replaceGeneratedSitemapSections('<html></html>',entry),/SITEMAP_ROOT_MISSING/);
});
