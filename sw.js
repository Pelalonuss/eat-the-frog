// Tagesplan als App: zuerst aus dem Internet laden (immer die neueste Version),
// ohne Verbindung die zuletzt gespeicherte Version zeigen.
const CACHE = 'tagesplan-v6';
self.addEventListener('install', ()=> self.skipWaiting());
self.addEventListener('activate', e=> e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  e.respondWith(
    fetch(req).then(res=>{
      if(res && (res.ok || res.type === 'opaque')){ const copy = res.clone(); caches.open(CACHE).then(c=> c.put(req, copy)); }
      return res;
    }).catch(()=> caches.match(req).then(hit=> hit || caches.match('./index.html')))
  );
});
