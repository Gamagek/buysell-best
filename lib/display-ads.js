// Codes verified in the approved buysell.best Adsterra website, adult ads OFF.
// Native dimensions and parser-inserted tags: no extra iframe, resizing,
// duplicate placement, refresh, retry, or synthetic ad interaction.
export const DISPLAY_AD_UNITS = Object.freeze({
  top: {key:"91208914dcc24988701a618a55adc6f0", width:320, height:50, placementId:31596640},
  sidebar: {key:"883fb46686c617aa6d5a15576ab25409", width:160, height:300, placementId:31596639},
  bottom: {key:"a43496cb06814274e5b21e6c0bbc0df5", width:300, height:250, placementId:31769684}
});
export const DISPLAY_AD_KEY = DISPLAY_AD_UNITS.top.key;
export const DISPLAY_AD_SCRIPT = `https://www.highrevenueformat.com/${DISPLAY_AD_KEY}/invoke.js`;
export const DISPLAY_AD_HEAD = '<link id="bsb-display-ad-style" rel="stylesheet" href="/css/display-ads.css?v=20261017-v2">';
const SMARTLINK = "https://www.profitableratecpmnetwork.com/nugmu8qikp?key=9245fcfc15bbb0d5bb9c7bec0ec186c4";

export function renderDisplayAd(position="top") {
  const unit = DISPLAY_AD_UNITS[position];
  const id = position === "top" ? "bsb-display-ad" : `bsb-display-ad-${position}`;
  const extra = position === "bottom" ? `<a class="display-ad-offer" href="${SMARTLINK}" target="_blank" rel="sponsored nofollow noopener noreferrer" data-sponsored-bypass>Explore a sponsored offer ↗</a>` : "";
  return `<aside id="${id}" class="display-ad display-ad--${position}" aria-label="Advertisement"><span class="display-ad-label">Advertisement</span><div class="display-ad-slot" style="width:${unit.width}px;height:${unit.height}px"><script>atOptions = { 'key': '${unit.key}', 'format': 'iframe', 'height': ${unit.height}, 'width': ${unit.width}, 'params': {} };</script><script src="https://www.highrevenueformat.com/${unit.key}/invoke.js"></script></div>${extra}</aside>`;
}

export function withDisplayAdvertising(request, response) {
  const path = new URL(request.url).pathname;
  if (request.method !== "GET" || response.status !== 200 || !response.headers.get("content-type")?.includes("text/html") || /^\/404(?:\.html)?\/?$/.test(path)) return response;
  let inserted = false, secondaryInserted = false, bottomInserted = false;
  const headers = new Headers(response.headers);
  for (const name of ["content-length", "etag", "content-md5", "digest"]) headers.delete(name);
  const rewriter = new HTMLRewriter()
    .on("head", {element(element) {element.append(DISPLAY_AD_HEAD, {html:true});}})
    .on("header.site-header", {element(element) {
      if (inserted) return;
      inserted = true;
      element.after(renderDisplayAd(), {html:true});
    }})
    .on("main", {element(element) {
      if (inserted) return;
      inserted = true;
      element.prepend(renderDisplayAd(), {html:true});
    }})
    .on(".shopping-toc", {element(element) {
      if (secondaryInserted) return;
      secondaryInserted = true;
      element.setAttribute("class", element.getAttribute("class") + " shopping-toc-with-ad");
      element.append(renderDisplayAd("sidebar"), {html:true});
    }})
    .on("footer.site-footer", {element(element) {
      if (bottomInserted) return;
      bottomInserted = true;
      element.before(renderDisplayAd("bottom"), {html:true});
    }});
  for (const selector of [".shopping-principles", ".shopping-priorities", ".shopping-detail-hero", ".product-hero", ".product-index .shopping-product-index", ".current-listings-section", ".travel-panel"]) {
    rewriter.on(selector, {element(element) {
      if (secondaryInserted) return;
      secondaryInserted = true;
      element.after(renderDisplayAd("sidebar"), {html:true});
    }});
  }
  return rewriter.transform(new Response(response.body, {status:response.status, statusText:response.statusText, headers}));
}
