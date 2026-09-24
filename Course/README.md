# Courses L&C

Liste de courses partagée entre Corentin et Lisa. Fichier unique (HTML/CSS/JS vanilla), hébergé sur GitHub Pages, synchronisé en temps réel via **Cloud Firestore**. Accessible via l'icône du Portail Duo sur iPhone (menu → Courses), avec ouverture hors-ligne.

**Reconstruite intégralement le 18/09/2026** suite à des incidents répétés de duplication de données liés à l'ancienne architecture (voir tout en bas, section Historique, pour le contexte).

## Fichiers
- `index.html` — l'application complète (CSS et JS inline, un seul fichier)
- `sw.js` — Service Worker : met en cache le shell (`index.html`, `manifest.json`) et le SDK Firebase (gstatic.com) pour l'ouverture hors-ligne
- `manifest.json` — configuration PWA (icône en base64 intégrée, nom, couleurs)

## Fonctionnement — 3 onglets

**Liste** : tous les produits connus, **triés par popularité** (nombre de fois où le produit a été effectivement acheté, du plus au moins acheté ; à égalité, ordre alphabétique) — pas de regroupement par rayon ici, le rayon est juste affiché en sous-titre sous le nom du produit. Chaque ligne a :
- une case à cocher à gauche : coche "à acheter" (fait apparaître le produit dans l'onglet Course)
- le nom du produit
- un petit carré éditable à droite pour la quantité ou une info libre (ex: "2", "grande taille")
- un crayon (✎) pour modifier le nom et/ou le rayon du produit

Une barre de recherche filtre par nom, avec une croix pour l'effacer. Un bouton rond **+**, posé juste au-dessus de la barre d'onglets flottante, aligné à droite (visible uniquement sur l'onglet Liste), ouvre le même formulaire que le crayon (nom + rayon, avec possibilité de créer un nouveau rayon à la volée) pour ajouter un produit.

**Course** : uniquement les produits cochés "à acheter" en Liste, groupés par rayon. On coche ici un produit une fois réellement acheté (nom barré, carte estompée) — rien n'est retiré automatiquement. Le bouton **Course terminée** (actif seulement si au moins un produit est coché acheté) décoche d'un coup, dans les deux onglets, tous les produits ainsi cochés — sans jamais les supprimer de la Liste.

**Réglages** : choix du profil (**Corentin** = thème bleu, **Lisa** = thème rose, appliqué immédiatement via une variable CSS `data-profil` sur `<html>`, mémorisé dans `localStorage`). Bouton **Recharger l'application** : vide uniquement le cache et le Service Worker de Course (jamais ceux du Portail/Muscu/Budget — voir "Choix d'architecture" ci-dessous), avec confirmation avant l'action.

Un bouton **theme-toggle** (cercle 🌙/☀️ en haut à droite, superposé à l'app) bascule entre mode sombre (par défaut) et mode clair, préférence mémorisée dans `localStorage` (`course-theme`), indépendamment du profil Corentin/Lisa.

## Base de données : Cloud Firestore
Projet `course-app-36e9d`, deux collections de premier niveau :
- `produits/{id}` — champs `nom`, `quantite` (texte libre), `rayonId`, `aAcheter` (bool), `achete` (bool), `compteur` (nombre, incrémenté de 1 à chaque "Course terminée" — sert au tri par popularité de l'onglet Liste)
- `rayons/{id}` — champ `nom`

Synchronisation en temps réel via `onSnapshot` sur les deux collections. Règles de sécurité : `allow read, write: if request.auth != null` (tout utilisateur authentifié, y compris anonyme).

**Authentification : anonyme** (`signInAnonymously()`), activée sur le projet le 18/09/2026. Pas d'écran de connexion — le choix Corentin/Lisa dans Réglages est une simple préférence d'affichage locale (`localStorage`), pas un compte séparé : les deux profils partagent les mêmes données.

**Persistance hors-ligne Firestore** : `enablePersistence({synchronizeTabs:true})` (SDK compat classique — délibérément pas l'API modulaire `initializeFirestore`/`persistentLocalCache`, qui nécessitait un `import()` cross-origin dynamique s'étant révélé peu fiable pour la mise en cache par le Service Worker). En cas d'échec, repli silencieux sur le cache mémoire.

## Choix d'architecture (pourquoi, suite aux incidents du 18/09/2026)
- **Aucune logique de "réinjection si la base est vide"** au démarrage de l'app. C'est le principal changement par rapport à l'ancienne version : une fonction de ce type s'est déclenchée à tort à plusieurs reprises (y compris après tentative de correctif), dupliquant le catalogue en base à chaque fois. Le catalogue de départ est importé **une seule fois, côté serveur**, via un script utilisant les identifiants Admin SDK — jamais par le code client.
- **SDK Firebase 100% "compat"**, sans import ES modulaire dynamique cross-origin (source d'échecs de mise en cache difficiles à diagnostiquer).
- **`sw.js`** met en cache le SDK Firebase (`gstatic.com`) en mode `no-cors` explicite pour la mise en cache (le mode `cors` par défaut de `cache.add()` peut échouer silencieusement selon le CDN).
- **`CACHE_PREFIX = 'courses-lc-shell-'`** : l'`activate` du Service Worker ne nettoie que les caches commençant par ce préfixe, jamais tout `caches.keys()` sans filtre — pour ne jamais supprimer le cache des autres apps du Portail (Muscu, Budget, le Portail lui-même).
- **Authentification anonyme** plutôt qu'email/mot de passe : élimine un écran de connexion et sa dépendance réseau au démarrage.

## Mise en route (si jamais à refaire ailleurs)
1. Projet Firebase avec Cloud Firestore (mode natif) activé
2. Activer l'authentification **Anonyme** dans Firebase Auth (Sign-in method)
3. Règles Firestore : `allow read, write: if request.auth != null;`
4. Copier la config du projet dans `firebaseConfig` en haut du `<script>` de `index.html`
5. Importer un catalogue de départ directement en base (jamais via le code client)
6. Déployer sur GitHub Pages

## Historique
- **18/09/2026 — Migration Realtime Database → Firestore**, puis plusieurs correctifs sur l'ouverture hors-ligne (Service Worker jamais enregistré, bug cross-app supprimant les caches des autres apps du Portail, SDK Firebase absent du cache, fonction de réinjection automatique se déclenchant à tort). Trois incidents de duplication du catalogue en base survenus le même jour malgré les correctifs successifs.
- **18/09/2026 — Reset complet** : extraction et dédoublonnage de la liste (13 rayons, 131 produits, 10 marqués "à acheter" — état réel préservé), sauvegarde fournie à Corentin, vidage complet de Firestore, suppression de tous les fichiers de l'app.
- **18/09/2026 — Reconstruction** : nouvelle app à 3 onglets (Liste / Course / Réglages avec thèmes par profil), architecture simplifiée décrite ci-dessus, catalogue ré-importé une seule fois côté serveur, authentification anonyme activée sur le projet.
- **Correctif (18/09/2026)** : le bouton "Course terminée" et le bouton **+** (FAB) étaient positionnés en `position:fixed` avec un décalage fixe (`bottom: 18px`/`86px`), sans tenir compte de la hauteur réelle de la barre d'onglets — ils passaient donc en partie sous elle. Ajout d'une variable `--tabbar-height` (58px), utilisée à la fois pour la hauteur minimale réelle de `nav.tabbar` et pour calculer la position de ces deux boutons juste au-dessus.
- **Nettoyage (18/09/2026)** : le téléphone de Lisa avait gardé en cache l'ancienne version de Course (d'avant le reset complet), dont l'ancienne fonction de réinjection automatique s'est redéclenchée une fois à son insu, dupliquant à nouveau rayons et produits. Nettoyage effectué avec la même méthode que lors du reset (conservation du plus ancien par nom, fusion des états `aAcheter`/`achete` réels dès qu'au moins une copie les avait, correction des `rayonId` orphelins). Base revérifiée propre : 13 rayons, 131 produits. Aucun risque de récidive côté code : la nouvelle version n'a plus aucune logique de réinjection, mais tout appareil gardant l'ancienne version en cache reste une source de risque tant qu'il n'a pas vidé ses données de site Safari.
- **Ajout (18/09/2026) : tri par popularité dans l'onglet Liste** — remplace le regroupement par rayon par un tri décroissant sur le nouveau champ `compteur` (alphabétique à égalité), le rayon restant affiché en sous-titre sur chaque ligne. `compteur` est incrémenté de 1 (`firebase.firestore.FieldValue.increment(1)`) pour chaque produit remis à zéro par le bouton "Course terminée". L'onglet Course, lui, garde son regroupement par rayon inchangé.
- **Alignement charte UX/UI (18/09/2026)** — Audit puis mise en conformité avec `/UX_UI_CHARTER.md` (référence : app Muscu) :
  - Ajout des meta tags PWA manquants : `apple-mobile-web-app-title`, `apple-touch-icon`, `icon` 512×512 (réutilisent l'icône déjà présente dans `manifest.json`). `theme-color` corrigé de `#10a37f` (vert, obsolète) vers `#0b0f14` (couleur de fond réelle de l'app).
  - Variables CSS renommées pour matcher la nomenclature commune : `--surface`→`--card`, `--surface-soft`→`--card-2`, `--ink`→`--text`, `--ink-soft`→`--text-dim`, `--line`→`--border`. Comportement visuel inchangé, seuls les noms de variables ont changé.
  - Couleurs Corentin/Lisa alignées sur les mêmes hex que Muscu (`#1f8fff` / `#ff3d7e`, contre `#2f6fed` / `#ef5da8` précédemment — écart de teinte mineur mais désormais identique sur toutes les apps).
  - Ajout des tokens sémantiques `--done`/`--danger`/`--gold`, du système d'ombres `--shadow-sm`/`--shadow`/`--shadow-lg`, des durées d'animation `--t-fast`/`--t-mid`, et extension du système de radius à 5 crans (`--r-xs` à `--r-xl` + `--r-pill`, remplaçant `--radius-md`/`--radius-lg`).
  - **Mode clair ajouté** (l'app était dark-only) : bouton `theme-toggle` + classe `.light-mode`, persistance `localStorage`.
  - Zones tactiles agrandies de 26px à 30px sur la case à cocher (`.case`) et le bouton d'effacement de recherche (`.btn-effacer-recherche`), en dessous du minimum recommandé.
  - `nav.tabbar` passée en glassmorphism (`backdrop-filter: blur(18px) saturate(160%)`) pour cohérence visuelle avec la bottom-bar de Muscu.
  - Couleurs et ombres codées en dur remplacées par les tokens correspondants (ex. `#e5484d`→`var(--danger)`, `box-shadow` du FAB et de la modale→`var(--shadow)`/`var(--shadow-lg)`).
  - Comportements iOS déjà excellents et **conservés tels quels** (meilleurs que la référence Muscu sur ces points) : `env(safe-area-inset-top)` en plus de `-bottom`, `overscroll-behavior:none`, layout flexbox pour la tabbar (plus robuste que le `position:fixed` de Muscu).
- **Retrait du badge de prénom et de la barre de statut translucide (18/09/2026)** — à la demande de Corentin, retour d'usage sur capture d'écran :
  - Le pastille affichant le prénom actif ("Corentin"/"Lisa") à côté du bouton de thème dans l'en-tête a été retirée (HTML `span#badge-profil`, sa règle CSS `.profil-badge`, et la ligne JS qui l'alimentait dans `appliquerProfil()`) — jugée inutile à l'usage. Le sélecteur de profil dans Réglages et la bascule de couleur d'accent restent inchangés.
  - `apple-mobile-web-app-status-bar-style` passé de `black-translucent` à `black` : la valeur translucide faisait apparaître un effet de flou/vitre dépolie derrière l'heure et les icônes système iOS (rendu natif du système, pas du CSS de l'app), visible sur capture d'écran. En `black`, la barre de statut est opaque et unie.
- **Cause réelle du flou identifiée et corrigée (18/09/2026)** : passer `apple-mobile-web-app-status-bar-style` en `black` (ci-dessus) n'a pas suffi — le flou persistait. Cause racine trouvée par comparaison avec Budget (qui n'a jamais eu ce problème) : le meta `viewport` de Course contenait `viewport-fit=cover`, absent de celui de Budget. Cette option fait passer l'app en rendu "plein écran" jusque sous l'encoche/la barre de statut, ce qui déclenche l'overlay flou natif d'iOS/Safari dans cette zone — indépendamment de la valeur de `status-bar-style`. Retiré du meta viewport. Toutes les utilisations de `env(safe-area-inset-top/bottom)` (`--safe-top`, `--safe-bottom`, en-tête, FAB, tabbar, modale) retombent proprement sur leurs valeurs de base (0) sans `viewport-fit=cover` — vérifié, aucune régression de mise en page.
- **Correction définitive (18/09/2026)** : le retrait de `viewport-fit=cover` seul (ci-dessus) n'avait rien changé au flou, et avait en plus cassé la barre d'onglets (trop basse, chevauchait la zone de geste du home indicator, déclenchant Siri par erreur) — corrigé en le remettant temporairement. La vraie cause, trouvée en comparant avec **Budget** (jamais eu ce flou, pas de barre fixe en bas) : le CSS de `body` contenait `height:100vh; height:100dvh;` — la seconde déclaration (`100dvh`, unité de viewport dynamique) l'emportait et forçait le body à occuper l'écran physique en entier, **indépendamment** de `viewport-fit=cover`. C'est ce qui annulait l'effet du premier correctif : `viewport-fit=cover` retiré ne changeait rien tant que `100dvh` gardait le body en plein écran, et privait en même temps `env(safe-area-inset-bottom)` de sa valeur réelle (qui dépend, elle, de `viewport-fit=cover`) — d'où la barre d'onglets sans protection dans une zone toujours edge-to-edge. Corrigé en retirant `viewport-fit=cover` **et** `height:100dvh` (conservant seulement `height:100vh`) : sans ces deux réglages combinés, le comportement par défaut d'iOS (`viewport-fit=auto`) exclut automatiquement le haut (encoche/barre de statut) et le bas (home indicator) du viewport, sans qu'aucun `env(safe-area-inset-*)` ne soit nécessaire pour compenser quoi que ce soit — exactement le mécanisme déjà utilisé (sans le savoir) par Budget.
- **Solution pragmatique finale (18/09/2026)** : le retrait combiné de `viewport-fit=cover` et `height:100dvh` (ci-dessus) n'a pas non plus fait disparaître le flou sur l'appareil réel — tout indique un comportement natif d'iOS (probablement lié au Dynamic Island sur iPhone récent) appliqué aux web-apps standalone plein écran, indépendant des réglages HTML/CSS/meta disponibles. Plutôt que de continuer à chercher à désactiver ce rendu système, **solution retenue (proposée par Corentin)** : accepter le plein écran natif d'iOS (`viewport-fit=cover` + `height:100dvh` restaurés) mais ajouter une **marge tampon fixe de 16px en plus de la vraie safe-area** directement dans la définition des variables : `--safe-top:calc(env(safe-area-inset-top) + 16px)` et `--safe-bottom:calc(env(safe-area-inset-bottom) + 16px)`. Comme l'en-tête, le FAB, la barre d'onglets, la modale et le padding de la liste utilisent tous déjà ces deux variables, ce changement unique se répercute automatiquement partout : le contenu visible de l'app ne touche plus jamais les bords réels de l'écran, avec une vraie marge visible en plus de la zone système réservée — que cette zone soit floutée par iOS ou non n'a plus d'impact visuel puisqu'aucun élément d'interface ne s'y trouve. Ajusté ensuite sur retour terrain de Corentin : 16px en haut (parfait tel quel), 8px en bas (16px faisait trop).
- **Bug du bloc vide en bas d'écran corrigé (18/09/2026)** : après réglage de la marge tampon (ci-dessus), Corentin a repéré un vrai bloc de couleur différente sous la barre d'onglets, jusqu'au bord réel de l'écran — pas juste la zone système du home indicator. Cause : `#app` héritait sa hauteur (`height:100%`) de `body{height:100dvh}`, et l'unité `dvh` a des soucis de calcul connus en PWA standalone sur iOS, pouvant donner une hauteur légèrement inférieure au vrai viewport visuel — d'où ce bloc non couvert visible en dessous. Corrigé en détachant `#app` de toute cette chaîne de hauteurs : `#app{position:fixed; inset:0; ...}`, qui s'aligne toujours directement sur le vrai viewport peu importe les calculs `dvh`. `body` reçoit simplement `overflow:hidden` pour éviter tout rebond de défilement derrière `#app`.
- **Cause probable de toute la confusion du 18/09/2026, trouvée en dernier : cache du Service Worker jamais invalidé.** `sw.js` sert `index.html` en cache-first (`caches.match` retourne direct s'il trouve une entrée, sans jamais revérifier le réseau). Comme `sw.js` lui-même n'avait jamais été modifié pendant que j'itérais sur les correctifs CSS/layout du jour, le navigateur n'avait aucune raison de détecter une mise à jour et réinstaller le Service Worker (cette détection se fait en comparant les octets de `sw.js`, pas ceux d'`index.html`) — il continuait donc de servir la version mise en cache **d'avant tous les correctifs**, peu importe le nombre de fois où le vrai fichier était mis à jour sur GitHub. Explique très probablement aussi l'incohérence "ça marche en direct, pas via le Portail" (timing différent de la vérification de mise à jour du Service Worker selon le contexte de navigation). Corrigé en incrémentant `CACHE_NAME` de `courses-lc-shell-v1` à `courses-lc-shell-v2` : le navigateur détecte le changement du fichier `sw.js`, installe le nouveau Service Worker (`skipWaiting`/`clients.claim` déjà en place), supprime l'ancien cache `v1` (le handler `activate` filtre déjà par préfixe) et recharge tout le shell depuis le réseau.

## Historique — Bandeau de mise à jour du Service Worker + meta tag standard (19/09/2026)

Suite à tout le chantier de débogage ci-dessus, un document de référence a été créé (`/GUIDE_PWA_IOS.md`, racine du dépôt) synthétisant les bugs WebKit rencontrés et les bonnes pratiques iOS — appliqué identiquement sur les 4 apps du dépôt.

- **Meta tag standard ajouté** : `<meta name="mobile-web-app-capable" content="yes">` à côté de `apple-mobile-web-app-capable` (jamais retiré, iOS Safari ne lit que l'orthographe Apple).
- **Bandeau "🔄 Nouvelle version disponible"** : élimine définitivement le problème de cache jamais invalidé qui a causé toute la confusion du 18/09. `sw.js` fait déjà `skipWaiting()`+`clients.claim()` automatiquement ; il manquait juste un moyen d'en informer l'utilisateur. Un bandeau discret apparaît désormais avec un bouton "Actualiser" dès qu'une mise à jour est détectée — rechargement volontairement non automatique pour ne jamais interrompre une saisie en cours.


## Historique — Bouton "Course terminée" masqué si vide + horodatage de déploiement (19/09/2026)

- **`.btn-course-terminee`** : passait auparavant en semi-transparent (`opacity:0.35` via `:disabled`) quand aucun produit n'était coché. Comportement jugé peu lisible par Corentin. Remplacé par un affichage/masquage complet (`display:none` par défaut, classe `.visible` ajoutée dès qu'au moins un produit est coché, retirée sinon), recalculé dans `renderCourse()` à chaque rendu. Au passage, correction d'un bug latent dans `toggleAchete()` qui remettait inconditionnellement le bouton actif à chaque clic (y compris en décochant le dernier produit coché, où il aurait dû redevenir masqué) — la fonction s'appuie désormais uniquement sur le rendu déclenché par le listener temps réel Firestore, seule source de vérité.
- Ajout d'une ligne dans Réglages affichant la date/heure du dernier déploiement de code (constante `DERNIERE_MAJ`). **À mettre à jour manuellement à chaque futur commit.**

## Historique — Barre d'onglets flottante « pilule » (20/09/2026)

À la demande de Corentin (inspiration : capture d'une app de e-commerce mobile), la barre d'onglets pleine largeur collée au bas de l'écran est remplacée par une **barre flottante en pilule**.

- **Structure** : `div.tabbar-flottante` (conteneur `position:absolute` dans `#app`, à `bottom: `--nav-offset``, marges latérales 14px) contenant `nav.tabbar` (la pilule : 62px de haut, `--r-pill`, fond `--glass-bar` + `backdrop-filter: blur(18px) saturate(160%)`, bordure `--border`, ombre `--shadow`) et le bouton rond `.nav-add`.
- **Onglet actif** : capsule de fond `--accent-soft` + icône/label en `--accent` (suit donc le profil Corentin bleu / Lisa rose et les modes sombre/clair). Chaque onglet fait ~50px de haut (> 44px Apple HIG). Feedback tactile `scale(0.97)`.
- **Bouton rond « + »** : remplace l'ancien FAB (`.fab-ajouter`, supprimé). Même `id="btn-ouvrir-ajout"`, donc aucun changement de JS pour l'ouverture de la modale. Il n'existe plus dans la section `#vue-liste` : sa visibilité est pilotée par l'attribut `data-onglet` porté par `#app` (mis à jour dans le handler de navigation) via `#app:not([data-onglet="liste"]) .nav-add{display:none}` — la pilule occupe alors toute la largeur.
- **La barre flotte PAR-DESSUS le contenu** (elle n'est plus un enfant flex de `#app`) : `main` occupe donc toute la hauteur, et `.liste` / `.params` reçoivent un `padding-bottom: calc(var(--tabbar-height) + var(--safe-bottom) + 24px)` pour que le dernier élément reste atteignable. `--tabbar-height` passe de 58px à **70px** (= pilule 62px + 8px de marge basse ; la safe-area s'ajoute séparément via `--safe-bottom`). Le bouton « Course terminée » (`bottom: tabbar-height + safe-bottom + 14px`) reste donc automatiquement 14px au-dessus de la barre.
- **Conteneur `pointer-events:none`** : seuls la pilule et le bouton rond captent les touches ; l'espace vide autour (marges, écart entre pilule et bouton) laisse passer le scroll/tap vers la liste en dessous.
- **Safe-area / position basse** : distance entre le bas de la pilule et le bord réel de l'écran = `--nav-offset` (voir ajustements du 20/09/2026 ci-dessous : valeur actuelle `max(2px, safe-area − 30px)`, soit ~4px sur iPhone à home indicator). Les contrôles restent hors de la zone de geste (cf. incident Siri du 18/09/2026).
- **Inchangés** : ancrage `#app{position:fixed;inset:0}`, `viewport-fit=cover`, marge de 16px en haut, bandeau « Nouvelle version disponible » (voir correctif du 20/09/2026 ci-dessous : désormais posé au-dessus de la barre et du bouton « + »).
- **Déploiement** : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` passé de `courses-lc-shell-v5` à `courses-lc-shell-v6`.

### Ajustement — barre plus basse (20/09/2026)
Retour d'usage de Corentin : la barre flottante était trop haute. Elle était posée à `safe-area-inset-bottom + 8px` du bord (~42px sur iPhone à home indicator). Nouvelle variable `--nav-offset: max(12px, calc(env(safe-area-inset-bottom) - 14px))` (~20px sur iPhone, 12px minimum sur un appareil sans home indicator) : la barre descend d'environ 22px tout en restant au-dessus de la zone de geste.
- `--tabbar-height` est désormais **la hauteur totale occupée en bas** : `calc(62px + var(--nav-offset))` (la safe-area y est incluse). Toutes les formules qui écrivaient `var(--tabbar-height) + var(--safe-bottom) + X` (`.liste`, `.params`, liste Course, bouton « Course terminée ») ont été simplifiées en `var(--tabbar-height) + X`, sinon la safe-area aurait été comptée deux fois. **Ne plus rajouter `--safe-bottom` à `--tabbar-height`.**
- Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `courses-lc-shell-v6` → `v7`.

## Correctif — horodatage invisible dans Réglages + Service Worker jamais enregistré (20/09/2026)
- **Symptôme** : la ligne « Dernière mise à jour du code » n'apparaissait pas dans Réglages.
- **Cause** : le commit du 19/09 (`ec649e9`) avait ajouté la ligne JS `document.getElementById('derniere-maj').textContent = …` mais **jamais l'élément `<p id="derniere-maj">`** dans le HTML de Réglages. `getElementById` renvoyait `null` → `TypeError` au niveau racine du script, qui **interrompait tout ce qui suit dans le même `<script>`**, y compris le bloc d'enregistrement du Service Worker et du bandeau « Nouvelle version disponible » — donc ce bandeau ne pouvait pas non plus s'afficher sur Course depuis le 19/09.
- **Correction** : ajout de `<p class="derniere-maj" id="derniere-maj">` sous le bouton « Recharger l'application » (bloc Application de Réglages, texte 12px `--text-dim` centré) ; la ligne JS est désormais gardée (`if (elDerniereMaj)`) pour qu'un élément absent ne puisse plus jamais bloquer la suite du script.
- Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `courses-lc-shell-v7` → `v8`.

### Ajustement — barre encore plus basse (20/09/2026)
Nouveau retour de Corentin : encore trop haute. `--nav-offset` passe de `max(12px, safe-area − 14px)` à **`max(8px, safe-area − 22px)`** : ~12px du bord sur iPhone à home indicator (contre ~20px), soit 8px de plus vers le bas. Les boutons de la pilule commencent à ~17px du bord : c'est proche de la limite de la zone de geste du home indicator (surveiller un éventuel retour du déclenchement de Siri / retour à l'accueil au tap sur le bas des onglets ; si cela se produit, remonter à `safe-area − 18px`). `--tabbar-height` suit automatiquement. Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `v8` → `v9`.

### Ajustement — barre au plus bas (20/09/2026)
Troisième retour de Corentin (« encore plus bas ») : `--nav-offset` passe à **`max(6px, safe-area − 26px)`**, soit ~8px du bord sur iPhone à home indicator (contre ~12px). **C'est le plancher retenu** : les boutons commencent à ~13px du bord (dans la zone de geste du home indicator si l'on tape tout en bas) et la pilule, à 8px du bas et 14px des côtés, se rapproche de la courbure des coins de l'écran. Si un tap déclenche Siri/retour à l'accueil, remonter à `safe-area − 22px` (valeur précédente). Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `v9` → `v10`.

### Ajustement — bouton « + » sorti de la pilule + barre encore 4px plus bas (20/09/2026)
Demande de Corentin :
- **Bouton « + » sorti de la barre** : il n'est plus à côté des onglets (la pilule occupe donc toute la largeur sur tous les onglets) mais **juste au-dessus, aligné à droite** (`.nav-add{position:absolute; right:0; bottom:calc(100% + var(--add-gap))}` par rapport au conteneur `.tabbar-flottante`, dont la hauteur est celle de la pilule). Taille 56px (`--add-size`), écart de 12px avec la pilule (`--add-gap`), style verre + icône d'accent inchangés. Toujours masqué hors onglet Liste via `data-onglet`.
- **Espace sous la liste** : `.liste` reçoit `padding-bottom: tabbar-height + add-gap + add-size + 16px`, sinon le dernier produit (et son champ quantité, à droite) resterait masqué derrière le « + » en fin de défilement — vérifié en test : le dernier produit s'arrête ~50px au-dessus du bouton.
- **Barre 4px plus bas** : `--nav-offset` = **`max(2px, safe-area − 30px)`**, soit ~4px du bord sur iPhone à home indicator (contre ~8px). Les boutons commencent à ~9px du bord : en pleine zone de geste du home indicator. **Point de surveillance** : si un tap sur le bas d'un onglet déclenche Siri / le retour à l'accueil, remonter à `safe-area − 26px` (~8px). `--tabbar-height` et tous les décalages suivent automatiquement.
- Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `v10` → `v11`.

### Correctif — bandeau « Nouvelle version disponible » recouvrant la barre (20/09/2026)
Depuis l'abaissement de la barre flottante, le bandeau de mise à jour (`#maj-toast`, `position:fixed`, `bottom: safe-area + 20px`) se superposait à la pilule et masquait les onglets tant qu'il était affiché. Il est maintenant posé au-dessus du bouton « + » et de la barre : `bottom: calc(var(--tabbar-height) + var(--add-gap) + var(--add-size) + 12px)` (repli sur des valeurs par défaut si les variables sont absentes), donc sans chevauchement sur l'onglet Liste comme sur les autres. Vérifié en rendu simulé : le bas du bandeau reste au-dessus du haut du « + » et de la pilule. Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `v11` → `v12`.


## Historique — Mise à jour au retour dans l'app + « réseau d'abord » (20/09/2026)

**But** : ne plus avoir à fermer l'app (swipe vers le haut) ni à la supprimer/réinstaller pour voir une nouvelle version.

- **`sw.js` — `index.html` en réseau d'abord** (`reseauPuisCache()`) : le serveur est interrogé en priorité, donc la dernière version est toujours servie quand il y a du réseau. Si le réseau est absent ou met plus de **4 s** à répondre (connexion « fantôme » sur iPhone), la copie en cache est servie : l'ouverture hors ligne reste garantie. Les autres fichiers du shell (icônes, manifest, SDK) restent en cache-first, inchangés.
- **Vérification de version au retour au premier plan** (bloc en fin de `<script>`, événement `visibilitychange`) : sur iPhone une PWA remise au premier plan n'est pas rechargée. Au retour, la page relit `index.html` sur le serveur (`cache:'no-store'`) et compare sa constante `DERNIERE_MAJ` avec celle du code en cours d'exécution. Si le serveur a une version différente : **rechargement automatique**, sauf si un champ de saisie est actif ou si une fenêtre (pop-up, confirmation, connexion) est ouverte — dans ce cas c'est le bandeau « 🔄 Nouvelle version disponible » existant qui s'affiche (le rechargement n'interrompt donc jamais une saisie). Au plus un contrôle toutes les 30 s ; hors ligne, rien ne se passe.
- ⚠️ **`DERNIERE_MAJ` est désormais un élément fonctionnel** (plus seulement un affichage) : elle sert de numéro de version pour cette détection. Ne pas la supprimer, et garder la forme `DERNIERE_MAJ = '…'` (une seule occurrence par fichier).
- **Une seule fois** : la première mise à jour vers cette version ne bénéficie pas encore du mécanisme (l'ancien code est encore en place). Fermer l'app et la rouvrir une ou deux fois suffit ; ensuite plus aucune manipulation.
- Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `courses-lc-shell-v12` → `courses-lc-shell-v13`.


## Historique — Découpage en `index.html` / `style.css` / `app.js` (20/09/2026)

**But** : des fichiers lisibles et modifiables (avant : tout dans un seul `index.html`, ≈ 47 Ko), et un cache navigateur / service worker qui peut traiter le style et le code séparément. **Aucun changement de comportement ni d'apparence** : le contenu a été déplacé tel quel.

**Où trouver quoi** (≈ 47 Ko → ≈ 17 Ko + ≈ 12 Ko + ≈ 19 Ko) :
- `index.html` : la structure HTML, un tout petit script inline qui définit `DERNIERE_MAJ`, et les balises `<link href="style.css?v=…">` / `<script src="app.js?v=…">`.
- `style.css` : tout le CSS (ancien `<style>`).
- `app.js` : tout le JavaScript classique (anciens `<script>`), dans l'ordre d'origine. La constante `DERNIERE_MAJ` n'y figure plus : elle est dans `index.html`.
**Règles** :
- Style → `style.css` ; logique → `app.js` ; structure → `index.html`. Pour une modification, lire les 3 fichiers si nécessaire.
- **Ne jamais modifier à la main** `DERNIERE_MAJ`, ni les `?v=…` de `index.html`, ni `CACHE_NAME` (`sw.js`) : le workflow `auto-version.yml` s'en charge à chaque push touchant `index.html`, `style.css` ou `app.js`. Les `?v=…` (chiffres de `DERNIERE_MAJ`) rendent l'URL de chaque déploiement unique : aucun cache (HTTP, mémoire, service worker) ne peut resservir l'ancien code.
- `sw.js` précache `index.html`, `style.css` et `app.js`, et les sert en **réseau d'abord** (repli sur le cache hors ligne ou après 4 s). Le cache est indexé sans la partie `?v=…`, donc une seule copie par fichier. Les requêtes réseau du service worker utilisent `cache:'no-cache'` (revalidation systématique).

**Vérifié avant mise en ligne** (Chromium headless, ancienne et nouvelle version côte à côte) : DOM identique hors `<script>`/`<style>` (27 éléments à `id`), styles calculés identiques sur tous ces éléments, mêmes variables globales, mêmes messages console ; ouverture hors ligne (page rendue, CSS et JS servis par le cache) ; déploiement simulé visible après un simple rechargement malgré `Cache-Control: max-age=600` (comme GitHub Pages) ; rechargement automatique au retour au premier plan, sauf saisie en cours ou fenêtre ouverte. **Non vérifié sur iPhone.**


## Correctif — bandeau « Nouvelle version disponible » affiché à tort (20/09/2026)

**Symptôme** : le bandeau « 🔄 Nouvelle version disponible » s'affichait à l'ouverture après un déploiement, alors que la page était déjà la dernière version.
**Cause** : il était déclenché par la seule installation d'un nouveau service worker (`updatefound` / `reg.waiting`). Or depuis le passage de `index.html` en réseau d'abord, la page est déjà à jour quand le service worker se met à jour : le bandeau était un faux positif, et il court-circuitait en plus le rechargement automatique.
**Correction** (`app.js`) :
- La mise à jour du service worker appelle désormais la vérification de version (`window.__verifierVersion(true)`) au lieu d'afficher le bandeau : elle compare `DERNIERE_MAJ` avec celle du serveur. Page vraiment périmée → **rechargement automatique** ; le bandeau n'apparaît que si une saisie ou une fenêtre est ouverte.
- Le contrôle est aussi fait **~3 s après chaque lancement** (au cas où un réseau lent aurait fait servir une copie ancienne de la page).
- **Garde-fou anti-boucle** : au plus 2 rechargements automatiques par session (`sessionStorage`, clé `majRechargements`) ; ensuite le bandeau s'affiche au lieu de recharger.
**Vérifié** (Chromium headless) : page à jour + simple changement de `sw.js` → aucun bandeau ; vraie nouvelle version → rechargement automatique (bandeau si saisie ou fenêtre ouverte) ; garde-fou ; suite hors ligne / déploiements simulés inchangée. **Non vérifié sur iPhone.**


## Nettoyage du code mort (21/09/2026)

Audit statique de `app.js`, `style.css` et `index.html`. **Aucun changement de comportement.**
- `app.js` : `dbSetDoc()` (jamais appelée).
- `style.css` : variables `--done` et `--gold` (jamais lues). `--r-xs`, `--r-sm`, `--r-md`, `--r-lg`, `--r-xl`, `--r-pill` sont **conservées** : ce sont les jetons de rayon de la charte UX/UI, même si tous ne sont pas utilisés ici.
- **Vérifié** : syntaxe JS ; plus aucune référence à `dbSetDoc`, `--done`, `--gold`. **Non vérifié sur iPhone.**


## Doublons de rayons et de produits — nettoyage et prévention (21/09/2026)

**Symptôme** : rayons en double dans l'app (25 rayons au lieu de 13, 257 produits au lieu de 133).
**Cause** : un **second lot de 136 documents** (12 rayons + 124 produits) a été écrit d'un seul bloc dans Firestore le **19/09/2026 à 11:05:30 (heure de Paris)**, alors que le catalogue de départ (18/09 à 20:27) était déjà en base. Son empreinte — produits avec `aAcheter:false, compteur:0` et **sans champ `achete`** — est exactement celle de l'ancienne fonction `lancerSeedSiVide()` du code d'avant le reset. Un appareil qui avait gardé cette ancienne version en cache l'a donc réexécutée (même mécanisme que l'incident du 18/09, déjà décrit plus haut). Rien dans le code actuel n'écrit en masse : aucune écriture de ce type n'a eu lieu depuis. Le nettoyage du 18/09 n'avait naturellement pas pu couvrir cet épisode du 19/09.
**Nettoyage (Firestore, `course-app-36e9d`)** : sauvegarde JSON complète avant toute écriture, puis fusion :
- rayons : 25 → 13, on garde le plus ancien de chaque nom et on y rattache tous les produits (aucun `rayonId` orphelin) ;
- produits : 257 → 133, un seul par nom ; états **préservés** par produit (à acheter / acheté = « au moins une copie », `compteur` = somme des deux copies) : 5 produits à acheter, compteur total 8, identiques avant/après. « Pommes de terre » existait dans 2 rayons (Fruits & légumes / Surgelés, l'ancien catalogue divergeait) : fusionné dans le plus ancien, Fruits & légumes.
**Prévention côté app** (`app.js`) : « + Nouveau rayon… » **réutilise** un rayon existant du même nom (sans tenir compte des accents ni de la casse) au lieu d'en créer un second.
**Risque résiduel** : un téléphone qui n'aurait jamais rouvert Course depuis le 19/09 pourrait encore porter l'ancien code en cache. Sur chaque téléphone : ouvrir Course une fois en ligne ; en cas de doute, supprimer le raccourci d'écran d'accueil et le recréer. Piste durable (non faite) : une règle de sécurité Firestore refusant la création d'un produit sans champ `achete`, ce qui bloquerait définitivement l'ancienne fonction.
**Non vérifié sur iPhone.**


## Résumé pour le Portail (22/09/2026)

Courses est la **« boîte aux lettres » du tableau de bord du Portail** : sa base (`course-app-36e9d`, connexion anonyme) reçoit un document `portail/<app>` de chaque app. Architecture, sécurité et décisions : `README.md` du Portail, section « Tableau de bord ».

- **`portail/courses`** (écrit par cette app) : `maj`, `aAcheter` (produits dans la liste), `restants` (dans la liste **et pas encore cochés** en magasin : `aAcheter && !achete`), `rayons` = les 3 rayons qui ont le plus de produits restants (`{nom, n}`).
- **Code** : bloc « RÉSUMÉ POUR LE PORTAIL » de `app.js` (`calculerResumePortail`, `planifierPublicationPortail`). `dbOnCollection` transmet un 2e argument `fromCache` à son callback (rétro-compatible). Publié **seulement après un premier snapshot SERVEUR des deux collections** (`portailRecu`), regroupé 2,5 s. **Depuis le 23/09/2026, republié à chaque snapshot serveur même si le contenu n'a pas changé** (sur demande de Corentin : `maj` doit refléter la dernière fois que l'app a été ouverte et vérifiée, pas la dernière fois que la liste a réellement changé — sinon le Portail affichait un horodatage périmé après une simple ouverture sans modification). **Flush immédiat au `pagehide`/`visibilitychange`** (même date) : si la page se ferme avant la fin des 2,5 s (aller-retour rapide dans l'app), le `setTimeout` en attente est publié tout de suite au lieu d'être perdu avec la page. **v2 (23/09/2026, soir)** : regroupement ramené à 0,3 s, `portailOk` suit l'accusé de réception serveur, et au départ de la page le secours passe par l'API REST de Firestore en `fetch keepalive` (remplace le simple flush, dont l'écriture n'était envoyée qu'à la prochaine ouverture de Courses). Détails et tests : README du Portail, « Publication fiable du résumé — v2 ».
- ⚠️ **La collection `portail` n'est pas à Courses** : elle contient aussi `portail/muscu` et `portail/budget`, écrits par les autres apps. Ne pas la supprimer, ne pas la « nettoyer » dans un script de remise à zéro du catalogue, et ne pas s'étonner d'y trouver ces documents.
- **Règles Firestore inchangées** : `request.auth != null` (anonyme compris) couvre déjà `portail`.
- **Vérifié** (vraie base, connexion anonyme réelle) : l'app publie et met à jour `portail/courses`. **Non vérifié sur iPhone.**


### Détection de la confirmation serveur — `includeMetadataChanges` (24/09/2026)

**Symptôme** : après le correctif « publication fiable v2 », Muscu et Budget mettaient bien le Portail à jour, **pas Courses**.
**Cause** : `dbOnCollection` écoutait sans `includeMetadataChanges`. À l'ouverture, Firestore livre d'abord le cache local (`fromCache = true`) ; si le serveur confirme ensuite que rien n'a changé, **aucun nouvel événement n'est émis**. `portailRecu` restait à `false`, et le garde-fou « jamais publier depuis le cache » bloquait tout. Invisible avec un cache vide (1re ouverture), systématique ensuite.
**Correctif** : `onSnapshot({ includeMetadataChanges: true }, …)`. Pour ne pas redessiner la liste à chaque petit changement de métadonnées, `cb` n'est rappelé qu'à la 1re réception, quand des documents changent (`docChanges().length > 0`), ou au passage cache → serveur. `fromCache` est suivi en continu (coupure réseau puis retour).
**Vérifié** (WebKit 26, profil persistant = cache rempli comme sur iPhone, 3 essais) : ancien code, jamais publié ; nouveau code, publié à chaque fois. **✅ Vérifié sur iPhone par Corentin le 24/09/2026**.


## Animations — conformité charte §11 (24/09/2026)

Audit contre la section 11 « Animation & Micro-interactions » de `UX_UI_CHARTER.md` : Course était déjà quasi conforme (3 transitions, toutes ciblées). Ajouts :
- bloc `@media (prefers-reduced-motion: reduce)` global en fin de `style.css` (durées de transition/animation ramenées à 0) ;
- `--t-fast` 0,14 s → 0,15 s (plancher de la charte §11.3).

La modale produit s'affiche toujours sans transition : laissé tel quel (option possible plus tard : entrée courte depuis le bas, action « occasionnelle » au sens du §11.2). **Non vérifié sur iPhone.**


## Alignement sur la charte UX/UI — sections 1 à 7 (24/09/2026)

Audit statique contre `UX_UI_CHARTER.md` puis mise en conformité, avec les mêmes principes que Budget (décidés par Corentin : pas de décoratif hors charte, modales conformes). Course était déjà proche (tokens nommés comme Muscu, pilule §5.5b, bottom-sheet).

- **Couleurs (`:root`)** : fonds et textes passés aux valeurs exactes de la charte (`--bg #0d1014`, `--card #161b22`, `--card-2 #1e2530`, `--text #e9eff6`, `--text-dim #8a97a8` ; avant : teintes propres à Course, légèrement différentes). **Bordure** : `#26303a` opaque bleu-gris (proscrit par la charte §9) → `rgba(255,255,255,0.09)`. Tokens manquants ajoutés (`--border-strong`, `--tint`, `--accent-dark`, `--done`, `--gold`, `--glass-modal`), aussi en mode clair. `theme-color` → `#0d1014`.
- **Typo** : titres de rayon et titres de blocs Réglages au format « label de section » de la charte (11 px, 800, capitales espacées).
- **Cards produit** : `--r-lg` (18 px) au lieu de 14 px. Champs de saisie en `--r-sm` (recherche, quantité, modale).
- **Zones tactiles ≥ 44 px** : la **case à cocher** (30 px visuels) et le ✕ de la recherche reçoivent une zone tactile étendue à 44 px via `::after` (`inset:-7px`), le crayon (36 px) via `inset:-4px` — **aucun changement visuel**. Champ quantité, barre de recherche, champs de la modale, « Supprimer ce produit » : hauteur 44 à 48 px.
- **Sélecteur de profil** : l'ancien `.btn-profil` maison remplacé par le composant de la charte §5.6 (`.profile-switch` / `.profile-switch-btn corentin|lisa`, classe `.selected`), repris tel quel. `appliquerProfil()` bascule `.selected` au lieu de `.actif`.
- **Boutons** : « Course terminée » en `--r-lg`, 15 px, ombre teintée d'accent ; feedback `scale(0.97)` au tap sur les boutons (charte §6.5). La case à cocher a un `scale(0.94)` **instantané, sans transition** (action la plus répétée de l'app, charte §11.2).
- **Modales** : fond en verre (`--glass-modal` + flou), bordure, largeur max 520 px, entrée en glissé 0,28 s (coupée en mouvement réduit).
- **`window.confirm()` remplacé** par `dialogue({ titre, texte, ok, annuler, danger })` → `Promise<boolean>` (`app.js`, juste après `const modal`), rendu dans `#dialogue` (`.modal-fond`, z-index au-dessus de la modale produit). Concerne « Supprimer ce produit » (l'id est figé avant l'attente) et « Recharger l'application ». Tap sur le fond = Annuler.
- **Style inline** du conteneur de l'onglet Course déplacé dans `style.css` (`#liste-course`).

**Non modifié, volontairement** : `apple-mobile-web-app-status-bar-style` reste à `black` (la charte dit `black-translucent`) — valeur choisie lors du chantier du flou de barre de statut du 18/09 (voir plus haut et `PROBLEMES_RESOLUS.md`), à ne pas toucher sans retester sur iPhone. Titre d'onglet en couleur d'accent conservé.

**Vérifié** : Chromium headless 390×844, Firebase bouchonné — Liste, Course, Réglages, modale produit, dialogue de suppression (Annuler → rien supprimé ; Supprimer → produit supprimé et modale fermée), bascule de profil (accent rose), mode clair, zone tactile de la case (un tap à 5 px à côté touche bien la case), aucune erreur JS. `node --check` sur `app.js`. **Non vérifié sur iPhone.**


## Ouverture plus rapide, hors-ligne préservé (24/09/2026)

**Constat de Corentin** : Courses met du temps à s'ouvrir depuis le Portail. **Mesure** (vraie app, CPU ×4 + 4G simulée, cache rempli) : page chargée en ~270 ms mais **écran vide jusqu'à ~1 s**, liste à 1,0–1,2 s (3,4 s à la 1re ouverture). Causes : `#app` masqué (`display:none`) tant que Firebase n'avait pas fini de démarrer (exécution du SDK + `enablePersistence` ≈ 300 ms + authentification) ; 3 scripts SDK bloquants dans `<head>` ; `index.html`/`style.css`/`app.js` en réseau d'abord avec jusqu'à 4 s d'attente ; SDK retéléchargé après chaque déploiement.

**Modifications** — contrainte n°1 : ne rien retirer à l'ouverture hors ligne.
1. **Aperçu local, affichage immédiat** (`app.js`, bloc « APERÇU LOCAL ») : `#app` n'est plus masqué. Au démarrage, la liste est dessinée depuis la dernière copie connue (`localStorage` `courses_apercu_v1`, écrite à chaque instantané Firestore une fois produits ET rayons reçus). ⚠️ **L'aperçu ne sert qu'à l'affichage** : jamais écrit dans Firestore (leçon des duplications du 18/09), remplacé intégralement par le 1er instantané Firestore.
2. **Écritures différées jusqu'au 1er instantané Firestore** : `dbUpdateDoc`/`dbAddDoc`/`dbDeleteDoc` et le lot « Course terminée » attendent la promesse `firestorePret` (résolue quand produits et rayons sont arrivés, cache local compris — donc aussi hors ligne). La valeur écrite est calculée **au moment du tap**, seul l'envoi attend : un tap pendant la demi-seconde de démarrage n'est ni perdu ni envoyé sans authentification.
3. **SDK Firebase et `app.js` en `defer`** (`index.html`) : la page s'affiche sans attendre l'exécution des ~600 Ko du SDK. L'ordre SDK → `app.js` est garanti (les scripts `defer` s'exécutent dans l'ordre du document) ; le petit script inline `DERNIERE_MAJ` reste synchrone.
4. **`sw.js`** :
   - **SDK dans un cache à part**, `courses-lc-sdk-10.12.2`, qui ne change pas à chaque déploiement (le workflow ne renomme que `CACHE_NAME`). À l'installation, seuls les fichiers manquants sont téléchargés. Nettoyé uniquement si la version du SDK change (préfixe `courses-lc-sdk-`). Les caches des autres apps ne sont jamais touchés.
   - **Bug corrigé** : le précache du SDK utilisait `cache.add()` sur une requête `no-cors`, or `cache.add()` refuse les réponses opaques (statut 0) → **le SDK n'était jamais mis en cache à l'installation** (échec silencieux), seulement plus tard par le gestionnaire `fetch`. Remplacé par `fetch()` + `cache.put()` (piège déjà signalé dans `PROBLEMES_RESOLUS.md` pour le Portail, « à vérifier sur Course »).
   - **Attente réseau d'abord : 4 s → 1,5 s.** Mode avion : inchangé (échec immédiat → cache). Réseau faible : on bascule plus vite sur le cache. Contrepartie : sur réseau lent, une nouvelle version peut n'être prise qu'au retour suivant dans l'app (contrôle `DERNIERE_MAJ` existant).

**Mesures après** (même banc, serveur local) : interface visible en **~230–360 ms** au lieu de 560–1 050 ms ; liste en **~300–420 ms** au lieu de 790–1 100 ms.

**Vérifié** (Chromium, vrai service worker, vraie base, cache HTTP du navigateur désactivé) : SDK présent dans son cache dès la 1re installation (3/3) ; rechargement **hors ligne** : 134/134 produits en ~150 ms ; déploiement simulé → ancien cache du shell supprimé, cache SDK conservé (3/3), cache d'une autre app intact ; nouveau rechargement hors ligne OK ; **coche faite hors ligne** puis retour du réseau → visible depuis un autre appareil ; coche annulée ensuite (état réel du produit vérifié en base via l'accès admin : revenu à l'identique). Bouchon Firebase avec authentification lente : liste affichée depuis l'aperçu à 100 ms, tap à 230 ms envoyé seulement après Firestore (900 ms), avec la bonne valeur. **Non vérifié sur iPhone.**

