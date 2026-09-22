// Service Worker — Budget L&C
// Rôle : mettre en cache le "shell" statique de CETTE app (index.html,
// manifest.json, icone.PNG) ET les scripts externes bloquants chargés en
// CDN (SDK Firebase, Sortable.js), pour qu'elle puisse
// s'ouvrir hors-ligne. Stratégie cache-first pour ces fichiers UNIQUEMENT.
// Ne touche jamais à Firestore/Auth eux-mêmes (persistance offline gérée
// séparément via persistentLocalCache), ni à aucune requête en dehors de
// ce dossier (la racine du portail, /Muscu/, /Course/ ne sont jamais
// interceptés par ce service worker).

const CACHE_NAME = 'budget-lc-shell-r45';
// Préfixe utilisé pour ne nettoyer QUE les anciennes versions du cache de
// CETTE app au moment de l'activation. Sans ça, caches.keys() renvoie tous
// les caches de tout le domaine (Portail, Course, Muscu inclus), et un
// filtre `!== CACHE_NAME` les supprimait tous par erreur (bug corrigé le
// 18/09/2026 — voir README, section Historique).
const CACHE_PREFIX = 'budget-lc-shell-';

// Chemins relatifs à l'emplacement de ce script (/Budget/sw.js) : ils
// restent valables quel que soit le sous-chemin d'hébergement GitHub Pages.
const SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icone.PNG'
];

// Scripts externes chargés en CDN (autres origines) : ces fichiers ne sont
// PAS interceptés par le test d'origine plus bas (fetch), donc sans les
// nommer ici, ils dépendent uniquement du cache HTTP par défaut de Safari
// — que iOS peut vider. Ajouté le 18/09/2026 après un signalement (sur
// Course, même mécanisme) d'ouverture hors-ligne restant bloquée sur
// l'écran de fond : les <script> du <head> sont tous synchrones (pas de
// defer/async), donc bloquants pour tout le reste de la page tant qu'ils
// n'ont pas répondu — sans eux en cache, la page entière reste gelée en
// attendant leur échec réseau. Versions figées : mettre à jour cette liste
// si jamais une version change dans index.html.
const EXTERNAL_FILES = [
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Chaque fichier est mis en cache indépendamment : si l'un échoue,
      // les autres sont quand même conservés, et l'installation n'échoue pas.
      Promise.all(
        [...SHELL_FILES, ...EXTERNAL_FILES].map((url) =>
          cache.add(SHELL_FILES.includes(url) ? new Request(url, { cache: 'reload' }) : url).catch((err) => console.warn('Précache impossible :', url, err))
        )
      )
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

  // Scripts externes (Sortable, SDK Firebase) : cache-first, en
  // dehors de toute logique de scope/origine — voir EXTERNAL_FILES ci-dessus.
  if (EXTERNAL_FILES.includes(event.request.url)) {
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
    return;
  }

  // Jamais d'interception hors de cette origine pour le reste (Firestore,
  // Auth : tout part normalement sur le réseau, sans passer par ce
  // service worker).
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
  const estFichierDuShell = chemin === '' || chemin === 'index.html' || chemin === 'style.css' || chemin === 'app.js' || chemin === 'manifest.json' || chemin === 'icone.PNG';
  if (!estFichierDuShell) return;

  // index.html : réseau d'abord (voir reseauPuisCache) ; manifest et icône : cache-first.
  if (chemin === '' || chemin === 'index.html' || chemin === 'style.css' || chemin === 'app.js') {
    event.respondWith(reseauPuisCache(event.request));
    return;
  }

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
