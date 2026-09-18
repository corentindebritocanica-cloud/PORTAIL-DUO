# Lisa-CorentinBudget

## Changelog

### v2.9.6 — Correctif Accordéons (2026-09-18)
- Correctif : les flèches d'accordéon (▼) des cartes de la vue Mensuelle (Répartition, Charges, Dépenses, Épargne, Provisions) étaient inertes — le clic sur l'en-tête ne repliait/dépliait pas la carte.
- Cause : l'écouteur de clic gérant l'accordéon (`toggleSection`) n'était attaché qu'à l'intérieur de la vue Admin (pour la corbeille), et non de façon globale.
- Correction : remplacement par un écouteur délégué unique sur `document.body`, qui capte tout `.card-header[data-target]` cliqué, quelle que soit la vue active.

### v2.9.7 — Cartes repliées par défaut (2026-09-18)
- Changement : dans la vue Mensuelle, les cartes Répartition, Charges, Dépenses, Épargne et Provisions s'affichent désormais repliées par défaut à l'ouverture d'un mois.
- Il suffit d'appuyer sur la flèche ▼ de l'en-tête pour déplier la carte qui vous intéresse (comportement inchangé, seul l'état initial change).

### v3.0.0 — Migration Realtime Database → Firestore (2026-09-18)
- Changement majeur : la persistance des données passe de Firebase Realtime Database à Firebase Firestore.
- Structure : chaque mois est désormais un document Firestore distinct (collection `mois`, identifiant = l'id du mois), au lieu d'un unique tableau réécrit en entier à chaque modification (`budgetDataLC`). La config (catégories, corbeille, objectifs de provisions) est dans un document unique `config/global`.
- Avant bascule : sauvegarde JSON complète de la RTDB effectuée et vérifiée (9 mois + config, comparaison champ par champ à 100%). La Realtime Database n'a pas été supprimée et reste disponible en lecture comme filet de sécurité, mais l'app n'y écrit et n'y lit plus rien après cette version.
- Le nœud `budgetVoyagesLC` (ancienne fonctionnalité Vacances, déjà inutilisée par l'app) n'a pas été migré ; il reste uniquement dans la RTDB et dans la sauvegarde JSON archivée.
- Règles de sécurité Firestore mises en place : lecture/écriture réservées aux utilisateurs authentifiés (`request.auth != null`), sur le même principe que les règles RTDB précédentes.
- Corrections associées : la suppression d'un mois supprime désormais réellement le document Firestore correspondant ; le bouton "Annuler" (undo) après suppression d'une ligne sauvegarde le bon mois même si l'utilisateur a changé d'onglet entre-temps ; la restauration manuelle par fichier .json remplace proprement toute la collection (ajouts, mises à jour et suppressions des mois absents du fichier importé) au lieu de ne sauvegarder que le mois actif.

### v3.0.1 — Correctif structure DOM + ouverture auto des cartes (2026-09-18)
- Correctif critique : une balise `<div id="repartition-m" ...>` introduite en v2.9.7 avait perdu son chevron fermant (`>`). Cette erreur de frappe corrompait silencieusement toute la structure du DOM en dessous : les cartes Charges, Dépenses, Épargne et Provisions se retrouvaient hors du conteneur `mois-content-wrapper` censé porter l'écouteur de clic pour les suppressions. Conséquence : les croix rouges de suppression ne répondaient plus, sur aucune ligne, dans aucune carte.
- Diagnostic confirmé par un test automatisé (jsdom) reproduisant le rendu réel de l'app et l'ancêtre DOM du bouton de suppression, avant et après correction.
- Changement : cliquer sur "+ Nouvelle charge / dépense / provision" ou "+ Épargner" alors que la carte correspondante est repliée la déplie désormais automatiquement, pour que la ligne ajoutée soit immédiatement visible.

### v3.0.2 — Persistance Firestore hors ligne + Service Worker (2026-09-18)
- Harmonisation offline avec Muscu et Course (voir leurs README respectifs) : jusqu'ici, malgré la migration Firestore de la v3.0.0, Budget n'avait **aucun** mécanisme fiable de fonctionnement hors ligne — ni côté données (aucune persistance Firestore activée), ni côté shell de l'app (aucun Service Worker).
- **Persistance des données** : ajout de `db.enablePersistence({synchronizeTabs:true})` juste après l'initialisation de Firestore (`firebase.firestore()`), avec gestion des erreurs `failed-precondition` (plusieurs onglets ouverts) et `unimplemented` (navigateur non supporté) — identique au code déjà en place sur Course. Les données des mois (collection `mois`) et de la config (`config/global`) sont désormais mises en cache localement (IndexedDB) et restent lisibles/modifiables hors connexion, synchronisées au retour du réseau.
- **Ouverture hors ligne du shell** : création de `Budget/sw.js` (nouveau fichier, n'existait pas avant, contrairement à Muscu et Course qui avaient déjà le leur) et enregistrement dans `index.html` via `navigator.serviceWorker.register('sw.js', { scope: './' })`. Met en cache `index.html`, `manifest.json` et `icone.PNG` (shell statique uniquement — jamais Firestore/Auth ni les SDK/CDN externes, qui partent normalement sur le réseau).
- ✅ **Anomalie repérée le 18/09/2026, corrigée le même jour** : `manifest.json` référençait l'icône en `icone.png` (minuscule), alors que le fichier réel dans le dépôt s'appelle `icone.PNG` (majuscules), ce qui pouvait casser l'icône d'installation PWA selon la sensibilité à la casse du serveur. Les deux entrées du tableau `icons` de `manifest.json` référencent désormais `icone.PNG`, comme le fichier réel et comme `sw.js`.

### v3.0.3 — Cache Firestore persistant modernisé (2026-09-18)
- Remplacement de `db.enablePersistence({synchronizeTabs:true})` (API dépréciée depuis le SDK v10) par `initializeFirestore(..., { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`, l'API moderne recommandée par Firebase — même mécanisme que celui déjà utilisé sur Muscu.
- Contrainte technique : le fichier reste sur le SDK Firebase **compat** (`firebase.firestore()`, `db.collection()...`, pas de passage en `type="module"`, qui aurait cassé le fonctionnement des `onclick="..."` du HTML). Les fonctions modulaires `initializeFirestore`/`persistentLocalCache`/`persistentMultipleTabManager` sont donc chargées via un `import()` dynamique (autorisé dans un script classique) plutôt qu'un `import` statique.
- `db` et `auth` sont désormais assignés de façon asynchrone, dans une IIFE exposée via la promesse `dbReady`. Le tout premier `authListen(...)` qui démarre l'app (écran de connexion / chargement des données) attend `dbReady` avant de s'exécuter, pour garantir que Firestore et Auth sont pleinement initialisés avant toute lecture/écriture — élimine tout risque de "course" entre l'auth (éventuellement déjà en session) et l'init du cache Firestore.
- En cas d'échec du cache persistant (navigateur non supporté, plusieurs onglets, etc.), repli silencieux sur le cache mémoire par défaut de Firestore, avec un `console.warn` explicite.

### v3.0.4 — Correctif critique : bug cross-app dans sw.js (2026-09-18)
Suite à un signalement de problème d'ouverture hors-ligne sur **Course** (app sœur dans ce même dépôt), audit du `sw.js` des 4 apps du dépôt (Portail, Course, Muscu, Budget). Le `activate` handler de Budget faisait `caches.keys().filter(key => key !== CACHE_NAME).map(key => caches.delete(key))` — or `caches.keys()` renvoie **tous les caches de tout le domaine**, pas seulement celui de Budget, donc ce code supprimait aussi le cache du Portail, de Course et de Muscu dès que le Service Worker de Budget s'activait (et réciproquement, les 3 autres `sw.js` avaient exactement le même bug et supprimaient le cache de Budget dès leur propre activation). Corrigé en ajoutant un `CACHE_PREFIX = 'budget-lc-shell-'` et en filtrant `keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)` : Budget ne nettoie désormais que ses propres anciennes versions de cache, jamais celles des autres apps. Même correctif appliqué aux 3 autres `sw.js` du dépôt (voir le README du Portail, section 8, pour le détail complet incluant le bouton "Vider le cache" du Portail qui avait le même problème).
