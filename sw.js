const CACHE_NAME = "musyrif-app-v10";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./output.css",
  "./config.js",
  "./app-core.js",
  "./tab-manager.js",
  "./auth-manager.js",
  "./date-manager.js",
  "./activity-logger.js",
  "./notification-manager.js",
  "./dashboard-manager.js",
  "./attendance-manager.js",
  "./permit-manager.js",
  "./analysis-manager.js",
  "./export-manager.js",
  "./script.js",
  "./data-santri.js",
  "./data-kelas.js",
  "./manifest.json",
];

// 1. Install Service Worker & Cache File
self.addEventListener("install", (event) => {
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
    }),
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
