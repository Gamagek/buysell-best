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
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.href === SMARTLINK || url.origin === location.origin) return null;
    const explicit = link.hasAttribute("data-sponsored-navigation") || link.rel.split(/\s+/).includes("sponsored");
    return explicit || AFFILIATE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith("." + host)) ? url.href : null;
  }
  function destinationLabel(destination) {
    const url = new URL(destination);
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
    dialog.innerHTML = '<header class="sponsored-step-header"><div><span class="sponsored-step-label">OPTIONAL ADVERTISEMENT</span><h2 id="sponsored-step-title">Continue to your selected shop</h2></div><button class="sponsored-step-close" type="button">×</button></header><div class="sponsored-step-content"><p id="sponsored-step-message">You can go straight to the shop, or choose to preview a separate Adsterra sponsored offer. The advertisement is not the merchant and is not required to shop.</p><a class="sponsored-step-sponsor" data-sponsored-bypass target="_blank" rel="sponsored nofollow noopener noreferrer">Preview sponsored offer in a new tab ↗</a><p class="sponsored-step-help sponsored-step-status" role="status" aria-live="polite">Close the sponsor tab to return here. Then use Continue or × to visit your selected shop.</p><p class="sponsored-step-help">New tab blocked? <a class="sponsored-step-same-tab" data-sponsored-bypass rel="sponsored nofollow noopener noreferrer">Open the sponsored offer in this tab</a>, then use Back to return. You can always skip it.</p></div><footer class="sponsored-step-footer"><a class="sponsored-step-continue" data-sponsored-bypass rel="sponsored nofollow noopener noreferrer"></a><button class="sponsored-step-stay" type="button">Cancel · stay on this page</button><small class="sponsored-step-help">The sponsor choice is available on every shopping button. No waiting or advertisement visit is required.</small></footer>';
    // An explicit sponsor-link click is required. Never frame, prefetch,
    // auto-open or simulate a click on a monetized destination.
    dialog.querySelector(".sponsored-step-sponsor").href = SMARTLINK;
    dialog.querySelector(".sponsored-step-same-tab").href = SMARTLINK;
    const destinationLink = dialog.querySelector(".sponsored-step-continue");
    destinationLink.href = destination;
    destinationLink.textContent = "Continue to " + label + " · skip / close sponsor →";
    const close = dialog.querySelector(".sponsored-step-close");
    close.setAttribute("aria-label", "Skip sponsor and continue to " + label);
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
  window.BuySellSponsoredClicks = Object.freeze({destinationFor, enabled:true, version:4});
})();
