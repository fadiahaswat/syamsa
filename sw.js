const CACHE_NAME = "musyrif-app-v215-restructured";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./output.css",
  "./config/config.js",
  "./core/app-core.js",
  "./core/script.js",
  "./features/qibla.js",
  "./assets/icon.svg",
  "./assets/icon.webp",
  "./assets/icon.png",
  "./assets/splash.webp",
  "./assets/login.webp",
  "./managers/santri-manager.js",
  "./data/data-santri.js",
  "./data/data-kelas.js",
  "./manifest.json",
];

// 1. Install Service Worker & Cache File
self.addEventListener("install", (event) => {
  self.skipWaiting(); // FORCE ACTIVATE IMMEDIATELY
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
});

// 2. Activate & Hapus Cache Lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      );
    }).then(() => {
      return self.clients.claim(); // TAKE CONTROL IMMEDIATELY
    })
  );
});

// 3. Fetch Strategy: Cache First, then Network
self.addEventListener("fetch", (event) => {
  // Cek apakah request menuju ke file eksternal (http/https)
  if (event.request.url.startsWith("http")) {
    // Gunakan strategi Network First untuk file eksternal agar tidak error CORS
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      }),
    );
  } else {
    // Untuk file lokal, gunakan Cache First (sesuai kode lama)
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      }),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) return client.navigate(targetUrl);
          return client;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return null;
    }),
  );
});
