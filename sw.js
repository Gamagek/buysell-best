const CACHE_NAME = "buysell-best-shell-v1";
const SHELL = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/data/global-deals.js",
  "/data/market-timeline.js",
  "/site-tools.js",
  "/manifest.webmanifest",
  "/icons/buysell-192.svg",
  "/icons/buysell-512.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match("/index.html")))
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "BuySell.Best", {
      body: data.body || "There is a new update on BuySell.Best.",
      icon: data.icon || "/icons/buysell-192.svg",
      badge: data.badge || "/icons/buysell-192.svg",
      tag: data.tag || "buysell-best",
      renotify: true,
      requireInteraction: !!data.requireInteraction,
      timestamp: Date.now(),
      data: { url: data.url || "/" },
      actions: Array.isArray(data.actions) ? data.actions.slice(0,2) : []
    })
  );
});