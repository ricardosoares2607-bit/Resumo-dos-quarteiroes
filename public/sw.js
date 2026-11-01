// Service Worker para Andamento dos quarteirões - PWA
const CACHE_NAME = 'andamento-quarteiroes-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
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

  // Ignorar requisições não-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Não cachear requisições para o Firebase Realtime Database ou chamadas de websocket
  if (url.hostname.includes('firebaseio.com') || url.pathname.includes('/.lp') || url.pathname.includes('/.ws')) {
    return;
  }

  // Estratégia Network First com fallback de Cache para navegação e dados
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a resposta for válida, clonar e atualizar o cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback para o cache quando offline
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Se for navegação de página e não houver cache específico, retorna o index.html
        if (event.request.mode === 'navigate') {
          const indexPage = await caches.match('/index.html');
          if (indexPage) return indexPage;
        }

        return new Response('Offline - Conteúdo indisponível sem conexão.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
      })
  );
});
