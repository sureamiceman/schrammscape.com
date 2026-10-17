// =============================================================================
// SERVICE WORKER — public/sw.js
// =============================================================================
// WHAT THIS FILE DOES:
//   Runs in the background for the SchrammScape app (schrammscape.com/app)
//   so it opens instantly and still opens with no signal in a customer's
//   yard. It only ever caches the app's own screens, code and icons.
//
//   It NEVER touches Supabase requests (customer/job data). Data is always
//   fetched live; the app itself keeps a last-known copy of each list so it
//   can show something when offline (see lib/app/offlineCache.ts).
//
// IF YOU CHANGE THIS FILE:
//   Bump VERSION so phones throw away the old cache and pick up the change.
// =============================================================================

const VERSION = 'ss-app-v1'
const SHELL = ['/app', '/app.webmanifest', '/app-icons/icon-192.png', '/app-icons/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {}) // never block install on a cache miss
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) (await caches.open(VERSION)).put(request, response.clone())
  return response
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request)
    if (response.ok) (await caches.open(VERSION)).put(request, response.clone())
    return response
  } catch {
    return (await caches.match(request)) || (await caches.match('/app')) || Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // Supabase, maps, etc. go straight to the network

  if (request.mode === 'navigate' && url.pathname.startsWith('/app')) {
    event.respondWith(networkFirstPage(request))
  } else if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/app-icons/')) {
    // Next.js build files have unique names per deploy, so caching them forever is safe.
    event.respondWith(cacheFirst(request))
  }
})
