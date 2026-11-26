# BuySell.Best — Adsterra Social Bar activated (27 Nov 2026)

The publisher supplied the official public GET CODE script:
`<script data-cfasync="false" src="https://bauval.org/14/d8063d5aecade427591382df80071470"></script>`

The Worker serves this exact script **once** near the end of each eligible HTML page through `lib/adsterra-social-bar.js`. Adsterra may choose floating notifications, animated creatives or video-like advertisements; **the publisher cannot select or guarantee a video on every page view**. The script path has no .js suffix; validated extensionless Adsterra /14/<32 hex> paths are supported.

### Existing affiliate and redirect behavior
The same page can show the vendor-controlled floating Social Bar. The site-owned, clearly marked optional redirect step in `js/social-bar-redirect.js` is displayed no more than once per page and once per 10 minutes for ordinary user clicks on eligible merchant links. The user may instantly Continue or dismiss; no required ad click, watch time, countdown, auto-refresh, forced popunder, artificial impression, or fake click. **The ad is not inserted in the dialog**: Adsterra renders Social Bar independently and may or may not select a video creative. Real 302 redirect responses cannot carry a visual ad; only HTML pages can.

### Safe and reversible
- Old Adsterra banners, Native Banners, Smartlink popups, Monetag vignette are still disabled; the original working setup is preserved at `backup/adsterra-monetag-full-setup-20261126`.
- Legal pages, contact forms, submission pages, APIs, sitemap, error pages are excluded from Social Bar.
- Until a compliant advertising-consent flow is implemented, do not load the third-party advertising script for visitors Cloudflare identifies as being in EEA countries, the UK or Switzerland. Privacy notice updated.
- To disable without code edit, set Worker Text variable `ADSTERRA_SOCIAL_BAR_SCRIPT_URL` to an empty string (only if the dashboard permits); alternatively change `AD_PROVIDER_MODE` to `newor_pending` and deploy.
- API token `ADSTERRA_PUBLISHER_API_TOKEN` is an unrelated private Worker secret for analytics. **Never place it in the HTML or GitHub.**

### Revenue: no guarantees
Publisher revenue is actual eligible Adsterra ad impressions × realised CPM / 1000. Example: 1000 valid impressions at $1 CPM yields $1; 500 at $2 yields $1, before payment fees and thresholds. Cloudflare HTTP page views are not ad impressions; only publisher reports give reliable revenue. Do not auto-repeat ads, incentivize clicks, fabricate traffic, or repeatedly trigger redirect dialogs. Review 7-day Adsterra Social Bar revenue, geo and merchant conversion rate before adding any extra ad formats or requesting a higher-frequency cap.

### Validation
Test that root, guides and product pages contain exactly one approved `#bsb-adsterra-social-bar` script with `data-cfasync=false`, and old vendor script tags remain absent. A direct non-browser HTTP GET of bauval.org returned 403 during the preparation audit; browser creatives require live browser/network verification and may be blocked by Adsterra anti-bot or consent logic.
