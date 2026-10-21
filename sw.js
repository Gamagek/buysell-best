// Notifications and installation do not require persistent page/image Cache Storage.
// Legacy broad network-first caching stored every successful GET in the user's
// browser, including full HTML and thumbnails. Public content now uses Cloudflare
// edge caching instead, while normal browser HTTP caching remains browser-managed.
self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("buysell-best-shell-"))
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// No fetch event interception: use regular network requests, the Cloudflare edge,
// and browser-managed HTTP cache. Never persist personalised/ad responses locally.

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