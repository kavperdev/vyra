/* VYRA service worker: shows push notifications and opens the right screen on tap. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
