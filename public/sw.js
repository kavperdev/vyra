/* VYRA service worker: push notifications, a friendly offline screen, and cached brand assets. */
const CACHE = "vyra-v1";
const PRECACHE = ["/offline.html", "/branding/vyra-icon-192.png", "/branding/vyra-logo-white.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: always from the network (data must be fresh); offline screen when there is no connection.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // Build assets and brand images never change under the same URL: serve from cache after the first load.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/branding/") || url.pathname.startsWith("/site/")) {
    event.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok && res.type === "basic" && !url.pathname.endsWith(".mp4")) c.put(req, res.clone());
              return res;
            }),
        ),
      ),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "VYRA", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "VYRA";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/branding/vyra-icon-192.png",
      badge: "/branding/vyra-icon-192.png",
      data: { link: data.link || "/panel" },
      tag: data.tag || undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/panel";
  const url = new URL(link, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
