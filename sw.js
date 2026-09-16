/* 禅意番茄钟 · Service Worker
   策略：应用外壳 stale-while-revalidate（先给缓存，后台悄悄更新）
        字体与图标同属本站资源，一并进缓存 —— 现在是纯本地字体，断网也能用 */
const CACHE = 'zen-pomodoro-v124';
const ASSETS = [
  './', './index.html', './styles.css', './tokens.css',
  './app.js', './manifest.json', './icon.svg',
  './icon-180.png', './icon-192.png', './icon-512.png',
  /* 思源宋体子集（约 260KB/个）：首次安装即预取，
     之后无论在线离线都走缓存，不再产生网络请求 */
  './fonts/SourceHanSerifSC-Regular.woff2',
  './fonts/SourceHanSerifSC-Bold.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // 第三方资源（现在已无）不接管

  e.respondWith(
    caches.match(req).then(hit => {
      const fresh = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || fresh;
    })
  );
});
