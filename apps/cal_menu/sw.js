const cacheName = "recipe-calculator-v1.3";
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
self.addEventListener("install", async (event) => {
  try {
    const cache = await caches.open(cacheName);
    await cache.addAll(cacheUrls);
  } catch (error) {
    console.error("Service Worker installation failed:", error);
  }
});


self.addEventListener('fetch', (event) => {
  console.log("event 'fetch' google fonts");
  const requestUrl = new URL(event.request.url);

  // Check if the request is for Google Fonts
  if (requestUrl.origin === 'https://googleapis.com' || requestUrl.origin === 'https://gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((idempotentResponse) => {
          if (idempotentResponse) {
            // Fetch a fresh version in the background (Stale-While-Revalidate)
            fetch(event.request).then((freshResponse) => {
              if (freshResponse.status === 200 || freshResponse.status === 0) {
                cache.put(event.request, freshResponse);
              }
            });
            return idempotentResponse;
          }

          // If not in cache, fetch from network and cache it
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200 || networkResponse.status === 0) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
  }
});


// Fetching resources
self.addEventListener("fetch", (event) => {
  console.log("event 'fetch' PWA");

  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);

      try {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          console.log("cachedResponse: ", event.request.url);
          return cachedResponse;
        }

        const fetchResponse = await fetch(event.request);
        if (fetchResponse) {
          console.log("fetchResponse: ", event.request.url);
          await cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        }
      } catch (error) {
        console.log("Fetch failed: ", error);
        const cachedResponse = await cache.match("index.html");
        return cachedResponse;
      }
    })()
  );
});