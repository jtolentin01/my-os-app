const CACHE_VERSION = "my-os-v3"
const PRECACHE_URLS = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  )
})

const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname.endsWith(".png") ||
  url.pathname.endsWith(".svg") ||
  url.pathname.endsWith(".ico") ||
  url.pathname.endsWith(".webp")

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") {
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || caches.match("/offline.html")
        })
    )
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          }
          return response
        })
      })
    )
  }
})

self.addEventListener("push", (event) => {
  let data = {
    title: "My OS",
    body: "You have a reminder",
    url: "/diet",
  }

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url || "/diet" },
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || "/diet"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
