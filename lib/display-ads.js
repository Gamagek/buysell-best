// Existing 320x50 Adsterra unit supplied for BuySell.Best. Keep its native
// dimensions and parser-inserted vendor tag; no custom frame, refresh or retry.
export const DISPLAY_AD_KEY = "91208914dcc24988701a618a55adc6f0";
export const DISPLAY_AD_SCRIPT = `https://www.highrevenueformat.com/${DISPLAY_AD_KEY}/invoke.js`;
export const DISPLAY_AD_HEAD = '<link id="bsb-display-ad-style" rel="stylesheet" href="/css/display-ads.css?v=20261016-v1">';

export function renderDisplayAd() {
  return `<aside id="bsb-display-ad" class="display-ad" aria-label="Advertisement"><span class="display-ad-label">Advertisement</span><div class="display-ad-slot"><script>atOptions = { 'key': '${DISPLAY_AD_KEY}', 'format': 'iframe', 'height': 50, 'width': 320, 'params': {} };</script><script src="${DISPLAY_AD_SCRIPT}"></script></div></aside>`;
}

export function withDisplayAdvertising(request, response) {
  const path = new URL(request.url).pathname;
  if (request.method !== "GET" || response.status !== 200 || !response.headers.get("content-type")?.includes("text/html") || /^\/404(?:\.html)?\/?$/.test(path)) return response;
  let inserted = false;
  const headers = new Headers(response.headers);
  for (const name of ["content-length", "etag", "content-md5", "digest"]) headers.delete(name);
  return new HTMLRewriter()
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
    .transform(new Response(response.body, {status:response.status, statusText:response.statusText, headers}));
}
