// Memory Master PWA Service Worker
// 캐시 버전 관리
const CACHE_NAME = 'memory-master-v1.2.0';
const STATIC_CACHE = 'memory-master-static-v1.2.0';
const DYNAMIC_CACHE = 'memory-master-dynamic-v1.2.0';

// 캐시할 정적 파일들
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js'
];

// 🎯 Service Worker 설치 이벤트
self.addEventListener('install', event => {
  console.log('🔧 Service Worker 설치 중...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 정적 파일 캐싱 중...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker 설치 완료!');
        // 즉시 활성화
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker 설치 실패:', error);
      })
  );
});

// 🔄 Service Worker 활성화 이벤트
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker 활성화 중...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        // 오래된 캐시 삭제
        const deletePromises = cacheNames
          .filter(cacheName => {
            return cacheName !== STATIC_CACHE && 
                   cacheName !== DYNAMIC_CACHE &&
                   cacheName.startsWith('memory-master-');
          })
          .map(cacheName => {
            console.log('🗑️ 오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          });
        
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('✅ Service Worker 활성화 완료!');
        // 모든 클라이언트 즉시 제어
        return self.clients.claim();
      })
      .catch(error => {
        console.error('❌ Service Worker 활성화 실패:', error);
      })
  );
});

// 🌐 네트워크 요청 가로채기 (Fetch 이벤트)
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // HTML 페이지 요청 처리
  if (request.destination === 'document') {
    event.respondWith(
      networkFirstStrategy(request)
    );
    return;
  }
  
  // 정적 자원 요청 처리 (CSS, JS, 이미지 등)
  if (STATIC_FILES.some(file => request.url.includes(file)) || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'image') {
    event.respondWith(
      cacheFirstStrategy(request)
    );
    return;
  }
  
  // 기타 요청은 네트워크 우선
  event.respondWith(
    networkFirstStrategy(request)
  );
});

// 📡 네트워크 우선 전략 (최신 콘텐츠 우선)
async function networkFirstStrategy(request) {
  try {
    // 네트워크에서 먼저 시도
    const networkResponse = await fetch(request);
    
    // 성공하면 캐시에 저장하고 반환
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // 네트워크 응답이 실패하면 캐시에서 찾기
    return await getCachedResponse(request);
    
  } catch (error) {
    console.log('🔄 네트워크 오류, 캐시에서 응답:', error.message);
    return await getCachedResponse(request);
  }
}

// 💾 캐시 우선 전략 (빠른 로딩)
async function cacheFirstStrategy(request) {
  try {
    // 캐시에서 먼저 찾기
    const cachedResponse = await getCachedResponse(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 캐시에 없으면 네트워크에서 가져오기
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('❌ 캐시 및 네트워크 모두 실패:', error);
    return new Response('오프라인 상태입니다.', { 
      status: 503,
      statusText: 'Service Unavailable' 
    });
  }
}

// 🔍 캐시에서 응답 찾기
async function getCachedResponse(request) {
  const cacheNames = [STATIC_CACHE, DYNAMIC_CACHE];
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const response = await cache.match(request);
    if (response) {
      return response;
    }
  }
  
  return null;
}

// 📱 푸시 알림 처리
self.addEventListener('push', event => {
  console.log('📬 푸시 알림 수신:', event);
  
  const options = {
    body: event.data ? event.data.text() : '새로운 도전이 기다리고 있어요! 🎮',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'play',
        title: '🎮 게임하기',
        icon: '/icon-72.png'
      },
      {
        action: 'close',
        title: '❌ 닫기'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('🧠 Memory Master', options)
  );
});

// 🔔 알림 클릭 처리
self.addEventListener('notificationclick', event => {
  console.log('🔔 알림 클릭:', event.action);
  
  event.notification.close();
  
  if (event.action === 'play' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 📊 백그라운드 동기화 (미래 확장용)
self.addEventListener('sync', event => {
  console.log('🔄 백그라운드 동기화:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // 백그라운드에서 데이터 동기화 작업
      syncGameData()
    );
  }
});

async function syncGameData() {
  try {
    console.log('📊 게임 데이터 동기화 시작...');
    // 여기에 서버와 데이터 동기화 로직 구현
    // 예: 최고 점수, 업적 등을 서버에 저장
    console.log('✅ 게임 데이터 동기화 완료!');
  } catch (error) {
    console.error('❌ 데이터 동기화 실패:', error);
  }
}

// 🎯 캐시 크기 관리 (최대 50개 파일)
async function manageCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    // 오래된 캐시부터 삭제
    const deletePromises = keys
      .slice(0, keys.length - maxItems)
      .map(key => cache.delete(key));
    
    await Promise.all(deletePromises);
    console.log(`🧹 캐시 정리 완료: ${cacheName}`);
  }
}

// 주기적으로 캐시 크기 관리 (1시간마다)
setInterval(() => {
  manageCacheSize(DYNAMIC_CACHE, 50);
}, 60 * 60 * 1000);

// 🔧 Service Worker 업데이트 알림
self.addEventListener('message', event => {
  console.log('💬 메시지 수신:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⚡ Service Worker 즉시 활성화');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME,
      timestamp: new Date().toISOString()
    });
  }
});

// 🎮 게임 관련 이벤트 처리
self.addEventListener('gameEvent', event => {
  console.log('🎮 게임 이벤트:', event.detail);
  
  // 게임 통계나 업적 처리
  // 예: 높은 점수 달성 시 축하 알림
});

console.log('🚀 Memory Master Service Worker 로드 완료!');
console.log('📦 캐시 버전:', CACHE_NAME);