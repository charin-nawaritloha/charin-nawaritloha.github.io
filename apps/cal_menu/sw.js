const CACHE_PREFIX = 'recipe-calculator-v'; // เวลาใช้ดู application cache จะต่อด้วยเลข version เช่น recipe-calculator-v1.2.3
const FONT_CACHE_NAME = 'google-fonts'; // สำหรับ cache fonts ของ Google ที่โหลดมา

let activeAppVersion = null; // version ของ cache ที่ใช้งานอยู่ปัจจุบัน ถูก set ตอน install/activate


// อ่าน version จาก cache ที่มีอยู่ในระบบ (ถ้ามีหลาย cache ให้เลือกตัวล่าสุดตามชื่อ)
async function detectCurrentVersionFromCaches() {
  const keys = await caches.keys();
  const versionCaches = keys.filter((k) => k.startsWith(CACHE_PREFIX));
  if (versionCaches.length === 0) return null;
  // เรียงตาม semantic version จากมากไปน้อย
  versionCaches.sort((a, b) => {
    const va = a.replace(CACHE_PREFIX, '').split('.').map(Number);
    const vb = b.replace(CACHE_PREFIX, '').split('.').map(Number);
    for (let i = 0; i < Math.max(va.length, vb.length); i++) {
      const x = va[i] || 0, y = vb[i] || 0;
      if (x !== y) return y - x;
    }
    return 0;
  });
  return versionCaches[0].replace(CACHE_PREFIX, '');
}


// ติดตั้งครั้งแรก: fetch version.json เอง เพื่อรู้ว่าต้องโหลด cache_X.X.X.json ตัวไหน
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const versionResponse = await fetch('update/version.json', { cache: 'no-store' });
        const versionData = await versionResponse.json();
        await loadCacheForVersion(versionData.version);
      } catch (error) {
        console.error("Service Worker installation failed:", error);
      }
    })()
  );
});


self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      activeAppVersion = await detectCurrentVersionFromCaches();
      await self.clients.claim();
    })()
  );
});


// โหลดรายชื่อไฟล์จาก cache_X.X.X.json แล้วเปิด cache ใหม่ตามรายชื่อนั้น พร้อมลบ cache เก่า
async function loadCacheForVersion(version) {
  const manifestResponse = await fetch(`update/cache_${version}.json`); // ไม่ต้อง no-store เพราะ URL ผูกกับ version อยู่แล้ว
  if (!manifestResponse.ok) {
    throw new Error(`ไม่พบไฟล์ cache_${version}.json`);
  }
  const manifest = await manifestResponse.json();
  const newCacheName = CACHE_PREFIX + version;

  const cache = await caches.open(newCacheName);
  await cache.addAll(manifest.files);

  // ลบ cache เวอร์ชันเก่าทิ้ง (เก็บ FONT_CACHE_NAME ไว้)
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((k) => k !== newCacheName && k !== FONT_CACHE_NAME)
      .map((k) => caches.delete(k))
  );

  activeAppVersion = version;
  return newCacheName;
}


// รับคำสั่งจาก app.js
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (data.type === "GET_ACTIVE_VERSION") {
    (async () => {
      if (!activeAppVersion) {
        activeAppVersion = await detectCurrentVersionFromCaches();
      }
      event.ports[0].postMessage({ version: activeAppVersion });
    })();
    return;
  }

  if (data.type === "UPDATE_TO_VERSION") {
    (async () => {
      let success = true;
      try {
        await loadCacheForVersion(data.version);
      } catch (error) {
        console.error("❌ อัปเดต cache ล้มเหลว:", error);
        success = false;
      }
      // แจ้งทุก client ที่เปิดอยู่ว่าทำงานเสร็จแล้ว
      const clientsList = await self.clients.matchAll();
      clientsList.forEach((client) => {
        client.postMessage({ type: "CACHE_UPDATE_DONE", success });
      });
    })();
    return;
  }
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

  // version.json ต้องไม่ cache เด็ดขาด
  if (requestUrl.pathname.endsWith('version.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    (async () => {
      const cacheName = CACHE_PREFIX + activeAppVersion;
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