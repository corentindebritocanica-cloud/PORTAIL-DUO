// Service worker du Portail Duo
// Rôle : mettre en cache le "shell" du portail (index.html, manifest, icônes)
// pour qu'il puisse s'ouvrir hors-ligne. Ne touche pas aux sous-apps
// (Muscu/, Budget/, Course/), qui gèrent leur propre cache indépendamment.

const CACHE_NAME = 'portail-duo-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icone-192.png',
  './icone-512.png',
  './icone-512-maskable.png'
];

// Installation : mise en cache du shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

// Activation : suppression des anciens caches (versions précédentes du shell)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch : cache-first pour le shell du portail, réseau pour le reste
// (les sous-dossiers Muscu/Budget/Course ne sont jamais interceptés ici)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // On ne gère que les requêtes de même origine, à la racine du portail
  // (jamais /Muscu/, /Budget/, /Course/, ni les requêtes cross-origin type Firebase)
  const isSubApp = /\/(Muscu|Budget|Course)\//.test(url.pathname);
  if (url.origin !== self.location.origin || isSubApp) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match('./index.html'));
    })
  );
});
