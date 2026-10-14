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
    if (!/^https?:$/.test(url.protocol) || url.href === SMARTLINK) return null;
    const explicit = link.hasAttribute("data-sponsored-navigation") || link.rel.split(/\s+/).includes("sponsored");
    if (url.origin === location.origin) return explicit || /^\/products\/[^/]+\/?$/.test(url.pathname) ? url.href : null;
    const affiliate = AFFILIATE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith("." + host));
    return explicit || affiliate ? url.href : null;
  }

  function finish(continueToDestination) {
    if (!active) return;
    const current = active;
    active = null;
    clearInterval(current.timer);
    try { if (current.popup && !current.popup.closed) current.popup.close(); } catch (_) {}
    if (current.dialog.open && current.dialog.close) current.dialog.close();
    current.dialog.remove();
    document.body.style.overflow = current.oldOverflow;
    if (continueToDestination) location.assign(current.destination);
    else current.trigger.focus();
  }

  function openSponsoredStep(link, destination) {
    // Open synchronously inside the visitor's click. No load-time ads, hidden
    // clicks, blocker workarounds or retry loops. Sever the advertiser's opener.
    let popup = null;
    try {
      popup = window.open("about:blank", "_blank", "popup=yes,width=960,height=720,resizable=yes,scrollbars=yes");
      if (popup) { popup.opener = null; popup.location.replace(SMARTLINK); }
    } catch (_) {
      try { popup?.close(); } catch (_) {}
      popup = null;
    }
    const dialog = document.createElement("dialog");
    dialog.className = "sponsored-step";
    dialog.setAttribute("aria-labelledby", "sponsored-step-title");
    dialog.setAttribute("aria-describedby", "sponsored-step-message");
    dialog.innerHTML = '<button class="sponsored-step-close" type="button" aria-label="Close advertisement and continue">×</button><span class="sponsored-step-label">ADVERTISEMENT</span><div class="sponsored-step-icon" aria-hidden="true">↗</div><h2 id="sponsored-step-title">A quick sponsored message</h2><p id="sponsored-step-message"></p><p class="sponsored-step-destination"></p><button class="sponsored-step-continue" type="button">Continue to destination →</button><a class="sponsored-step-ad" target="_blank" rel="sponsored noopener noreferrer" data-sponsored-bypass>Open sponsored link ↗</a><label class="sponsored-step-auto"><input type="checkbox" checked> <span>Continue automatically in <b data-sponsored-seconds>6</b>s</span></label><button class="sponsored-step-stay" type="button">Stay on this page</button>';
    dialog.querySelector("#sponsored-step-message").textContent = popup
      ? "The sponsor opened in a separate window. Close that window, use ×, or continue whenever you are ready."
      : "Your browser blocked the ad window. You can continue directly, or open the sponsored link yourself.";
    dialog.querySelector(".sponsored-step-destination").textContent = "Next: " + (new URL(destination).origin === location.origin ? "BuySell.Best product page" : new URL(destination).hostname);
    dialog.querySelector(".sponsored-step-ad").href = SMARTLINK;
    const oldOverflow = document.body.style.overflow;
    document.body.appendChild(dialog);
    document.body.style.overflow = "hidden";
    active = {destination, popup, dialog, trigger:link, oldOverflow, timer:null};
    const continueButton = dialog.querySelector(".sponsored-step-continue");
    continueButton.addEventListener("click", () => finish(true));
    dialog.querySelector(".sponsored-step-close").addEventListener("click", () => finish(true));
    dialog.querySelector(".sponsored-step-stay").addEventListener("click", () => finish(false));
    dialog.addEventListener("cancel", event => { event.preventDefault(); finish(true); });
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) finish(true);
    });
    dialog.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.preventDefault(); finish(true); return; }
      if (event.key !== "Tab") return;
      const controls = [...dialog.querySelectorAll("button,a[href],input")];
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    });
    try { if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", ""); }
    catch (_) { dialog.setAttribute("open", ""); }
    continueButton.focus();
    const auto = dialog.querySelector("input");
    const seconds = dialog.querySelector("[data-sponsored-seconds]");
    let remaining = 6000, previous = Date.now();
    active.timer = setInterval(() => {
      if (!active) return;
      const now = Date.now();
      if (auto.checked) remaining -= Math.max(0, now - previous);
      previous = now;
      seconds.textContent = String(Math.max(0, Math.ceil(remaining / 1000)));
      let closed = false;
      try { closed = !!popup && popup.closed; } catch (_) {}
      if (closed || (auto.checked && remaining <= 0)) finish(true);
    }, 250);
  }

  document.addEventListener("click", event => {
    if (!event.isTrusted || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const link = event.target.closest?.("a[href]");
    const destination = destinationFor(link);
    if (!destination) return;
    event.preventDefault();
    if (!active) openSponsoredStep(link, destination);
  });
  window.addEventListener("pagehide", () => {
    if (!active) return;
    clearInterval(active.timer);
    try { active.popup?.close(); } catch (_) {}
  });
  window.BuySellSponsoredClicks = Object.freeze({destinationFor, enabled:true});
})();
