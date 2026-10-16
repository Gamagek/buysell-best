# 50 buyer-decision guides — 17 October 2026

Added 50 decision checklists in ten commerce-adjacent topic clusters, focused on purchase intent rather than unsubstantiated "highest CPM" claims. Each URL is server-rendered as HTML by the existing Cloudflare Worker at /insights/<slug>/, with a canonical URL, title, description, publication date, truthful Article JSON-LD, contextual internal links and a reference to an independent source.

## Site integration
- One main /insights/ index with ten browsable clusters and all 50 links.
- Home page features six of the new guides, all linking to real pages.
- Dynamic and fallback /sitemap.xml now include exactly 51 additional URLs (one hub + 50 articles).
- Existing shared header top banner, in-article sidebar and footer banner are injected through lib/display-ads.js. The separate, explicitly selected footer Smartlink and optional shopping-dialog Native Banner are untouched.
- No new advertisement placement, forced popunder, auto-click, auto-refresh, fake impressions or adult-ad option has been added.
- Existing Cloudflare Worker, D1, R2, and affiliate product pages remain unchanged.

## Editorial limitations
The guides provide a comparison framework, specific decision scenarios and original educational checklists. They DO NOT claim to quote current premiums, prices, financial outcomes, eligibility, insurer terms, live product stock or independent hands-on tests. Financial and insurance content is general and readers are directed to local disclosures and qualified professionals when appropriate. Primary references are pointers to further background, not author endorsements. Publication date reflects publication; not live price checking.

Google may decline to index pages whose content is judged insufficient. Periodically review and expand pages using verifiable local data, actual screenshots/tests, research, authorship details or distinct interactive tools where available. Do not generate thousands of close variants. Inspect individual page URLs in Search Console and review query performance by category.

## Check
Run npm ci && npm test and npm run content:export. Deploy the main branch through the existing Cloudflare workflow, verify /insights/ and sampled article 200 HTML, live sitemap, adult controls and ad layout on phones. Check Adsterra by domain, country, device and placement after enough genuine visits. Revenue = accepted impressions x actual eCPM / 1000; page views and load events do not guarantee billable impressions.
