const CACHE = 'riverlab-v2-volumetry-2';
const CORE = [
  './', './index.html', './manifest.webmanifest', './icon.svg',
  './sound.js', './bots.js', './volumetry.css', './volumetry-mobile.css'
];

self.addEventListener('install', e => {
  // Revalidate the whole shell when upgrading an installed PWA.
  const requests = CORE.map(url => new Request(url, {cache: 'reload'}));
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(requests)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys
      .filter(name => name.startsWith('riverlab-') && name !== CACHE)
      .map(name => caches.delete(name)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch', e => {
  const request = e.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(fetch(request).then(response => {
    if (response.ok && (response.type === 'basic' || response.type === 'default')) {
      const copy = response.clone();
      e.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
    }
    return response;
  }).catch(() => caches.match(request).then(response => response ||
    (request.mode === 'navigate' ? caches.match('./index.html') : undefined))));
});
