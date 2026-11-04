// Free Food Scan service worker – makes the app installable and work offline.
const CACHE = "ffs-v5";
const SHELL = ["./", "index.html", "config.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const LIBS = ["https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(SHELL);
    for (const u of LIBS) { try { const r = await fetch(u, { mode: "no-cors" }); await c.put(u, r); } catch (err) {} }
  }));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // Never cache product-database or payment calls – always live.
  if (/openfoodfacts|openbeautyfacts|openproductsfacts|openpetfoodfacts|nal\.usda|upcitemdb|stripe/.test(url.hostname)) return;
  const sameOrigin = url.origin === location.origin;
  if (sameOrigin && (req.mode === "navigate" || /\.(html|js|webmanifest)$/.test(url.pathname))) {
    // Network first, so updates arrive straight away; fall back to the cached copy offline.
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
    return;
  }
  // Everything else (icons, fonts, scanner library): cache first.
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => r)));
});
