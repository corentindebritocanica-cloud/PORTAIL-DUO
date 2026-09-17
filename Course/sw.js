// Service Worker — Courses L&C
// Rôle : mettre en cache le "shell" statique de CETTE app (index.html,
// manifest.json, icone.png) pour qu'elle puisse s'ouvrir hors-ligne.
// Stratégie cache-first pour ces 3 fichiers UNIQUEMENT.
// Ne touche jamais à Firestore/Auth (projet Firebase course-app-36e9d,
// qui gère déjà sa propre persistance offline via enablePersistence),
// ni au SDK Firebase/Google Fonts chargés en CDN, ni à aucune requête
// en dehors de ce dossier (/Muscu/, /Budget/, la racine du portail ne
// sont jamais interceptés par ce service worker).

const CACHE_NAME = 'courses-lc-shell-v1';

// Chemins relatifs à l'emplacement de ce script (/Course/sw.js) : ils
// restent valables quel que soit le sous-chemin d'hébergement GitHub Pages.
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icone.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Chaque fichier est mis en cache indépendamment : si l'un échoue
      // (ex: icone.png, actuellement absent du dossier /Course/), les
      // autres sont quand même conservés, et l'installation n'échoue pas.
      Promise.all(
        SHELL_FILES.map((url) =>
          cache.add(url).catch((err) => console.warn('Précache impossible :', url, err))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jamais d'interception hors de cette origine (donc jamais Firestore,
  // Auth, SDK Firebase en CDN, ni Google Fonts : tout part normalement
  // sur le réseau, sans passer par ce service worker).
  if (url.origin !== self.location.origin) return;

  // Jamais d'interception hors du dossier de CE service worker
  // (/Course/) : la racine du portail, /Muscu/ et /Budget/ ne sont
  // jamais concernés, même si ce fichier venait à changer de portée.
  const scopePath = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scopePath)) return;

  // Parmi les requêtes de ce dossier, ne traiter en cache-first QUE
  // les 3 fichiers du shell statique ; tout le reste (JS de l'app
  // chargé dynamiquement, etc.) part normalement sur le réseau.
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
