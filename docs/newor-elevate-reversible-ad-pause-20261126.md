# BuySell.Best: Newor Elevate handoff and fully reversible ad pause
**Date:** 2026-11-26
**Public domain:** https://buysell.best
**Archived untouched main branch:** https://github.com/Gamagek/buysell-best/tree/backup/adsterra-monetag-full-setup-20261126

## Present state: Newor approval pending, all third-party ad serving paused

The Cloudflare Worker uses the single explicit switch:
- \`lib/ad-provider-switch.js\`: \`AD_PROVIDER_MODE = "newor_pending"\`
- It strips all existing Adsterra, Monetag, pop-up, native, Smartlink, and vignette **ad requests** from server-served HTML at the **final response boundary** (including HTML cached from before the switch).
- Existing affiliate product outbound links, website navigation, shopping guides, seller images, D1 publishing, JSON-LD, sitemaps, verified Google publisher metadata, non-ad site functionality and ads.txt verification are not intentionally altered.
- In this mode **no actual Newor/AdX ad calls are created**. No real partner codes or account approval have yet been supplied. Do not advertise the site as having active AdX until Newor and Google accept it.
- In eligible editorial pages the Worker adds hidden, inert Newor-ready \`data-newor-slot\` markers for future official ad units. No empty visible ad placeholders, no unexpected navigation, no popup redirects.
- The existing homepage's original ad scripts and assets remain in Git so restoration is possible, but the Worker strips them from the served HTML.

## Exact preservation map

| Original format | Original implementation | Current status | Future compatible alternative after partner approval |
|---|---|---|---|
| Top 320×50 banner | \`lib/display-ads.js\` | Hidden/disabled | Newor header responsive display |
| Sidebar 160×300 | \`lib/display-ads.js\` | Hidden/disabled | Newor in-content/sidebar native or display |
| Bottom 300×250 + separate Smartlink | \`lib/display-ads.js\` | Hidden/disabled | Newor footer responsive display (no Smartlink auto redirect) |
| User-click Adsterra Native Banner dialogue + continue/close destination | \`js/sponsored-click.js\`, \`worker.js\` | Hidden/disabled; genuine merchant href navigates normally | Direct merchant navigation; optionally Google-policy-compliant user-consented ad, never forced |
| Homepage opt-in Adsterra script and offer bar | \`index.html\` | Hidden/disabled | Only an approved Newor/GPT format; never transplant the old ad tag |
| Monetag vignette | \`lib/monetag-vignette.js\`, \`index.html\`, \`js/monetag-vignette.js\` | Hidden/disabled | Official Google Ad Manager web-interstitial format if supplied/approved |
| Potential video format | None under legacy third-party setup | Awaiting partner approval | Newor outstream/AI video on substantive product/guide content where offered and compliant |

\`data-newor-slot\` markers: \`top\`, \`in-content\`, \`sidebar\`, \`bottom\`, \`outstream-video\`. Web interstitial must be installed separately through Google Publisher Tags (GPT) if Newor explicitly authorizes it; it is not a regular hidden DOM box.

## Safely restore ALL previous advertising

1. Edit \`lib/ad-provider-switch.js\`, changing exactly \`export const AD_PROVIDER_MODE = "newor_pending";\` to \`export const AD_PROVIDER_MODE = "legacy";\`.
2. Merge and deploy with the existing GitHub/Cloudflare CI. The original \`worker.js\` functions, \`lib/display-ads.js\`, \`js/sponsored-click.js\`, \`index.html\` popup tags, and \`lib/monetag-vignette.js\` are still present.
3. Check the live homepage and a product page and ensure no unintended duplicate ad network loads.
4. The immutable archival branch above contains the exact pre-change setup for an emergency full rollback, including original page copy. To restore page copy exactly, use that archived version only for the affected ad-related files; do not blindly reset today's unrelated D1/SEO changes.
5. Only activate legacy mode if the Newor agreement allows it (Newor Elevate normally requires exclusivity).

## Steps the owner must complete to enable real Google demand

1. Apply for **Newor Elevate**: https://newormedia.com/programs and review https://newormedia.com/elevatefaqs. Newor says there is no minimum traffic, but it requires English content, manual policy review, a navigation bar, readiness to run at least two ad units per page, and a Google Ad Manager account. It requires exclusivity.
2. Open https://admanager.google.com/ and follow Newor's official MCM invitation process. Google/partner approval is a real review and not guaranteed; never bypass it.
3. Ask Newor for the exact site-specific header/GPT tag, 2+ ad unit codes, responsive formats, *authorized* \`ads.txt\` lines, EEA/UK consent requirements, final payout method, and written revenue-share/contract details. **No tags, IDs or seller lines should be invented.**
4. Request their **in-content display**, **outstream/AI video** (only if offered for Elevate and eligible inventory), and **Google GPT web interstitial** (only if approved and compliant) options. Do not place Google ads in Adsterra-style popunders or forced merchant-link redirects. AdX demand, CPM or video yield is not guaranteed.
5. After official approval, add a **new explicit \`newor_live\` mode**, not by changing the \`newor_pending\` branch to an unknown tag. Install only the official snippets in the prepared slots, test Google policies, validate \`ads.txt\`, verify load speed and separate affiliate conversions, then deploy.

## Validation

A production-safe Miniflare test audits root/static/editorial HTML for absence of all old network script tags, zero live popup controllers, and hidden future slots, while retaining original merchant destination links and canonical/structured-data markup. The exact vendor implementations remain in the archived source.
