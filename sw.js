// Cache only the static app shell; personal records remain in localStorage.
const CACHE_PREFIX = `lifeos-shell-${encodeURIComponent(self.registration.scope)}-`;
const CACHE_NAME = `${CACHE_PREFIX}v16`;
const shellUrls = ["./", "./index.html", "./styles.css", "./app.js"].map((path) => new URL(path, self.registration.scope).href);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(shellUrls)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
    .map((key) => caches.delete(key)))));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin) return;
  const isAppPage = request.mode === "navigate" && (url.pathname === scope.pathname || url.pathname === `${scope.pathname}index.html`);
  const assetUrl = `${url.origin}${url.pathname}`;
  if (!isAppPage && !shellUrls.includes(assetUrl)) return;
  const cacheKey = isAppPage ? new URL("./index.html", scope).href : assetUrl;
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => (await cache.match(cacheKey)) || fetch(request)));
});
