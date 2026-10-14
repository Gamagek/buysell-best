# Shopping guide maintenance

The 2026-10-15 release adds 24 original research-based guides, six category hubs,
the guide index and a substantive selection-methodology page: 32 new canonical
HTML pages. It also expands the original phone guide without changing its URL.
The new articles contain approximately 770–860 body words each before template
copy, tables and source lists. They address different purchasing decisions.

## Merchant and affiliate links

`content/shopping-catalog.json` contains 71 unique merchant URLs: 56 exact item
references and 15 clearly labelled marketplace searches. Direct AliExpress
retrieval was unavailable during research. Item identities came from indexed
listing records and the owner's existing phone URL. **No current availability,
seller authenticity, price, popularity or sales rank is certified.** Manufacturer
references support the buying criteria rather than a claim that an unrelated
marketplace seller supplies an identical product.

1. Download `https://buysell.best/shopping-links.csv`.
2. Use the owner's connected AliExpress program in Admitad Store:
   `https://store.admitad.com/en/webmaster/websites/3011985/catalog/?keyword=aliexpress`.
3. Generate an approved deeplink for the original merchant URL in each row.
4. Keep the Product ID and original Merchant URL; add the generated link in the
   affiliate column. The existing smartphone's approved link is already filled.
5. Map the generated URLs to their matching IDs in `content/affiliate-links.json`.
6. Run `npm run content:check`, `npm run content:export` and `npm test`.
7. Publish through the existing GitHub main → Cloudflare Worker deployment.

No unverified tracking URL is manufactured from a guessed account or campaign.
The supplied phone's exact tracked URL is preserved. Other buttons deliberately
use merchant URLs while their approved links are pending. The same product ID
can be used in multiple guides; changing its mapping updates every associated
button. If a merchant URL changes, first verify the model and rewrite affected
selection text rather than silently substituting an unrelated item.

## Reader flow

- Home tile / carousel → internal product or article page, with no sponsored step.
- First outbound shopping action in a tab/session → one visible sponsored dialog.
- × or Continue → exact original destination, after destroying the ad iframe.
- Close ad and stay here / Escape / Back → dismiss the frame.
- Subsequent shopping actions in the same tab/session → the normal destination.

The sandbox continues to exclude popup windows, top navigation and external-app
escape permissions. No automatic destination timer, retry, hidden ad frame or
synthetic advertising request was added. The ad network decides whether a real
request is a valid counted impression or click. Tests stub both the ad frame and
navigation; they generate no advertising or affiliate traffic.

## Content and search metadata

Every guide has an individual title, meta description, canonical URL, visible
sources, selection tradeoffs, comparison table, purchasing checklist and FAQs.
`Article`, `BreadcrumbList`, `ItemList` and `WebPage` structured data describe the
actual page. There are no invented offers, ratings or review-test results.
FAQs remain useful visible content; no FAQ rich-result eligibility is claimed.

The dynamic sitemap includes the original marketplace URLs, product images,
24 guide URLs, six category URLs, the guide index and methodology. Each visual
guide has an image entry. The export script updates the static fallback without
deleting existing marketplace entries. Unknown guide URLs return 404/noindex;
trailing-slash redirects and HEAD are tested.

Use the buysell.best property in Search Console to submit `/sitemap.xml` and
inspect important canonical pages. Sitemap publication is discovery support,
not evidence of Google indexing or ranking. No Search Console submission or
indexing request is claimed by this code change.

## Image assets

Created with the built-in image_gen tool, then encoded as WebP at the original
1536 × 1024 dimensions. The six files total less than 1 MB. Captions explicitly
identify AI-generated category illustrations; they are not product photography.
The exact final prompt set, source SHA-256 values and output paths are recorded
in [image-generation.json](../content/image-generation.json).

| Category | Published asset |
| --- | --- |
| Sports & outdoors | `/assets/guides/sports-outdoors-equipment.webp` |
| Entertainment | `/assets/guides/entertainment-equipment.webp` |
| Desk setup | `/assets/guides/desk-setup-equipment.webp` |
| Home & kitchen | `/assets/guides/home-kitchen-equipment.webp` |
| Travel | `/assets/guides/travel-accessories.webp` |
| Phone accessories | `/assets/guides/phone-accessories.webp` |

Images use ordinary HTML img elements with dimensions, descriptive alt text,
captions and OG/Twitter metadata. Hero images get high fetch priority; cards
are lazy-loaded. The existing assets binding serves the files. No R2 or Cloudflare
Images binding or account configuration was added. Assets have immutable caching;
use new versioned filenames when replacing an illustration.

## Further expansion

Add a guide only when it addresses a distinct purchasing decision. Cite primary
technical/manufacturer sources, distinguish source evidence from judgement and
verify exact listing identity. Do not make sales, trend, price, stock or testing
claims from an archive record. Keep only genuinely useful material and update
dates only when substantive content changes. Publishing volume alone is not the
quality target.

Validation covers guide/product IDs, unique URLs and titles, complete comparisons,
sources, content depth, outbound URL protocols and category coverage. Worker/DOM
tests exercise every article, category navigation, image signatures, sitemap,
canonical redirects, HEAD, 404s, the existing gallery/carousel and sponsored flow.
Browser screenshot QA was unavailable in this environment; no browser-visual
verification is claimed.
