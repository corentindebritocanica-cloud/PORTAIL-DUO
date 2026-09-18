// Service Worker — Courses L&C
// Rôle : mettre en cache le "shell" statique de CETTE app (index.html,
// manifest.json, icone.png) ET le SDK Firebase chargé depuis gstatic.com,
// pour qu'elle puisse s'ouvrir hors-ligne. Stratégie cache-first pour ces
// fichiers UNIQUEMENT. Ne touche jamais à Firestore/Auth eux-mêmes (projet
// Firebase course-app-36e9d, qui gère déjà sa propre persistance offline),
// ni à Google Fonts, ni à aucune requête en dehors de ce dossier (/Muscu/,
// /Budget/, la racine du portail ne sont jamais interceptés par ce service
// worker).

const CACHE_NAME = 'courses-lc-shell-v3';
// Préfixe utilisé pour ne nettoyer QUE les anciennes versions du cache de
// CETTE app au moment de l'activation. Sans ça, caches.keys() renvoie tous
// les caches de tout le domaine (Portail, Muscu, Budget inclus), et un
// filtre `!== CACHE_NAME` les supprimait tous par erreur (bug corrigé le
// 18/09/2026 — voir README, section Historique).
const CACHE_PREFIX = 'courses-lc-shell-';

// Chemins relatifs à l'emplacement de ce script (/Course/sw.js) : ils
// restent valables quel que soit le sous-chemin d'hébergement GitHub Pages.
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icone.png'
];

// SDK Firebase chargé depuis gstatic.com (une autre origine) : ces fichiers
// ne sont PAS interceptés par le test d'origine plus bas (fetch), donc sans
// les nommer ici, ils dépendent uniquement du cache HTTP par défaut de
// Safari — que iOS peut vider. Version figée (10.12.2) : mettre à jour
// cette liste si jamais la version change dans index.html.
//
// v3 (18/09/2026) : passage en mode 'no-cors' explicite pour la mise en
// cache de ces fichiers. En v2, `cache.add(url)` sur une simple chaîne
// utilisait le mode 'cors' par défaut — et ces mises en cache échouaient
// silencieusement (capturées par le .catch() de l'installation), alors que
// l'import() direct de la page, lui, réussissait online (ce qui masquait
// le problème pendant les tests en ligne). Résultat en pratique : le SDK
// Firebase modulaire n'était jamais réellement dans le cache, provoquant
// l'échec de l'import hors-ligne ("Importing a module script failed"),
// repli de Firestore sur le cache mémoire (vidé à chaque fermeture
// complète de l'app), et donc un catalogue vide au démarrage hors-ligne.
// Le mode 'no-cors' fonctionne indépendamment des en-têtes CORS du CDN :
// la réponse est "opaque" (illisible en JS) mais parfaitement utilisable
// comme source de script/import, ce qui est tout ce dont on a besoin ici.
const FIREBASE_FILES = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
];

// Requête forcée en no-cors, pour les fichiers externes ci-dessus.
function requeteExterne(url){
  return new Request(url, { mode: 'no-cors' });
}

// Tente de mettre une URL en cache, avec 1 nouvel essai en cas d'échec
// (les CDN peuvent avoir un raté ponctuel) avant d'abandonner pour ce
// fichier précis sans bloquer l'installation des autres.
async function mettreEnCacheAvecRetry(cache, url, options){
  const req = options && options.externe ? requeteExterne(url) : url;
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
        ...SHELL_FILES.map((url) => mettreEnCacheAvecRetry(cache, url, { externe: false })),
        ...FIREBASE_FILES.map((url) => mettreEnCacheAvecRetry(cache, url, { externe: true })),
      ])
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Fichiers Firebase (autre origine, gstatic.com) : cache-first, en dehors
  // de toute logique de scope/origine — voir FIREBASE_FILES ci-dessus.
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

  // Jamais d'interception hors de cette origine pour le reste (Firestore,
  // Auth, Google Fonts : tout part normalement sur le réseau, sans passer
  // par ce service worker).
  if (url.origin !== self.location.origin) return;

  // Jamais d'interception hors du dossier de CE service worker
  // (/Course/) : la racine du portail, /Muscu/ et /Budget/ ne sont
  // jamais concernés, même si ce fichier venait à changer de portée.
  const scopePath = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scopePath)) return;

  // Parmi les requêtes de ce dossier, ne traiter en cache-first QUE
  // les fichiers du shell statique ; tout le reste (JS de l'app chargé
  // dynamiquement, etc.) part normalement sur le réseau.
  const chemin = url.pathname.slice(scopePath.length);
  const estFichierDuShell = chemin === '' || chemin === 'index.html' || chemin === 'manifest.json' || chemin === 'icone.png';
  if (!estFichierDuShell) return;

  // Cache-first : on répond depuis le cache si présent, sinon on va
  // chercher sur le réseau (et on alimente le cache pour la prochaine fois).
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
