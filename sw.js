const CACHE_NAME = 'cromo-vision-v' + Date.now(); // Nombre dinámico para forzar actualización

// Archivos básicos para que la App abra
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// 1. INSTALACIÓN: Salta la espera para activarse ya mismo
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

// 2. ACTIVACIÓN: Borra TODAS las cachés viejas de la app
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim()) // Toma el control de la página inmediatamente
  );
});

// 3. ESTRATEGIA: Network First (Prioriza internet sobre la caché)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si hay internet, guardamos la copia nueva y la devolvemos
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)) // Si falla internet (offline), usa la caché
  );
});