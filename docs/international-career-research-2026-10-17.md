# International Career Research — country-targeted, specialist guides

Scope: 50 original, country-by-specialty research pages under `/careers/`, plus the index. Ten country markets: United States, Canada, United Kingdom, Australia, Germany, Switzerland, Netherlands, Ireland, Singapore, and United Arab Emirates. Five subject clusters: cybersecurity/risk, cloud & AI platforms, finance/insurance compliance, pharma/life sciences, and energy/industrial engineering.

## Editorial principles

These pages are **not job vacancy advertisements**, do not imply an actively open role, and should not use `JobPosting` structured data. Employers, salary, sponsorship and hiring outcomes are **not** claimed or verified for an individual role. The sources are official employer-run career search pages; readers must choose their own country, role, and application on that portal. Each topic includes a distinct local role-assessment scenario, qualification/immigration cautions, practical role screening questions, a decision worksheet, and links to further fields.

Official sources manually checked against employer portals on 17 October 2026:
- Microsoft: https://careers.microsoft.com/v2/global/en/home.html
- Amazon: https://www.amazon.jobs/en/search
- Salesforce: https://careers.salesforce.com/en/jobs/
- Citi: https://jobs.citi.com/category/finance-jobs/287/19609/1
- HSBC: https://www.hsbc.com/careers/find-a-job
- Deloitte: https://www.deloitte.com/global/en/careers/job-search.html
- Roche: https://careers.roche.com/global/en
- Siemens: https://www.siemens.com/en-us/company/jobs/
- Accenture: https://www.accenture.com/us-en/careers/jobsearch

A global company portal may not offer openings in all the countries described. Do not present those links as confirmed specific vacancies. Check availability and application links before updating source notes. Editorial snapshots are not automatically rewritten just because a live employer vacancy changes.

## Monetization and honest geography

Topic choice targets economically valuable subject areas (regulated finance, security, cloud, medical technology, engineering) in ten countries. **No CPM amount, advertiser fill rate, ad targeting or traffic location is guaranteed.** No geo spoofing, forced redirects, synthetic impressions or fake clicks. Content describes country-specific applicant considerations; it does not impersonate local applicants or traffic.

The career pages skip general top, sidebar and bottom display ads. Official outbound career links reuse the site's existing, user-initiated **single Adsterra Native Banner sponsored step** with an optional Smartlink offer. There is always a visible immediate **Continue to employer** link: the visitor never has to view/click the advertisement to proceed. No ad iframe of a Smartlink landing page, countdown, waiting period, autoplay, blocking or duplicate sponsored popups. The existing once-per-ten-minute popup cooldown remains intact.

## Indexing

The runtime `/sitemap.xml` and fallback static sitemap each contain the career hub and 50 detail pages. Every canonical URL has relevant `Article` metadata, never fictitious `JobPosting` metadata. Homepage highlights selected career guides for natural internal discovery. The site's existing Search Console read-only URL Inspection automation will not automatically inspect all these new URLs unless its queue is amended. Request Indexing on ordinary career research pages must be done manually through Google Search Console; Google's separate Indexing API is only for eligible genuine JobPosting or BroadcastEvent content.

## Operations

Data is in `content/career-research-catalog.json`; markup, hub, and sitemap entries in `lib/career-guides.js`; routing, ad suppression and homepage links in `worker.js`; style in `css/career-guides.css`; tests in `test/career-guides.test.mjs`. Keep datePublished at original publishing date. Do not assign newer lastmod dates unless the page has actually changed. Run `npm test` before deploy.
