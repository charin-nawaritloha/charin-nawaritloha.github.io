const cacheName = "recipe-calculator-v1.3.1"; // แก้เลขนี้ให้ตรงกับ version.json ทุกครั้งที่ปล่อยรุ่นใหม่
const cacheUrls = [
  'index.html',
  'app.css',
  'app.js',
  'manifest.json',
  'icon.png',
  'favicon.ico',
  'bg/carrot.png',
  'bg/home.png',
  'bg/food1.png',
  'bg/pot.png',
  'bg/icon.png'
];

const FONT_CACHE_NAME = 'google-fonts';

// Installing the Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(cacheName);
        await cache.addAll(cacheUrls);
        await self.skipWaiting(); // ติดตั้งทันทีโดยไม่รอ tab เก่าปิด
      } catch (error) {
        console.error("Service Worker installation failed:", error);
      }
    })()
  );
});

// ลบ cache รุ่นเก่าทิ้งตอน activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== cacheName && key !== FONT_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim(); // ควบคุม tab ที่เปิดอยู่ทันที
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin === 'https://googleapis.com' || requestUrl.origin === 'https://gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((idempotentResponse) => {
          if (idempotentResponse) {
            fetch(event.request).then((freshResponse) => {
              if (freshResponse.status === 200 || freshResponse.status === 0) {
                cache.put(event.request, freshResponse);
              }
            });
            return idempotentResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200 || networkResponse.status === 0) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // ไม่ cache version.json เด็ดขาด ให้ผ่านไป network ตรง
  if (requestUrl.pathname.endsWith('version.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);
      try {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        const fetchResponse = await fetch(event.request);
        if (fetchResponse) {
          await cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        }
      } catch (error) {
        const cachedResponse = await cache.match("index.html");
        return cachedResponse;
      }
    })()
  );
});