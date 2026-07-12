/* 棋譜メーカー Service Worker
   アプリ本体をキャッシュしてオフラインでも起動できるようにする。
   ※スクショの読み取り（AI）はオンライン時のみ。KIF読み込み・保存はオフラインでも動作。 */

const CACHE = "kifu-maker-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png",
  "./apple-touch-icon.png"
];

// インストール時：アプリ一式をキャッシュ
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 有効化時：古いキャッシュを掃除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 取得時の方針
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // GET以外（APIへのPOST等）はそのままネットワークへ。キャッシュしない
  if (req.method !== "GET") {
    return;
  }

  // AI読み取りのAPI通信はキャッシュ対象外
  if (req.url.includes("api.anthropic.com")) {
    return;
  }

  // 外部CDN（html2canvas・フォント）はネット優先、取れなければキャッシュ
  if (req.url.includes("cdnjs.cloudflare.com") || req.url.includes("fonts.g")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // アプリ本体：キャッシュ優先、なければネットワーク
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
