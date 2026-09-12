// Service Worker — Courses L&C
// Met en cache l'app shell (HTML/CSS/JS/polices/SDK Firebase) pour que
// l'app se lance même sans réseau. Les échanges temps réel avec Firebase
// (base de données, auth) ne sont jamais interceptés.

const CACHE_NAME = 'courses-lc-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icone.png',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Chaque URL est mise en cache indépendamment : si l'une échoue
      // (ex: icone.png absent), les autres sont quand même conservées.
      return Promise.all(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => console.warn('Précache impossible :', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(noms =>
      Promise.all(noms.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Ne jamais intercepter les échanges temps réel / auth avec Firebase
  if (
    url.includes('firebaseio.com') ||
    url.includes('firebasedatabase.app') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // Stratégie : répondre depuis le cache immédiatement si possible,
  // tout en rafraîchissant le cache en tâche de fond dès que le
  // réseau est disponible. Fallback réseau si rien en cache.
  event.respondWith(
    caches.match(event.request).then(reponseCache => {
      const misAJourReseau = fetch(event.request).then(reponseReseau => {
        if (reponseReseau && reponseReseau.status === 200) {
          const copie = reponseReseau.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copie));
        }
        return reponseReseau;
      }).catch(() => reponseCache);

      return reponseCache || misAJourReseau;
    })
  );
});
