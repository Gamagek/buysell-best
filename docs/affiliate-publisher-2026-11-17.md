# BuySell.Best Admitad Original-Feed Publisher — 17 Nov 2026

## Production
- GitHub: Gamagek/buysell-best, merged PR #56.
- Cloudflare Worker: buysell-best; D1: buysell-best-db; R2: buysell-flash-media.
- Feed: publisher-approved Admitad AliExpress WW Original Product Feed, stored **only** in encrypted Worker secret ALIEXPRESS_PRODUCT_FEED_URL. Never commit signed export links or paste them into public issue comments.
- Scheduled UTC jobs: hourly \`0 * * * *\` for bounded product publishing and GSC inspection; six-hour \`0 */6 * * *\` for existing promotional work. Cron propagation is not immediate.
- Import limits from source: 50/hour, 1,200/day; actual successful imports can be lower due to feed validation, R2 image downloads, quotas and timeouts.
- Any merchant button on *new imported bulk product pages* is accepted only when the feed supplies an HTTPS rzekl.com/g/... Admitad link whose \`ulp\` references an exact AliExpress item URL. Generic direct AliExpress product links never qualify.
- Non-discounted original-feed products have no invented sale price, markdown or countdown. No invented reviews, first-hand tests, star ratings, stock or dates.
- Product main image is a cached source seller photo. A second site-generated editorial SVG graphic is visibly labelled **not a product photo**; it does not attempt to imitate the real merchandise.
- Product pages have categories inferred from listing type, buying-check guidance, source limitations, related listings, schema.org Product and seller Offer with feed-reported USD prices, canonical and OG metadata.
- Existing Adsterra top, sidebar and bottom placements plus user-initiated, immediately skippable Native Banner dialog are preserved. Advertiser eCPM and paid impressions cannot be promised.
- The dynamic sitemap index /sitemap-index.xml references /sitemap.xml, /image-sitemap.xml and /sitemaps/affiliate-products-N.xml and /sitemaps/affiliate-images-N.xml. The image shards include the source photo plus the distinct editorial SVG on the corresponding product URL. Keep all file URLs 200/crawlable.
- 146/146 Node tests, content check and Wrangler deploy dry-run passed on an Oracle test checkout with Node 24.15.0 before merge.

## Monitoring (Cloudflare D1 SQL Console)
SELECT COUNT(*) AS n FROM bulk_products;
SELECT name,value FROM bulk_state ORDER BY name;
SELECT published_day, COUNT(*) AS n FROM bulk_products GROUP BY published_day ORDER BY published_day DESC LIMIT 14;
SELECT COUNT(*) AS untracked FROM bulk_products WHERE destination NOT LIKE 'https://rzekl.com/g/%';

## Operational cautions
- Data imported from feeds is **not** a hands-on product review. For index quality, add independent, sourced editorial information and prioritize valuable products instead of assuming mass templates earn Google rankings.
- After this export URL was shared in chat, rotate its Admitad access code and replace the Cloudflare Worker secret with the new signed URL.
- Changes in publisher eligibility, affiliate attribution, feed access, external image policies, Cloudflare resource limits or plan pricing can interrupt imports. Review worker Cron Events and D1 bulk_state rather than assuming runs succeeded.
- The 1 GB RAM Oracle host is suitable for connectivity checks and lightweight jobs but not a high-quality large local reasoning or image diffusion model. No Gemini or local LLM is necessary for the safe feed/sitemap pipeline.
- The URL parser currently processes XML offers/products in the supplied feed. Other formats must be tested before switching. Source images are fetched only from allowed AliExpress media hosts.
- The dynamic SEO XML shard upper bound is currently 200,000 products; evaluate D1 read/cursor pagination and indexing quality well before approaching it.
