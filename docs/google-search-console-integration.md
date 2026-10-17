# BuySell.Best — Private Google Search Console integration

The existing Cloudflare Worker (no second Worker) has a read-only, server-side Google Search Console client in lib/gsc-integration.js. No public endpoint serves these reports. It uses the existing six-hour Worker cron while preserving syncPromos. The Worker does not submit normal articles for indexing.

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

- OAuth JWT bearer flow, RS256, Google token endpoint and webmasters.readonly scope. Tokens obtained at runtime, never stored.
- Once per UTC day: 28 complete days of Search Analytics, up to 250 pages, 100 queries, site totals and sitemap status. Search Analytics is not exhaustive; anonymized queries or row-limit omissions may occur.
- Every six hours: up to 12 rotating published URL inspections for home, hubs, 50 guides and shopping pages. No scraping or fake traffic. Google reports the indexed version, not live indexability.
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
