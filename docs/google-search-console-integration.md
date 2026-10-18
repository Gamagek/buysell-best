# BuySell.Best — Private Google Search Console integration

The existing Cloudflare Worker (no second Worker) has a server-side Google Search Console client in lib/gsc-integration.js. No public endpoint serves these reports. It uses a separate hourly cron for URL inspections while preserving the existing six-hour syncPromos cron. The Worker does not submit individual normal articles for indexing, but uses the official sitemap submission API to notify Google of newly published canonical URLs.

## Prerequisites

- Google Cloud project: buysell-best-seo with Google Search Console API enabled.
- Service Account: buysell-best-search-console@buysell-best-seo.iam.gserviceaccount.com
- Give this Service Account Full permission in the buysell.best Search Console property.
- Bind two Cloudflare Worker variables in buysell-best:
  - GSC_SERVICE_ACCOUNT_JSON — encrypted Secret, full Google Service Account JSON.
  - GSC_SITE_URL — exact property identifier: sc-domain:buysell.best for a Domain property or https://buysell.best/ for a URL-prefix property. Can also be stored as a Secret.
- Never commit the JSON, create a public debug endpoint, or paste the private key in a chat.
- Do not reuse any Vid.Best credentials.

## How it works

- OAuth JWT bearer flow, RS256, Google token endpoint and webmasters.readonly scope for inspections and analytics, plus a separate temporary webmasters write-scope token **only** when the URL inventory has changed and a sitemap submission is needed. Tokens obtained at runtime, never stored.
- Once per UTC day: 28 complete days of Search Analytics, up to 250 pages, 100 queries, site totals and sitemap status. Search Analytics is not exhaustive; anonymized queries or row-limit omissions may occur.
- Every hour: up to five rotating published URL inspections for the full canonical set from home, category hubs, shopping products, guides, 50 high-intent articles and 50 career guides; optional active D1 listings are also scanned when a listings table exists. No scraping or fake traffic. Google reports the indexed version, not live indexability.
- Results stay in the existing private Cloudflare D1 database buysell-best-db. Tables auto-create if not present; the schema is also in db/migrations/0006_search_console_monitoring.sql.
- Errors stored by status code only, not Google response bodies or key material. Invalid property identifiers fail closed.

## Verify in private Cloudflare D1 console

    SELECT * FROM gsc_runs ORDER BY id DESC LIMIT 10;
    SELECT url,coverage_state,verdict,checked_at FROM gsc_url_inspections ORDER BY checked_at DESC LIMIT 100;
    SELECT dimension,item,clicks,impressions,ctr,position FROM gsc_performance ORDER BY checked_at DESC,clicks DESC LIMIT 100;
    SELECT * FROM gsc_sitemaps ORDER BY checked_at DESC;

First data appears after the next scheduled cron execution, if authorization succeeds. GSC_API_HTTP_403 indicates missing Search Console property permission or a property mismatch; GSC_TOKEN_HTTP_400 indicates invalid credentials or key, and GSC_SECRET_FORMAT_INVALID indicates the stored JSON is invalid.

## Limitations

URL Inspection does not expose the entire Discovered — currently not indexed list and cannot force indexing of ordinary pages. Normal discovery continues through canonical links, crawlable pages and https://buysell.best/sitemap.xml.

## Automation cadence and first five pages

Cloudflare schedules: `0 * * * *` for five URL inspections each hour,
`0 */6 * * *` for the existing promotion sync. The first inspection batch
checks `/`, `/insights/`, `/guides/`, `/shopping-methodology/` and
`/insights/compare-auto-insurance-quotes/`. Later runs advance the D1
`inspection_cursor` through the remaining published URL list. This is
**status inspection only**, not Google's Request Indexing operation. The
Google Search Console API must authorize correctly before any results appear.

## Automatic sitemap submission

The canonical public sitemap is `https://buysell.best/sitemap.xml`. It is
already listed in `robots.txt` and had been submitted previously through GSC.
When the Worker finds a different canonical URL inventory, the next hourly cron
uses `PUT /webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}` with a short-lived
OAuth token scoped to `https://www.googleapis.com/auth/webmasters`.
It is **not** the Google Indexing API and it does **not** request indexing of
each individual ordinary article. A successful PUT means Google accepted a
sitemap submission, not that Google fetched it or indexed its URLs.

An SHA-256 hash of the published canonical URL list is saved in private D1.
Success prevents redundant resubmission until the URL inventory changes.
Permission failures are saved with a sanitized code, and attempts are limited
to one per UTC day for an unchanged inventory. Read-only URL inspections still
proceed even if sitemap submission fails. Google may crawl an already-submitted
updated sitemap without resubmitting; this automation avoids hourly resubmission.

Check private D1:
```sql
SELECT name,value FROM gsc_state
WHERE name IN ('sitemap_submission_hash','sitemap_submission_time',
 'sitemap_submission_error','sitemap_attempt_version');
SELECT url,checked_at,coverage_state,verdict FROM gsc_url_inspections
WHERE url LIKE 'https://buysell.best/careers/%'
ORDER BY checked_at DESC LIMIT 50;
```

`sitemap_submission_time` is proof of successful API submission, **not indexing**.
Google's next sitemap download and URL crawl are asynchronous and outside
the Worker's control. Domain ownership and Full permission in Search Console
remain required; credentials stay in Cloudflare Secrets.

If permission cannot be granted to the existing Service Account, the owner can
manually submit `https://buysell.best/sitemap.xml` in the Search Console
Sitemaps UI. This does not require moving any secrets into GitHub.

## Dedicated image sitemap (October 2026)

`https://buysell.best/image-sitemap.xml` is a companion to the existing
`https://buysell.best/sitemap.xml`. Both are declared in `robots.txt` and
can be submitted automatically through the already-authorized Google Search
Console `sitemaps.submit` API using the existing Cloudflare Secret. The
GSC integration stores **separate** successful submission hashes, timestamps,
and sanitized errors for each feed in private D1. It submits only when
the published URL/image associations or first-party marketplace listing
inventory actually changes. It does **not** repeatedly request indexing for
individual image files.

Source of truth: the canonical sitemap already attaches every published
first-party editorial image to its content page with
`<image:image><image:loc>...`. The dedicated image feed is *derived* from
those page-to-image associations, so there is no disconnected image-only
sitemap. New approved marketplace listings on `buysell.best` with
first-party hosted images are included automatically. A third-party listing
image is not included because the remote image host may not be verified
in the site owner's Search Console.

Current source inventory: 87 substantive first-party content image files,
145 page-image relations, 72 image-bearing canonical pages; the two favicon
SVG icons are intentionally not in the image feed. The 51 SVG illustrations
are labeled as editorial concepts, not physical-product photographs. The
site includes 20 seller-image WebPs and 10 smartphone-gallery JPGs.

The existing hourly product-image GitHub workflow also regenerates the
fallback static `image-sitemap.xml` when files change and commits the two
sitemaps together. `worker.js` serves the dynamic sitemap first, using
the same main sitemap builder as the public `sitemap.xml`.

Verify status via the private D1 SQL console:
```sql
SELECT name, value FROM gsc_state
WHERE name IN (
  'sitemap_submission_time','sitemap_submission_error',
  'image_sitemap_submission_time','image_sitemap_submission_error',
  'image_sitemap_submission_hash'
);
```

The successful API submission only confirms Google received the sitemap
submission. Google ultimately decides when to crawl, process, and index each
page and image. Google Images ranking is not guaranteed. Future images need
valid rights, meaningful placement in crawlable HTML, descriptive alt text and
valid first-party image URLs; decorative icons do not belong in the image feed.
