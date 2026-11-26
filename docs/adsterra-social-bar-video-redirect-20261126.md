# Adsterra Social Bar video-like creatives + affiliate exit flow (2026-11-26)

## State and safety
The owner-approved Social Bar script is required before serving advertising. Until configured, the integration **fails closed**: no Social Bar tag, no navigation prompt and no third-party ad request. The previous Adsterra display/native/Smartlink, homepage popup and Monetag vignette code is archived in the immutable backup branch:
https://github.com/Gamagek/buysell-best/tree/backup/adsterra-monetag-full-setup-20261126

Social Bar can display video-like or animated creatives, but Adsterra controls which ad appears. This is **not a VAST player** and does not guarantee video on every impression. Users are not required to watch an advertisement.

## Get the approved Social Bar embed code (not the API token)
1. Log in: https://beta.publishers.adsterra.com/
2. Websites → buysell.best → + AD UNIT → Social Bar, or select an existing approved Social Bar unit.
3. After ad-unit approval, select GET CODE.
4. Copy the official HTTPS script src URL in the vendor script tag. This is public ad installation code, NOT a private account token.
5. Cloudflare Dashboard → Workers & Pages → buysell-best → Settings → Variables and Secrets → Add.
6. Set variable name **ADSTERRA_SOCIAL_BAR_SCRIPT_URL** with exact approved script src URL, Type Text, Save and Deploy.
7. On eligible HTML pages the Worker loads the vendor script once before the closing body tag. No fabricated tags or old incompatible popup scripts are loaded.

## Affiliate redirect flow
On a normal user click on an allowed merchant, sponsored affiliate or designated internal travel link, a **skippable** dialog can appear at most once per page and once every 10 minutes. Continue and × go immediately to the original merchant URL, Stay/Escape dismiss. Modified clicks and unrelated links retain normal navigation. The real Social Bar ad floats independently under Adsterra control, not embedded in the dialog. No mandatory video watch, advertiser interaction, auto-redirect or synthetic click is implemented.

## API token is for reports, not installing ads
Official Adsterra Publisher API documentation: https://adsterra.com/api/ .
Publisher dashboard → Settings → API → GENERATE NEW TOKEN.
This is a read-only reporting API; it supports fetching domains, placements, impressions, clicks, CPM and earnings. It is not confirmed to return exact GET CODE scripts.

For a future secure API reporting integration, add a Cloudflare **Secret** named **ADSTERRA_PUBLISHER_API_TOKEN** and use server-side calls with the X-API-Key header. Do not send the API token in chat or GitHub. Merely creating a Cloudflare Secret does NOT give ChatGPT access to its value; separate secure reporting integration is necessary. For direct control of the Adsterra dashboard without sharing credentials, use an approved browser connector and sign in through its isolated browser.

## Modes and rollback
The switch in lib/ad-provider-switch.js supports:
- adsterra_social_bar: only authentic configured Social Bar script, with old ad networks disabled; no ads until real script available.
- newor_pending: no ads, hidden preparatory Newor slots.
- legacy: original Adsterra + Monetag setup (archived unchanged).

After a mode change and deployment, verify actual homepage and product pages before declaring any ad live. Do not load Social Bar, Popunder and Monetag vignette together without explicit ad-network compatibility approval.

## Testing
Oracle Wrangler dry-run and automated tests verify URL validation, one authorized tag per eligible page, removal of legacy ad scripts and no installation on API, legal, forms or error responses. Actual video ad creative and payout performance are only observable after the network serves valid impressions.
