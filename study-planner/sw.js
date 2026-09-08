/*
 * Service worker for Study Planner.
 *
 * The app is one HTML file plus a manifest and icons, and all user data lives in
 * localStorage, so caching the shell is enough to make it work fully offline.
 *
 * Strategy:
 *   - navigations  cache-first, with a background refresh, so launching from the
 *                  home screen is instant and works with no connection. A new
 *                  deploy is picked up on the launch after the one that fetched it.
 *   - same-origin
 *     GET assets   stale-while-revalidate.
 *   - everything
 *     else         left to the network.
 *
 * Bump CACHE_VERSION when the list of precached files changes; the old cache is
 * deleted on activate. Changing index.html alone needs no bump — the background
 * refresh above keeps it current.
 */
var CACHE_VERSION = "v1";
var CACHE_NAME = "study-planner-" + CACHE_VERSION;
var INDEX = "./index.html";
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Added one at a time: a single 404 (a host that won't serve "./", say)
      // must not fail the whole install and leave the app uncached.
      return Promise.all(SHELL.map(function (url) {
        return cache.add(new Request(url, { cache: "reload" }))["catch"](function () {});
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME && key.indexOf("study-planner-") === 0) return caches["delete"](key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function refresh(cache, request, cacheKey) {
  return fetch(request).then(function (response) {
    if (response && response.ok && response.type === "basic") {
      cache.put(cacheKey || request, response.clone());
    }
    return response;
  })["catch"](function () {
    return null;
  });
}

var OFFLINE_FALLBACK =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Study Planner</title>' +
  '<style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#f4f6f8;color:#161b22;' +
  'font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;text-align:center;padding:24px}' +
  '@media(prefers-color-scheme:dark){body{background:#10151b;color:#e8edf2}}</style></head><body><div>' +
  "<h1>Offline</h1><p>Open Study Planner once with a connection, then it will work offline.</p>" +
  "</div></body></html>";

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(INDEX).then(function (cached) {
          var network = refresh(cache, new Request(INDEX, { cache: "reload" }), INDEX);
          if (cached) return cached;
          return network.then(function (response) {
            return response || new Response(OFFLINE_FALLBACK, {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" }
            });
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(request, { ignoreSearch: true }).then(function (cached) {
        var network = refresh(cache, request);
        if (cached) return cached;
        return network.then(function (response) {
          return response || Response.error();
        });
      });
    })
  );
});
