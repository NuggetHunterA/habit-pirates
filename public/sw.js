// Offline-Speicher (Phase 6): Beim Installieren werden alle Dateien des Builds vorab geladen,
// damit die App auch im Flugmodus komplett laeuft (auch Bilder, die man noch nie gesehen hat).
// Dateien unter assets/ tragen eine Pruefsumme im Namen und aendern sich nie: erst Cache, dann Netz.
// Alles andere (Seite, Manifest, Symbole): erst Netz, bei Fehler Cache.
const ASSETS = 'hp-assets'
const PAGES = 'hp-pages'

async function manifest() {
  const res = await fetch('./precache.json', { cache: 'no-store' })
  return res.ok ? res.json() : []
}

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(
    (async () => {
      const files = await manifest().catch(() => [])
      const cache = await caches.open(ASSETS)
      const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname))
      const base = new URL('./', self.registration.scope).pathname
      const missing = files.filter((f) => f.startsWith('assets/') && !have.has(base + f))
      // In kleinen Paketen laden, damit ein einzelner Fehler nicht alles abbricht
      for (let i = 0; i < missing.length; i += 12) {
        await Promise.all(missing.slice(i, i + 12).map((f) => cache.add(f).catch(() => {})))
      }
      const pages = await caches.open(PAGES)
      await Promise.all(files.filter((f) => !f.startsWith('assets/')).concat('./').map((f) => pages.add(f).catch(() => {})))
    })(),
  )
})

self.addEventListener('activate', (e) =>
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== ASSETS && k !== PAGES) await caches.delete(k)
      // Alte Dateien frueherer Versionen entfernen
      const files = new Set(await manifest().catch(() => []))
      if (files.size) {
        const cache = await caches.open(ASSETS)
        const base = new URL('./', self.registration.scope).pathname
        for (const r of await cache.keys()) if (!files.has(new URL(r.url).pathname.slice(base.length))) await cache.delete(r)
      }
      await self.clients.claim()
    })(),
  ),
)

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Versionsdatei und Vorab-Liste immer frisch vom Netz (Update-Hinweis)
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('/precache.json')) return
  if (url.origin !== location.origin) {
    if (url.host.includes('fonts.g')) e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => (caches.open(ASSETS).then((c) => c.put(req, res.clone())), res))))
    return
  }
  if (url.pathname.includes('/assets/')) {
    e.respondWith(caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then((res) => (res.ok && caches.open(ASSETS).then((c) => c.put(req, res.clone())), res))))
    return
  }
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(PAGES).then((c) => c.put(req, copy))
        }
        return res
      })
      .catch(() => caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit || caches.match('./', { ignoreVary: true }))),
  )
})
