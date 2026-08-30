const CACHE_NAME = "agung-lestari-shell-v3";
const SHELL = ["/", "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png"];
const DEVELOPMENT_PREFIXES = ["/@vite/", "/@react-refresh", "/@id/", "/app/", "/lib/", "/node_modules/"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && DEVELOPMENT_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      })
      .catch(async () => {
        const cached = (await caches.match(request)) || (request.mode === "navigate" ? await caches.match("/") : null);
        return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      })
  );
});
