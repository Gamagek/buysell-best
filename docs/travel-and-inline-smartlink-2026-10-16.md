# Worldwide hotels, promo-code sources and inline Smartlink preview

## Published behavior

- `/hotels/`: 249 ISO country/territory entries, city/hotel search brief, dates and occupancy; seven booking/metasearch services with practical comparison notes; a local calculator for final full-stay quotes entered by the visitor; buying, fees, cancellation and location guidance.
- `/promo-codes/`: five official hotel-offer/coupon-information sources and three coupon-discovery sources, with eligibility and verification notes. No coupon strings, discounts or redemption success are fabricated.
- The homepage has two new travel cards. Static-page navigation and shared product/guide headers link to both pages. Travel entry links explicitly opt in to the sponsor step.
- Existing product, guide, carousel, tile, marketplace and promo-source shopping actions use shared `js/sponsored-click.js` v5. A trusted ordinary click opens the screenshot-style modal with a visible Smartlink frame. Continue or × immediately goes to the exact selected URL; a separate stay button dismisses. Repeated shopping clicks also show the step.

## Source and data limits

`content/travel-services.json` keeps provider/offer URLs, primary information sources, descriptions and a review date. Sources include Google Travel Help, Booking.com Genius, Agoda deals, Expedia and Hotels.com coupon pages, Trip.com hotel-promotion information, and KAYAK help. Wethrift, SimplyCodes and Slickdeals are discovery services, not merchant redemption guarantees. The source data for the country list is recorded in `content/travel-countries.json`.

Google links carry destination queries; Booking.com links carry destination, valid dates and occupancy. Other providers open their official search pages and visibly ask the visitor to enter the trip there. Every provider must reconfirm search details. A research-tool restriction prevented live automated confirmation of the Booking.com result URL; its query structure and exact parameter retention are locally tested, but inventory/rates are not.

No hotel-rate API credentials or live room feed are available. Consequently the site does not list invented hotels, prices, availability, ratings or a globally cheapest hotel. The country selector does not imply bookable inventory or platform access in every territory. The quote comparison identifies the lowest visitor-entered total in one currency, with no conversion. A currency change clears entered amounts. Quotes are not transmitted to a server or stored across navigation. These travel links are direct provider URLs; no travel affiliate approval is implied.

## Advertisement and browser behavior

Smartlink: `https://www.profitableratecpmnetwork.com/nugmu8qikp?key=9245fcfc15bbb0d5bb9c7bec0ec186c4`.

The legacy inline preview was restored at the user’s explicit request. The iframe is created only after opening a visible dialog from a trusted visitor click. Its sandbox allows scripts, forms and same-origin resources, but not top navigation, extra popups or downloads. No hidden ad load, prefetch, automatic tab, timer, retry or once-per-session gate is used. The original affiliate URL is preserved.

Advertiser CSP/X-Frame-Options and third-party blocking are honored. A frame load event is not proof that an ad displayed. The outer destination controls remain available for a blank or blocked frame. The implementation restores the requested appearance; it does not establish Adsterra placement approval or accepted traffic. Adsterra publisher terms restrict framing ad click-through destinations; network acceptance and payouts remain account-level decisions. Advertiser creatives can vary, including the age prompt visible in the reference screenshot. That creative is neither recreated nor promised here.

Native dialog and fallback overlay preserve outside controls. Modified clicks, JavaScript-free links, product galleries and ordinary reading links retain browser navigation. Internal sponsor interception is limited to explicitly opted-in `/hotels/` and `/promo-codes/` entry anchors, preventing recursion into general internal routes. Escape, Back, page hiding and restored pages clean up without redirecting. Continue and × destroy the advertiser context before navigating.

## SEO and routing

Both pages are server-rendered by the existing Cloudflare Worker, have canonical URLs, useful text and internal links, title/description/OG/Twitter metadata, and truthful CollectionPage, BreadcrumbList and ItemList schema. They are included once in dynamic and exported fallback sitemaps. No hotel Product/Offer/rating data is fabricated. Wrangler runs the Worker before static assets on the new routes. No new D1 table, external runtime, secret or paid binding is required.

Search Console has no connected inspection/indexing access in this environment. No new inspection or indexing request is claimed. The two URLs are added to `docs/manual-indexing-urls-2026-10-15.txt` for manual inspection. Google indexing/ranking is not guaranteed.

## Validation

`npm run content:export` and `npm test` passed. All **22** integration/DOM tests passed, covering existing twenty Admitad products and real image assets, all guides and existing gallery/carousel, direct destination preservation, repeated clicks, frame isolation/cleanup, blocked-frame and native-dialog fallbacks, every travel provider/promo destination, all 249 country entries, escaping, trip validation, quote ties/currency/reset, canonical redirects, HEAD/404 behavior and both sitemap copies. Automated tests stub the advertisement and do not create ad-network or affiliate traffic. Wrangler dry run retained the existing DB and ASSETS bindings.

## Production verification

Feature commit: https://github.com/Gamagek/buysell-best/commit/a158133bb7a441b3b186a97e63fe3621fa4202a4 . Cloudflare build `917c0c90-8b23-4271-83a8-73f896a222ec` completed successfully. Production deployment `160b5876-c5fd-41d7-9f1a-025984b67fd2` put Worker version `8dfece09-9136-47a4-ac10-6b728e9bf7c6` at 100% traffic on 2026-10-15T20:27:05Z. The existing ASSETS and D1 DB bindings remained present.

The live browser rendered both `/hotels/` and `/promo-codes/`. Submitting a Kandy, Sri Lanka test trip for 10–12 November 2026 produced the matching trip summary and Booking.com URL with dates, adults and room count intact. The live quote calculator correctly compared temporary sample inputs of 120 and 100 and reported a difference of 20; those inputs were test data, not retrieved hotel prices. The v5 sponsored module was present and no ad frame loaded before a shopping activation. No site-code console error was observed; the browser extension logged its own unrelated metadata errors. Live advertiser display was not exercised or claimed. The XML sitemap’s route/content is verified locally; this environment previously blocked live XML retrieval, so a live XML HTTP-200 claim is not made.
