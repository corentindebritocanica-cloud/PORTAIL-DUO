// Service worker du Portail Duo
// Rôle : mettre en cache le "shell" du portail (index.html, manifest, icônes)
// pour qu'il puisse s'ouvrir hors-ligne. Ne touche pas aux sous-apps
// (Muscu/, Budget/, Course/), qui gèrent leur propre cache indépendamment.

const CACHE_NAME = 'portail-duo-shell-r54';
// Préfixe utilisé pour ne nettoyer QUE les anciennes versions du cache de
// CETTE app au moment de l'activation. Sans ça, caches.keys() renvoie tous
// les caches de tout le domaine (Course, Muscu, Budget inclus), et un
// filtre `!== CACHE_NAME` les supprimait tous par erreur (bug corrigé le
// 18/09/2026 — voir README, section Historique).
const CACHE_PREFIX = 'portail-duo-shell-';
// Scindé le 22/09/2026 (voir README, « Page noire hors-ligne ») : CRITIQUES = la page ne
// peut pas s'afficher sans eux, ANNEXES = son confort seulement (icône, manifest). Si
// cache.addAll() échoue à cause d'UN SEUL fichier annexe (404 passager pendant un déploiement,
// par ex.), les fichiers critiques doivent quand même finir en cache.
const SHELL_CRITIQUES = ['./', './index.html', './style.css', './app.js'];
const SHELL_ANNEXES = ['./manifest.json', './icone-192.png', './icone-512.png', './icone-512-maskable.png'];

// SDK Firebase (autre origine, gstatic.com) pour le tableau de bord (22/09/2026) : mis en cache en mode
// 'no-cors' (réponse opaque, mais utilisable comme source de script) pour que le Portail puisse relire
// la base même après une ouverture hors ligne. Même version que SDK dans app.js — à tenir à jour ensemble.
// Ces fichiers sont chargés APRÈS le premier affichage : leur absence ne bloque jamais la page.
const FIREBASE_FILES = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

// Installation : mise en cache du shell. Chaque fichier annexe (et, en repli, chaque
// fichier critique) est mis en cache INDIVIDUELLEMENT : avec cache.addAll() seul, UN SEUL
// fichier en échec (404 passager, déploiement en cours) annulait tout, y compris index.html/
// app.js/style.css — l'app restait alors indisponible hors-ligne (voir README).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(SHELL_CRITIQUES.map((u) => new Request(u, { cache: 'reload' })));
      } catch (err) {
        console.warn('[sw] cache.addAll (critiques) a échoué, reprise fichier par fichier :', err);
        await Promise.all(SHELL_CRITIQUES.map((u) =>
          fetch(new Request(u, { cache: 'reload' }))
            .then((r) => { if (r && r.ok) return cache.put(u, r); })
            .catch((e) => console.warn('[sw] fichier critique non mis en cache :', u, e))
        ));
      }
      await Promise.all(SHELL_ANNEXES.map((u) =>
        fetch(new Request(u, { cache: 'reload' }))
          .then((r) => { if (r && r.ok) return cache.put(u, r); })
          .catch((e) => console.warn('[sw] fichier annexe non mis en cache :', u, e))
      ));
      // SDK Firebase, facultatif lui aussi (déjà le cas avant ce correctif).
      // ⚠️ fetch + put, PAS cache.add() : add() rejette une réponse opaque (no-cors, statut 0), put() l'accepte.
      await Promise.all(FIREBASE_FILES.map((url) =>
        fetch(new Request(url, { mode: 'no-cors' })).then((rep) => cache.put(url, rep))
          .catch((err) => console.warn('[sw] SDK non mis en cache :', url, err))
      ));
    })
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
// Page minimale, sans dépendance externe (pas de style.css : elle doit s'afficher même si
// RIEN n'a pu être mis en cache). Dernier filet avant une page noire ou blanche indéfinie.
function pageSecours(){
  return new Response(
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<title>Portail Duo</title><style>' +
    'html,body{height:100%;margin:0;background:#0d1014;color:#e9eff6;' +
    'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;' +
    'display:flex;align-items:center;justify-content:center;text-align:center;' +
    'padding:24px calc(24px + env(safe-area-inset-right)) 24px calc(24px + env(safe-area-inset-left));' +
    'box-sizing:border-box}' +
    '.c{max-width:320px}h1{font-size:20px;margin:0 0 8px}' +
    'p{font-size:14px;color:#8a97a8;margin:0 0 22px;line-height:1.5}' +
    'button{min-height:44px;padding:0 24px;border-radius:14px;border:none;' +
    'background:#1a5fc4;color:#fff;font-size:15px;font-weight:700}' +
    '</style></head><body><div class="c">' +
    '<h1>Pas de réseau</h1>' +
    '<p>Le Portail n\'a pas encore de copie utilisable hors-ligne sur cet appareil. ' +
    'Réessaie une fois connecté au Wi-Fi ou aux données mobiles.</p>' +
    '<button onclick="location.reload()">Réessayer</button>' +
    '</div></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
function reseauPuisCache(requete){
  return new Promise((resolve) => {
    let termine = false;
    const finir = (r) => { if (!termine) { termine = true; resolve(r); } };
    const repliCache = () => caches.match(cleCache(requete)).then((r) => r || caches.match(new URL('index.html', self.registration.scope).href));
    // ⚠️ 22/09/2026 : à ce délai, on résout TOUJOURS — avec le cache s'il a quelque chose,
    // sinon avec la page de secours. Avant ce correctif, un cache vide au moment du délai
    // laissait la promesse ouverte en attendant l'échec du fetch réseau, qui peut prendre
    // bien plus de 4 s sur iPhone en zone de mauvais réseau (DNS/TCP qui traînent) : la page
    // restait alors noire, potentiellement très longtemps (voir README).
    const minuteur = setTimeout(() => {
      repliCache().then((r) => finir(r || pageSecours()));
    }, DELAI_RESEAU_MS);
    // Requête neuve avec cache:'no-cache' : force la revalidation auprès du serveur (304 si inchangé)
    // et évite de resservir une copie du cache HTTP de Safari (GitHub Pages : max-age=600).
    fetch(new Request(requete.url, { cache: 'no-cache' })).then((reponse) => {
      if (reponse && reponse.status === 200) {
        const copie = reponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(cleCache(requete), copie));
      }
      clearTimeout(minuteur);
      finir(reponse);
    }).catch(() => {
      clearTimeout(minuteur);
      repliCache().then((r) => finir(r || pageSecours()));
    });
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // SDK Firebase : cache-first, en dehors de toute logique de scope/origine.
  if (FIREBASE_FILES.includes(event.request.url)) {
    event.respondWith(
      caches.match(event.request.url).then((reponseCache) => {
        if (reponseCache) return reponseCache;
        return fetch(new Request(event.request.url, { mode: 'no-cors' })).then((reponseReseau) => {
          const copie = reponseReseau.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request.url, copie));
          return reponseReseau;
        });
      })
    );
    return;
  }

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
