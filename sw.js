/* MindBalance service worker: офлайн-доступ (Precache app shell + runtime CDN cache) */
const CACHE = 'mindbalance-v1';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/@babel/standalone@7.25.6/babel.min.js',
  'https://cdn.jsdelivr.net/npm/recharts@2.12.7/umd/Recharts.min.js',
  'https://cdn.jsdelivr.net/npm/prop-types@15.8.1/prop-types.min.js',
  'https://cdn.jsdelivr.net/npm/lucide-react@0.454.0/dist/umd/lucide-react.js',
  'https://cdn.tailwindcss.com/3.4.16',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap',
  'https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofoOgHrYevN.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { mode: url.startsWith('http') ? 'cors' : 'same-origin' }))
            .catch(() => undefined)
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Навигация: всегда отдаём оболочку приложения (SPA работает офлайн)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Стратегия: кэш сначала, затем сеть (докладываем в кэш на лету)
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
        }
        return res;
      }).catch(() => hit);
    })
  );
});
