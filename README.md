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
Worker pages. The first real, unmodified visitor click on a product, Admitad /
AliExpress, `rel="sponsored"` or `data-sponsored-navigation` link shows one visible
Adsterra Smartlink frame inside the site's own dialog. The × and the real
**Continue to product / AliExpress** link stay outside that frame and remain
accessible while advertiser redirects happen inside it. There are no external
ad tabs, automatic destination timers or automatic retries.

The frame sandbox permits scripts, forms and its own origin, but prevents top
navigation, popup windows and external-app launches. × / Continue destroys the
frame and follows the exact original destination once. **Stay here**, Escape,
native dialog cancellation and Back dismiss the panel. Page lifecycle cleanup
prevents restoring a live ad panel from the browser back-forward cache.

`sessionStorage` records one Smartlink attempt per browsing tab/session. Later
product and Buy clicks use their normal destination, including after navigating
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
