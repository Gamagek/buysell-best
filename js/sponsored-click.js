(function () {
  "use strict";
  if (window.BuySellSponsoredClicks) return;
  const SMARTLINK = "https://www.profitableratecpmnetwork.com/nugmu8qikp?key=9245fcfc15bbb0d5bb9c7bec0ec186c4";
  const AFFILIATE_HOSTS = ["rzekl.com", "admitad.com", "ad.admitad.com", "admitad.link", "aliexpress.com", "s.click.aliexpress.com"];
  let active = null;

  function destinationFor(link) {
    if (!link || link.hasAttribute("data-sponsored-bypass") || link.hasAttribute("download")) return null;
    let url;
    try { url = new URL(link.href, location.href); } catch (_) { return null; }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.href === SMARTLINK) return null;
    if (url.origin === location.origin) {
      // Only the two explicitly marked travel entry pages use a sponsored step.
      // Forms, product galleries, ordinary internal reading and API links do not.
      return link.getAttribute("data-sponsored-navigation") === "internal" && ["/hotels/","/promo-codes/"].includes(url.pathname) ? url.href : null;
    }
    const explicit = link.hasAttribute("data-sponsored-navigation") || link.rel.split(/\s+/).includes("sponsored");
    return explicit || AFFILIATE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith("." + host)) ? url.href : null;
  }
  function destinationLabel(destination) {
    const url = new URL(destination);
    if (url.origin === location.origin) return url.pathname === "/hotels/" ? "hotel comparison" : "promo-code sources";
    let merchant = url;
    if (url.hostname === "rzekl.com") {
      try { merchant = new URL(url.searchParams.get("ulp")); } catch (_) {}
    }
    return merchant.hostname === "aliexpress.com" || merchant.hostname.endsWith(".aliexpress.com") ? "AliExpress" : merchant.hostname;
  }
  function finish(continueToDestination) {
    if (!active) return;
    const current = active;
    active = null;
    if (current.dialog.open && current.dialog.close) current.dialog.close();
    current.overlay.remove();
    document.body.style.overflow = current.oldOverflow;
    if (continueToDestination) location.assign(current.destination);
    else if (current.trigger.isConnected) current.trigger.focus();
  }
  function openSponsoredStep(link, destination) {
    const label = destinationLabel(destination);
    const overlay = document.createElement("div");
    overlay.className = "sponsored-step-backdrop";
    const dialog = document.createElement("dialog");
    dialog.className = "sponsored-step";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "sponsored-step-title");
    dialog.setAttribute("aria-describedby", "sponsored-step-message");
    dialog.innerHTML = '<header class="sponsored-step-header"><div><span class="sponsored-step-label">ADVERTISEMENT · ADSTERRA</span><h2 id="sponsored-step-title">Optional sponsored offer</h2></div><button class="sponsored-step-close" type="button">×</button></header><div class="sponsored-step-offer"><p>Choose to view an Adsterra sponsored offer, or continue straight to your destination.</p><a class="sponsored-step-ad" target="_blank" data-sponsored-bypass rel="sponsored nofollow noopener noreferrer">Open sponsored offer in a new tab ↗</a><a class="sponsored-step-ad-fallback" data-sponsored-bypass rel="sponsored nofollow noopener noreferrer">New tab blocked? Open the offer in this tab ↗</a></div><footer class="sponsored-step-footer"><p id="sponsored-step-message">The advertisement is separate from the merchant or destination page. You never need to open or click an ad to continue.</p><a class="sponsored-step-continue" data-sponsored-bypass rel="sponsored nofollow noopener noreferrer"></a><button class="sponsored-step-stay" type="button">Close ad and stay here</button><small class="sponsored-step-help">Use Continue or × at any time; no waiting is required.</small></footer>';
    // Smartlink is a real user-selected link, not a framed landing page.
    // Vendor banner tags are rendered once on the page by the Worker.
    dialog.querySelector(".sponsored-step-ad").href = SMARTLINK;
    dialog.querySelector(".sponsored-step-ad-fallback").href = SMARTLINK;
    const destinationLink = dialog.querySelector(".sponsored-step-continue");
    destinationLink.href = destination;
    destinationLink.textContent = "Continue to " + label + " →";
    const close = dialog.querySelector(".sponsored-step-close");
    close.setAttribute("aria-label", "Close advertisement and continue to " + label);
    const oldOverflow = document.body.style.overflow;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    active = {destination, dialog, overlay, trigger:link, oldOverflow};
    document.body.style.overflow = "hidden";
    destinationLink.addEventListener("click", event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      event.preventDefault(); finish(true);
    });
    close.addEventListener("click", () => finish(true));
    dialog.querySelector(".sponsored-step-stay").addEventListener("click", () => finish(false));
    dialog.addEventListener("cancel", event => {event.preventDefault(); finish(false);});
    dialog.addEventListener("close", () => {if (active && active.dialog === dialog) finish(false);});
    dialog.addEventListener("keydown", event => {
      if (event.key === "Escape") {event.preventDefault(); finish(false); return;}
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.querySelectorAll("button,a[href]"));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    });
    try {if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");}
    catch (_) {dialog.setAttribute("open", "");}
    destinationLink.focus();
  }
  document.addEventListener("click", event => {
    if (!event.isTrusted || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const target = event.target;
    const link = target && target.closest ? target.closest("a[href]") : null;
    const destination = destinationFor(link);
    if (!destination) return;
    if (active) {event.preventDefault(); return;}
    event.preventDefault();
    try {openSponsoredStep(link, destination);} catch (_) {finish(false); location.assign(destination);}
  });
  window.addEventListener("popstate", () => finish(false));
  window.addEventListener("pagehide", () => finish(false));
  window.addEventListener("pageshow", event => {if (event.persisted) finish(false);});
  window.BuySellSponsoredClicks = Object.freeze({destinationFor, enabled:true, version:6});
})();
