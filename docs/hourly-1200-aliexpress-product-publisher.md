# Hourly verified AliExpress publisher — 1,200/day target

## Objective and accurate status

The BuySell.Best Worker now includes a **bounded recurring 50-new-product
per hourly run** publisher (50 × 24 = theoretical 1,200 new product pages
per Sri Lanka day; daily safety cap 1,200). Existing Worker cron
`0 * * * *` is the scheduler. This is **a conditional throughput target,
not a promise that 1,200 products will be live today**: successfully
loading a real, advertiser-approved Admitad feed and rehosting genuinely
verified merchant photos on Cloudflare R2 remain necessary. All actual
production counters and errors must be checked in private D1.

No ChatGPT session needs to remain open, and no separate ChatGPT reminder
must be created. Publishing continues through the Cloudflare cron even if
the user closes the browser.

The previous `syncFlashSale` job downloaded the full XML into memory,
enforced 25 MB, and limited its selected catalogue to 1,500 products.
To avoid downloading the same very large feed twice every hour, the hourly
schedule uses the new `importHourlyBulkProducts` incremental publisher
instead of the old full-download sync. Existing editorial product pages,
40-product fallback, Adsterra placement, original affiliate links, Google
Search Console jobs and six-hour promotion schedule are unchanged.

## Safeguards

- The feed source is read **only** from encrypted
  `ALIEXPRESS_PRODUCT_FEED_URL`; the secret value must never appear in
  GitHub, URLs on the site, or diagnostic logs.
- The feed URL must be HTTPS on an approved `admitad.com` host.
- Stream XML `<offer>` / `<product>` rows, stop early after up to 85
  previously unseen valid candidates; max 50,000 examined rows and 50 MB of
  incoming XML per hourly run. Reader is explicitly closed once enough
  candidates are available. If the feed is blocked, malformed, huge, or
  host-mismatched, fail closed.
- Product is eligible only when its genuine affiliate offer data
  contains a product title, valid seller image, valid price, and verified
  old-price/discount information of **20%–95%**. Restricted categories,
  duplicates, expired offers and unsafe outbound URLs are excluded.
- Up to 85 photo retrieval attempts per run; never publish a product
  page without an actual image file successfully downloaded and stored
  in the existing private Cloudflare R2 bucket `buysell-flash-media`.
  Product pages and image sitemaps use first-party `/flash-media/` URLs.
  Seller product photos are not edited to change the identity of an item.
- Each product page has a stable path
  `/flash-sale/product/<name-and-source-id>/`, a real product name,
  feed-sourced price/discount, optional real end time, a seller photo,
  canonical, Open Graph preview, truthful Product / Offer data and an
  *independent buying-check summary*. No forged reviews, imaginary
  popularity scores, guaranteed stock, invented discounts, fake
  countdown clocks or unsourced specifications.
- The public `/flash-sale/` index serves new product pages in manageable
  batches of 60 per paginated page. The homepage shows up to 24 latest
  product tiles when valid items exist, otherwise the 40 researched
  catalogue remains available. Existing `data-sponsored-navigation`
  attributes and the optional immediately skippable Adsterra popup
  continue to be used for all shopping redirects.
- The canonical and derived image sitemap associate each new first-party
  image with its actual product page. The private GSC integration
  fingerprints the changed product set, resubmits both sitemap feeds on
  meaningful change and samples URLs using its original five-per-hour
  **status-only** API allowance. Google decides how many pages/images to
  crawl and index.

## Private diagnostics in Cloudflare D1

Tables are created automatically on the first correctly configured hourly
run. In Cloudflare dashboard, D1 `buysell-best-db`, run:

```sql
SELECT name, value FROM bulk_state ORDER BY name;

SELECT COUNT(*) AS published_products FROM bulk_products;

SELECT published_day, COUNT(*) AS published
FROM bulk_products GROUP BY published_day ORDER BY published_day DESC LIMIT 7;

SELECT slug,title,discount,price,currency,published_at
FROM bulk_products ORDER BY published_at DESC LIMIT 10;
```

If the tables do not yet exist, the cron has not initialized them (or
the required bindings are unavailable). Because currently connected
Cloudflare API access has intermittently failed, **an actual successful
production feed import is not confirmed by deploying code**.

The service-account Search Console integration and the image sitemap
were already installed. This publishing workflow does not ask for
Google's unsupported general-page indexing API, fabricate indexing
requests or falsify last-modified dates.

## Cloudflare limitations

Actual 50/hour success depends on Worker plan subrequest quotas, Worker
execution time/CPU limits, R2 permissions, D1 limits, source CDN behavior,
feed access, image response sizes and the number of eligible products.
If a Free Workers subrequest or compute quota makes 50 uploads per
execution impossible, use a permitted paid plan, task queue, multiple
independent scheduled executions, or lower the batch size. Do not claim
1,200 completed until real D1 counts prove it.

Initial feed content is **not** a substitute for original tested product
reviews. Repeated generic content, stale offer prices, duplicate pages
and overoptimistic link volume can damage SEO; periodically deindex or
improve underdeveloped pages. Product image licensing must be authorized
under the affiliate feed program.
