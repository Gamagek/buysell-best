# Admitad worksheet rows 21–40 and image SEO audit

Source: user-uploaded `BuySell_Best_71_Shopping_Links_Admitad_Template.docx`, second table (indexed product IDs). This batch is effective 17 October 2026, without disturbing the existing first 20 Admitad mappings or Adsterra placements.

## Affiliate link fidelity

- Existing product rows **01–20** remain untouched, with their seller photo galleries, SEO pages, original published dates and existing Admitad destinations.
- Rows **21–40** contain 20 candidate products and **19 user-provided Admitad deeplinks**. All 19 are mapped by exact Product ID in `content/affiliate-links.json`. The long tracking URL on **row 23** is preserved.
- **Row 34** (`ed-mic-condenser`, FIFINE K669B USB microphone) is *blank* in the uploaded worksheet. No Admitad link is fabricated. Its AliExpress marketplace search remains as the clear fallback.
- Row 32’s supplied deeplink targets the `/i/1005012935908391.html` path, while its canonical plain merchant reference uses `/item/1005012935908391.html`. The seller-specific item ID is identical; availability and redirect behavior have not been externally verified.
- Per-link ownership of the destination and product authenticity, actual stock, variant, commission eligibility and current prices remain unverified. The user can confirm those in their Admitad account and the actual merchant pages.

## Product pages

Previously published detailed product pages: **20**, all with attributed authentic seller WebP photos. The other 51 catalog candidates have SVG concept illustrations, not actual product photos. This patch publishes **20 new independent buying-check pages for rows 21–40**, while leaving other comparison-only items as guide entries. Each page contains category-specific practical screening questions, known source limitations, a unique title, canonical URL, Article and breadcrumb schema, an image with honest alt and figure caption, original published date (17 Oct 2026), and relevant guide links. It does not pretend the SVG is a seller photograph or that there is an approved Product rich-results offer.

New URLs are of the form `https://buysell.best/products/<descriptive-slug>/`. Their originals remain in the published buying-guide option lists, now with internal links to each new page. The Product hub also links to all 20.

## Images, sitemap and Google

- Each of the 20 new pages uses the product-specific original editorial SVG created in the previous 51-image batch. All 20 earlier seller photo pages remain intact.
- `image:image` entries in the runtime sitemap **and** fallback `sitemap.xml` use the actual first-party SVG path. The existing guide image sitemap data is unchanged. The newly published URLs get `lastmod` for their actual publication date only.
- The Cloudflare GSC sync monitors these new URLs and fingerprints image entries when considering resubmitting the sitemap. Successful submission does not mean indexing is guaranteed.
- The existing **hourly GitHub image audit/generator**, scheduled sitemap export and 5-URL/hour Search Console URL inspection are preserved. Any later replacement of an illustration with a source-attributed real photograph is a *different task* requiring an appropriate image source and permission.
- Adsterra display ads, popup, Smartlink code and sponsor CSS/scripts are **not edited**.

## Verification

- `npm test` — validates original seller images and twenty new article URLs.
- `test/admitad-batch-21-40.test.mjs` — verifies product IDs, source-target IDs, image captions/SEO, RSS-free XML sitemap and internal links.
- GitHub Actions CI and Cloudflare Worker deployment must pass. A separate live Google crawl may take time, and high image rankings cannot be guaranteed.
