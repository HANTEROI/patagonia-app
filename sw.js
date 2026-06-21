const CACHE = "patagonia-v2";
const ASSETS = [
  "/", "/index.html",
  "/js/data.js", "/js/state.js", "/js/drive.js", "/js/map.js", "/js/ui.js", "/js/actions.js",
  "/manifest.json",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("googleapis.com") || e.request.url.includes("accounts.google.com")) return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res => { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); return res; }).catch(() => cached)));
});
