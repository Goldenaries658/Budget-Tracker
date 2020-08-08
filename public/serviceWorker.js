// Perform install steps
const CACHE_NAME = "budget-app-cache-v2";
const urlsToCache = [
  "/",
  "/styles/main.css",
  "/script/main.js",
  "manifest.json",
  "images/icons/icon-144x144.png",
];

const cache = (request, response) => {
  if (response.type === "error" || response.type === "opaque") {
    return Promise.resolve(); // do not put in cache network errors
  }

  return caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, response.clone()));
};

self.addEventListener("install", (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Clearing old cache on activation
self.addEventListener("activate", (event) => {
  const cacheAllowList = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheAllowList.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Returning cached requests
self.addEventListener("fetch", (event) => {
  // Checking if calling api
  // if (event.request.url.includes("/api/")) {
  //   // Cache Update Refresh Strategy for api calls
  // } else {
  // Cache First Strategy
  console.log(event.request.url);
  event.respondWith(
    caches
      .match(event.request) // Checking for cached response
      .then((cachedFile) => cachedFile || fetch(event.request)) // if cachedFile unavailable then req network
      .then((response) => {
        if (event.request.url.indexOf("http") === 0) {
          // Checking if request is http (not browser extension)
          return cache(event.request, response) // adds response to cache
            .then(() => response); // Return network response
        }
        return response;
      })
  );
  // }
});
