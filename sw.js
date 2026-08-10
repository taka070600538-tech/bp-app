const CACHE_NAME = 'bp-app-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/app.js',
  './js/classify.js',
  './js/dateUtils.js',
  './js/records.js',
  './js/stats.js',
  './js/backup.js',
  './js/bpChart.js',
  './js/recordForm.js',
  './js/graphView.js',
  './js/settingsView.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];
// 注意: app-sync(共有モジュール)のURLはキャッシュしない。
// オフライン時はどのみち保存できず、キャッシュすると更新が届かなくなるため。

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
