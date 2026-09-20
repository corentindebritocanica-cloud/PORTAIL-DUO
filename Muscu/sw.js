/* Service worker — Duo Training (Muscu)
   Ajouté le 17/09/26 pour permettre l'ouverture hors-ligne du "shell" de
   l'app, sur le même principe que le sw.js du Portail Duo à la racine du
   dépôt — mais strictement local à ce dossier.

   Portée : ce fichier est enregistré depuis index.html avec
   `navigator.serviceWorker.register('sw.js', { scope: './' })` — un chemin
   RELATIF, volontairement, pour ne jamais dépendre de l'URL absolue de
   déploiement (page GitHub Pages de projet, domaine perso, etc.). Le scope
   qui en résulte est toujours "le dossier qui contient ce fichier", donc ce
   service worker ne peut mécaniquement jamais intercepter le portail,
   /Budget/ ou /Course/, même copié tel quel ailleurs par erreur.

   Ce qui EST mis en cache : le shell statique — cette page, les fichiers
   d'icône externes référencés dans son <head> (s'ils existent), ET le SDK
   Firebase modulaire chargé depuis gstatic.com (voir FIREBASE_FILES plus
   bas, ajouté le 18/09/2026). Au 17/09/26, apple-touch-icon.png et
   icon-512.png sont référencés dans index.html mais absents du dépôt
   (404) — cache.add() est fait fichier par fichier (pas cache.addAll(),
   qui échoue en bloc au premier 404) pour que l'absence de ces deux
   fichiers n'empêche jamais la mise en cache d'index.html. Le jour où ils
   seront ajoutés au dépôt, ils commenceront à se mettre en cache
   automatiquement, sans toucher à ce fichier.

   Pourquoi le SDK Firebase est désormais mis en cache (18/09/2026) : Muscu
   le charge via des `import` ES statiques dans un `<script type="module">`
   (voir index.html) — si ces imports échouent hors-ligne (fichiers absents
   du cache HTTP par défaut de Safari, que iOS peut vider), le module entier
   ne s'exécute PAS DU TOUT (pas d'exécution partielle en JS : un import qui
   échoue fait échouer tout le module), donc aucune fonctionnalité de l'app
   ne démarre. Correctif suite à un signalement du même symptôme sur Course
   (voir son README et celui du Portail, section 8).

   Ce qui N'est PAS mis en cache et ne doit jamais l'être : Firestore
   (firestore.googleapis.com), l'API Gemini (generativelanguage.googleapis.com),
   les polices Google. Le fetch handler ci-dessous les laisse filer vers le
   réseau sans même les regarder, via le test d'origine — pas besoin de les
   lister nommément. Firestore gère déjà sa propre persistance hors-ligne ;
   ce service worker n'a pas à s'en mêler. */

const CACHE_NAME = 'muscu-shell-r16';
// Préfixe utilisé pour ne nettoyer QUE les anciennes versions du cache de
// CETTE app au moment de l'activation. Sans ça, caches.keys() renvoie tous
// les caches de tout le domaine (Portail, Course, Budget inclus), et un
// filtre `!== CACHE_NAME` les supprimait tous par erreur (bug corrigé le
// 18/09/2026 — voir README, section Historique).
const CACHE_PREFIX = 'muscu-shell-';

// SDK Firebase modulaire chargé depuis gstatic.com (une autre origine) :
// versions figées (12.18.0) — mettre à jour cette liste si jamais la
// version change dans index.html.
const FIREBASE_FILES = [
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'
];

/* Recalculé à chaque usage plutôt que mis en cache une fois pour toutes :
   self.registration.scope est disponible aussi bien dans install/activate
   que dans fetch, et le recalcul est trivial (quelques new URL()). */
function shellUrls(){
  const scope = self.registration.scope;
  return [
    scope,
    new URL('index.html', scope).href,
    new URL('style.css', scope).href,
    new URL('app.js', scope).href,
    new URL('apple-touch-icon.png', scope).href,
    new URL('icon-512.png', scope).href,
  ];
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        [...shellUrls(), ...FIREBASE_FILES].map((url) =>
          cache.add(FIREBASE_FILES.includes(url) ? url : new Request(url, { cache: 'reload' })).catch((err) => {
            console.warn('[sw] pas mis en cache (probablement un 404) :', url, err);
          })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n.startsWith(CACHE_PREFIX) && n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
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
  const req = event.request;

  /* Seules les requêtes GET sont concernées par le cache — POST/PUT vers
     Firestore ne passeraient de toute façon jamais le test d'origine
     ci-dessous, mais autant l'exclure d'emblée. */
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  /* SDK Firebase (autre origine, gstatic.com) : cache-first, en dehors de
     toute logique de scope/origine — voir FIREBASE_FILES ci-dessus. */
  if (FIREBASE_FILES.includes(req.url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  /* Jamais une autre origine pour le reste : Firestore, l'API Gemini et
     les polices Google sont ainsi ignorées sans avoir à les nommer. */
  if(url.origin !== self.location.origin) return;

  const scopePath = new URL(self.registration.scope).pathname;
  /* Jamais en dehors de ce dossier : le portail, /Budget/ et /Course/
     restent hors de portée quel que soit le chemin de déploiement réel. */
  if(!url.pathname.startsWith(scopePath)) return;

  const known = shellUrls().some((u) => new URL(u).pathname === url.pathname);
  if(!known) return; /* pas un fichier du shell : réseau normal, pas de cache */

  /* index.html / racine du dossier : réseau d'abord (voir reseauPuisCache) ;
     icônes : cache-first. */
  if (url.pathname === scopePath || ['index.html', 'style.css', 'app.js'].some((f) => url.pathname === new URL(f, self.registration.scope).pathname)) {
    event.respondWith(reseauPuisCache(req));
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if(cached) return cached;
      return fetch(req).then((res) => {
        if(res.ok){
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    }).catch(() => caches.match(new URL('index.html', self.registration.scope).href))
  );
});
