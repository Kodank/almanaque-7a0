/* global self, caches, fetch */
var CACHE = "almanaque-7a0-v2";
var PRECACHE = [
  "./consultar.html",
  "./explorer/styles.css",
  "./explorer/app.js",
  "./explorer/data.js",
  "./explorer/manifest.webmanifest"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) {
        cache.put(event.request, copy);
      });
      return res;
    }).catch(function () {
      return caches.match(event.request).then(function (hit) {
        return hit || caches.match("./consultar.html");
      });
    })
  );
});
