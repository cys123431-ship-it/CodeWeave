const CACHE='codeweave-shell-v37';
const ASSETS=['./','./index.html','./styles.css','./src/app.js','./src/catalog.js','./src/logic.js','./src/figures.js','./workbench.html','./workbench.css','./src/workbench.js','./src/iterations.js','./src/practice.js','./src/attempt-backup.js','./src/backup.js','./src/mastery.js','./src/exercises.js','./src/multi-file.js','./src/compiler-feedback.js','./manifest.webmanifest','./assets/icon.svg'];
async function cacheShellResponse(cache, key, response) {
  if (!response.ok) return;
  if (response.headers.get('content-type')?.startsWith('text/html')) {
    // Keep an offline shell, never a server-start capability token.
    const html = await response.clone().text();
    const clean = html.replace(/  <meta name="codeweave-token" content="[0-9a-f]{64}">\n/g, '')
      .replace(/  <meta name="codeweave-rust" content="rust-cargo">\n/g, '');
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    await cache.put(key, new Response(clean, { status: response.status, headers }));
  } else if (response.headers.get('cache-control') !== 'no-store') {
    await cache.put(key, response.clone());
  }
}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await Promise.all(ASSETS.map(async asset => {
      const response = await fetch(asset, { cache: 'reload' });
      if (!response.ok) throw Error('Shell asset unavailable');
      await cacheShellResponse(cache, asset, response);
    }));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/api/'))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cacheShellResponse(cache,event.request,copy)).catch(()=>{}));}
    return response;
  }).catch(()=>caches.match(event.request).then(saved=>saved||caches.match('./index.html'))));
});
