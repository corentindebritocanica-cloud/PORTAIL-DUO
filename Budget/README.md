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

### v3.0.5 — Correctif critique : SDK Firebase + Sortable/confetti absents du cache Service Worker (2026-09-18)
Suite à une persistance du problème d'ouverture hors-ligne sur **Course** malgré le correctif v3.0.4, diagnostic plus poussé sur suggestion de Corentin. Les 4 `<script src="https://www.gstatic.com/...">` (SDK Firebase compat) et les 2 `<script src="https://cdn.jsdelivr.net/...">` (Sortable.js, canvas-confetti) du `<head>` sont des balises **classiques, sans `defer` ni `async`** : le navigateur bloque le traitement de toute la page tant qu'elles n'ont pas répondu. Or le `fetch` handler du `sw.js` ignore explicitement toute origine différente de la sienne, donc ces 6 scripts n'étaient **jamais mis en cache par le Service Worker**, et dépendaient uniquement du cache HTTP par défaut de Safari (que iOS peut vider, notamment en mode standalone). Hors-ligne, si ce cache navigateur ne les avait pas gardés, la page restait bloquée en attendant leur échec réseau — même mécanisme identifié sur Course, appliqué ici par précaution. Corrigé en ajoutant une liste `EXTERNAL_FILES` (les 6 scripts + `firebase-firestore.js`, utilisé par l'`import()` dynamique de la persistance) au `sw.js`, avec une branche cache-first dédiée dans le `fetch` handler, en dehors de toute logique de scope/origine. `CACHE_NAME` passé à `budget-lc-shell-v2` pour forcer la réinstallation du cache avec ces nouveaux fichiers.

### v3.1.0 — Alignement charte UX/UI : suppression de la Garde-robe, sombre par défaut (2026-09-18)
Audit puis mise en conformité avec `/UX_UI_CHARTER.md` (référence : app Muscu), à la demande explicite de Corentin.

- **Suppression complète des 10 thèmes décoratifs** ("Garde-robe" : purple, green, rose, glass/glassmorphism, latte, botanic, gatsby, terracotta, moleskine, watercolor). Retirés : le tableau `THEMES`, la fonction `applyTheme()`, le rendu des pastilles de couleur dans `rendreAdmin()`, le gestionnaire de clic `data-set-theme`, la section admin "🎨 Garde-robe (Thèmes)", et tout le CSS associé (`.color-selector`, `.color-circle`, les ~10 blocs `body.theme-*`). Ne subsiste que la bascule sombre/clair (🌙/☀️), comme sur Muscu, Course et Portail.
- **Bug latent découvert pendant l'audit** : la balise `<body class="theme-glass">` avait ce thème codé en dur dans le HTML statique lui-même, indépendamment du système de classes géré par le JS — probablement resté d'une session de test antérieure. Corrigé en `<body>` simple.
- **Mode sombre passé par défaut** (l'app était jusque-là claire par défaut, sombre en option — à l'inverse des 3 autres apps). Le choix explicite déjà enregistré par Corentin ou Lisa dans `localStorage` (`budgetLC_dark`) est préservé à l'identique ; seul le cas "jamais touché au bouton" bascule désormais vers le sombre. Concrètement : ancienne condition `if (localStorage.getItem(LS_DARK) === 'true')`, devenue `if (localStorage.getItem(LS_DARK) !== 'false')`.
- **Accent unique aligné sur la charte** : `--primary` passe du bleu iOS (`#007AFF`) au bleu Muscu (`#1f8fff`). `--danger`/`--success` alignés sur les valeurs `--danger`/`--done` de la charte (`#ef4444` / `#12b981`). Ces couleurs restent désormais constantes entre clair et sombre (elles ne sont plus redéfinies dans `body.dark-mode`), seuls fond/carte/texte/bordure/ombre varient — même logique que Muscu.
- `manifest.json` : `background_color` et `theme_color` alignés sur `#0d1014` (nouveau fond sombre par défaut, au lieu de `#F2F2F7`/`#007AFF`).
- Ajouts de conformité iOS : meta `apple-mobile-web-app-title` (absente), `overscroll-behavior:none`, `-webkit-overflow-scrolling:touch`, `-webkit-tap-highlight-color:transparent` (toutes absentes du reset CSS `*`/`body`).
- **Non modifié, vérifié intact** : toute la logique métier (Firestore, CRUD mois/charges/dépenses/épargne/provisions, corbeille, objectifs), l'authentification, et la section "📧 Sauvegarde Automatique" avec son bouton d'envoi manuel. Le mécanisme d'envoi automatique du dimanche minuit ne se trouve pas dans `index.html`. ⚠️ **Correction (20/09/2026)** : ce n'est PAS une Cloud Function, mais un **Google Apps Script** (projet « Projet sans titre » du Drive de Corentin, hors dépôt) avec un déclencheur hebdomadaire. Il lisait encore l'ancienne Realtime Database, figée depuis cette migration : les mails du dimanche contenaient des données périmées. Réécrit le 20/09/2026 : lecture de Firestore par compte de service (clé dans la propriété de script `SA_BUDGET`, jamais dans le code), pièce jointe `Sauvegarde_Budget_….json` = tableau de mois **réimportable tel quel** via « Importation manuelle », plus `Sauvegarde_Budget_config_….json` (`config/global`), et un mail « ⚠️ Échec » si la lecture échoue ou revient vide. Le bouton « Envoyer fichier .json par mail » (`doPost`) envoie maintenant à la bonne adresse (il avait encore une adresse par défaut). Après toute modification du script : Déployer → Gérer les déploiements → Nouvelle version, sinon `doPost` garde l'ancien code. Ce même script sert aussi le bouton de sauvegarde des Réglages de **Muscu** (`doPost` reconnaît `{ _app: 'muscu', … }` ; un tableau reste traité comme une sauvegarde Budget). Le script n'est pas versionné dans le dépôt. Voir `PROBLEMES_RESOLUS.md`.
- `--radius-card`/`--radius-input`/nomenclature des variables CSS **non renommés** (contrairement à Course) : gain de cohérence jugé secondaire face au risque d'un renommage sur un fichier de 1300+ lignes à forte valeur métier. Seules les *valeurs* ont été alignées sur la charte, pas les noms des variables.

### v3.2.0 — Sélecteur de profil Corentin/Lisa (2026-09-18)
- Ajout d'un sélecteur de profil dans la section admin (à l'emplacement laissé libre par l'ancienne "Garde-robe", v3.1.0) : deux boutons **Corentin** (bleu `#1f8fff`) / **Lisa** (rose `#ff3d7e`), mêmes couleurs que sur Muscu et Course.
- **Purement une préférence d'affichage par appareil** (`localStorage` : `budgetLC_profil`) : change uniquement la couleur d'accent (`--primary`) via une classe `body.profil-lisa`. Le compte reste unique et partagé — aucune donnée n'est séparée par profil, contrairement à Muscu où Corentin et Lisa ont chacun leurs propres séances.
- Nouvelles variables `--lisa` / `--lisa-light` ajoutées à côté de `--primary`/`--primary-light` existantes.

## Historique — Bandeau de mise à jour du Service Worker + meta tag standard (19/09/2026)

Suite au chantier de débogage du flou/décalage sur Course (voir son propre README), un document de référence a été créé (`/GUIDE_PWA_IOS.md`, racine du dépôt) synthétisant les bugs WebKit rencontrés et les bonnes pratiques iOS. Deux corrections en ont découlé, appliquées identiquement sur les 4 apps (Portail/Muscu/Budget/Course) :

- **Meta tag standard ajouté** : `<meta name="mobile-web-app-capable" content="yes">` à côté du tag `apple-mobile-web-app-capable` existant (jamais retiré — iOS Safari ne lit que l'orthographe Apple). Fait taire l'avertissement de dépréciation de Chrome DevTools sans rien changer côté iOS.
- **Bandeau "🔄 Nouvelle version disponible"** : le `sw.js` de cette app fait déjà `skipWaiting()` + `clients.claim()` automatiquement à chaque mise à jour détectée, mais rien n'informait l'utilisateur qu'un rechargement était nécessaire pour voir le nouveau code — c'est très exactement ce qui a causé des heures de confusion sur Course le 18/09. Un petit bandeau discret (bas d'écran, conscient de la safe-area) apparaît désormais dès qu'une mise à jour du Service Worker est détectée, avec un bouton "Actualiser". Le rechargement n'est **volontairement pas automatique** (`controllerchange` non écouté pour forcer un reload) afin de ne jamais interrompre une saisie en cours — l'utilisateur choisit le moment.
- Vérifié à cette occasion : le bug `height:100dvh` qui avait affecté Course (voir son historique) ne touche pas cette app, qui utilise déjà `min-height:100vh` partout où c'est pertinent.


### v3.3.0 — Renommage de l'onglet Admin en Réglages + horodatage de déploiement (2026-09-19)
- Libellé visible de l'onglet renommé "Admin" → "Réglages" (identifiants internes `data-view="admin"`, `#vue-admin`, fonction `rendreAdmin()` volontairement inchangés — aucun risque sur la logique existante).
- Date/heure du dernier déploiement de code ajoutée juste sous la ligne "Version X.X.X" déjà présente en bas de l'onglet (constante `DERNIERE_MAJ`). **À mettre à jour manuellement à chaque futur commit.**

### v3.4.0 — Barre d'onglets flottante « pilule » (2026-09-20)
Même design que Course (voir `Course/README.md` et `/UX_UI_CHARTER.md` §5.5b), à la demande de Corentin.
- **Onglets Mois / Année / Fixes / Réglages déplacés du haut vers le bas** : ils quittent la `top-nav` (qui ne garde que le titre + bouton thème + liste des mois + « + Démarrer un mois ») et forment une pilule flottante fixe en bas (`div.tabbar-flottante` > `nav.tab-buttons`), 62px de haut, fond verre (`--glass-bar` + `backdrop-filter`), icône + label par onglet (calendrier / histogramme / flèches de répétition / engrenage), onglet actif teinté `--primary-light` + `--primary` (suit donc le profil Corentin bleu / Lisa rose et le mode clair/sombre).
- **JS de navigation inchangé** : la `nav` garde la classe `.tab-buttons` et les `data-view`, donc la délégation de clic (`document.querySelector('.tab-buttons')`) et `changerVue()` fonctionnent sans modification.
- **Hors de `<main>` volontairement** : `changerVue()` masque tous les `main > div` ; la barre est placée avant `<main>` pour ne jamais être masquée (voir point ouvert ci-dessous).
- **Position basse identique à Course** : `--nav-offset: max(2px, calc(env(safe-area-inset-bottom) - 30px))` (~4px du bord sur iPhone), `--tabbar-height: calc(62px + var(--nav-offset))`. `.main-content` reçoit `padding-bottom: tabbar-height + 24px`.
- **`viewport-fit=cover` ajouté au meta viewport** (Budget ne l'avait pas) : nécessaire pour que `env(safe-area-inset-bottom)` renvoie une vraie valeur et que la barre se pose au même endroit que sur Course. Conséquence, compensée : `.top-nav` reçoit `padding-top: calc(15px + env(safe-area-inset-top))` pour que le titre ne passe pas sous la barre de statut.
- **Toasts** : le toast « Nouvelle version disponible » et le toast d'annulation (`#toast.show`) se posent désormais au-dessus de la barre (`bottom: tabbar-height + 12px`) au lieu de la recouvrir.
- **Desktop (≥ 768px)** : la colonne d'onglets de la sidebar disparaît ; la pilule est centrée en bas, largeur max 520px.
- Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `budget-lc-shell-v4` → `v5`.
- ✅ **Bug découvert à cette occasion, corrigé juste après (voir v3.4.1)**.

### v3.4.1 — Correctif : le toast « Annuler » (suppression de ligne) n'était jamais visible (2026-09-20)
- **Symptôme** : après suppression d'une ligne (charge, dépense, épargne, provision), le bandeau « Ligne supprimée — Annuler » n'apparaissait pas, donc impossible d'annuler.
- **Cause** : `<main class="main-content">` n'avait **aucune balise fermante `</main>`**. `<div id="toast">` (et le `<script>`) se retrouvaient donc *dans* `<main>` (confirmé en analysant l'arbre DOM). Or `changerVue()` fait `document.querySelectorAll('main > div').forEach(d => d.classList.toggle('hidden', d.id !== 'vue-' + vue))` : le toast, dont l'id n'est pas `vue-…`, recevait `.hidden` (`display:none !important`) à chaque changement de vue, y compris au démarrage. Le `classList.add('show')` de la suppression n'y pouvait rien.
- **Correction** : ajout de `</main>` juste avant `<div id="toast">`. Test avant/après (même sélecteur `main > div`) : avant → toast `display:none`, parent `MAIN` ; après → parent `BODY`, `display:flex`, visible ; les 4 vues continuent de se masquer/afficher normalement et la barre d'onglets reste visible.
- **Au passage** : `white-space:nowrap` sur `#toast` (le texte « Ligne supprimée » passait sur deux lignes, le toast étant centré avec `left:50%`).
- Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `budget-lc-shell-v5` → `v6`.

### v3.4.2 — Barre d'onglets remontée de 6px (2026-09-20)
Retour d'usage de Corentin : la barre était un peu trop basse sur Budget. `--nav-offset` passe de `max(2px, safe-area − 30px)` (~4px du bord) à **`max(8px, safe-area − 24px)`** (~10px du bord sur iPhone à home indicator) — soit 6px de plus vers le haut. **Budget diverge donc volontairement de Course** (~4px). `--tabbar-height`, le `padding-bottom` de `.main-content` et la position des toasts (« Annuler », « Nouvelle version ») suivent automatiquement. Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `budget-lc-shell-v6` → `v7`.

### v3.4.3 — Barre d'onglets remontée de 4px supplémentaires (2026-09-20)
Nouveau retour de Corentin : encore un peu plus haut. `--nav-offset` passe de `max(8px, safe-area − 24px)` (~10px du bord) à **`max(12px, safe-area − 20px)`** (~14px du bord sur iPhone à home indicator), soit 4px de plus vers le haut (10px cumulés depuis la v3.4.0, qui était à ~4px). Tout le reste (`--tabbar-height`, marge basse de `.main-content`, toasts) suit automatiquement. Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `budget-lc-shell-v7` → `v8`.

### v3.4.4 — Barre d'onglets remontée de 8px supplémentaires (2026-09-20)
Nouveau retour de Corentin : encore plus haut. `--nav-offset` passe de `max(12px, safe-area − 20px)` (~14px du bord) à **`max(20px, safe-area − 12px)`** (~22px du bord sur iPhone à home indicator), soit 8px de plus vers le haut (18px cumulés depuis la v3.4.0, qui était à ~4px). À ~22px du bord, les boutons de la pilule sont désormais entièrement hors de la zone de geste du home indicator. Tout le reste (`--tabbar-height`, marge basse de `.main-content`, toasts) suit automatiquement. Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `budget-lc-shell-v8` → `v9`.


### v3.5.0 — Pop-up « 🔔 Nouveautés » fiabilisé, mise à jour au retour dans l'app, nettoyage SDK (2026-09-20)

**Fonctionnalité à préserver** (jusqu'ici absente de ce README) : quand Lisa (ou Corentin depuis un autre appareil) ajoute, modifie ou supprime une ligne, l'autre voit à sa prochaine ouverture un pop-up « 🔔 Nouveautés » listant les changements (➕ ajout, ✏️ modification avec l'ancien et le nouveau montant, 🗑️ suppression), avec un bouton « J'ai compris ».

**Bug corrigé (probablement en place depuis l'activation du cache persistant, v3.0.2/v3.0.3)** : le pop-up comparait le **premier** snapshot Firestore à une copie locale (`budgetLC_cache`) réécrite à chaque snapshot. Avec le cache persistant, ce premier snapshot vient du cache local (identique à la copie) : aucun écart détecté, `firstLoad` passait à `false`, et le snapshot serveur portant les dépenses de Lisa n'était plus jamais comparé. Diagnostic établi par lecture du code (`snap.metadata.fromCache` n'était jamais consulté) et validé par un harnais de test Node (14 vérifications) ; non observé sur appareil avant correction.

**Nouveau fonctionnement** (`gererNouveautes()`, `calculerChangements()`, `afficherNouveautes()`) :
- **Référence** = dernier état « vu » sur cet appareil, dans `localStorage` (`budgetLC_vu`). L'ancienne clé `budgetLC_cache` n'est plus écrite ; elle est lue une seule fois comme point de départ (migration sans perdre de notification).
- On **ne compare jamais sur un snapshot issu du cache local** (`snap.metadata.fromCache`) : on attend le premier snapshot serveur.
- Les **modifications faites sur cet appareil** (`snap.metadata.hasPendingWrites`) mettent la référence à jour sans pop-up : on ne voit jamais ses propres ajouts. Un champ « auteur » n'a donc pas été ajouté (il aurait fallu toucher tous les points de création de lignes).
- La référence **n'avance ni en arrière-plan, ni tant que le pop-up est ouvert** : elle est enregistrée à la **fermeture** du pop-up (« J'ai compris »). Si l'app est fermée sans le fermer, il réapparaît au lancement suivant.
- **Fenêtre de comparaison** : à l'ouverture de l'app **et à chaque retour au premier plan** (`visibilitychange`, qui remplace le relancement complet que iOS ne fait pas). Les changements qui arrivent en direct pendant qu'on utilise l'app sont simplement affichés à l'écran, sans pop-up.
- Le mois par défaut (« Mars 2026 ») n'est plus créé sur un snapshot vide **issu du cache** (seulement sur un snapshot serveur vide).
- Catégories et noms de mois **échappés** avant injection dans le pop-up (`esc()`).

**Autres changements** :
- **Mise à jour au retour dans l'app + `sw.js` en réseau d'abord pour `index.html`** — même mécanisme que sur les 3 autres apps (voir section « Mise à jour au retour dans l'app » ci-dessous). Le bandeau « Nouvelle version disponible » sert de repli si une saisie ou un pop-up est en cours.
- Pied de page des Réglages : « Version 3.0.1 » → « Version 3.5.0 » (l'étiquette n'avait pas suivi les versions depuis v3.0.1).
- `firebase-database-compat.js` retiré (index.html et EXTERNAL_FILES de `sw.js`) : la Realtime Database n'est plus utilisée depuis v3.0.0 ; un script bloquant en moins dans le `<head>`.
- `sortablejs@latest` → `sortablejs@1.15.2` (index.html et `sw.js`, doivent rester identiques) : une version non épinglée pouvait changer sous les pieds et n'était de toute façon jamais rafraîchie dans le cache.
- Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `budget-lc-shell-v9` → `v10`.


## Mise à jour au retour dans l'app + « réseau d'abord » (20/09/2026)

**But** : ne plus avoir à fermer l'app (swipe vers le haut) ni à la supprimer/réinstaller pour voir une nouvelle version.

- **`sw.js` — `index.html` en réseau d'abord** (`reseauPuisCache()`) : le serveur est interrogé en priorité, donc la dernière version est toujours servie quand il y a du réseau. Si le réseau est absent ou met plus de **4 s** à répondre (connexion « fantôme » sur iPhone), la copie en cache est servie : l'ouverture hors ligne reste garantie. Les autres fichiers du shell (icônes, manifest, SDK) restent en cache-first, inchangés.
- **Vérification de version au retour au premier plan** (bloc en fin de `<script>`, événement `visibilitychange`) : sur iPhone une PWA remise au premier plan n'est pas rechargée. Au retour, la page relit `index.html` sur le serveur (`cache:'no-store'`) et compare sa constante `DERNIERE_MAJ` avec celle du code en cours d'exécution. Si le serveur a une version différente : **rechargement automatique**, sauf si un champ de saisie est actif ou si une fenêtre (pop-up, confirmation, connexion) est ouverte — dans ce cas c'est le bandeau « 🔄 Nouvelle version disponible » existant qui s'affiche (le rechargement n'interrompt donc jamais une saisie). Au plus un contrôle toutes les 30 s ; hors ligne, rien ne se passe.
- ⚠️ **`DERNIERE_MAJ` est désormais un élément fonctionnel** (plus seulement un affichage) : elle sert de numéro de version pour cette détection. Ne pas la supprimer, et garder la forme `DERNIERE_MAJ = '…'` (une seule occurrence par fichier).
- **Une seule fois** : la première mise à jour vers cette version ne bénéficie pas encore du mécanisme (l'ancien code est encore en place). Fermer l'app et la rouvrir une ou deux fois suffit ; ensuite plus aucune manipulation.
- Budget : le rechargement automatique ne se déclenche pas si le pop-up « Nouveautés » ou la fenêtre « Connexion perdue » est ouvert.


## Historique — Découpage en `index.html` / `style.css` / `app.js` (20/09/2026)

**But** : des fichiers lisibles et modifiables (avant : tout dans un seul `index.html`, ≈ 88 Ko), et un cache navigateur / service worker qui peut traiter le style et le code séparément. **Aucun changement de comportement ni d'apparence** : le contenu a été déplacé tel quel.

**Où trouver quoi** (≈ 88 Ko → ≈ 19 Ko + ≈ 15 Ko + ≈ 54 Ko) :
- `index.html` : la structure HTML, un tout petit script inline qui définit `DERNIERE_MAJ`, et les balises `<link href="style.css?v=…">` / `<script src="app.js?v=…">`.
- `style.css` : tout le CSS (ancien `<style>`).
- `app.js` : tout le JavaScript classique (anciens `<script>`), dans l'ordre d'origine. La constante `DERNIERE_MAJ` n'y figure plus : elle est dans `index.html`.
**Règles** :
- Style → `style.css` ; logique → `app.js` ; structure → `index.html`. Pour une modification, lire les 3 fichiers si nécessaire.
- **Ne jamais modifier à la main** `DERNIERE_MAJ`, ni les `?v=…` de `index.html`, ni `CACHE_NAME` (`sw.js`) : le workflow `auto-version.yml` s'en charge à chaque push touchant `index.html`, `style.css` ou `app.js`. Les `?v=…` (chiffres de `DERNIERE_MAJ`) rendent l'URL de chaque déploiement unique : aucun cache (HTTP, mémoire, service worker) ne peut resservir l'ancien code.
- `sw.js` précache `index.html`, `style.css` et `app.js`, et les sert en **réseau d'abord** (repli sur le cache hors ligne ou après 4 s). Le cache est indexé sans la partie `?v=…`, donc une seule copie par fichier. Les requêtes réseau du service worker utilisent `cache:'no-cache'` (revalidation systématique).

**Vérifié avant mise en ligne** (Chromium headless, ancienne et nouvelle version côte à côte) : DOM identique hors `<script>`/`<style>` (75 éléments à `id`), styles calculés identiques sur tous ces éléments, mêmes variables globales, mêmes messages console ; ouverture hors ligne (page rendue, CSS et JS servis par le cache) ; déploiement simulé visible après un simple rechargement malgré `Cache-Control: max-age=600` (comme GitHub Pages) ; rechargement automatique au retour au premier plan, sauf saisie en cours ou fenêtre ouverte. **Non vérifié sur iPhone.**


## Historique — Icône allégée : 1024 → 512 px (20/09/2026)

`Budget/icone.PNG` faisait **1 024 × 1 024 px pour 1,29 Mo** (dont une miniature EXIF embarquée) : elle était téléchargée à chaque installation du cache du service worker (`sw.js` la précache) alors que l'app n'en a besoin qu'en 180 px (`apple-touch-icon`) et 512 px (`manifest.json`). Elle est désormais en **512 × 512 px, PNG opaque sans métadonnées, 362 Ko** (−72 %), redimensionnée en Lanczos ; rendu visuellement identique.
- **Nom de fichier inchangé** (`icone.PNG`, casse comprise) : `manifest.json`, `index.html` (`apple-touch-icon`) et `sw.js` n'ont pas été touchés.
- **Pas de nouvelle version de cache forcée** : les installations existantes gardent l'ancienne copie jusqu'au prochain déploiement de Budget, dont le robot `auto-version` change `CACHE_NAME` et fait retélécharger l'icône allégée. L'icône déjà posée sur l'écran d'accueil ne change pas.
- Piste écartée (possible plus tard) : palette 256 couleurs, ≈ 110 Ko, mais avec risque de bandes dans les dégradés du fond.


## Correctif — bandeau « Nouvelle version disponible » affiché à tort (20/09/2026)

**Symptôme** : le bandeau « 🔄 Nouvelle version disponible » s'affichait à l'ouverture après un déploiement, alors que la page était déjà la dernière version.
**Cause** : il était déclenché par la seule installation d'un nouveau service worker (`updatefound` / `reg.waiting`). Or depuis le passage de `index.html` en réseau d'abord, la page est déjà à jour quand le service worker se met à jour : le bandeau était un faux positif, et il court-circuitait en plus le rechargement automatique.
**Correction** (`app.js`) :
- La mise à jour du service worker appelle désormais la vérification de version (`window.__verifierVersion(true)`) au lieu d'afficher le bandeau : elle compare `DERNIERE_MAJ` avec celle du serveur. Page vraiment périmée → **rechargement automatique** ; le bandeau n'apparaît que si une saisie ou une fenêtre est ouverte.
- Le contrôle est aussi fait **~3 s après chaque lancement** (au cas où un réseau lent aurait fait servir une copie ancienne de la page).
- **Garde-fou anti-boucle** : au plus 2 rechargements automatiques par session (`sessionStorage`, clé `majRechargements`) ; ensuite le bandeau s'affiche au lieu de recharger.
- Le rechargement automatique ne se déclenche pas tant que le pop-up « 🔔 Nouveautés » ou la fenêtre « Connexion perdue » est ouvert.
**Vérifié** (Chromium headless) : page à jour + simple changement de `sw.js` → aucun bandeau ; vraie nouvelle version → rechargement automatique (bandeau si saisie ou fenêtre ouverte) ; garde-fou ; suite hors ligne / déploiements simulés inchangée. **Non vérifié sur iPhone.**


## Suppression de la carte « Projets / Épargne » et de ses données (21/09/2026)

**Demande** : la carte « ✈️ Projets / Épargne » de la vue Mensuelle est supprimée, ainsi que toutes les données qu'elle contenait.

**Code** (`index.html`, `app.js`, `sw.js`) :
- Carte « Projets / Épargne » (avec son bouton « + Épargner ») retirée de la vue Mensuelle.
- Jauge « Épargne » de la carte Répartition retirée : les pourcentages sont recalculés sur Charges, Dépenses, Provisions et Reste.
- Carte « Total Épargné » de la vue Bilan Annuel retirée (elle serait restée définitivement à 0 €). Les objectifs de provisions n'additionnent plus que les lignes de la carte Provisions.
- `normaliserMois()` écarte désormais le champ `epargne` : une ancienne sauvegarde `.json` restaurée ne le réintroduit pas. Les lignes de la corbeille de type `epargne` sont ignorées au chargement.
- Effet de bord retiré : la librairie `canvas-confetti` (les confettis ne servaient qu'au bouton « + Épargner ») n'est plus chargée ni précachée par `sw.js`.
- **Aucun impact sur le Reste à vivre** : l'épargne n'y était déjà plus soustraite (compte à part).

**Données Firestore** (projet `lisa-et-corentin`) : champ `epargne` supprimé des 9 documents de la collection `mois` (3 lignes au total : Mars 2026 ×1, Avril 2026 ×2, catégorie « Vacances ») et 2 lignes vides de la corbeille (`config/global`). Sauvegarde JSON complète faite avant suppression (hors dépôt).

**Vérifié** (jsdom, données réelles de la base) : aucune erreur console ; Reste à vivre d'avril identique avant/après (9,20 €) ; structure DOM intacte (les 4 cartes restantes dans `mois-content-wrapper`) ; Bilan Annuel inchangé sauf la carte retirée. **Non vérifié sur iPhone.**


## Bilan Annuel — « Total Dépenses » remplace « Total Épargné » (21/09/2026)

La carte d'en-tête du Bilan Annuel (laissée vide par la suppression de la carte Épargne) affiche désormais le **Total Dépenses** de l'année sélectionnée : somme des lignes de la carte Dépenses, **toutes catégories confondues** (tickets restaurant et espèces inclus, comme dans le bloc « 🛒 Dépenses » en dessous). Même style que l'ancienne carte (dégradé orange → rose). Charges fixes et provisions ne sont pas comptées. Fichiers : `index.html` (carte `annuel-total-depenses`), `app.js` (`rendreVueAnnuelle`).


## Total Dépenses = Courses + Charges fixes ; Réglages allégés (21/09/2026)

- **Bilan Annuel** : la carte « Total Dépenses » vaut désormais **Dépenses (🛒 courses) + Charges fixes (🏠)** de l'année sélectionnée, soit la somme des deux premières lignes du bloc en dessous (correction de la version précédente, qui n'additionnait que les dépenses). Provisions non comptées. Sur les données 2026 : 6 434,59 + 8 849,87 = 15 284,46 €.
- **Réglages** : trois cartes retirées avec leur code — « 🔒 Sécurité » (bouton « Se déconnecter », `authLogout`), « 📅 Créer un mois spécifique » (`btn-creer-mois`) et « 🛠️ Gestion des Catégories » (`admin-categories`, ajout / suppression).
- **Conséquences à connaître** : (1) plus de bouton de déconnexion dans l'app (l'écran « Ouvrir les comptes » reste pour un appareil non connecté) ; (2) un nouveau mois ne se crée plus que par « + Démarrer un mois » (mois suivant le dernier) ; (3) la liste de catégories n'est plus modifiable dans l'app : elle reste stockée dans `config/global` (Firestore) et alimente toujours les listes déroulantes des lignes.
- **Vérifié** (jsdom, données réelles) : aucune erreur ; Réglages = Outils Système, Budgets de Provisions, Profil, Sauvegarde Automatique, Corbeille, Restauration Manuelle ; Bilan Annuel = 15 284,46 €. **Non vérifié sur iPhone.**


## Nettoyage du code mort (21/09/2026)

Audit statique de `index.html`, `app.js`, `style.css` et `sw.js` (fonctions, variables, ids, classes et variables CSS, propriétés de `state`, fichiers précachés), puis retrait de ce qui restait d'anciennes fonctionnalités. **Aucun changement de comportement.**
- `app.js` : appel à `rendreVueVacances()` (fonction inexistante, vue jamais ouvrable) et branche `'vacances'` de `rafraichirTouteLInterface` ; commentaires orphelins « Vue Vacances » / « RESTAURÉE » ; flag `isRetrait` (créé uniquement par l'ancienne carte Épargne, absent des données) dans le rendu et l'édition du montant ; `databaseURL` de `firebaseConfig` (Realtime Database abandonnée depuis la v3.0.0).
- `index.html` : bloc caché `#comparaison-n1` (jamais utilisé par le JS) et commentaire `VUE VACANCES`.
- `style.css` : règle `.comparison` (ne servait qu'à `#comparaison-n1`).
- **Firestore** : champ `locked` (jamais lu par le code) supprimé des 2 documents qui le portaient (Janvier et Février 2026).
- Le reste est propre : aucune fonction ou variable inutilisée, aucune classe/variable CSS orpheline, tous les fichiers précachés par `sw.js` existent. Les ids construits dynamiquement (`bar-…-m`, `pct-…-m`, `vue-…`, `conteneur-…`) ne sont pas du code mort.
- **Vérifié** (jsdom, données réelles) : aucune erreur ; rendu Mensuel (avril : reste 9,20 €), Bilan Annuel (15 284,46 €) et Réglages identiques à avant. **Non vérifié sur iPhone.**


## Haut de l'écran : descendu de 4 px (21/09/2026)

Retour d'usage de Corentin : le haut de l'app (titre « Budget » et bouton thème) restait flou, trop près de la zone de la barre d'état. `.top-nav` : `padding-top` passe de `calc(15px + env(safe-area-inset-top))` à **`calc(19px + env(safe-area-inset-top))`**, soit **+4 px** (le contenu des vues, placé sous la barre, suit automatiquement). Valeur ajustée à l'usage, comme `--nav-offset` en bas ; pour mémoire Course et Muscu utilisent `inset + 16px`. Le flou natif d'iOS dans cette zone n'est pas reproductible hors iPhone : **non vérifié sur iPhone**, à confirmer visuellement. Fichier : `style.css`.

**Nouveau retour de Corentin : encore 4 px plus bas.** `.top-nav` : `padding-top` passe de `calc(19px + env(safe-area-inset-top))` à **`calc(23px + env(safe-area-inset-top))`** (+4 px, soit **+8 px cumulés** depuis les 15 px d'origine). Toujours **non vérifié sur iPhone**. Fichier : `style.css`.


## Résumé pour le Portail (22/09/2026)

Budget publie le **reste à vivre du mois en cours** pour le tableau de bord du Portail. Architecture, sécurité et décisions : `README.md` du Portail, section « Tableau de bord ».

- **`portail/budget`** est écrit dans la base de l'app **COURSES** (`course-app-36e9d`, connexion anonyme), **pas** dans celle de Budget : `maj`, `mois` (ex. « Septembre 2026 »), `reste`, `budget` (report + revenus + revenus additionnels), `depense` (charges + dépenses CB + provisions), `joursRestants`. Tous `null` sauf `mois` si le mois calendaire n'existe pas encore.
- **Formule identique à `calculerTotauxMensuels`** (`calculerResumePortail`) : report exclusif Revolut (`calculerSoldeReporte`), tickets restos et espèces exclus des dépenses. ⚠️ Si la formule du reste à vivre change dans l'app, **la changer aussi dans `calculerResumePortail`** (sinon le Portail affiche un autre chiffre que l'app). Le calcul porte sur le **mois calendaire courant**, pas sur le mois affiché dans l'app.
- **Une 2e application Firebase nommée `'portail'`** (`CONFIG_BASE_PORTAIL`, connexion anonyme) : la base et la session e-mail/mot de passe de Budget ne sont pas touchées. Créée à la première publication seulement (`obtenirBasePortail`), en SDK compat comme le reste de l'app.
- **Déclenchement** : à chaque snapshot de `mois` (`planifierPublicationPortail`), **seulement après un snapshot venu du serveur** (`portailServeurVu`, indépendant de `state.serveurVu` qui ne se met pas à jour en arrière-plan), regroupé 2,5 s, sans effet si le contenu n'a pas changé. Erreurs absorbées.
- **Vérifié** : calcul sur les vrais mois (identique à la formule de l'app) ; pont de connexion anonyme et d'écriture avec les vrais SDK. **Non vérifié dans l'app complète** (connexion e-mail/mot de passe requise) ni sur iPhone.


## Suivi Espèces (report cumulatif) + paiement partiel carte/espèces sur les Dépenses (22/09/2026)

**Contexte** : Corentin/Lisa vont avoir une somme d'espèces à écouler sur plusieurs mois, en plus du Revolut. Jusqu'ici, une dépense payée en espèces (icône 💵) était simplement exclue du total Revolut, sans qu'aucune cagnotte espèces ne soit suivie dans l'app.

**Décisions prises avec Corentin avant implémentation** :
- Le solde d'espèces non dépensé **se reporte automatiquement** d'un mois sur l'autre, exactement comme le Revolut.
- Le paiement en espèces (et le partiel carte/espèces) ne concerne **que la carte Dépenses** (courses) — Charges fixes et Provisions restent 100% Revolut, non concernées.
- Les anciennes lignes déjà marquées 🎟️ Ticket Resto (mode `TR`) sont **laissées à part** : toujours exclues des deux totaux (Revolut et Espèces) tant qu'on n'y touche pas, comme avant cette fonctionnalité.

**Nouveau champ mensuel** : `especes_add` (« Espèces ajoutées »), en 2 lignes dans la carte revenus de la vue Mensuelle, sur le même principe que le Revolut :
- **Espèces reportées** (`solde_reporte_especes`, lecture seule) : somme cumulative de tous les mois précédents (`especes_add − dépenses payées en espèces`), calculée par la nouvelle fonction `calculerSoldeReporteEspeces()` (miroir de `calculerSoldeReporte()`, mais scopée aux Dépenses uniquement).
- **Espèces ajoutées** (`especes_add`, éditable) : l'apport du mois en cours, saisi manuellement (ex. pour étaler une somme reçue en espèces sur plusieurs mois).

**Carte « Reste à vivre »** : titre simplifié (`Reste à vivre (Revolut)` → `Reste à vivre`), le montant affiché est désormais **Revolut + Espèces combinés**. Une ligne de détail (`detail-reste`) affiche la répartition : `💳 X € · 💵 Y €`.

**Mode de paiement d'une dépense** (`item.moyenPaiement`) : le bouton-icône cycle désormais **💳 Carte → 💵 Espèces → 🔀 Mixte** (le Ticket Resto n'est plus proposé pour les nouvelles lignes). En mode Mixte, un nouveau champ apparaît sous la ligne (`.item-mixte`) pour saisir le montant payé en espèces (`item.montantEspeces`, borné entre 0 et le montant total par le listener d'input) ; la part carte (`montant − montantEspeces`) est recalculée et affichée automatiquement. Une ancienne ligne 🎟️ Ticket Resto sur laquelle on clique quitte définitivement ce statut et repart de Carte (premier tap), pour ne jamais sauter une étape du nouveau cycle.

**Fonctions modifiées/ajoutées** (`app.js`) :
- `sommeCB(arr)` : gère désormais le cas `MIXTE` (ne compte que `montant − montantEspeces` côté carte) ; `ESPECES`/`TR` toujours exclus.
- `sommeEspeces(arr)` *(nouvelle)* : symétrique de `sommeCB`, calcule la part espèces d'une liste de dépenses.
- `calculerSoldeReporteEspeces(cibleIdx)` *(nouvelle)* : report cumulatif de la cagnotte espèces, même principe que `calculerSoldeReporte`.
- `calculerTotauxMensuels(m, report, reportEspeces)` : signature étendue (3e paramètre), calcule `resteRevolut`/`resteEspeces` séparément puis leur somme (`reste`), affichée dans `#reste-a-vivre` et détaillée dans `#detail-reste`. Les jauges de la carte Répartition (`bar-reste-m`) utilisent ce `reste` combiné.
- `normaliserMois()` : ajout de `especes_add: m.especes_add || 0` (même traitement que `revenus_add`).
- ⚠️ **`calculerResumePortail()` mis à jour à l'identique**, comme l'exige la règle du pont Portail (section précédente de ce README) : `budget` = Revolut + Espèces (report + apports des deux), `depense` = charges + provisions + part carte des dépenses + part espèces des dépenses. Le `reste` publié au Portail reste donc rigoureusement identique à celui affiché dans l'app.

**Non modifié** : Charges fixes, Provisions, jauges de répartition (structure inchangée, seul `reste` devient la somme Revolut+Espèces), Bilan Annuel (les totaux `charges`/`depenses`/`provisions` restent sur le montant total de chaque ligne, indépendant du moyen de paiement).

**Vérifié** : logique de calcul (report cumulatif, mode Mixte, exclusion du legacy Ticket Resto) testée par un harnais Node autonome (16 assertions, scénario sur 3 mois enchaînés) — voir le calcul manuel dans le commit. Cohérence des `id` HTML/JS vérifiée par script (aucun id utilisé par `app.js` absent de `index.html`). **Non vérifié dans l'app complète en conditions réelles (Firestore) ni sur iPhone.**

**Ajustement UX (retour de Corentin, même jour)** : les 2 champs en lecture seule (« Solde reporté (Revolut) », « Espèces reportées ») regroupés en haut de la carte revenus, avant les 3 champs éditables. Style dédié `.revenus-box input[readonly]` (couleur `--text-muted`, fond `--bg-color`, bordure en pointillés) pour les distinguer visuellement des champs sur lesquels on peut saisir — ils n'étaient jusqu'ici pas différenciés (même couleur `--primary` que les champs éditables), ce qui pouvait laisser croire à tort qu'on pouvait les modifier.


## Mode Mixte : boutons ±5 € + glisser tactile, retrait du champ texte (22/09/2026)

**Retour de Corentin** : le petit champ numérique du mode Mixte (taper le montant espèces au clavier) était difficile à manipuler sur iPhone. Une maquette a été proposée et validée avec Corentin (Artifact « Design », itérée en 3 versions) avant implémentation. Décisions actées pendant cette itération :
- Corentin indique toujours des **montants espèces ronds** (jamais de centimes) — la carte absorbe automatiquement le reste, centimes compris.
- **Aucune valeur par défaut ni preset** ne doit être suggéré (ni en %, ni en €) : l'espèces part toujours de **0 €**.
- Ajustement par **paliers de 5 €** (et non 1 €, ajusté après un premier essai).

**Nouvelle interaction** (`rendreLignes()`, remplace l'ancien `<input type="number" data-field="montantEspeces">`) : sur une ligne en mode Mixte, la part espèces se règle avec :
- deux **boutons ronds ± (`.mixte-btn`)** de part et d'autre du chiffre, qui l'incrémentent/décrémentent de 5 €, bornés entre 0 € et le montant total de la ligne ;
- ou en **glissant le doigt verticalement sur le chiffre** (`.mixte-scrub`, `touch-action:none`) : haut = +5 €, bas = −5 €, par paliers de 5 € (un palier tous les 18 px parcourus).
- La **part carte n'est plus saisissable** : elle s'affiche en lecture seule juste en dessous (`.mixte-recap`), calculée automatiquement (`montant − espèces`).

**Détail technique du glisser** (`setupTableListeners()`, écouteurs `pointerdown`/`pointermove`/`pointerup`/`pointercancel` sur le conteneur, en plus de l'existant `input`/`change`/`click`) :
- `pointerdown` sur `[data-mixte-scrub]` capture le pointeur (`setPointerCapture`) et mémorise la position Y et la valeur de départ dans des variables de module dédiées (`mixteDragId`/`mixteDragStartY`/`mixteDragStartVal`/`mixteDragLive`, **hors de `state`** : purement transitoire).
- `pointermove` met à jour **uniquement le texte du chiffre affiché**, en DOM direct (`textContent`), **sans appeler `rafraichirTouteLInterface()`** : un re-render pendant le geste reconstruirait le HTML de la ligne (`rendreLignes` fait `container.innerHTML = ''`) et casserait la capture du pointeur en cours de glissement.
- `pointerup`/`pointercancel` seuls déclenchent l'écriture réelle (`item.montantEspeces = …`), `sauvegarderDonnees()` et le re-render complet — même principe de « live pendant la saisie, commit au relâchement » que le reste de l'app (ex. les champs `montant`/`libelle`, mis à jour sur `input` en mémoire mais sauvegardés seulement au `change`).
- Couleur du chiffre espèces : `var(--secondary)` (orange `#FF9500`, valeur fixe), volontairement **pas** `--primary`/`--lisa` : ces deux variables changent selon le profil actif (Corentin bleu / Lisa rose, v3.2.0), ce qui aurait pu faire coïncider visuellement carte et espèces selon le profil.

**Vérifié** : syntaxe JS (`node -c`), cohérence des sélecteurs CSS ↔ attributs `data-mixte-*` entre `app.js` et `style.css`. **Non vérifié sur iPhone** (le geste de glissement tactile — `touch-action:none`, `setPointerCapture` — n'a pu être testé qu'en lecture de code, pas en conditions réelles tactiles).

**Correctif (retour de Corentin après test sur iPhone, même jour)** : le geste fonctionne, mais le blocage du défilement ne portait que sur le petit chiffre (`.mixte-scrub`) — Corentin veut que **toute la zone** (boutons ± compris) coupe immédiatement le défilement de la page dès que le doigt s'y pose, priorité totale au réglage du montant.
- `style.css` : `touch-action: none` déplacé du seul `.mixte-scrub` à tout le conteneur `.item-mixte` (boutons ± inclus — un `touch-action:none` sur un bouton n'empêche pas le clic, seulement les gestes de défilement/zoom par défaut du navigateur).
- `app.js` : `e.preventDefault()` ajouté dans `pointerdown` et `pointermove` du glisser (en plus du CSS, en filet de sécurité), et les deux écouteurs passés en `{ passive: false }` pour que `preventDefault()` soit effectif (un écouteur `pointermove` est passif par défaut sur certains navigateurs, ce qui aurait silencieusement ignoré l'appel).


## Alignement visuel du panneau Mixte sur la maquette + retrait de l'icône Ticket Resto (22/09/2026)

**Retour de Corentin** (captures d'écran de l'app à l'appui) : le panneau Mixte en production ne ressemblait pas assez à la maquette validée, et l'icône 🎟️ Ticket Resto traînait encore dans le sous-titre de la carte Dépenses.

- **Sous-titre `🛒 Dépenses (Xé) (dont Yé 🎟️/💵)`** → devient `(dont Yé 💵)` : l'icône Ticket Resto retirée, ce total résiduel (espèces + éventuelles anciennes lignes 🎟️ legacy) s'affiche desormais avec la seule icône 💵. L'icône 🎟️ reste affichée sur les lignes individuelles encore marquées `TR` (mode de paiement, cf. entrée v3.5.0+) — seul ce sous-titre agrégé est concerné.
- **Panneau Mixte (`.item-mixte`)** restructuré pour suivre la maquette (Artifact « Design » de la conversation) :
  - ajout d'un en-tête `💵 Espèces — par paliers de 5 €` (`.mixte-label`, majuscules, discret) au-dessus des boutons ± — auparavant cette information était fondue dans le hint sous le chiffre ;
  - le hint `↕ glisser pour ajuster` (`.mixte-hint`) déplacé sous les boutons ± (au lieu d'être accolé au chiffre avec le libellé « espèces »), plus proche de la mise en page de la maquette ;
  - le récap passe d'**une seule ligne** (« 💳 carte (reste) : Xé ») à **deux lignes** (`.mixte-recap` > `.mixte-recap-row` ×2) : `💳 Carte (reste automatique)` et `💵 Espèces`, chacune avec son montant aligné à droite — reprend exactement la structure de la maquette.
- Interaction **inchangée** : le mode se choisit toujours en tapant l'icône (cycle 💳→💵→🔀), pas de contrôle segmenté Carte/Espèces/Mixte permanent sur chaque ligne comme dans la maquette — jugé trop encombrant pour une liste de dépenses avec plusieurs lignes ; à ajouter si Corentin le demande explicitement.

**Non vérifié sur iPhone** (rendu visuel uniquement relu via l'API GitHub, pas testé sur l'appareil).
