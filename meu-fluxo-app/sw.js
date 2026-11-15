const CACHE = 'meu-fluxo-offline-v1.3.1';
const ASSETS = ['./','./index.html','./app.js','./chat-parser.js','./backup-v2.js','./finance-v13.js','./finance-ui-v13.js','./firebase-config.js','./styles.css','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('meu-fluxo-offline-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  // Configuração de login: preferir versão atualizada, mantendo cópia offline.
  if (url.pathname.endsWith('/firebase-config.js')) {
    event.respondWith(fetch(request, {cache:'no-store'}).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }).catch(() => caches.match(request)));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request,copy)).catch(() => {});
    }
    return response;
  }).catch(() => caches.match('./index.html'))));
});
