// service-worker.js

// Bump the cache name to invalidate previously cached HTML/CSS that still contained
// mobile-only UI. This forces clients to fetch the latest desktop-only assets.
const CACHE_NAME = "sokoban-cache-v2";

const PRECACHE_URLS = [
    "/",
    "/index.html",
    "/manifest.webmanifest", // PWA manifest (if present)

    // Initial puzzle collection
    "/resources/puzzles/Mini Cosmos.sok",

    // Initial skin (images with stable paths)
    "/resources/skins/KSokoban2/KSokoban.png",
    "/resources/skins/KSokoban2/KSokoban walls.png",
];

// Install: pre-cache the core app shell and selected static assets
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
    );

    // Activate this service worker immediately, without waiting for older ones to close
    self.skipWaiting();
});

// Activate: remove old caches that do not match the current CACHE_NAME
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );

    // Take control of all open clients as soon as activation completes
    self.clients.claim();
});

// Fetch: serve requests from cache when possible, fall back to network
self.addEventListener("fetch", event => {
    const request = event.request;

    // Only handle GET requests; ignore POST/PUT/DELETE/etc.
    if (request.method !== "GET") {
        return;
    }

    // For navigation requests (HTML pages), use an app-shell-style strategy
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(() => caches.match("/index.html"))
        );
        return;
    }

    // For all other GET requests, use cache-first with network fallback
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            // Not in cache → go to network
            return fetch(request)
                .then(networkResponse => {
                    // Only cache valid, non-opaque, successful responses
                    if (
                        !networkResponse ||
                        networkResponse.status !== 200 ||
                        networkResponse.type === "opaque"
                    ) {
                        return networkResponse;
                    }

                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseClone);
                    });

                    return networkResponse;
                })
                .catch(() => {
                    // As a generic offline fallback, return index.html
                    // (you can customize this to return another offline page)
                    return caches.match("/index.html");
                });
        })
    );
});
