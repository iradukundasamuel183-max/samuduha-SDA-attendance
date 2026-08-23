// Samuduha Attendance — Service Worker
// Strategy: NETWORK-FIRST. Whenever the phone has internet, it always
// fetches the latest index.html/app files from the server — so pushing
// an update to GitHub is enough, no extra steps needed for leaders.
// The cache is only used as a fallback when there's no internet at all.

const CACHE_NAME = 'samuduha-cache-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for our own app shell files.
  // Supabase API calls, images, etc. just pass through untouched.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isAppShell = APP_SHELL.some((f) => url.pathname.endsWith(f.replace('./', '')));
  if (!isAppShell) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Got it from the network — save a fresh copy for offline fallback
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        // No internet — serve the last cached copy instead
        caches.match(event.request)
      )
  );
});
