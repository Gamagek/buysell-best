# Automatic affiliate AI buying guides — GitHub + Cloudflare

## What runs, and when
- **Existing Cloudflare Worker Cron:** every hour at minute 00 UTC, imports at most 50 real approved Admitad AliExpress products/hour and 1,200/day into D1/R2, when the source works.
- **New GitHub Actions:** `.github/workflows/hf-bulk-review-publish.yml` hourly at minute 37 UTC. A temporary GitHub-hosted Ubuntu runner downloads the pinned Hugging Face Qwen3-1.7B GGUF Q4_K_M and llama.cpp CPU inference engine. No paid Gemini/OpenAI inference API and no 1GB Oracle LLM server needed. The default processes up to **6 review candidates per run** (maximum 144 per full day if every run succeeds and all six pass). It is a finite scheduled workflow, not a permanent VM. GitHub queues/delays, service outages, quota and abuse restrictions can affect availability.
- **Authenticated publishing:** an OIDC token with aud `https://buysell.best/_ops/reviews` and the exact repo, main ref and workflow identity is verified cryptographically by Cloudflare. Only this workflow can call `POST /__ops/reviews/candidates`, `/publish` and `/failed`; signed feed URL never enters the GitHub runner.
- **Storage:** `bulk_ai_reviews` and `bulk_ai_review_attempts` in the existing D1 database. Database tables initialize on the first authenticated call. The AI review appends to the existing canonical, product photo, editorial SVG, affiliate link, Product/Offer JSON-LD, internal product links and image/page sitemaps. Existing Adsterra ads and skippable dialog remain unchanged.
- **Publishing quality:** 4 buyer checks, AI-assisted overview, cautious verdict; no invented hands-on use, five-star ratings, guaranteed product quality, certifications or verified fit. A server-side text screen rejects simple suspicious claims. This is not a substitute for independent source fact-checking; every published AI analysis is labelled accordingly and user can always check original merchant details.
- **Concurrency / budget:** one job at a time, up to 8 candidates returned, 6 processed, max 300 reviews stored per UTC day, retry failed product after at least 24 hours. No model call if source record is missing.

## Optional 4get search grounding
The public 4get API explicitly forbids unprompted continuous automation and intensive scraping (see `https://git.lolcat.ca/lolcat/4get/src/branch/master/api.txt`). Do not use `https://4get.ca/` or unapproved public instances for hourly bot queries. If you **self-host** your own 4get-compatible service and authorize this workload, create GitHub repository variable `PRIVATE_4GET_BASE_URL` with the HTTPS base URL ending in `/`. The job then makes at most one bounded `/api/v1/web?s=...` query per product, extracts at most two linked references and labels them as **unverified web search references**. Without this variable, the feed-based AI analysis continues automatically. Search results are not accepted as instructions or proof of any seller specification.

## Monitor
- GitHub Actions → **Qwen3 Hourly AI Affiliate Review Publisher**
- Cloudflare D1 SQL Console:
  - `SELECT COUNT(*) n FROM bulk_products;`
  - `SELECT COUNT(*) n FROM bulk_ai_reviews;`
  - `SELECT slug, published_at FROM bulk_ai_reviews ORDER BY published_at DESC LIMIT 10;`
  - `SELECT slug,result,tried_at FROM bulk_ai_review_attempts ORDER BY tried_at DESC LIMIT 10;`
  - `SELECT name,value FROM bulk_state ORDER BY name;`
- Live example page: `https://buysell.best/flash-sale/product/plastic-car-rivets-strong-designs-retainer-clip-91505tm8003-for-automoti-1005010507993958/`

## Limitations
- Six generated reviews/hour is not thousands of deep reviews/day; existing feed product pages can still reach up to 1,200/day. CPU-only review generation throughput should be increased only after tests verify quality, resource usage and policies.
- Search results and affiliate product feeds lack independent tests, so they cannot support claims of firsthand product quality.
- Model output and web snippets may contain mistakes even after screening. Strict pricing, attribution and link eligibility still come from the original approved Admitad feed.
- Review and source content updates can be stale until the Worker cache revalidates. Sitemap positions already exist for every eligible published product.
- No promise of search indexing, CTR, CPM or affiliate commission.
