// Perform install steps
const CACHE_NAME = "budget-app-cache-v10";
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

// caching api responses
const update = (request) => {
  return fetch(request.url).then(
    (response) =>
      cache(request, response) // we can put response in cache
        .then(() => response) // resolve promise with the Response object
  );
};

// Refreshing the page with server response
const refresh = (response) => {
  return response
    .json() // read and parse JSON response
    .then((jsonResponse) => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          // report and send new data to client
          client.postMessage(
            JSON.stringify({
              type: response.url,
              data: jsonResponse,
            })
          );
        });
      });
      return jsonResponse.data; // resolve promise with new data
    });
};

self.addEventListener("install", (event) => {
  // Immediately activating service worker on install
  self.skipWaiting();
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
  if (event.request.method !== "GET") {
    event.respondWith(fetch(event.request));
    return;
  }
  // Checking if calling api
  if (event.request.url.includes("/api/")) {
    // Cache Update Refresh Strategy for api calls
    event.respondWith(caches.match(event.request)); // Respond instantly from cache if available
    event.waitUntil(
      update(event.request) // Save network response to cache
        .then(refresh)
    ); // Sending new data to client
  } else {
    // Cache First Strategy
    event.respondWith(
      caches
        .match(event.request) // Checking for cached response
        .then((cachedFile) => cachedFile || fetch(event.request)) // if cachedFile unavailable then req network
        .then((response) => {
          if (
            event.request.url.indexOf("http") === 0 // Checking if request is http (not browser extension)
          ) {
            return cache(event.request, response) // adds response to cache
              .then(() => response); // Return network response
          }
          return response;
        })
    );
  }
});
