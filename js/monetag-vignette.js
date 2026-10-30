/* BuySell.Best — one carefully limited Monetag vignette opportunity per 24h.
 * The vendor supplies its own creative, so we cannot guarantee what it shows.
 * Never force clicks, reload ads, trap navigation, or load during Adsterra dialogs.
 */
(function () {
  "use strict";
  if (window.BuySellVignette) return;

  const ZONE = "12151474";
  const VENDOR = "https://n6wxm.com/vignette.min.js";
  const LAST_SHOWN_KEY = "bsb-monetag-vignette-at-v1";
  const ADSTERRA_PROMPT_KEY = "bsb-sponsored-prompt-at-v7";
  const COOLDOWN_MS = 24 * 60 * 60 * 1000;
  const ADSTERRA_GAP_MS = 10 * 60 * 1000;
  const MIN_STAY_MS = 45 * 1000;
  const MIN_SCROLL_PX = 180;
  const startedAt = Date.now();
  let loaded = false;
  let disposed = false;
  let scrollEngaged = false;

  function readStamp(storage, key) {
    try {
      const value = storage.getItem(key);
      if (value === null) return 0;
      const time = Number(value);
      return Number.isFinite(time) && time > 0 ? time : 0;
    } catch (_) {
      return -1;
    }
  }

  function available() {
    // If storage is blocked, fail closed instead of repeatedly interrupting
    // this visitor on every page. Respect privacy/browser preferences.
    if (!window.localStorage || !window.sessionStorage) return false;
    const last = readStamp(window.localStorage, LAST_SHOWN_KEY);
    if (last < 0) return false;
    const now = Date.now();
    if (last && (now < last || now - last < COOLDOWN_MS)) return false;
    const adsterra = readStamp(window.sessionStorage, ADSTERRA_PROMPT_KEY);
    if (adsterra < 0 || (adsterra && (now < adsterra || now - adsterra < ADSTERRA_GAP_MS))) return false;
    try {
      if (navigator.globalPrivacyControl === true ||
          navigator.doNotTrack === "1" ||
          navigator.connection?.saveData === true) return false;
    } catch (_) {}
    return true;
  }

  function noInterruption() {
    if (document.visibilityState !== "visible" || !document.hasFocus()) return false;
    if (document.querySelector('dialog[open], .sponsored-step-backdrop, [aria-modal="true"]')) return false;
    const active = document.activeElement;
    if (active && active.closest && active.closest('input, textarea, select, form, [contenteditable="true"]')) return false;
    return true;
  }

  function removeListeners() {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("focus", maybeLoad);
    document.removeEventListener("visibilitychange", maybeLoad);
  }

  function maybeLoad() {
    if (loaded || disposed || !scrollEngaged) return;
    if (Date.now() - startedAt < MIN_STAY_MS || !noInterruption() || !available()) return;

    // Reserve the 24h cap before requesting the vendor. Across tabs this also
    // reduces repeated vignette exposures; no user data is stored.
    try {
      window.localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
      // Adsterra's separate, existing click popup already respects this stamp.
      window.sessionStorage.setItem(ADSTERRA_PROMPT_KEY, String(Date.now()));
    } catch (_) { return; }

    loaded = true;
    removeListeners();
    const target = document.body || document.documentElement;
    if (!target) return;
    const script = document.createElement("script");
    script.dataset.zone = ZONE;
    script.src = VENDOR;
    script.async = true;
    script.referrerPolicy = "strict-origin-when-cross-origin";
    target.appendChild(script);
  }

  function onScroll() {
    if (window.scrollY >= MIN_SCROLL_PX ||
        document.documentElement.scrollTop >= MIN_SCROLL_PX) {
      scrollEngaged = true;
      maybeLoad();
    }
  }

  // A session only gets an opportunity after deliberate browsing and 45s.
  // Merely opening a product page does not trigger an overlay.
  window.BuySellVignette = Object.freeze({enabled:true, zone:ZONE, cooldownHours:24});
  window.addEventListener("scroll", onScroll, {passive:true});
  window.addEventListener("focus", maybeLoad);
  document.addEventListener("visibilitychange", maybeLoad);
  window.addEventListener("pagehide", () => { disposed=true; removeListeners(); }, {once:true});
  window.setTimeout(maybeLoad, MIN_STAY_MS);
  onScroll();
})();
