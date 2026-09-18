// Service Worker — Budget L&C
// Rôle : mettre en cache le "shell" statique de CETTE app (index.html,
// manifest.json, icone.PNG) pour qu'elle puisse s'ouvrir hors-ligne.
// Stratégie cache-first pour ces fichiers UNIQUEMENT.
// Ne touche jamais à Firestore/Auth (persistance offline gérée séparément
// via enablePersistence), ni aux SDK Firebase / Sortable.js / canvas-confetti
// chargés en CDN, ni à aucune requête en dehors de ce dossier (la racine du
// portail, /Muscu/, /Course/ ne sont jamais interceptés par ce service
// worker).

const CACHE_NAME = 'budget-lc-shell-v1';

// Chemins relatifs à l'emplacement de ce script (/Budget/sw.js) : ils
// restent valables quel que soit le sous-chemin d'hébergement GitHub Pages.
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icone.PNG'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Chaque fichier est mis en cache indépendamment : si l'un échoue,
      // les autres sont quand même conservés, et l'installation n'échoue pas.
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
  // Auth, SDK Firebase/Sortable/confetti en CDN : tout part normalement
  // sur le réseau, sans passer par ce service worker).
  if (url.origin !== self.location.origin) return;

  // Jamais d'interception hors du dossier de CE service worker
  // (/Budget/) : la racine du portail, /Muscu/ et /Course/ ne sont
  // jamais concernés, même si ce fichier venait à changer de portée.
  const scopePath = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scopePath)) return;

  // Parmi les requêtes de ce dossier, ne traiter en cache-first QUE
  // les fichiers du shell statique ; tout le reste part normalement
  // sur le réseau.
  const chemin = url.pathname.slice(scopePath.length);
  const estFichierDuShell = chemin === '' || chemin === 'index.html' || chemin === 'manifest.json' || chemin === 'icone.PNG';
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
