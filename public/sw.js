// The app is a WebView pointed at this site, so with no network it would
// otherwise show a browser error page and never start. This keeps the last
// pages and catalogue responses around so a launch offline still lands on
// something useful - your collection, as you last saw it.

const VERSION = 'v1'
const SHELL = `gombrick-shell-${VERSION}`
const STATIC = `gombrick-static-${VERSION}`
const DATA = `gombrick-data-${VERSION}`
const KEEP = [SHELL, STATIC, DATA]

// Read-only endpoints worth keeping. Anything else - toggles, uploads,
// sign-in - must reach the server to mean anything.
const CACHEABLE_API = ['/api/bearbricks', '/api/series', '/api/categories', '/api/collection']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(SHELL))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !KEEP.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

/** Serves from cache and refreshes in the background. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

/** Prefers the network, falls back to whatever was last stored. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (error) {
    const hit = await cache.match(request)
    if (hit) return hit
    throw error
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Build output is content-hashed, so a hit is always the right file.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC))
    return
  }

  if (CACHEABLE_API.some((path) => url.pathname === path)) {
    event.respondWith(networkFirst(request, DATA))
    return
  }

  // Page navigations: show the live page when there is a network, and the
  // last copy of that page - or failing that the home screen - when there
  // isn't.
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, SHELL).catch(async () => {
        const cache = await caches.open(SHELL)
        return (await cache.match(request)) || (await cache.match('/')) || Response.error()
      })
    )
  }
})

// Signing out should not leave the previous account's collection on the
// device for the next person to open the app.
self.addEventListener('message', (event) => {
  if (event.data === 'clear-user-data') {
    event.waitUntil(caches.delete(DATA))
  }
})
