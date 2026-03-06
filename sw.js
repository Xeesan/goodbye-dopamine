const CACHE_NAME = 'gbd-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/storage.js',
    './js/quotes.js',
    './js/auth.js',
    './js/app.js',
    './js/pdf-import.js',
    './js/pages/dashboard.js',
    './js/pages/planner.js',
    './js/pages/routine.js',
    './js/pages/exams.js',
    './js/pages/academic-hub.js',
    './js/pages/money.js',
    './js/pages/notes.js',
    './js/pages/detox.js',
    './js/pages/reports.js',
    './js/pages/profile.js',
    './manifest.json',
    './icon.svg'
];

// Install event: cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event: Serve from network first, then fallback to cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
