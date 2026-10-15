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

`js/sponsored-click.js` is shared by static and Worker-rendered pages. Every
unmodified, trusted outbound shopping click offers a visible, optional sponsor
choice. Internal product, guide and carousel links continue
normally. The merchant href is kept intact and works without JavaScript.

The primary control skips the sponsor and follows the exact Admitad deeplink.
The visitor can instead deliberately click the separately labelled Adsterra
sponsor link, which uses a normal new-tab anchor with `noopener`. A second normal
same-tab anchor provides a fallback if the browser blocks new tabs. Closing with
× skips to the merchant; Cancel, Escape, Back and page lifecycle events
dismiss the choice. Native dialog fallback, focus containment and storage-independent
handling retain the controls on browsers without full dialog/storage support.

No ad is framed, prefetched or opened automatically. Tests never contact the
ad network. This replaces the old framed destination because the Adsterra
publisher terms prohibit framing an ad click-through destination and prohibit
misleading, forced or artificially generated ad traffic. Sponsor engagement is
not required for shopping and is not used to trigger the Admitad destination.
Account approval, accepted traffic and commission eligibility remain decisions
of the respective networks; URL validation is not account-level approval.

Use `data-sponsored-bypass` for source references and the dialog's own links.

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

## First 20 Admitad product import on 15 October 2026

The uploaded DOCX's second table supplies 19 tracking links and one direct
AliExpress URL among its first 20 product rows. The 19 tracking URLs are retained
exactly. Row 13 uses the identical supplied campaign path and its exact supplied
merchant URL as `ulp`; its constructed origin is recorded in
`content/affiliate-import-2026-10-15.json`. The previous smartphone mapping remains.

All 20 exact item pages supplied their main image and title through public
listing metadata. Twenty local WebP assets preserve those visuals, with a total
size of 977,570 bytes. Source URLs, dimensions, retrieval dates and SHA-256 values
are recorded in the catalog. No substitute product rendering was generated.

Eight existing guides, their cards, the product index, twenty linked product
buying-check pages and both image sitemaps use the same catalog and mapping.
The actual replacements include a toiletry bag, a drive case and an earphone
case; their names and comparisons reflect those items, while stable product IDs
are retained. The packing-organizer listing is not described as verified
compression hardware. See `docs/admitad-integration-2026-10-15.md` for the mapping,
page and image paths, policy sources, verification and remaining account work.
