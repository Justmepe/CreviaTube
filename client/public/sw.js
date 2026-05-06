// Copied from frontend/public/sw.js with adjustments for Vite build paths if needed
importScripts = importScripts;

const CACHE_NAME = 'creviatube-v1.0.0';
const STATIC_CACHE = 'creviatube-static-v1.0.0';
const DYNAMIC_CACHE = 'creviatube-dynamic-v1.0.0';
const API_CACHE = 'creviatube-api-v1.0.0';

const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

const API_ENDPOINTS = [
  '/api/user',
  '/api/campaigns',
  '/api/analytics/stats'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.map((name) => {
        if (![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(name)) {
          return caches.delete(name);
        }
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
    event.respondWith(handleStaticRequest(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

async function handleApiRequest(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, res.clone());
      return res;
    }
    throw new Error('Network not ok');
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) {
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, res.clone());
  }
  return res;
}

async function handlePageRequest(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, res.clone());
      return res;
    }
    throw new Error('Network not ok');
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('/offline.html');
  }
}

console.log('Service Worker: Loaded');


