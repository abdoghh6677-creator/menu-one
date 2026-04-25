// =====================================================
// Service Worker - FoodOrder PWA + Push Notifications
// =====================================================

const CACHE_VERSION = 'v4';
const STATIC_CACHE = `foodorder-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `foodorder-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = ['/index.html', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon.svg'];

// ===== Install =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

// ===== Activate =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![STATIC_CACHE, DYNAMIC_CACHE].includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ===== Fetch =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.pathname.startsWith('/manifest/')) return;

  // ===== IMAGE CACHING =====
  if (request.destination === 'image' || url.pathname.includes('/storage/v1/render/image/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Return placeholder for failed images
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((r) => {
          const rClone = r.clone();
          caches.open(DYNAMIC_CACHE).then((c) => c.put(request, rClone));
          return r;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.hostname.includes('fonts.g')) {
    event.respondWith(caches.match(request).then((c) => c || fetch(request).then((r) => {
      caches.open(STATIC_CACHE).then((cache) => cache.put(request, r.clone())); return r;
    })));
    return;
  }

  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)) {
    event.respondWith(caches.match(request).then((c) => c || fetch(request).then((r) => {
      caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, r.clone())); return r;
    })));
    return;
  }

  event.respondWith(
    fetch(request).then((r) => { caches.open(DYNAMIC_CACHE).then((c) => c.put(request, r.clone())); return r; })
      .catch(() => caches.match(request))
  );
});

// ===== Push Notifications =====
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'طلب جديد!', body: event.data.text() }; }

  const options = {
    body: data.body || 'لديك طلب جديد',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'new-order',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: { url: data.url || '/restaurant/orders', orderId: data.orderId },
    actions: [
      { action: 'view', title: 'عرض الطلب' },
      { action: 'dismiss', title: 'تجاهل' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title || '🔔 طلب جديد!', options));
});

// ===== Notification Click =====
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/restaurant/orders';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/restaurant') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ===== Messages =====
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CACHE_MENU') {
    caches.open(DYNAMIC_CACHE).then((c) => c.add(`/menu/${event.data.slug}`).catch(() => {}));
  }
  // إشعار محلي (بدون Push Server)
  if (event.data?.type === 'LOCAL_NOTIFICATION') {
    const { title, body, url, orderId } = event.data;
    self.registration.showNotification(title || '🔔 طلب جديد!', {
      body: body || 'لديك طلب جديد',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `order-${orderId || Date.now()}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300],
      data: { url: url || '/restaurant/orders' },
    });
  }
});
