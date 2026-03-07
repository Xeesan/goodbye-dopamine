const CACHE_NAME = 'gbd-cache-v16';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './css/auth.css',
    './css/sidebar.css',
    './css/dashboard.css',
    './css/pages.css',
    './css/responsive.css',
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
    './js/pages/health.js',
    './js/pages/reports.js',
    './js/pages/profile.js',
    './manifest.json',
    './icon.svg',
    './icon-192.png',
    './icon-512.png',
    './favicon.svg'
];

// Install: cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).catch(err => console.warn('[SW] Cache addAll failed:', err))
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch: network first, cache fallback
self.addEventListener('fetch', (event) => {
    // Skip non-GET and external requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache successful responses
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
