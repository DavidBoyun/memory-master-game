const CACHE_NAME = 'memory-master-v1';
const urlsToCache = [
  '/',
  '/memory_game.html',
  '/manifest.json'
];

// 설치 이벤트
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('캐시 오픈됨');
        return cache.addAll(urlsToCache);
      })
  );
});

// 페치 이벤트
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에서 발견되면 반환
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// 활성화 이벤트
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});