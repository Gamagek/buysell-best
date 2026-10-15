# BuySell Best Admitad integration report

Implementation date: 15 October 2026. This batch covers the first twenty product rows in the uploaded document and preserves the existing Cloudflare Worker, Static Assets and D1 architecture.

## A Input processing

- Input: `BuySell_Best_71_Shopping_Links_Admitad_Template.docx`, second table, rows 1–20.
- Product IDs were present and used directly. All 19 supplied Admitad links are preserved byte for byte.
- Row 13 contained a direct AliExpress link. Its deeplink was constructed with the identical supplied `rzekl.com/g/1e8d1144948a33a283af16525dc3e8/` campaign and exact merchant URL as `ulp`. This is recorded separately from supplied tracking links; account approval and commission eligibility were not verified.
- The original smartphone link remains in the central mapping. The document SHA-256 and row-by-row provenance are in `content/affiliate-import-2026-10-15.json`.

## B GitHub

- Repository: https://github.com/Gamagek/buysell-best
- Production branch: `main`. The resulting commit is identified in the delivery message and its Cloudflare check run.
- Changed areas: central affiliate mapping, shopping catalog and import manifest; guide/product rendering and Worker routes; shared sponsor CSS/JS and static asset version references; CSV exports and validation; static image sitemap; integration tests and documentation.
- Twenty new WebP image files are under `assets/products/shopping/`.

## C Cloudflare

- Existing Worker: `buysell-best`, with `ASSETS` and the existing `buysell-best-db` D1 binding.
- Existing GitHub-connected Workers Builds deployment is used for the main commit. No D1 migrations, data writes, account permissions or domain routes are changed.
- Route coverage includes the twenty product detail paths below, eight existing guides, `/products/`, guide/category indexes and home guide cards, `/sitemap.xml`, and the shared static sponsor assets.
- Deployment outcome and live HTTP verification are reported with the final commit.

## D Affiliate integration

Every shopping button for these IDs reads `content/affiliate-links.json`. Unmapped products retain merchant fallback behavior. All supplied tracking query strings remain intact. The stable IDs remain even where the replacement listing describes a different accessory type.

