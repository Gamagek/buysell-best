# BuySell.Best advertising configuration — 17 October 2026

Verified in the signed-in Adsterra publisher UI. Website `buysell.best` is
approved. The website's adult-ad switch is OFF. The existing Smartlink is
Active, Mainstream, with adult ads OFF. No adult option was enabled.

| Placement | Provider ID | Native size / layout | Location |
| --- | --- | --- | --- |
| `320x50_1` | 31596640 | 320 × 50 | After the site header |
| `160x300_1` | 31596639 | 160 × 300 | Guide sidebar or a gap between substantive sections |
| `300x250_1` | 31769684 | 300 × 250 | Before the site footer |
| `NativeBanner_1` | 31769683 | 1:1, one native card | Visible shopping dialog after intentional navigation |
| `Smartlink_1` | 31725217 | Direct URL | Explicit sponsor links in the dialog and below the bottom banner |

The 300×250 and Native Banner placements were created in this change and
confirmed Active. The native layout was saved as 1:1. Existing Social Bar and
Popunder account units are not installed by this change. Their display frequency
requires provider assistance; default page-load overlays would conflict with the
requested unobtrusive experience.

## Placement and navigation

- Rich guides, product pages, travel pages and the homepage have top, secondary
  and bottom display units. Shorter information/form pages have top and bottom.
- The narrow guide rail uses a genuine 160×300 creative; on small screens it
  becomes an ordinary block below the guide navigation. No ad is scaled, clipped,
  fixed over content or refreshed to manufacture impressions.
- The popup uses the Native Banner's official asynchronous script and container
  directly in the page body. It does not frame a Smartlink, landing page or tag.
  Adsterra selects the available creative; this is not an autoplay video format.
- The native script is requested only after an intentional shopping/travel click
  opens the visible dialog. It is requested at most once per page. Repeated
  prompts are limited to one per ten minutes using session storage; if storage
  is blocked, the per-page limit still applies.
- Continue and × immediately use the original affiliate/provider URL. Stay and
  Escape dismiss the popup. Loading failures never disable destination controls.
  No waiting or interaction with an ad is required.
- Smartlink uses an explicit native anchor. It opens a new tab when selected;
  a same-tab link is available if the browser blocks the new tab. Ad clicks are
  not intercepted as shopping navigation.
- API, image, script, sitemap, redirect and error responses do not receive ads.
- Provider tag calls are not an accepted-impression metric. No synthetic ad
  clicks, reload loops or ad-network calls occur in automated tests.

## Provider references

- [Adsterra format selection](https://help-publishers.adsterra.com/en/articles/5210727-selecting-the-right-ad-unit)
  explains fixed display sizes and responsive Native Banners.
- [Static HTML installation](https://help-publishers.adsterra.com/en/articles/5210780-adding-ads-to-a-static-html-site)
  allows Native Banner code in the page body and cautions against duplicating
  the same native code on one page.
- [Publisher terms, sections 4.7 and 6](https://adsterra.com/publishers-terms-managed/)
  restrict changing tags, placing them into custom iframes without written
  consent, framing click-through destinations and artificial traffic.
- [Smartlink guide](https://adsterra.com/blog/guide-for-working-with-direct-links/)
  describes it as a URL leading to an advertiser offer, without a visual format.

Ads can be blocked, unfilled or filtered according to geography and provider
traffic checks. An age prompt on a third-party offer is not evidence that an
adult-content setting is enabled. The switches above are the verified account
settings; advertiser creative approval remains with Adsterra.
