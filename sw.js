// Service worker du Portail Duo
// Rôle : mettre en cache le "shell" du portail (index.html, manifest, icônes)
// pour qu'il puisse s'ouvrir hors-ligne. Ne touche pas aux sous-apps
// (Muscu/, Budget/, Course/), qui gèrent leur propre cache indépendamment.

const CACHE_NAME = 'portail-duo-shell-r7';
// Préfixe utilisé pour ne nettoyer QUE les anciennes versions du cache de
// CETTE app au moment de l'activation. Sans ça, caches.keys() renvoie tous
// les caches de tout le domaine (Course, Muscu, Budget inclus), et un
// filtre `!== CACHE_NAME` les supprimait tous par erreur (bug corrigé le
// 18/09/2026 — voir README, section Historique).
const CACHE_PREFIX = 'portail-duo-shell-';
const SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icone-192.png',
  './icone-512.png',
  './icone-512-maskable.png'
];

// Installation : mise en cache du shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES.map((u) => new Request(u, { cache: 'reload' }))))
  );
  self.skipWaiting();
});

// Activation : suppression des anciens caches (versions précédentes du shell)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch : cache-first pour le shell du portail, réseau pour le reste
// (les sous-dossiers Muscu/Budget/Course ne sont jamais interceptés ici)
// Réseau d'abord pour index.html (20/09/2026) : on tente le serveur en priorité
// pour toujours servir la dernière version ; si le réseau est absent ou met plus
// de 4 s à répondre (connexion « fantôme » sur iPhone), on sert la copie en cache.
// Les autres fichiers du shell (icônes, manifest, SDK) restent en cache-first.
const DELAI_RESEAU_MS = 4000;
function cleCache(requete){
  const u = new URL(requete.url);
  u.search = '';   // app.js?v=… et app.js partagent la même entrée de cache
  return u.href;
}
function reseauPuisCache(requete){
  return new Promise((resolve) => {
    let termine = false;
    const repliCache = () => caches.match(cleCache(requete)).then((r) => r || caches.match(new URL('index.html', self.registration.scope).href));
    const minuteur = setTimeout(() => {
      repliCache().then((r) => { if (r && !termine) { termine = true; resolve(r); } });
    }, DELAI_RESEAU_MS);
    // Requête neuve avec cache:'no-cache' : force la revalidation auprès du serveur (304 si inchangé)
    // et évite de resservir une copie du cache HTTP de Safari (GitHub Pages : max-age=600).
    fetch(new Request(requete.url, { cache: 'no-cache' })).then((reponse) => {
      if (reponse && reponse.status === 200) {
        const copie = reponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(cleCache(requete), copie));
      }
      if (!termine) { termine = true; clearTimeout(minuteur); resolve(reponse); }
    }).catch(() => {
      clearTimeout(minuteur);
      if (termine) return;
      repliCache().then((r) => { termine = true; resolve(r || Response.error()); });
    });
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // On ne gère que les requêtes de même origine, à la racine du portail
  // (jamais /Muscu/, /Budget/, /Course/, ni les requêtes cross-origin type Firebase)
  const isSubApp = /\/(Muscu|Budget|Course)\//.test(url.pathname);
  if (url.origin !== self.location.origin || isSubApp) {
    return;
  }

  // index.html / page d'accueil : réseau d'abord (voir reseauPuisCache)
  const scopePath = new URL(self.registration.scope).pathname;
  if (url.pathname === scopePath || ['index.html', 'style.css', 'app.js'].some((f) => url.pathname === scopePath + f)) {
    event.respondWith(reseauPuisCache(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match('./index.html'));
    })
  );
});