| Row | Product ID | Current page | Exact merchant item |
| --- | --- | --- | --- |
| 01 | `st-loop-bands` | [Compact resistance band](https://buysell.best/products/compact-resistance-bands/) | `1005012986658635` |
| 02 | `st-jump-rope` | [Adjustable jump rope](https://buysell.best/products/adjustable-jump-rope/) | `1005011639886680` |
| 03 | `st-folding-mat` | [Folding exercise mat](https://buysell.best/products/folding-exercise-mat/) | `1005009871080834` |
| 04 | `st-tacky-overgrip` | [Smooth tacky racket overgrip](https://buysell.best/products/smooth-tacky-racket-overgrip/) | `4001242156968` |
| 05 | `st-dry-overgrip` | [Dry-feel racket overgrip](https://buysell.best/products/dry-feel-racket-overgrip/) | `1005012132202932` |
| 06 | `st-racket-bag` | [Single-racket shoulder bag](https://buysell.best/products/single-racket-shoulder-bag/) | `1005012553871658` |
| 07 | `st-saddle-bag` | [Cycling saddle bag](https://buysell.best/products/cycling-saddle-bag/) | `1005009735684216` |
| 08 | `st-top-tube-bag` | [Cycling top-tube bag](https://buysell.best/products/cycling-top-tube-bag/) | `1005013031445646` |
| 09 | `st-frame-bag` | [Triangle bicycle frame bag](https://buysell.best/products/triangle-bicycle-frame-bag/) | `1005012226249230` |
| 10 | `st-folding-daypack` | [Travel toiletry organizer bag](https://buysell.best/products/travel-toiletry-organizer-bag/) | `1005009011176869` |
| 11 | `st-dry-sack` | [Roll-top storage dry bag](https://buysell.best/products/roll-top-dry-bag/) | `1005009191249052` |
| 12 | `st-mesh-stuff-sack` | [Mesh stuff sack](https://buysell.best/products/mesh-stuff-sack/) | `1005011743782397` |
| 13 | `st-compression-cubes` | [Travel packing organizer set](https://buysell.best/products/travel-packing-organizer-set/) | `1005007011689536` |
| 14 | `st-shoe-bag` | [Travel shoe bag](https://buysell.best/products/travel-shoe-bag/) | `1005007548810770` |
| 15 | `st-laundry-mesh` | [Mesh travel laundry bag](https://buysell.best/products/mesh-travel-laundry-bag/) | `1005005899330339` |
| 16 | `st-hard-tech-case` | [Portable hard-drive storage case](https://buysell.best/products/portable-hard-drive-storage-case/) | `1005007785250910` |
| 17 | `st-small-tech-case` | [Compact earphone accessory case](https://buysell.best/products/compact-earphone-accessory-case/) | `1005007492337373` |
| 18 | `st-cable-ties` | [Reusable hook-and-loop cable straps](https://buysell.best/products/reusable-hook-loop-cable-straps/) | `1005012422550750` |
| 19 | `st-luggage-scale` | [Handheld luggage scale](https://buysell.best/products/handheld-luggage-scale/) | `1005009389094683` |
| 20 | `st-luggage-tag` | [Privacy-cover luggage tag](https://buysell.best/products/privacy-cover-luggage-tag/) | `1005012084529123` |

Affected existing guides:

- https://buysell.best/guides/small-space-home-workout-aliexpress/
- https://buysell.best/guides/badminton-grips-and-bags-aliexpress/
- https://buysell.best/guides/cycling-bags-commute-aliexpress/
- https://buysell.best/guides/day-hiking-pack-organization-aliexpress/
- https://buysell.best/guides/rainy-day-travel-bags-aliexpress/
- https://buysell.best/guides/packing-cubes-carry-on-aliexpress/
- https://buysell.best/guides/travel-cable-organizers-aliexpress/
- https://buysell.best/guides/luggage-scales-tags-straps-aliexpress/

Replacement-type corrections:

- `st-folding-daypack`: the supplied new listing is a toiletry organizer, so the content no longer presents it as a backpack.
- `st-hard-tech-case`: the supplied listing is a portable drive case, not verified two-layer organizer hardware.
- `st-small-tech-case`: the supplied listing is a compact earphone case.
- `st-compression-cubes`: the listing offers a packing-organizer set; compression zippers must be checked for the selected variant.

## E Adsterra

The reusable sponsor module presents a clearly labelled optional choice on every unmodified shopping-button click. Skip and × continue to the exact merchant deeplink. Cancel, Escape and page lifecycle events dismiss it. A separate native new-tab sponsor anchor and a same-tab fallback both point to the supplied Smartlink. No advertisement is loaded by displaying the choice, and shopping never depends on visiting the sponsor. There is no once-per-session suppression: every normal shopping-button click can show it, including the homepage spotlight, mini tile and carousel shop buttons, all twenty product-index CTAs, guide/product CTAs and dynamically rendered marketplace/promo actions. Product images and reading links keep their internal destinations. Modified clicks and JavaScript-free shopping links retain ordinary browser behavior.

The previous iframe was removed. Adsterra publisher terms prohibit framing an ad click-through destination and misleading, forced or artificial ad traffic. The implementation follows the published guidance that the user clicks a distinct sponsor link. Admitad guidance lists PopUp/ClickUnder and incentive traffic as forbidden for AliExpress; this flow does not open the affiliate destination as a popup or condition it on an ad click. Actual campaign acceptance and payouts remain account decisions. Tests never open the sponsor or generate affiliate clicks.

Policy references reviewed:

- https://adsterra.com/publishers-terms-managed/
- https://adsterra.com/smartlink-ads/
- https://edu.affiliate.admitad.com/en/aliexpress/

## F SEO images

The exact twenty replacement AliExpress items supplied their own main image URLs and titles. Native CDN WebP delivery was saved with the original appearance, no substitute AI product renderings and no added promotional claims. The assets total **977,570 bytes**; individual files are approximately 11–92 KB, with actual dimensions recorded in the catalog.

Each asset is used on its product page, relevant guide option, guide preview/card where applicable and product index. Every relevant page has an HTML `img`, descriptive alt text, actual dimensions, caption, OG/Twitter preview and image-sitemap entry. Source image URL, optimized URL, exact listing URL, retrieval date and SHA-256 are recorded with the product.

| Product ID | Published image URL |
| --- | --- |
| `st-loop-bands` | https://buysell.best/assets/products/shopping/compact-resistance-bands-1005012986658635.webp |
| `st-jump-rope` | https://buysell.best/assets/products/shopping/adjustable-jump-rope-1005011639886680.webp |
| `st-folding-mat` | https://buysell.best/assets/products/shopping/folding-exercise-mat-1005009871080834.webp |
| `st-tacky-overgrip` | https://buysell.best/assets/products/shopping/smooth-tacky-racket-overgrip-4001242156968.webp |
| `st-dry-overgrip` | https://buysell.best/assets/products/shopping/dry-feel-racket-overgrip-1005012132202932.webp |
| `st-racket-bag` | https://buysell.best/assets/products/shopping/single-racket-shoulder-bag-1005012553871658.webp |
| `st-saddle-bag` | https://buysell.best/assets/products/shopping/cycling-saddle-bag-1005009735684216.webp |
| `st-top-tube-bag` | https://buysell.best/assets/products/shopping/cycling-top-tube-bag-1005013031445646.webp |
| `st-frame-bag` | https://buysell.best/assets/products/shopping/triangle-bicycle-frame-bag-1005012226249230.webp |
| `st-folding-daypack` | https://buysell.best/assets/products/shopping/travel-toiletry-organizer-bag-1005009011176869.webp |
| `st-dry-sack` | https://buysell.best/assets/products/shopping/roll-top-dry-bag-1005009191249052.webp |
| `st-mesh-stuff-sack` | https://buysell.best/assets/products/shopping/mesh-stuff-sack-1005011743782397.webp |
| `st-compression-cubes` | https://buysell.best/assets/products/shopping/travel-packing-organizer-set-1005007011689536.webp |
| `st-shoe-bag` | https://buysell.best/assets/products/shopping/travel-shoe-bag-1005007548810770.webp |
| `st-laundry-mesh` | https://buysell.best/assets/products/shopping/mesh-travel-laundry-bag-1005005899330339.webp |
| `st-hard-tech-case` | https://buysell.best/assets/products/shopping/portable-hard-drive-storage-case-1005007785250910.webp |
| `st-small-tech-case` | https://buysell.best/assets/products/shopping/compact-earphone-accessory-case-1005007492337373.webp |
| `st-cable-ties` | https://buysell.best/assets/products/shopping/reusable-hook-loop-cable-straps-1005012422550750.webp |
| `st-luggage-scale` | https://buysell.best/assets/products/shopping/handheld-luggage-scale-1005009389094683.webp |
| `st-luggage-tag` | https://buysell.best/assets/products/shopping/privacy-cover-luggage-tag-1005012084529123.webp |

## G SEO and verification

- The twenty detail pages have individual titles, descriptions, canonical URLs, semantic headings, product-specific fit checks, seller/variant/shipping/return guidance, affiliate disclosure and links to the full comparisons.
- Eight existing guides gain the same central destinations, real listing photos, specific additional buying checks and corrected comparisons.
- Structured data uses truthful `WebPage`, `Article`, `BreadcrumbList`, `ItemList` and `ImageObject` information. No ratings, review counts, stock counts or live offers were invented. The existing smartphone Product schema and gallery remain.
- The dynamic and static fallback sitemaps include all twenty canonical product URLs and their image URLs, with guide image entries and existing marketplace URLs preserved. The existing robots file permits public pages and images while excluding APIs.
- AdMaven and Mitgo verification are preserved. Removed Adcash integration was not reintroduced.
- Validation completed: CSV/sitemap export; catalog, campaign and decoded item-ID checks; Wrangler deployment dry run; all **17 Node/Miniflare integration tests passed**. Coverage includes all twenty product pages, all twenty local image responses, all twenty affiliate mappings, all twenty-four guides, canonical redirects, HEAD/404s, sitemap coverage, the existing gallery/carousel and optional sponsor/fallback/repeated-click behavior.
- Automated tests do not contact Adsterra or merchant affiliate tracking endpoints. Browser acceptance, real seller availability and network-account approval are separate from these checks.

## H Search Console

- Target property: `buysell.best`; neither its property type nor authenticated access could be confirmed.
- No installed Search Console connector or accessible authenticated API credential was available. Browser access reached the public Search Console introduction and required sign-in.
- Sitemap submission: **not performed**. URL inspections: **0**. Request indexing actions: **0**. No such action is claimed.
- Submit https://buysell.best/sitemap.xml in the correct property, then inspect/request the exact canonical URLs in `docs/manual-indexing-urls-2026-10-15.txt`.
- The list contains the two indexes, twenty product URLs and eight affected guides. The public Google Indexing API is restricted to eligible job-posting and livestream pages and was not used for shopping pages.
- Crawlability and sitemap publication help discovery but do not guarantee indexing or ranking.

Google references:

- https://developers.google.com/search/docs/appearance/google-images
- https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- https://developers.google.com/search/apis/indexing-api/v3/using-api

## I Remaining work

- Check Admitad campaign acceptance and Link Checker status, especially the constructed row 13, in the publisher account. The verification worksheet marks these as `NO` for account-level verification, while storing all implemented URLs.
- Complete the Search Console actions above with authenticated access.
- Rows 21–71 were outside this image/content batch. The existing smartphone mapping is retained; the other fifty products still lack newly supplied central affiliate mappings.
- Check final seller variants, stock, shipping and returns at purchase time. No verified price or availability is asserted for this batch.
