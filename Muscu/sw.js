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

   Ce qui EST mis en cache : uniquement le shell statique — cette page et,
   s'ils existent, les fichiers d'icône externes référencés dans son <head>.
   Au 17/09/26, apple-touch-icon.png et icon-512.png sont référencés dans
   index.html mais absents du dépôt (404) — cache.add() est fait fichier par
   fichier (pas cache.addAll(), qui échoue en bloc au premier 404) pour que
   l'absence de ces deux fichiers n'empêche jamais la mise en cache
   d'index.html. Le jour où ils seront ajoutés au dépôt, ils commenceront à
   se mettre en cache automatiquement, sans toucher à ce fichier.

   Ce qui N'est PAS mis en cache et ne doit jamais l'être : Firestore
   (firestore.googleapis.com), l'API Gemini (generativelanguage.googleapis.com),
   les polices Google. Le fetch handler ci-dessous les laisse filer vers le
   réseau sans même les regarder, via le test d'origine — pas besoin de les
   lister nommément. Firestore gère déjà sa propre persistance hors-ligne ;
   ce service worker n'a pas à s'en mêler. */

const CACHE_NAME = 'muscu-shell-v1';

/* Recalculé à chaque usage plutôt que mis en cache une fois pour toutes :
   self.registration.scope est disponible aussi bien dans install/activate
   que dans fetch, et le recalcul est trivial (quelques new URL()). */
function shellUrls(){
  const scope = self.registration.scope;
  return [
    scope,
    new URL('index.html', scope).href,
    new URL('apple-touch-icon.png', scope).href,
    new URL('icon-512.png', scope).href,
  ];
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        shellUrls().map((url) =>
          cache.add(url).catch((err) => {
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
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  /* Seules les requêtes GET sont concernées par le cache — POST/PUT vers
     Firestore ne passeraient de toute façon jamais le test d'origine
     ci-dessous, mais autant l'exclure d'emblée. */
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Jamais une autre origine : Firestore, l'API Gemini et les polices
     Google sont ainsi ignorées sans avoir à les nommer. */
  if(url.origin !== self.location.origin) return;

  const scopePath = new URL(self.registration.scope).pathname;
  /* Jamais en dehors de ce dossier : le portail, /Budget/ et /Course/
     restent hors de portée quel que soit le chemin de déploiement réel. */
  if(!url.pathname.startsWith(scopePath)) return;

  const known = shellUrls().some((u) => new URL(u).pathname === url.pathname);
  if(!known) return; /* pas un fichier du shell : réseau normal, pas de cache */

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
