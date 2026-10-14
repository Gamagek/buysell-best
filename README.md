# BuySell.Best

Mobile-first classified marketplace starter for https://buysell.best.

## Included
- Responsive marketplace homepage
- Categories and browse/search UI
- Listing detail interface
- Free-ad submission flow (front-end demo)
- SEO titles, descriptions and canonical links
- OpenGraph basics
- robots.txt and sitemap.xml
- About, Contact, Privacy and Terms starter pages
- Cloudflare Pages-friendly static structure

## Production phase
1. Connect Cloudflare Pages to this GitHub repository.
2. Create Cloudflare D1 for listings.
3. Create Cloudflare R2 for listing photos.
4. Add Pages Functions/API routes for submissions, search, moderation and reports.
5. Add an admin moderation dashboard.
6. Render approved listing pages from D1 with unique server-side SEO metadata.
7. Add rate limits, spam controls, image validation and abuse reporting.
8. Add Search Console and finalize legal/privacy wording.
9. Add a compliant advertising provider after content moderation is ready.

The current demo listings are sample data, not real seller inventory.

## Featured AliExpress product

The curated phone page is `/products/7-3-inch-android-15-smartphone/`. Its catalog,
tracked Admitad URL, images and shared price live in `lib/affiliate-products.js`.
The Worker renders the page, homepage spotlight and initial carousel HTML, so
the product and gallery are available without waiting for JavaScript or D1.
Original seller images are served from `assets/products/` through `ASSETS`.
No new R2, D1 or Images binding is required for this curated product.

The LKR price is a snapshot from the supplied URL, not a verified current offer.
Seller specifications are identified as claims. The page does not invent stock,
ratings, a discount deadline or a countdown. `Product` markup includes the photo
URLs; `Offer` markup is added only when `priceVerified` is true after a real check.
The dynamic `/sitemap.xml` includes the product URL and all ten image URLs.

## Sponsored clicks

`js/sponsored-click.js` is included on the existing static pages and rendered
Worker pages. Internal product, guide, category and carousel links open normally.
The first real, unmodified outbound shopping click on an Admitad / AliExpress,
`rel="sponsored"` or `data-sponsored-navigation` link shows one visible
Adsterra Smartlink frame inside the site's own dialog. The × and the real
**Continue to AliExpress** link stay outside that frame and remain
accessible while advertiser redirects happen inside it. There are no external
ad tabs, automatic destination timers or automatic retries.

The frame sandbox permits scripts, forms and its own origin, but prevents top
navigation, popup windows and external-app launches. × / Continue destroys the
frame and follows the exact original destination once. **Stay here**, Escape,
native dialog cancellation and Back dismiss the panel. Page lifecycle cleanup
prevents restoring a live ad panel from the browser back-forward cache.

`sessionStorage` records one Smartlink attempt per browsing tab/session. Later
outbound Buy clicks use their normal destination, including after navigating
between pages. If storage is unavailable, the current page still caps attempts.
Nothing is fetched from the ad network just by visiting a page, and tests never
contact the ad network. A frame request or load event is not evidence of a valid
impression or payable click. Advertisers may block framing or require permissions
not available in this container; no proxy bypasses those restrictions. The
publisher must verify counted traffic in Adsterra and use a supported in-page ad
format such as Social Bar when guaranteed embedded creative support is needed.

Use `data-sponsored-bypass` for the panel's own destination control. Future static
pages should include the versioned shared CSS/script; Worker HTML responses use
`withSponsoredSupport()`.

## Shopping guides

The initial editorial batch has 24 substantial buying guides, six category hubs,
the `/guides/` index and `/shopping-methodology/`. The original smartphone page
keeps its URL and now links to the related purchasing and accessory guides.
These pages are rendered in the existing Worker and require no client-side feed,
new D1 tables, R2 bucket or paid image transformation binding.

Article content, sources and 71 merchant-link candidates are stored in
`content/shopping-catalog.json`. Six original AI-generated illustrations are
served from `assets/guides/`; captions distinguish them from actual product
photos. `content/image-generation.json` records the prompts and image provenance.

Only the already supplied phone link is currently tracked. Other shopping buttons
use the original merchant URLs until approved Admitad deeplinks are supplied.
`content/affiliate-links.json` maps stable product IDs to those approved links.
The public `/shopping-links.csv` export includes IDs, merchant URLs, reference
URLs, an affiliate-link column and the associated articles. Exact item links and
marketplace searches are explicitly distinguished. Indexed references do not
verify live stock, seller authenticity, current price or bestselling status.

Run `npm run content:check` to validate substantive content and references;
`npm run content:export` refreshes the CSV and fallback sitemap. `npm test` also
checks the content before the Worker build and route/DOM tests. Source content,
scripts and documentation are excluded from static asset uploads.
See [shopping guide maintenance](docs/shopping-guides.md) for the update process.

## Search Console

Select the **buysell.best** property, submit `https://buysell.best/sitemap.xml`
under **Sitemaps**, then inspect the canonical product URL and request indexing.
The Google Indexing API is limited to eligible job / livestream pages and is not
the submission route for this product. Google chooses whether and when to index
the page and images; publishing schema or a sitemap does not guarantee ranking.

## Verification

Run `npm ci` followed by `npm test` for a Wrangler build check, Worker routing /
SEO tests in Miniflare and isolated DOM tests of the sponsored click flow. Tests
stub the ad frame and do not make advertising or affiliate network requests.
