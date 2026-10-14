(function () {
  "use strict";
  if (window.BuySellSponsoredClicks) return;
  const SMARTLINK = "https://www.profitableratecpmnetwork.com/nugmu8qikp?key=9245fcfc15bbb0d5bb9c7bec0ec186c4";
  const SESSION_KEY = "bsb_sponsor_attempted_v2";
  const AFFILIATE_HOSTS = ["rzekl.com", "admitad.com", "ad.admitad.com", "admitad.link", "aliexpress.com", "s.click.aliexpress.com"];
  let active = null, attempted = false;

  function destinationFor(link) {
    if (!link || link.hasAttribute("data-sponsored-bypass") || link.hasAttribute("download")) return null;
    let url;
    try { url = new URL(link.href, location.href); } catch (_) { return null; }
    if (!/^https?:$/.test(url.protocol) || url.href === SMARTLINK) return null;
    const explicit = link.hasAttribute("data-sponsored-navigation") || link.rel.split(/\s+/).includes("sponsored");
    if (url.origin === location.origin) return explicit || /^\/products\/[^/]+\/?$/.test(url.pathname) ? url.href : null;
    const affiliate = AFFILIATE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith("." + host));
    return explicit || affiliate ? url.href : null;
  }

  function hasAttempted() {
    if (attempted) return true;
    try { return window.sessionStorage.getItem(SESSION_KEY) === "1"; }
    catch (_) { return false; }
  }
  function markAttempted() {
    attempted = true;
    try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch (_) {}
  }
  function destinationLabel(destination) {
    const url = new URL(destination);
    if (url.origin === location.origin) return "product";
    if (url.hostname === "rzekl.com") {
      try {
        const merchant = new URL(url.searchParams.get("ulp"));
        if (merchant.hostname === "aliexpress.com" || merchant.hostname.endsWith(".aliexpress.com")) return "AliExpress";
      } catch (_) {}
    }
    if (url.hostname === "aliexpress.com" || url.hostname.endsWith(".aliexpress.com")) return "AliExpress";
    return url.hostname;
  }

  function finish(continueToDestination) {
    if (!active) return;
    const current = active;
    active = null;
    // Destroy the advertiser's browsing context before navigating. Its scripts,
    // child history and redirects cannot remain in a separate foreground tab.
    current.frame.remove();
    if (current.dialog.open && current.dialog.close) current.dialog.close();
    current.dialog.remove();
    document.body.style.overflow = current.oldOverflow;
    if (continueToDestination) location.assign(current.destination);
    else current.trigger.focus();
  }

  function openSponsoredStep(link, destination) {
    const label = destinationLabel(destination);
    const dialog = document.createElement("dialog");
    dialog.className = "sponsored-step";
    dialog.setAttribute("aria-labelledby", "sponsored-step-title");
    dialog.setAttribute("aria-describedby", "sponsored-step-message");
    dialog.innerHTML = '<header class="sponsored-step-header"><div><span class="sponsored-step-label">ADVERTISEMENT · ADSTERRA</span><h2 id="sponsored-step-title">One sponsored message</h2></div><button class="sponsored-step-close" type="button">×</button></header><div class="sponsored-step-viewport"></div><footer class="sponsored-step-footer"><p id="sponsored-step-message">Your product button stays here while the ad loads. You can continue at any time.</p><a class="sponsored-step-continue" data-sponsored-bypass rel="sponsored noopener noreferrer"></a><button class="sponsored-step-stay" type="button">Close ad and stay here</button><small class="sponsored-step-help">Can’t see the ad? Continue directly to your product. This message is shown once per browsing session.</small></footer>';
    const frame = document.createElement("iframe");
    frame.className = "sponsored-step-frame";
    frame.title = "Adsterra sponsored content";
    frame.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin");
    frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    // No allow-top-navigation, allow-popups or external-app escape permissions:
    // advertiser redirects are confined to this visible frame, below our ×.
    dialog.querySelector(".sponsored-step-viewport").appendChild(frame);
    const destinationLink = dialog.querySelector(".sponsored-step-continue");
    destinationLink.href = destination;
    destinationLink.textContent = "Continue to " + label + " →";
    const close = dialog.querySelector(".sponsored-step-close");
    close.setAttribute("aria-label", "Close advertisement and continue to " + label);
    const oldOverflow = document.body.style.overflow;
    document.body.appendChild(dialog);
    document.body.style.overflow = "hidden";
    active = {destination, dialog, frame, trigger:link, oldOverflow};
    destinationLink.addEventListener("click", event => {event.preventDefault(); finish(true);});
    close.addEventListener("click", () => finish(true));
    dialog.querySelector(".sponsored-step-stay").addEventListener("click", () => finish(false));
    // Escape / native mobile Back dismiss the ad instead of starting a redirect.
    dialog.addEventListener("cancel", event => {event.preventDefault(); finish(false);});
    dialog.addEventListener("close", () => {if (active?.dialog === dialog) finish(false);});
    dialog.addEventListener("keydown", event => {
      if (event.key === "Escape") {event.preventDefault(); finish(false); return;}
      if (event.key !== "Tab") return;
      const controls = [...dialog.querySelectorAll("button,a[href],iframe")];
      if (event.shiftKey && document.activeElement === controls[0]) {event.preventDefault(); controls.at(-1).focus();}
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) {event.preventDefault(); controls[0].focus();}
    });
    frame.addEventListener("error", () => {
      if (active?.frame === frame) dialog.querySelector("#sponsored-step-message").textContent = "The sponsored page could not be displayed. Continue to your product below.";
    });
    try {if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");}
    catch (_) {dialog.setAttribute("open", "");}
    destinationLink.focus();
    // One real visitor activation, one visible request. An iframe load event
    // does not prove an ad impression or a payable click; Adsterra decides that.
    markAttempted();
    frame.src = SMARTLINK;
  }

  document.addEventListener("click", event => {
    if (!event.isTrusted || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const link = event.target.closest?.("a[href]");
    const destination = destinationFor(link);
    if (!destination) return;
    if (active) {event.preventDefault(); return;}
    if (hasAttempted()) return; // Following product/Buy clicks use their real href.
    event.preventDefault();
    openSponsoredStep(link, destination);
  });
  window.addEventListener("popstate", () => finish(false));
  window.addEventListener("pagehide", () => finish(false));
  window.addEventListener("pageshow", event => {if (event.persisted) finish(false);});
  window.BuySellSponsoredClicks = Object.freeze({destinationFor, enabled:true, version:2});
})();
