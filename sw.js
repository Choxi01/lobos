// Modo offline del Narrador de Lobos.
// Páginas, estilos y código: primero busca la versión nueva en internet y,
// si no hay conexión, usa la guardada. Así las actualizaciones llegan solas.
// Fuentes e íconos: usa la copia guardada (no cambian).
const CACHE = "lobos";
const ARCHIVOS = [
  "./", "index.html", "css/estilos.css", "js/roles.js", "js/estado.js", "js/textos.js", "js/app.js",
  "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png",
  "fonts/alegreya-sans-latin-400-normal.woff2", "fonts/alegreya-sans-latin-700-normal.woff2",
  "fonts/alegreya-sans-latin-800-normal.woff2", "fonts/alegreya-sc-latin-700-normal.woff2",
  "fonts/alegreya-sc-latin-800-normal.woff2",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const fijo = /\.(woff2|png)$/.test(new URL(req.url).pathname);

  if (fijo) {
    e.respondWith(caches.match(req).then(g => g || fetch(req)));
    return;
  }
  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then(resp => {
        if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return resp;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(g => g || caches.match("index.html")))
  );
});
