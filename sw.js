// Cache only the static app shell; personal records remain in localStorage.
const CACHE_PREFIX = `lifeos-shell-${encodeURIComponent(self.registration.scope)}-`;
const CACHE_NAME = `${CACHE_PREFIX}v97`;
const SHELL_MARKER = "lifeos-shell-v97";
const shellUrls = ["./", "./index.html", "./styles-v97.css", "./app-v97.js"].map((path) => new URL(path, self.registration.scope).href);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const responses = await Promise.all(shellUrls.map((url) => fetch(url, { cache: "reload" })));
    if (responses.some((response) => !response.ok)) throw new Error("Unable to load app shell");
    const contents = await Promise.all(responses.map((response) => response.clone().text()));
    if (!contents.every((text) => text.includes(SHELL_MARKER))) throw new Error("App shell versions do not match");
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(shellUrls.map((url, i) => cache.put(url, responses[i])));
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
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
  const assetUrl = url.href;
  if (!isAppPage && !shellUrls.includes(assetUrl)) return;
  const cacheKey = isAppPage ? new URL("./index.html", scope).href : assetUrl;
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => (await cache.match(cacheKey)) || fetch(request)));
});
