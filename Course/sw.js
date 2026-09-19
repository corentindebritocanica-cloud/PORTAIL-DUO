// Service Worker — Courses L&C (reconstruction du 18/09/2026)
// Rôle : mettre en cache le shell statique (index.html, manifest.json) ET
// le SDK Firebase compat chargé depuis gstatic.com, pour une ouverture
// hors-ligne fiable. Architecture volontairement simple suite aux
// incidents du 18/09/2026 (voir README) : pas d'import() dynamique
// cross-origin, pas de logique de réinjection de données.

const CACHE_NAME = 'courses-lc-shell-v2';
// Préfixe utilisé pour ne nettoyer QUE les anciennes versions du cache de
// CETTE app. caches.keys() renvoie tous les caches du domaine (Portail,
// Muscu, Budget inclus) : ne jamais utiliser un filtre qui ne se base pas
// sur ce préfixe, sous peine de supprimer le cache des autres apps.
const CACHE_PREFIX = 'courses-lc-shell-';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// SDK Firebase (autre origine, gstatic.com) : mis en cache en mode
// 'no-cors' explicite (leçon du 18/09/2026 — le mode 'cors' par défaut de
// cache.add() peut échouer silencieusement selon le CDN, alors qu'un
// <script src="..."> classique, lui, réussit toujours ; la réponse
// 'no-cors' est opaque mais parfaitement utilisable comme source de
// script). Version figée (10.12.2) : mettre à jour cette liste si jamais
// la version change dans index.html.
const FIREBASE_FILES = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

function requeteExterne(url){
  return new Request(url, { mode: 'no-cors' });
}

async function mettreEnCacheAvecRetry(cache, url, externe){
  const req = externe ? requeteExterne(url) : url;
  try {
    await cache.add(req);
  } catch (err1) {
    try {
      await cache.add(req);
    } catch (err2) {
      console.warn('[sw] échec définitif de mise en cache :', url, err2);
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all([
        ...SHELL_FILES.map((url) => mettreEnCacheAvecRetry(cache, url, false)),
        ...FIREBASE_FILES.map((url) => mettreEnCacheAvecRetry(cache, url, true)),
      ])
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // SDK Firebase : cache-first, en dehors de toute logique de scope/origine.
  if (FIREBASE_FILES.includes(event.request.url)) {
    event.respondWith(
      caches.match(event.request.url).then((reponseCache) => {
        if (reponseCache) return reponseCache;
        return fetch(requeteExterne(event.request.url)).then((reponseReseau) => {
          const copie = reponseReseau.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request.url, copie));
          return reponseReseau;
        });
      })
    );
    return;
  }

  // Jamais d'interception hors de cette origine (Firestore, Auth : réseau normal).
  if (url.origin !== self.location.origin) return;

  // Jamais d'interception hors du dossier de CE service worker (/Course/).
  const scopePath = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scopePath)) return;

  const chemin = url.pathname.slice(scopePath.length);
  const estFichierDuShell = chemin === '' || chemin === 'index.html' || chemin === 'manifest.json';
  if (!estFichierDuShell) return;

  event.respondWith(
    caches.match(event.request).then((reponseCache) => {
      if (reponseCache) return reponseCache;
      return fetch(event.request).then((reponseReseau) => {
        if (reponseReseau && reponseReseau.status === 200) {
          const copie = reponseReseau.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copie));
        }
        return reponseReseau;
      });
    })
  );
});
