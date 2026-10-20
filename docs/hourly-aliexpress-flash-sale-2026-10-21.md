# BuySell.Best — Hourly AliExpress Flash Sale Catalogue

## Current readiness

The flash-sale storefront, D1 category store, R2 product-image cache and hourly
Cloudflare Worker sync are implemented. **The advertiser product-feed URL is not
currently connected. No verified discount inventory or 1,000 products may be
claimed until that URL is configured and a successful sync is observed.**

**One necessary setup action:** In the existing Cloudflare Worker `buysell-best`,
add an encrypted secret named `ALIEXPRESS_PRODUCT_FEED_URL` containing the
*actual publisher-approved Admitad AliExpress product feed export URL*. This
value is a credential: do **not** paste it into code, GitHub, or a public chat.
The feed URL must use HTTPS and an `admitad.com` domain (including subdomains);
other hosts fail closed. If your approved feed is hosted elsewhere, validate
that host independently and update the explicit allow-list before connecting.

Instructions for obtaining a feed from your own Admitad publisher account:
Admitad → Product Feeds → Original → select your active AliExpress WW program
and the `buysell.best` ad space → choose **discounted products only** (if
available), XML/CSV or JSON → include `offer_id`, `name`, `category_name`,
`price`, `oldprice` or `discount_percent`, `currencyId`, `picture`,
`url` (pre-tagged affiliate destination where provided),
`description`, and optional `sale_end` or `end_date` →
Generate → copy the signed feed URL privately into the Worker secret.
If the feed lacks an offer's current price, valid discount, verified image or
trusted product destination, that row is skipped. Do not fabricate those fields.

Official help:
https://admitad.useresponse.com/knowledge-base/article/product-feed-what-it-is-and-how-to-export-it-for-your-website_4

## User experience

- A new responsive **Today’s Flash Sale — verified discounts up to 50%**
  mini-tile section appears at the **bottom of the homepage main content**.
  With no verified feed the section displays a small honest "not available"
  message linking to existing researched products.
- Full catalogue hub: `/flash-sale/`, paginated 60 cards per page;
  country/category-independent category pages:
  `/flash-sale/category/<verified-category-slug>/`.
- Takes the **ten best genuine discounted offers per source category**, up to
  150 feed categories/1,500 products. It does not create phantom entries to
  reach 1,000; actual totals depend on what the approved feed provides.
- Cards show title, short factual description, verified currency and price,
  original crossed-out price if supplied, computed or explicitly supplied
  percentage between 1% and 50%, and actual offer end time **only if the
  source supplies one**. Ends are displayed in UTC, never guessed.
- All shopping links retain the existing `data-sponsored-navigation`
  interaction, which shows the **one already configured Adsterra Native Banner**
  dialog with an immediate "Continue to ..." link. No enforced ad clicks,
  added pop-ups, invented Smartlinks, adult products or counterfeit offers.
  Existing Adsterra code and prior Admitad links are completely unchanged.

## Hourly execution

Existing Cloudflare cron `0 * * * *` adds
`syncFlashSale(env)` alongside existing Google Search Console URL Inspection,
and preserves six-hour promo syncing. Each run:

1. Downloads the verified Admitad feed (CSV, XML/YML offer tags or JSON).
2. Validates sources and discounts; excludes sensitive/restricted inventory;
   skips expired promotions and deduplicates products.
3. Writes selected top-ten categories to `flash_categories` in existing D1,
   preserving unchanged content modified dates.
4. Copies up to 24 **approved vendor product photos** from AliExpress's
   `alicdn.com` media hosts into the dedicated `buysell-flash-media` R2
   bucket. Images are only published from first-party
   `https://buysell.best/flash-media/items/<key>.<ext>` **after a successful
   image download**. Up to 48 source requests may be attempted per run.
   Images are not rewritten unnecessarily. Estimate ~42+ hourly runs to
   cache 1,000 unique images under normal conditions; actual time depends on
   active verified offers and rate limits.
5. Displays *only* fully validated, currently active, first-party-cached
   product cards. Stale feed data older than eight hours is hidden.
6. Updates the dynamically generated canonical sitemap and image sitemap
   with first-party images on actual category pages; submits changed sitemaps
   via the existing Google Search Console integration. Sitemap submission
   does not force image or page indexing.

D1 schema auto-creates `flash_categories`, `flash_media`, `flash_state`
on the first configured successful trigger. No secrets are inserted into D1.
Read status privately via the Cloudflare D1 console:

```sql
SELECT * FROM flash_state ORDER BY name;
SELECT COUNT(*) AS categories FROM flash_categories;
SELECT COUNT(*) AS images_cached FROM flash_media;
SELECT title,modified_at FROM flash_categories ORDER BY title LIMIT 10;
```

Potential permission errors from Admitad, unavailable stock, source-feed expiry,
image CDN 403, image/host mismatch or missing sale-end dates are never hidden by
mock content. The source product owner must authorize using and redistributing
product photos; this integration is for publisher-approved product feeds only.

The existing static `sitemap.xml` stays valid. Flash-sale listing data is
dynamic and read from D1 at request time, rather than committing volatile,
potentially 1,000+ changed thumbnails to GitHub every hour.

## Verification

- `npm test` in CI.
- Verify Worker deployment after merge.
- Confirm Cloudflare's R2 bucket `buysell-flash-media` binding `FLASH_MEDIA`.
- After setting `ALIEXPRESS_PRODUCT_FEED_URL`, wait for the hourly cron.
  Check D1 state `last_success`, `offers_count`, `category_count`
  and `flash_media` count. Check actual
  `https://buysell.best/flash-sale/` and `image-sitemap.xml`.
- Continue monitoring indexing via Search Console; all Google indexing
  decisions remain Google's and are not guaranteed.
