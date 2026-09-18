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

Une barre de recherche filtre par nom, avec une croix pour l'effacer. Un bouton **+** flottant en bas à droite ouvre le même formulaire que le crayon (nom + rayon, avec possibilité de créer un nouveau rayon à la volée) pour ajouter un produit.

**Course** : uniquement les produits cochés "à acheter" en Liste, groupés par rayon. On coche ici un produit une fois réellement acheté (nom barré, carte estompée) — rien n'est retiré automatiquement. Le bouton **Course terminée** (actif seulement si au moins un produit est coché acheté) décoche d'un coup, dans les deux onglets, tous les produits ainsi cochés — sans jamais les supprimer de la Liste.

**Réglages** : choix du profil (**Corentin** = thème bleu, **Lisa** = thème rose, appliqué immédiatement via une variable CSS `data-profil` sur `<html>`, mémorisé dans `localStorage`). Bouton **Recharger l'application** : vide uniquement le cache et le Service Worker de Course (jamais ceux du Portail/Muscu/Budget — voir Sécurité ci-dessous), avec confirmation avant l'action.

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
