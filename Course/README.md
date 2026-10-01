# Courses L&C

Liste de courses partagée entre Corentin et Lisa. HTML/CSS/JS vanilla (3 fichiers depuis le 20/09/2026), hébergé sur GitHub Pages, synchronisé en temps réel via **Cloud Firestore**. Accessible via l'icône du Portail Duo sur iPhone (menu → Courses), avec ouverture hors-ligne.

**Reconstruite intégralement le 18/09/2026** suite à des incidents répétés de duplication de données liés à l'ancienne architecture (voir tout en bas, section Historique, pour le contexte).


> **📌 État actuel (vérifié le 28/09/2026)** — à lire en premier ; les sections plus bas sont chronologiques et peuvent décrire un état dépassé (barré ou signalé « → »).
> - **Design Verre** (feuille commune `../verre.css`), **sombre uniquement**, titre de l’onglet (Liste / Course / Réglages) à gauche + pastille de connexion ; la page défile elle-même, barre d'onglets en `position:fixed`.
> - **Noyau commun `../commun.js`** chargé dans le `<head>` (halos, transition, date de MAJ, service worker, vérification de version).
> - **Profil** : `duo_profile`, commun aux 4 apps (Réglages › Profil). Retour au Portail : geste retour d'iOS.
> - **Plusieurs listes de courses** (depuis le 30/09/2026, modèle v2 « catalogue commun ») : tous les produits dans toutes les listes, une seule coche par produit à la couleur de la liste qui l'a coché, onglet Course = toutes les listes. Voir « Plusieurs listes de courses » et « v2 » en fin de fichier.
## Fichiers (mis à jour le 28/09/2026)
- `index.html` — structure + `DERNIERE_MAJ` (gérée par le workflow) ; charge `../commun.js`, `../verre.css`, `style.css`, `app.js`
- `style.css` — styles de base (le verre vient de `../verre.css`)
- `app.js` — logique de l'app
- `sw.js` — Service Worker : shell (`index.html`, `style.css`, `app.js`, `manifest.json`), fichiers communs `../verre.css` et `../commun.js` (`FICHIERS_COMMUNS`) et SDK Firebase (gstatic.com), pour l'ouverture hors-ligne
- `manifest.json` — configuration PWA (icône en base64 intégrée, nom, couleurs)

## Fonctionnement — 3 onglets

