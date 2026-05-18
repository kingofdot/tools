// === SERVICE WORKER ===
// 정적 자산을 캐시해 오프라인에서 앱 셸을 띄움.
// 노트 데이터는 localStorage에 별도 보관.

const CACHE = 'study-notes-v54';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/state.js',
  './js/storage.js',
  './js/parser.js',
  './js/highlight.js',
  './js/numbering.js',
  './js/render.js',
  './js/editor.js',
  './js/list.js',
  './js/search.js',
  './js/github.js',
  './js/sync.js',
  './js/quiz.js',
  './js/lawapi-parser.js',
  './js/lawapi.js',
  './js/init.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // GitHub API 호출은 항상 네트워크 (오프라인이면 실패하고 로컬 데이터로 폴백)
  if (url.hostname.includes('github')) return;
  // law.go.kr OPEN API는 SW를 거치지 않음
  if (url.hostname.includes('law.go.kr')) return;

  // network-first: 항상 최신을 받고, 실패하면 캐시 폴백
  // (이전엔 cache-first 라 코드 변경이 다음 다음 새로고침에야 반영되던 문제 해결)
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && url.origin === location.origin) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});
