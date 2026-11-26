# D1 75% account-wide daily quota guard — 2026-11-26

## Protection enabled for **new** bulk product page imports
- Existing published `/flash-sale/product/*` pages, Adsterra ads, sitemap routes and Google Search Console are not disabled.
- Cloudflare D1 Workers Free allowance: **5,000,000 rows read/day** and **100,000 rows written/day**, across the **entire Cloudflare account**, resetting **00:00 UTC**. Other D1 databases count toward this allowance.
- Each hourly product import first queries Cloudflare's authoritative D1 GraphQL analytics using an **Account Analytics Read**-scoped Worker secret named `D1_ANALYTICS_READ_TOKEN`. Never put it in GitHub, logs, the site or a chat.
- When **either** metric reaches **75%** (3,750,000 reads OR 75,000 writes), new bulk pages are halted automatically for the rest of that UTC day or until the next verified budget check shows usage below 75%.
- At 60% usage, cap bulk imports to 20 pages/hour; at 70%, cap to 5/hour; below 60%, at most 50/hour. Existing 1,200/day limit remains.
- The old one-time authenticated affiliate import also stops if quota has been reached.
- The guard **fails closed** if the token is absent, analytics is inaccessible, response malformed or no current-day account-wide results are returned. The site keeps serving existing content. This is intentional: an unmeasured importer cannot promise to protect a shared quota.
- Uses one GraphQL request before any publisher D1 scans/feeds/R2 writes. It does not add monitoring writes to D1.
- Analytics ingestion can lag. Other Workers/sites can consume D1 concurrently; stopping new imports cannot guarantee account-wide usage remains below 75%.

## One-time security configuration: Cloudflare dashboard
1. Cloudflare Dashboard → your account → **Manage Account → Account API Tokens** (or Profile → API Tokens).
2. Create a **custom API token** scoped to **only this Cloudflare account**, permission **Account Analytics → Read** (no D1 edit, Workers edit, R2 edit or DNS edit). You may add a rotation/expiry policy and replace it before expiration.
3. Cloudflare Dashboard → Workers & Pages → `buysell-best` → Settings → Variables and Secrets → Add secret:
   - Name: `D1_ANALYTICS_READ_TOKEN`
   - Value: the newly created **read-only** Cloudflare API token.
4. Save/deploy the Worker secret. Do not paste the token in GitHub or ChatGPT.
5. The next hourly Worker Cron will automatically query live analytics and resume imports **only when verified below 75%**. Observe `D1_BULK_IMPORT_QUOTA` worker logs without displaying the secret.

## Monitoring
Cloudflare → Workers & Pages → `buysell-best` → Observability → Logs: filter for `D1_BULK_IMPORT_QUOTA`.

Statuses:
- `daily-d1-75pct-limit` — account read or write rows have reached 75%; no new products.
- `under-limit` — imports permitted with 5/20/50 hourly adaptation.
- `analytics-token-not-configured` — no token; publisher safely paused pending one-time setup.
- `analytics-http-error`, `analytics-graphql-error`, `analytics-unavailable` — measurement failed; publisher safely paused.

As of 2026-11-26, Cloudflare's account-wide GraphQL returned 4,564,960 D1 rows read and 1,862 written for that UTC day, corresponding to **91.3% of the Free row-read allowance**. Numbers change throughout the day. Oracle Node24 tests and Wrangler build tests were run before deployment.