**Liste** : tous les produits connus, **triés par popularité** (nombre de fois où le produit a été effectivement acheté, du plus au moins acheté ; à égalité, ordre alphabétique) — pas de regroupement par rayon ici, le rayon est juste affiché en sous-titre sous le nom du produit. Chaque ligne a :
- une case à cocher à gauche : coche "à acheter" (fait apparaître le produit dans l'onglet Course)
- le nom du produit
- un petit carré éditable à droite pour la quantité ou une info libre (ex: "2", "grande taille")
- un crayon (✎) pour modifier le nom et/ou le rayon du produit

Une barre de recherche filtre par nom, avec une croix pour l'effacer. Un bouton rond **+**, posé juste au-dessus de la barre d'onglets flottante, aligné à droite (visible uniquement sur l'onglet Liste), ouvre le même formulaire que le crayon (nom + rayon, avec possibilité de créer un nouveau rayon à la volée) pour ajouter un produit.

**Course** : uniquement les produits cochés "à acheter" en Liste, groupés par rayon. On coche ici un produit une fois réellement acheté (nom barré, carte estompée) — rien n'est retiré automatiquement. Le bouton **Course terminée** (actif seulement si au moins un produit est coché acheté) décoche d'un coup, dans les deux onglets, tous les produits ainsi cochés — sans jamais les supprimer de la Liste.

**Réglages** : choix du profil (**Corentin** = thème bleu, **Lisa** = thème rose, appliqué immédiatement via une variable CSS `data-profil` sur `<html>`, mémorisé dans `localStorage duo_profile` — réglage commun aux 4 apps depuis le 28/09/2026). Bouton **Recharger l'application** : vide uniquement le cache et le Service Worker de Course (jamais ceux du Portail/Muscu/Budget — voir "Choix d'architecture" ci-dessous), avec confirmation avant l'action.

~~Un bouton **theme-toggle** (cercle 🌙/☀️ en haut à droite, superposé à l'app) bascule entre mode sombre (par défaut) et mode clair, préférence mémorisée dans `localStorage` (`course-theme`), indépendamment du profil Corentin/Lisa.~~ → retiré le 28/09/2026 (sombre uniquement).

## Base de données : Cloud Firestore
Projet `course-app-36e9d`, deux collections de premier niveau :
- `produits/{id}` — champs `nom`, `quantite` (texte libre), `rayonId`, `aAcheter` (bool), `achete` (bool), `compteur` (nombre, incrémenté de 1 à chaque "Course terminée" — sert au tri par popularité de l'onglet Liste)
- `rayons/{id}` — champ `nom`
- `listes/{id}` — champs `nom`, `ordre`, `couleur` (depuis le 30/09/2026) ; `listeId` d'un produit = la liste qui l'a **coché** (absent = `maison`). Voir « Plusieurs listes de courses » (v2).

Synchronisation en temps réel via `onSnapshot` sur les deux collections. Règles de sécurité : `allow read, write: if request.auth != null` (tout utilisateur authentifié, y compris anonyme). *(Situation d'origine — depuis le 29/09/2026 au soir : réservé au compte du duo, voir « Réservée au compte du duo » en fin de fichier.)*

**Authentification : anonyme** (`signInAnonymously()`), activée sur le projet le 18/09/2026 *(remplacée le 29/09/2026 au soir par le compte e-mail du duo ; connexion anonyme désactivée dans Firebase)*. Pas d'écran de connexion — le choix Corentin/Lisa dans Réglages est une simple préférence d'affichage locale (`localStorage`), pas un compte séparé : les deux profils partagent les mêmes données.

**Persistance hors-ligne Firestore** : `enablePersistence({synchronizeTabs:true})` (SDK compat classique — délibérément pas l'API modulaire `initializeFirestore`/`persistentLocalCache`, qui nécessitait un `import()` cross-origin dynamique s'étant révélé peu fiable pour la mise en cache par le Service Worker). En cas d'échec, repli silencieux sur le cache mémoire.

## Choix d'architecture (pourquoi, suite aux incidents du 18/09/2026)
- **Aucune logique de "réinjection si la base est vide"** au démarrage de l'app. C'est le principal changement par rapport à l'ancienne version : une fonction de ce type s'est déclenchée à tort à plusieurs reprises (y compris après tentative de correctif), dupliquant le catalogue en base à chaque fois. Le catalogue de départ est importé **une seule fois, côté serveur**, via un script utilisant les identifiants Admin SDK — jamais par le code client.
- **SDK Firebase 100% "compat"**, sans import ES modulaire dynamique cross-origin (source d'échecs de mise en cache difficiles à diagnostiquer).
- **`sw.js`** met en cache le SDK Firebase (`gstatic.com`) en mode `no-cors` explicite pour la mise en cache (le mode `cors` par défaut de `cache.add()` peut échouer silencieusement selon le CDN).
- **`CACHE_PREFIX = 'courses-lc-shell-'`** : l'`activate` du Service Worker ne nettoie que les caches commençant par ce préfixe, jamais tout `caches.keys()` sans filtre — pour ne jamais supprimer le cache des autres apps du Portail (Muscu, Budget, le Portail lui-même).
- **Authentification anonyme** plutôt qu'email/mot de passe : élimine un écran de connexion et sa dépendance réseau au démarrage.

## Mise en route (si jamais à refaire ailleurs)
*(Procédure d'origine, périmée depuis le 29/09/2026 : aujourd'hui, projet commun `course-app-36e9d`, connexion e-mail du duo, règles = `/firestore.rules` du dépôt.)*
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
- **Règles Firestore inchangées** : `request.auth != null` (anonyme compris) couvre déjà `portail`. *(Depuis le 29/09/2026 au soir : `portail/*` réservé au compte du duo.)*
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



## Mode « Verre » — essai commun aux 4 apps (28/09/2026)

Habillage activable défini dans la feuille commune **`../verre.css`** (racine du dépôt) — principe, activation et workflow décrits dans le README racine, section « Mode Verre ». Côté Course :

- `index.html` : `<html data-app="course">`, mini-script dans `<head>` qui pose `html.verre` si `localStorage duo-verre = '1'`, police Unbounded, `<link>` vers `../verre.css?v=…` ; lien **« ‹ Portail »** (`#verre-pile`, visible seulement en mode Verre) en haut de `#app` ; nouvelle carte **Réglages › Apparence** avec l'interrupteur « Essai Verre (les 4 apps) ».
- `app.js` (bloc « MODE VERRE ») : interrupteur (effet immédiat, sans rechargement) ; lien « ‹ Portail » : si on vient du Portail, `history.back()` (le Portail ressort de son cache précédent/suivant, comme avec le geste retour) ; sinon lien normal vers `../`.
- `sw.js` : `../verre.css` est **hors du dossier du service worker**, il était donc ignoré par le gestionnaire `fetch` (et aurait manqué hors ligne). Ajouté explicitement au précache et en « réseau d'abord » (constante `FICHIER_VERRE`).
- Rendu en mode Verre : **une seule plaque de verre** (`main`) pour tout le contenu qui défile ; les produits deviennent des **lignes séparées par des filets** (plus de cartes) pour ne pas multiplier les flous ; cases rondes lumineuses à la couleur du profil ; barre d'onglets et bouton + en verre plus dense ; « Course terminée » teinté vert. **La coche reste sans animation** (charte §11.2).

**Vérifié** : Chromium headless 390×844 — Liste et Réglages en mode Verre, mode classique inchangé. **Non vérifié sur iPhone.**


## Mode Verre — retouches après le 1er essai sur iPhone (28/09/2026)

Retour de Corentin sur capture iPhone :
- **Lien « ‹ Portail » retiré** (et ses deux barres translucides en haut) : pas clair, et inutile — le geste retour d'iOS (glisser vers la droite) ramène déjà au Portail. `index.html` (`#verre-pile`), `app.js` et `verre.css` nettoyés ; l'en-tête reprend sa position normale.
- **Bande unie de ~62 pt tout en bas, sous la barre d'onglets.** Mesure sur la capture (1320×2868, ×3) : la plaque et la barre s'arrêtent à 895 pt sur 956 ; dessous, seulement le fond de `<html>` (#08080a) — pas le calque de halos, pourtant fixé en `inset:-10%`. La hauteur manquante ≈ l'encoche du haut : c'est le **bug WebKit n°1** du guide PWA (le viewport perd la hauteur de la zone du haut). Elle existait déjà en mode classique, **invisible** car de la même couleur que le fond ; le verre, plus clair, la révèle. **Course était la seule des 4 apps en `status-bar-style` `black`** (Portail, Muscu et Budget : `black-translucent`, sans bande signalée), alors que ce réglage n'avait eu « aucun effet » sur le flou du 18/09 (vraie cause : cache du service worker). **Passé en `black-translucent`**, comme les 3 autres. En mode classique, l'en-tête gardait déjà sa marge `--safe-top` : rien ne passe sous l'heure.

⚠️ **À vérifier sur iPhone** : bande disparue ? Et la barre d'onglets : si le viewport retrouve sa vraie hauteur, la pilule descend d'environ 60 pt (elle était de fait posée plus haut que `--nav-offset` ne le prévoyait). Si elle devient trop basse (Siri qui se déclenche), remonter `--nav-offset` dans `style.css`. Si le flou de la barre de statut du 18/09 réapparaît, revenir à `black` et chercher une autre piste pour la bande.

### Suite (28/09/2026, 18h35) — la bande persiste avec `black-translucent` : correctif par mesure

Retour de Corentin : **bande toujours là**. Le changement de `status-bar-style` est conservé (même réglage que les 3 autres apps), mais ne suffit pas. Correctif direct :
- **`index.html`** (petit script dans `<head>`) : en app écran d'accueil, mesure `écart = hauteur de l'écran − window.innerHeight`, posée dans la variable CSS `--manque` (0 hors bug, hors mode app, ou si l'écart sort de 1–120 pt : clavier, rotation). Remesurée à 0,5 s et 1,5 s (bug WebKit n°2 : valeurs fausses juste après le lancement), au redimensionnement, à la rotation et au retour depuis le cache précédent/suivant.
- **`style.css`** : `#app` et le fond des modales descendent de `--manque` sous le bas du viewport (ils couvrent la bande) ; la barre d'onglets et les fins de listes/réglages/modales remontent d'autant → **la barre reste exactement à la même place à l'écran** (position choisie par Corentin à l'usage). Les éléments fixés au viewport (« Course terminée », bandeau de mise à jour) ne bougent pas.

**Non vérifiable hors iPhone** (Chromium ne reproduit pas ce viewport). Si la bande reste : c'est que Safari ne peint rien sous le viewport, et il faudra une autre approche (fond de `<html>` à la couleur de la plaque).

### Suite (28/09/2026, 18h40) — bande toujours là : diagnostic + filet de sécurité

Retour de Corentin : **toujours là** après le correctif par mesure. Plutôt que d'enchaîner les hypothèses :
- **Diagnostic temporaire** dans Réglages › Application (sous la date du code, `#diag-ecran`, bloc « Diagnostic TEMPORAIRE » de `app.js`) : taille de l'écran, `innerHeight`, `clientHeight`, viewport visuel, safe-areas haut/bas, `--manque`, bas réel de `#app`, mode app oui/non. **À retirer une fois la bande réglée.**
- **Filet de sécurité en mode Verre** (`verre.css`) : le fond de `<html>` garde la couleur du fond sur toute la hauteur du viewport (dégradé plein, taille 100 %), et prend la couleur de la plaque de verre (`#171719`, clair : `#ece7df`) pour tout ce qui dépasse — donc la bande, si Safari ne peint que ce fond-là sous le viewport.

### Conclusion (28/09/2026, 18h45) — mesures iPhone : la bande est hors de la page

Mesures relevées par le diagnostic sur l'iPhone de Corentin (écran 440×956 pt) : `innerHeight` = `clientHeight` = viewport visuel = **894**, safe-area haut 62 / bas 34, `#app` prolongé jusqu'à 956 par `--manque`… mais **rien n'est dessiné sous 894**, alors que la bande a pris la couleur de secours de `<html>`.
**Conclusion** : en app écran d'accueil, la page elle-même ne mesure que 894 pt (956 − 62, la hauteur de l'encoche) ; les 62 pt du bas sont **hors de la page** et iOS les remplit avec la **couleur de fond de `<html>`** (couleur unie seulement : ni dégradé ni élément). Aucun CSS ne peut y dessiner.
**Donc** :
- Correctif par mesure (`--manque`) **retiré** (inutile : on ne peut pas peindre là) ; `#app`, barre d'onglets, listes et modales reviennent exactement à leur état d'avant.
- Diagnostic temporaire **retiré** de Réglages.
- **Conservé** : `black-translucent` (même réglage que les 3 autres apps) et, en mode Verre, fond de `<html>` à la couleur du bas de la plaque (`#171719`, clair `#f1ede7`) — la bande prolonge la plaque. Le 2e halo (couleur de l'app) est remonté à 60 % de la hauteur pour que le bas de la plaque soit uni et se raccorde sans marche à la bande.
- La cause profonde (pourquoi iOS retire 62 pt à la page) reste un bug WebKit non contournable côté page à ce jour ; elle touche sans doute aussi les autres apps, où elle ne se voit pas car leur bas de page a déjà la couleur du fond.

### Rebondissement (28/09/2026, 18h50) — Budget n'a PAS la bande : la cause est propre à Course

Capture de Budget par Corentin : son contenu et sa barre descendent jusqu'au vrai bas de l'écran (barre à ~22 pt du bord, alors que la page de Course s'arrête à 894 pt). La conclusion précédente (« iOS coupe toutes les pages ») était donc **fausse**. Différence de structure : Budget = page qui défile normalement ; Course = `body{overflow:hidden}` + `#app` fixé. Suspect n°1 : **`body{overflow:hidden}`**.
- `body{overflow:hidden}` **retiré** (rien n'est dans le flux normal, la page ne peut de toute façon pas défiler).
- **`--manque` remis**, mais cette fois SANS compenser la barre : `#app` (et les fonds de modale) descendent jusqu'au vrai bas de l'écran si la page est encore plus courte que l'écran ; la barre suit. Les éléments fixés au bas du viewport (« Course terminée », bandeau de mise à jour) retranchent `--manque` pour rester au-dessus de la barre.
- **`--nav-offset` aligné sur Budget** : `max(20px, safe-area − 12px)` ≈ 22 pt (avant : ≈ 4 pt, valeur jamais réellement vue à l'écran à cause de la bande — elle aurait mis la barre dans la zone du geste d'accueil).

⚠️ **À vérifier sur iPhone** : la barre doit être posée comme celle de Budget. Si elle apparaît **coupée en bas** : le retrait d'`overflow:hidden` ne suffit pas, iOS ne dessine toujours rien sous 894 pt → remettre `--manque` à 0 (retirer le script de `index.html`) le temps de chercher.

### Retour arrière (28/09/2026, 18h50)

Retour iPhone : la barre d'onglets est **coupée** en bas — iOS ne dessine toujours rien sous 894 pt, même sans `body{overflow:hidden}`. `style.css` et `index.html` de Course **remis à l'identique de l'état précédent** (barre visible, même position qu'avant ; `overflow:hidden` et `--nav-offset` ≈ 4 pt restaurés ; `--manque` retiré). Restent en place : `black-translucent` et la couleur de fond de secours du mode Verre.
**Piste restante** : Budget, lui, a sa pleine hauteur — sa page **défile** (contenu plus haut que l'écran, `body{min-height:100vh}`), celle de Course non (tout est dans `#app` fixé). À tester séparément, en mesurant d'abord la hauteur de page de Budget sur l'iPhone.

### Correctif définitif (28/09/2026, 19h00) — la page défile comme Budget et Muscu

Constat de Corentin : Budget et Muscu, **pages qui défilent**, n'ont jamais eu la bande. Course était la seule app construite en « écran fixe » : `body{overflow:hidden}` + `#app{position:fixed; inset:0}` + `<main>` qui défilait **à l'intérieur**. Dans cette structure, iOS (app écran d'accueil) ne donne à la page que 894 pt sur 956 et ne dessine rien dans les 62 pt du bas (mesuré). La tentative précédente n'avait retiré que `overflow:hidden` en gardant `#app` fixé : insuffisant.
**Course reprend la structure de Budget** (`style.css`) :
- `#app` suit le flux normal (`position:relative; min-height:100vh`), `<main>` grandit avec son contenu (plus de défilement interne) : c'est la page entière qui défile.
- Barre d'onglets en `position:fixed` (avant : `absolute` dans `#app` fixé) ; bouton thème en `absolute` (défile avec l'en-tête) ; « Course terminée », modales et bandeau de mise à jour étaient déjà en `fixed`.
- `--nav-offset` = valeur de Budget, `max(20px, safe-area − 12px)` ≈ 22 pt du **vrai** bord (l'ancienne valeur ≈ 4 pt se mesurait depuis une page coupée : à l'écran, la barre était à ~66 pt du bord).
- `app.js` : `window.scrollTo(0,0)` à chaque changement d'onglet (le défilement est maintenant celui de la page, partagé par les onglets).
**Vérifié** (Chromium 390×844, vraie base) : liste longue qui défile jusqu'en bas avec la barre fixe par-dessus, Réglages, changement d'onglet revenant en haut, modes Verre et classique, aucune erreur JS. **À confirmer sur iPhone.** Point à surveiller : en mode Verre, la plaque floutée fait désormais toute la hauteur de la liste — si le défilement saccade sur une longue liste, retirer son `backdrop-filter` (le fond seul suffit).


## Design Verre — DÉFINITIF (28/09/2026, 19h15)

Décision de Corentin : le design Verre devient celui de Course (et du Portail). **Plus d'interrupteur** : `<html lang="fr" data-app="course" class="verre">` en dur ; mini-script du `<head>` et carte **Réglages › Apparence** retirés ; bloc « MODE VERRE » d'`app.js` remplacé par le nettoyage des clés de l'essai (`duo-verre`, `duo-verre-intensite`). Le curseur « Effet verre » essayé sur le Portail a été retiré (valeurs fixes du verre).

**État de Course en résumé** : page qui défile (structure de Budget), barre d'onglets en `position:fixed` à ~22 pt du vrai bord, plaque de verre unique pour le contenu, produits en lignes à filets, cases rondes à la couleur du profil, bouton thème qui défile avec l'en-tête, `status-bar-style` `black-translucent`, `../verre.css` en cache (`FICHIER_VERRE` dans `sw.js`). `style.css` reste la base (jetons, structure, thème clair), `verre.css` l'habille.

**Vérifié** (Chromium 390×844, aucune clé en `localStorage`) : ouverture directe en Verre, Liste, Réglages sans « Apparence », aucune erreur JS.

### Halos animés (28/09/2026, 19h25)
Les deux lumières du fond dérivent lentement (feuille commune `../verre.css`, voir README racine, « Halos animés »). Rien de propre à Course. Point à surveiller sur iPhone : fluidité du défilement de la liste (le verre de la plaque est recalculé pendant que le fond bouge) — en cas de saccade, couper l'animation d'abord.

### Halos continus d'une app à l'autre (28/09/2026, 19h30)
`index.html` : mini-script dans `<head>` (→ dans `../commun.js` depuis le noyau commun) qui cale l'animation des halos sur l'horloge (identique au Portail) — les lumières continuent leur mouvement au lieu de repartir de zéro en arrivant dans Course. Détail dans le README racine.


## Thème sombre uniquement — bouton lune retiré (28/09/2026)

Décision de Corentin, **valable pour les 4 apps** : plus de thème clair, on reste en sombre d'office. Course : bouton `#theme-toggle` retiré (`index.html`), bloc thème d'`app.js` remplacé par l'effacement de `course-theme` ; règles `.light-mode` et `.theme-toggle` retirées de `style.css` et de `verre.css`.
**Vérifié** (Chromium 390×844, avec l'ancien réglage « clair » encore en mémoire) : l'app s'ouvre en sombre, plus de bouton, aucune erreur JS. **Non vérifié sur iPhone.**


## Pastille de connexion à côté du titre (28/09/2026)

Demande de Corentin : dans chaque app, le titre à gauche et la pastille verte/rouge de connexion **juste à côté**, comme « Budget ● ». Pastille commune dessinée par `verre.css` en `::after` sur le titre (un pseudo-élément survit aux titres réécrits en JS), couleur pilotée par `<html data-sync="ok|envoi|hors-ligne">` : **vert** synchronisé, **or** synchronisation en cours, **rouge** hors ligne. Budget garde sa pastille d'origine (`.status-dot`), qui servait de modèle.
Course : pastille après le titre de l'onglet (`#titre-onglet`, l'en-tête passe en `justify-content:flex-start`). `app.js` : `majStatutConnexion()` appelée à chaque instantané Firestore (`dbOnCollection`) — vert quand les données viennent du serveur, or tant qu'elles viennent du cache local, rouge hors ligne (événements `online`/`offline`).


## Haut de page aligné sur Budget (28/09/2026)

Demande de Corentin : Budget gère le mieux le haut de l'écran → même en-tête dans les 4 apps. Nouvelle variable commune `--v-haut` (`verre.css`) = zone de l'encoche + 18 px (valeur de Budget) : **le titre démarre au même endroit dans toutes les apps**, en **Unbounded 600 22 px** avec la pastille de connexion à côté, et **les plaques de verre commencent sous l'en-tête**, jamais sous la barre d'état.
Mesuré (Chromium 440×956, zone d'encoche simulée à 62 px) : haut du titre à 79–80 px dans les 4 apps (avant : Portail 88, Course 92, Budget 80, Muscu 132).
Course : en-tête à `--v-haut` (au lieu de encoche + 30 px), titre de l'onglet en Unbounded 600 22 px (Unbounded 300 34 px avant) ; la plaque remonte d'autant.


## Profil Corentin/Lisa commun aux 4 apps (28/09/2026)

Demande de Corentin : un seul choix de profil pour tout (avant : une clé par app — `duo_profile` pour Muscu et le Portail, `profil` pour Course, `budgetLC_profil` pour Budget — donc trois choix à faire sur le téléphone de Lisa). **Clé unique : `localStorage duo_profile` = `'corentin' | 'lisa'`** (même origine, donc partagée). Muscu l'utilisait déjà (écran « Qui s'entraîne ? » et Réglages › « Qui es-tu sur ce téléphone ? »), le Portail la lisait déjà.
Course : `lireProfilCommun()` / `ecrireProfilCommun()` (`app.js`) — lit `duo_profile`, reprend une fois l'ancienne clé `profil` (`'Corentin' | 'Lisa'`) puis l'efface ; en interne, Course garde `'Corentin' | 'Lisa'` (attribut `html[data-profil]`, boutons). Réglages › Profil : phrase « Réglage commun aux 4 apps ».


## Transition « la vitre s'ouvre en app » (28/09/2026)

Demande de Corentin : en touchant la vitre de devant du Portail, la vitre **se transforme** en l'app au lieu d'un simple changement de page. **View Transitions inter-pages** (Safari/iOS 18.2+, Chrome 126+ ; ailleurs : navigation normale) :
- `verre.css` : `@view-transition { navigation: auto; }` (les 4 pages partagent l'origine et la feuille) ; la **plaque** de chaque app porte `view-transition-name: vitre` (Course : `main` ; Budget : `.main-content` ; Muscu : `#view-menu .plaque`) ; la boîte « vitre » se déforme de la taille de la vitre à celle de la plaque en 0,42 s (courbe de la pile), contenu jamais étiré (`object-fit:none`, calé en haut, découpé par la boîte arrondie) ; le reste de la page fond enchaîné. Coupée par `prefers-reduced-motion`.
- Mini-script identique dans le `<head>` des 4 pages (`pagereveal`) : **transition annulée pour les retours** (geste retour d'iOS, historique : type `traverse` / `back_forward`) et les rechargements — iOS anime déjà lui-même le retour, deux animations se superposeraient.
Course : `main` (la plaque) porte `view-transition-name: vitre` ; mini-script `pagereveal` dans `index.html` (→ dans `../commun.js` depuis le noyau commun).


## Noyau commun `../commun.js` (28/09/2026)

Le code identique aux 4 apps (halos calés sur l'horloge, annulation de la transition « vitre → app » au retour, date de dernière mise à jour, enregistrement du service worker, vérification de version au retour dans l'app) vit maintenant **une seule fois** dans `../commun.js` à la racine — détail dans le README racine, « Noyau commun ».
- `index.html` : les deux mini-scripts du `<head>` remplacés par `<script src="../commun.js?v=…">` (sans `defer`, avant `verre.css`). `DERNIERE_MAJ`, `#maj-toast` et `#derniere-maj` (Réglages) restent ici.
- `app.js` : blocs `formaterDerniereMaj`, service worker et vérification de version retirés (~80 lignes).
- `sw.js` : `FICHIER_VERRE` → `FICHIERS_COMMUNS = ['../verre.css', '../commun.js']` (précache + réseau d'abord avant le filtre de périmètre).
**Vérifié** (Chromium) : aucune erreur JS, date de MAJ affichée dans Réglages, `sw.js` enregistré, `commun.js` en cache, rechargement auto / bandeau sur version plus récente.

## Projet Firebase unique (29/09/2026)

- Le projet de Course (`course-app-36e9d`) est devenu **le projet commun aux 4 apps** : Budget (`mois`, `config`) et Muscu (`archives`, `customSessions`, `coachChat`, `settings`) y ont été copiés. Données de Course **non touchées**. Détails : README racine, « Projet Firebase UNIQUE ».
- **Règles modifiées** (`/firestore.rules`, versionné) : `produits`, `rayons` et `portail` restent ouverts à toute session (anonyme comprise) ; les collections de Budget et Muscu exigent le compte e-mail du duo ; tout le reste est fermé (avant : `request.auth != null` sur **toute** la base).
- **Session partagée** avec Budget et Muscu : si l'on s'est connecté par e-mail dans l'une d'elles, Course reprend cette session telle quelle ; sinon connexion anonyme comme avant *(plus de connexion anonyme depuis le soir même : écran de connexion, voir ci-dessous)*. `demarrer()` garde les fonctions d'arrêt de ses deux écoutes (`ecoutes`, `dbOnCollection` renvoie désormais la fonction d'arrêt) : jamais d'écoute en double si l'état d'auth est re-signalé, arrêt puis reconnexion anonyme après une déconnexion faite dans Muscu.
- Vérifié : Chromium, base réelle — données lues depuis le serveur (pastille verte), aucune erreur.

## Réservée au compte du duo (29/09/2026, soir)

- **Plus de connexion anonyme** : `demarrer()` (`app.js`) ouvre l'écran **Connexion** (`#connexion`, `connexionDuo()` de `../commun.js`) tant qu'il n'y a pas de session e-mail du duo — une ancienne session anonyme compte comme « pas connecté ». Écoutes de `produits`/`rayons` démarrées seulement avec le compte du duo, arrêtées à la déconnexion.
- **Session partagée** avec le Portail, Budget et Muscu (application Firebase par défaut, même origine) : une connexion faite dans l'une vaut pour les autres sur la même installation.
- Règles : `produits`, `rayons`, `portail` → `compteDuo()` (`/firestore.rules`). **Ordre de mise en service** et vérifications : README racine, « Course et Portail réservés au compte du duo ».
- **État au 29/09/2026 (soir)** : en ligne, testé sur iPhone par Corentin (« tout marche ») ; connexion anonyme désactivée dans Firebase ; règles avec l'UID du compte publiées.

## Barre de recherche toujours accessible (29/09/2026, soir)

**Demande de Corentin** : que la recherche reste en haut pendant qu'on fait défiler la liste.
- `index.html` : la `.searchbar` est enveloppée dans `.barre-recherche`, **collée en haut de l'écran** pendant le défilement (`position:sticky`, `../verre.css`) — la page défile elle-même (voir « bande noire du bas »), pas de défilement interne.
- Au repos : aspect inchangé (même place, sur la plaque de verre). **Collée** (classe `.colle`, posée par `app.js`, « BARRE DE RECHERCHE COLLÉE », au plus un calcul par image) : fond opaque couleur plaque `#171719` **sans flou** (règle PERF de `verre.css` : pas de 4e surface floutée), voile sur la zone de l'encoche au-dessus (`::before`) et fondu sous la barre (`::after`) — les produits qui défilent dessous ne se lisent ni à côté de la barre ni derrière l'heure.
- La barre se cale à 10 px sous l'encoche (`top: env(safe-area-inset-top) - 6px`, la barre étant à 16 px du haut de l'enveloppe).
- Vérifié (Chromium + émulateurs, 30 produits, encoche simulée) : iPhone 16 Pro Max — au repos barre à 139 px, non collée ; après défilement barre à 72 px (62 + 10), collée ; recherche qui raccourcit la liste → retour en haut, décollée ; iPhone 16 : 136 px → 69 px. Aucune erreur JS. **Non vérifié sur iPhone.**

### Suite — la barre disparaissait à l'ouverture du clavier (29/09/2026, soir)
**Retour de Corentin (iPhone)** : toucher la barre alors qu'elle était collée ouvrait le clavier, et iOS faisait défiler la page pour « montrer » le champ… en poussant la barre hors de l'écran.
- `app.js` (« CLAVIER ET BARRE COLLÉE ») : à l'entrée dans le champ (`focus`), retour en haut de la liste (`scrollTo(0, 0)`) — la barre y est à sa place normale, au-dessus du clavier, résultats juste dessous. Refait sur `visualViewport` `resize` pendant l'ouverture du clavier (1,5 s au plus après l'entrée, iOS pouvant redéfiler après le focus), jamais ensuite : on peut parcourir les résultats clavier ouvert.
- Vérifié (Chromium, iPhone 16 Pro Max simulé) : liste défilée → toucher la barre collée → haut de page, barre à 139 px, champ actif ; redéfilement simulé pendant l'ouverture → ramené en haut ; saisie OK ; défilement après 1,5 s → laissé tel quel, barre recollée. Le clavier d'iOS ne se simule pas dans Chromium : **confirmé sur iPhone par Corentin le 29/09/2026** (barre collée, puis toucher la barre → elle reste visible au-dessus du clavier).


## Styles au choix Verre · Relief · Argile (30/09/2026)

- Choisis sous la pile du **Portail** (« Style des apps ») et appliqués ici sans aucun changement dans le code de l'app : `../commun.js` pose `<html data-style="relief|argile">` avant le 1er rendu (`localStorage duo-style`), `../verre.css` (bloc « STYLES AU CHOIX ») habille les surfaces. Attribut absent = Verre (défaut).
- **Relief** = neumorphisme (matière mate unique, surfaces en relief ou en creux, pas de halos). **Argile** = claymorphisme (surfaces pleines gonflées, teintées à la couleur du profil). Bleu Corentin / rose Lisa conservés dans les deux.
- Surfaces de cette app prises en charge : plaque `main`, barre d'onglets, bouton +, « Course terminée », barre de recherche collée (fond = couleur de la plaque), cases, quantités, blocs des Réglages, sélecteur de profil, modales. **Nouvelle surface ajoutée à l'app** → la déclarer dans la bonne catégorie du bloc « STYLES AU CHOIX » de `verre.css`, sinon elle reste translucide en Relief/Argile.
- **Bande iOS du bas** : le fond de `<html>` prend la couleur de la plaque du style choisi (même principe qu'en Verre).
- Vérifié (Chromium, Firebase simulé) : Liste, Course, Réglages dans les 3 styles, profils Corentin et Lisa. Non vérifié sur iPhone. Détails : README racine, « Styles au choix ».


## Plusieurs listes de courses (30/09/2026)

> ⚠️ **Première version (v1), remplacée le même jour par la v2 « catalogue commun » ci-dessous** : les points « chaque liste a ses propres produits », « champ Liste dans la fiche produit », « supprimer une liste supprime ses produits » et « Course = liste choisie » ne valent plus.

**Demande de Corentin** : la liste existante est en fait la liste « Maison » ; pouvoir en créer d'autres (« Apéro », « Vacances »…), qu'il remplit lui-même. Consigne : ne rien perdre de la liste actuelle (48 produits cochés ce jour-là).

**Interface**
- **Pastilles sous le titre** (`#selecteur-listes`, onglets Liste et Course, masquées dans Réglages) : une par liste, avec un badge = nombre de produits encore à acheter (`aAcheter && !achete`) ; la pastille **+** crée une liste. Défilement horizontal si beaucoup de listes. 40 px visuels, zone tactile 44 px (`::after`).
- **Onglets Liste et Course** : n'affichent que la liste choisie. **« Course terminée » ne décoche que la liste affichée.** La recherche cherche dans la liste affichée.
- **Réglages › Listes de courses** : une ligne par liste (nom + nombre de produits) → fenêtre **renommer / supprimer** ; bouton « + Nouvelle liste ».
- **Fiche produit** (+ ou ✎) : champ **Liste** (visible seulement s'il y a au moins 2 listes) — sert aussi à déplacer un produit d'une liste à l'autre. Nouveau produit : liste affichée par défaut.
- **Maison ne peut pas être supprimée** (elle peut être renommée). Supprimer une autre liste supprime aussi ses produits, après confirmation (`dialogue()`, nombre de produits annoncé).
- Créer une liste avec le nom d'une liste existante (sans accents ni casse) ouvre simplement celle-ci ; renommer vers un nom pris affiche une erreur.
- Liste affichée **mémorisée par téléphone** (`localStorage courses_liste_active`) : Lisa et Corentin peuvent regarder deux listes différentes. Si elle a été supprimée depuis l'autre téléphone → retour sur Maison.

**Données** (`course-app-36e9d`)
- Nouvelle collection **`listes/{id}`** = `{ nom, ordre }` (`ordre` = 0 pour Maison, date de création sinon). La liste d'origine a l'id fixe **`maison`**.
- Champ **`listeId`** sur chaque produit. **Absent = `maison`** (`listeDe()`) : un produit créé par un téléphone resté sur l'ancienne version, ou tout document d'avant la migration, reste visible dans Maison.
- Si `listes/maison` manque (règles non publiées, première ouverture hors ligne), Maison existe quand même dans l'interface (entrée virtuelle, jamais écrite par l'app sauf si on la renomme : `set(…, {merge:true})`).
- Les **rayons restent communs** à toutes les listes.
- Nouvelle liste : id créé localement (`collection('listes').doc()`), affichée tout de suite, même hors ligne. Suppression : produits par lots de 400 au plus, puis la liste.
- Une écoute `onSnapshot` de plus (collection de quelques documents : coût négligeable sur le quota partagé). Aperçu local (`courses_apercu_v1`) : contient aussi `listes`.
- **Résumé du Portail** (`portail/courses`) : inchangé, il compte **toutes les listes** confondues.

**Migration faite le 30/09/2026** (compte de service, jamais par le code client — même principe que le catalogue de départ) : sauvegarde JSON complète avant (134 produits, 13 rayons, 3 documents `portail`), puis en une seule écriture groupée : création de `listes/maison` (`nom: 'Maison', ordre: 0`) et `listeId: 'maison'` sur les 134 produits **avec un masque de champ** (`updateMask: listeId`) : aucun autre champ touché. Vérifié après : 134 produits, tous dans Maison, tous les autres champs identiques, 48 produits cochés « à acheter » comme avant.

**Règles** : `match /listes/{id} { allow read, write: if compteDuo(); }` ajoutée à `/firestore.rules` et **publiée par l'API Firebase Rules le 30/09/2026** (avant la mise en ligne du code). Vérifié : `listes` refusée sans session.

**Correctif au passage** : quand la liste de l'onglet Course devenait vide, le bouton « Course terminée » recevait `disabled` mais gardait sa classe `.visible` (il restait affiché). Il est maintenant masqué (`.visible` retirée) — visible surtout en changeant de liste.

**Styles** (`../verre.css`) : pastilles et lignes des Réglages habillées en Verre (sans flou, règle PERF) ; ajoutées aux catégories « panneaux » (`.liste-chip`) et « états actifs » (`.liste-chip.actif`) du bloc « STYLES AU CHOIX » pour Relief et Argile.

**Vérifié** (Chromium 440×956, Firebase simulé avec la vraie sauvegarde) : Maison affichée avec ses 134 produits et le badge 48 (document `listes/maison` absent comme avant migration) ; création d'« Apéro » → liste vide, ajout d'un produit, coche, badge 1 ; onglet Course par liste ; « Course terminée » sur Maison ne touche pas Apéro ; Réglages (compteurs, Maison non supprimable, doublon refusé, renommage) ; suppression d'Apéro et de son produit, Maison intacte ; styles Verre, Relief, Argile ; aucune erreur JS. **Non vérifié sur iPhone.**


### v2 — catalogue commun et couleur par liste (30/09/2026, 17h55)

**Demande de Corentin** (après essai de la v1) : retrouver **tous les articles dans chaque liste**, y compris ceux déjà cochés ; une liste commune où la coche prend **la couleur de la liste** qui l'a faite. Choix de Corentin : **une seule coche par produit** (pas de coche indépendante par liste) ; onglet Course = **toutes les listes ensemble**.

- **Catalogue commun** : l'onglet Liste montre les 134 produits quelle que soit la liste choisie (tri par popularité inchangé). La pastille choisie = la liste **pour laquelle on coche**.
- **Coche** (`toggleAAcheter`) : pas coché → coché pour la liste choisie (`aAcheter:true, listeId`) ; coché par cette liste → décoché ; coché par **une autre liste** → passe dans la liste choisie (reste à acheter). Sous le produit, le nom de l'autre liste s'affiche en couleur.
- **Sens de `listeId`** : la liste qui a coché le produit (sans signification quand il n'est pas coché). Nouveau produit : pas de `listeId`. Champ « Liste » de la fiche produit **retiré**.
- **Couleurs** : champ `couleur` sur `listes/{id}`, choisi dans la fenêtre de la liste parmi 8 pastilles (`PALETTE_LISTES` : vert, orange, violet, jaune, cyan, rouge, rose, bleu). Maison = vert `#12b981` (couleur d'identité de Course) ; nouvelle liste = 1re couleur libre. Appliqué par la variable CSS `--c-liste` posée sur la case (`.case.checked`), la pastille de liste (`.liste-pastille`), le badge, la pastille active et le nom de liste (`.nom-liste`) — accent du profil en repli. Les autres éléments (onglets, +, profil) gardent le bleu/rose du profil.
- **Onglet Course** : pastille **« Toutes »** (par défaut, non mémorisée) + une par liste pour filtrer ; chaque produit a une case cerclée de la couleur de sa liste (`.case-liste`), remplie une fois acheté, et le nom de sa liste sous le produit. **« Course terminée » agit sur ce qui est affiché** (toutes les listes, ou la liste filtrée). Pas de + dans les pastilles de Course.
- **Réglages › Listes de courses** : pastille de couleur, nom, « N à acheter ».
- **Supprimer une liste** (jamais Maison) : **aucun produit supprimé** ; ceux qu'elle avait cochés passent dans Maison (toujours à acheter).
- **Styles** (`../verre.css`) : coche et lueur à la couleur de la liste en Verre (`color-mix`) ; Relief/Argile : `.case.checked` à `--c-liste`, anneau de couleur sur les cases de Course, contour de couleur sur la pastille active.

**Données** : aucune migration de produits (les 48 cochés étaient déjà `listeId: 'maison'` → verts). `couleur` écrite côté serveur (masque de champ) : Maison `#12b981`, « Apéro Juju nico » (créée par Corentin entre-temps, vide) `#ff8a2b`. Vérifié après : 134 produits, 48 à acheter.

**Vérifié** (Chromium 440×956, Firebase simulé avec les vraies données) : 134 produits et 48 coches vertes visibles dans « Apéro Juju nico » ; cocher un produit libre → orange ; toucher un produit coché Maison → passe en orange ; retoucher → décoché ; badges ; Course : « Toutes » (48), filtre par liste, « Course terminée » filtrée sur Apéro sans toucher Maison ; changement de couleur ; suppression de la liste sans perte de produit ; Verre, Relief, Argile ; aucune erreur JS. **Non vérifié sur iPhone.**

## Notifications — liste modifiée, courses faites (30/09/2026)

Architecture, abonnement et relais : README racine, « Notifications du duo ». Envoi à **l'autre** profil par `notifierDuo()` (`../commun.js`).
- **Liste modifiée** : « Lisa a modifié la liste de courses — Vous avez 12 articles à acheter. » Déclenchée par chaque coche **ou** décoche de l'onglet Liste (`toggleAAcheter`), **regroupée** : envoyée `NOTIF_LISTE_DELAI_MS` = **20 s** après la dernière coche (cocher 10 produits d'affilée = 1 notification avec le total final), ou tout de suite si l'app passe en arrière-plan (`pagehide` / `visibilitychange`, `keepalive`). `tag: courses-liste` : sur le téléphone qui reçoit, la nouvelle remplace l'ancienne. Nombre = articles à acheter, toutes listes, pas encore achetés (même compte que « restants » du Portail). Un simple changement de liste d'un produit déjà coché ne notifie pas.
- **Courses faites** : bouton **Course terminée** → « Les courses sont faites ! — Lisa a terminé les courses : 12 articles achetés. Il reste 3 articles à acheter. » (`notifierCoursesFaites`, `tag: courses-faites`). Annule une notification « liste modifiée » encore en attente.
- **Pas de notification** pour les coches « acheté » en magasin (onglet Course) ; rien tant que la liste n'a pas été reçue de Firestore (`firestoreRecu.produits`).
- *Historique* : première version du même jour = une notification au **passage de 4 à 5 articles** (`SEUIL_NOTIF_COURSES`) ; remplacée à la demande de Corentin après essai sur iPhone (« ça marche », mais il voulait être prévenu à chaque mise à jour, et à la fin des courses).
**Vérifié** (Chromium + émulateurs Auth/Firestore, relais simulé, délai ramené à 3 s) : 3 coches rapprochées → rien avant le délai, puis 1 seule notification avec le total final (5) ; coche puis départ de la page → envoi immédiat (6) ; 2 achats + une décoche en attente + Course terminée → uniquement « Les courses sont faites ! … 2 articles achetés. Il reste 3 articles à acheter. » ; aucune erreur JS. Réception réelle sur iPhone confirmée par Corentin pour la 1re version (même chemin d'envoi).

## Fenêtre « Ajouté à la liste » à l'ouverture (01/10/2026)

**Demande de Corentin** : quand une notification annonce que l'autre a modifié la liste, voir en ouvrant Course **ce qui a été ajouté**.
- **Qui a coché, et quand** : chaque coche « à acheter » (`toggleAAcheter`) écrit aussi `ajoutePar` (`corentin` / `lisa`, profil du téléphone) et `ajouteLe` (heure du téléphone, ms) sur le produit. Un simple changement de liste d'un produit déjà coché ne les change pas.
- **Fenêtre** `#nouveautes` (`index.html`, bloc « AJOUTÉ À LA LISTE » d'`app.js`, styles `.nouveaute*`) : « 🛒 Ajouté à la liste — Lisa a ajouté 2 articles depuis ta dernière visite : » puis un produit par ligne (pastille à la couleur de sa liste, nom, quantité · rayon · liste si plusieurs listes), bouton OK.
- **Ce qui est listé** : produits encore à acheter (pas décochés depuis, pas déjà achetés), cochés par **l'autre** profil après la dernière visite de ce téléphone. Ses propres coches, même faites sur un autre téléphone, n'apparaissent jamais.
- **« Dernière visite »** : `localStorage courses_vu` (par téléphone), mis à jour en fermant la fenêtre et quand l'app passe en arrière-plan (ce qui était à l'écran a été vu). Première ouverture sur un téléphone : rien de montré, `courses_vu` initialisé.
- **Quand** : à l'ouverture de Course et au **retour au premier plan** (toucher une notification ramène souvent l'app déjà ouverte), dès que la liste arrive du serveur — pendant 10 s (`FENETRE_OUVERTURE_MS`). Ensuite, pendant l'utilisation, les ajouts de l'autre apparaissent dans la liste en direct, sans fenêtre (marqués vus).
- Qu'on ouvre Course en touchant la notification ou depuis le Portail, la fenêtre est la même : elle dépend de ce qui a été ajouté, pas de la façon d'ouvrir l'app.
- Limite : l'heure vient des téléphones (`Date.now()`) ; un écart d'horloge de plusieurs secondes entre les deux pourrait faire manquer un ajout fait juste après la dernière visite (en pratique les iPhone sont à l'heure).
- **Vérifié** (Chromium + émulateurs Auth/Firestore, deux téléphones simulés Corentin / Lisa, deux listes) : 1re ouverture → rien, `courses_vu` posé ; Lisa coche Kiwis et Lait (Maison), Chips (Apéro), décoche Lait → `ajoutePar: lisa` écrit ; Corentin ouvre Course → fenêtre « Lisa a ajouté 2 articles » avec Kiwis (2 kg · Fruits · Maison) et Chips (Fruits · Apéro), pas Lait ; OK → fermée ; rouverture → rien ; app en arrière-plan, Lisa coche Bananes, retour au premier plan → fenêtre avec Bananes ; app utilisée, Lisa coche Riz → pas de fenêtre, Riz apparaît coché ; coche de Corentin (Sucre) jamais listée. Aucune erreur JS. **Non vérifié sur iPhone.**

