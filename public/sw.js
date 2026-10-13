// Stage 11: static offline notice only. Never cache tokens, user pages, notes, APIs or signatures.
const CACHE='byteback-stage11-offline-v1';
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.add('/offline.html')));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))
  )));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||req.mode!=='navigate')return;
  event.respondWith(fetch(req,{cache:'no-store'}).catch(async()=>{
    const cache=await caches.open(CACHE);
    return await cache.match('/offline.html')??Response.error();
  }));
});
