// Service Worker para Andamento dos quarteirões - PWA (100% Offline-Ready)
const CACHE_NAME = 'andamento-quarteiroes-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/libs/firebase-app-compat.js',
  '/libs/firebase-database-compat.js',
  '/libs/html2pdf.bundle.min.js'
];

// Instalação do Service Worker e pré-cache dos recursos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Aviso no pré-cacheamento de alguns recursos:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de versões antigas do cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições de rede
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar requisições que não sejam GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Não interceptar requisições em tempo real do Firebase Realtime Database
  if (url.hostname.includes('firebaseio.com') || url.pathname.includes('/.lp') || url.pathname.includes('/.ws')) {
    return;
  }

  // Estratégia para navegação da página (HTML): Network First com fallback de Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request) || await caches.match('/index.html') || await caches.match('/');
          if (cached) return cached;
          return new Response('Offline - Conteúdo em cache não encontrado.', {
            status: 200,
            headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' })
          });
        })
    );
    return;
  }

  // Estratégia para scripts, bibliotecas, imagens e assets: Cache First com fallback de rede
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return new Response('', { status: 404 });
      });
    })
  );
});
