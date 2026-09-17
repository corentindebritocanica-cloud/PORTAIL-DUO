# Courses L&C

Application de liste de courses partagée entre Corentin et Lisa. Fichier unique HTML/CSS/JS (vanilla, sans framework), hébergé sur GitHub Pages, avec synchronisation en temps réel via **Firebase Firestore** (avec cache hors-ligne). Fait partie du repo **PORTAIL-DUO**, aux côtés de Muscu (Duo Training) et Budget (Budget L&C), regroupées par un portail de lancement commun.

- **URL live** : https://corentindebritocanica-cloud.github.io/PORTAIL-DUO/Course/
- **URL raw (édition du code)** : https://raw.githubusercontent.com/corentindebritocanica-cloud/PORTAIL-DUO/refs/heads/main/Course/index.html

## Fichiers du dossier `/Course/`
- `index.html` — l'application complète (HTML + CSS + JS dans un seul fichier). Le logo/icône est encodé en base64 directement dans le `<head>` (deux fois : `apple-touch-icon` et `icon`), donc **aucun fichier image externe n'est requis pour l'icône**.
- `manifest.json` — fichier PWA séparé, obligatoire (référencé via `<link rel="manifest">`), qui définit nom, couleurs et icône de l'app pour l'installation sur l'écran d'accueil.
- `icone.png` — **référencé par `sw.js` mais absent du dossier `/Course/` du dépôt** (l'icône réelle utilisée par l'app est le base64 intégré dans `index.html`/`manifest.json`). Le service worker tente quand même de le précacher (voir ci-dessous) : l'échec de ce fichier précis est intercepté individuellement et n'empêche pas l'installation du service worker. Si ce fichier est ajouté un jour au dépôt, il sera automatiquement pris en cache sans rien changer au code.
- `sw.js` — service worker de cette app, séparé de `index.html` (fichier d'infrastructure PWA, au même titre que `manifest.json` — n'enfreint pas le principe "single-file HTML" de l'app elle-même). Voir section dédiée ci-dessous.

## Mode hors-ligne (service worker)
- `sw.js` met en cache le **shell statique** de l'app (`index.html`, `manifest.json`, `icone.png`) avec une stratégie **cache-first** : réponse immédiate depuis le cache si présente, sinon requête réseau (dont le résultat alimente le cache pour la prochaine fois).
- Il **n'intercepte jamais** les échanges avec Firestore/Auth (projet Firebase `course-app-36e9d`) ni le SDK Firebase/Google Fonts chargés en CDN — ces requêtes cross-origin ne sont jamais interceptées par construction (vérification `url.origin !== self.location.origin`). Firestore gère déjà sa propre persistance hors-ligne via `enablePersistence({ synchronizeTabs: true })`, donc aucune gestion de cache Firebase n'est nécessaire côté service worker.
- Il **n'intercepte que les requêtes du dossier `/Course/`** (vérification sur `self.registration.scope`) : `/Muscu/`, `/Budget/` et la racine du portail ne sont jamais concernés par ce service worker, même par erreur.
- Enregistré dans `index.html` au chargement de la page (`navigator.serviceWorker.register('./sw.js')`, dans un `window.addEventListener('load', ...)`), avec détection de support (`if ('serviceWorker' in navigator)`) et échec silencieux si l'enregistrement rate.
- Nom de cache versionné (`courses-lc-shell-v1`) : à chaque changement de version, l'étape `activate` supprime automatiquement les caches portant un ancien nom.

## Stack technique
- HTML/CSS/JS vanilla, aucun framework, aucun build step.
- **Firebase SDK compat** (v10.12.2, `firebase-app-compat.js` + `firebase-auth-compat.js` + `firebase-firestore-compat.js`) — le SDK "compat" est utilisé volontairement à la place des modules ES, car les imports ES modules posent des soucis de compatibilité sur Safari iOS (leçon reprise du projet Budget L&C).
- **Firebase Firestore** (et non plus Realtime Database) pour la synchro temps réel entre les deux profils, avec **cache local activé** (`db.enablePersistence({ synchronizeTabs: true })`) : l'app reste lisible et modifiable hors connexion, la synchro reprend automatiquement au retour du réseau.
- **Firebase Auth** avec persistance `LOCAL` (session conservée après fermeture de l'app).
- Police `Bebas Neue` (Google Fonts) pour les titres en style "display".
- PWA installable (manifest + meta tags Apple pour mode standalone iOS).

## Projet Firebase
- Projet dédié : `course-app-36e9d` (distinct de celui de Budget L&C, volontairement, pour isoler les données).
- Config Firebase actuellement en dur dans `index.html` (clé API, `authDomain`, etc.) — pas de fichier de config séparé. Le champ `databaseURL` (hérité de Realtime Database) n'est plus utilisé par le code mais reste inoffensif s'il traîne dans la config.
- Deux références de collection globales : `colProduits` (`db.collection('produits')`) et `colRayons` (`db.collection('rayons')`), utilisées directement (plus de wrappers `dbRef`/`dbSet`/`dbUpdate`/`dbPush`/`dbOn` — ces noms datent de l'époque Realtime Database et ont été retirés).

## Authentification
- **Email + mot de passe** (`signInWithEmailAndPassword`) — ⚠️ ce n'est PAS une authentification anonyme.
- **Un compte unique partagé** entre Corentin et Lisa (mêmes identifiants pour les deux), volontairement plutôt que deux comptes séparés.
- Après connexion, un écran de sélection de profil (`#ecran-profil`) demande "Qui es-tu ?" avec deux boutons Corentin / Lisa.
- Le profil choisi est stocké en `localStorage` (clé `courses_profil`) et réaffiché en badge dans l'en-tête de l'app tant qu'il n'est pas effacé. Ce n'est qu'un marqueur d'affichage local (pas lié à une identité Firebase séparée) — les deux profils voient et modifient les mêmes données.
- Écran de login avec message d'erreur si email/mot de passe invalide ou champ vide.
- Les **règles de sécurité Firestore** exigent `request.auth != null` pour toute lecture/écriture sur l'ensemble des documents (`match /{document=**}`).

## Structure des données (Firebase Firestore)
```
produits/            (collection)
  <id>/               (document)
    nom: string
    quantite: string (texte libre, ex: "4", "grand format", "")
    rayonId: string (référence vers un document de la collection rayons)
    aAcheter: boolean   // coché dans l'onglet Saisie → apparaît dans Course
    achete: boolean     // coché dans l'onglet Course → prêt à être retiré
    compteur: number    // incrémenté à chaque passage à aAcheter=true, sert au tri de Saisie

rayons/               (collection)
  <id>/               (document)
    nom: string (ex: "Épicerie sucrée")
```
- Pas de champ "date" ou "historique" : l'état est toujours l'état courant, rien n'est archivé.
- Au tout premier lancement (collections Firestore vides), l'app importe automatiquement un **catalogue de départ** de **128 produits** répartis sur **12 rayons** (fonction `lancerSeedSiVide()`, écriture en un seul `batch`), pour ne pas repartir de zéro. Ce seed ne s'exécute qu'une seule fois : si la collection `rayons` contient déjà au moins un document, le seed est ignoré.
- Le state JS interne (`state.produits`, `state.rayons`) garde exactement la même forme qu'à l'époque Realtime Database (id → objet produit / id → nom de rayon), pour ne pas avoir à toucher au code de rendu (`render()`, `renderSaisie()`, `renderCourse()`).

## Fonctionnement — deux onglets

### Onglet "Saisie" 📝
- Liste de **tous** les produits connus, triée automatiquement par fréquence d'usage : le tri se fait sur le champ `compteur` (décroissant), qui s'incrémente à chaque fois qu'un produit est coché comme "à acheter" ; à égalité, tri alphabétique.
- Une **barre de recherche** en haut filtre la liste par nom de produit (insensible à la casse), avec un **bouton croix** qui apparaît dès qu'un texte est saisi pour effacer la recherche en un tap (vide le champ, remet le focus dessus).
- Chaque produit affiche : case à cocher, nom, rayon (tag sous le nom, cliquable pour changer de rayon via une modale), et un champ **quantité en texte libre** (ex : "4", "grand format", "sans sucre").
- Cocher un produit ici l'ajoute à l'onglet Course.
- Un **bouton flottant "+"** (coin bas-droit) ouvre une modale d'ajout de produit : nom, quantité (optionnelle), et rayon (liste déroulante des rayons existants + option "Nouveau rayon…" qui fait apparaître un champ texte pour créer un rayon à la volée). Le nouveau produit est créé directement avec `aAcheter:true` et `compteur:1` via `colProduits.add(...)`.
- Un **crayon** à côté du champ quantité de chaque produit réouvre cette même modale, en mode édition : titre "Modifier le produit", champs pré-remplis (nom, quantité, rayon), bouton "Enregistrer" à la place de "Ajouter". La validation met à jour le produit existant (`colProduits.doc(id).update(...)`) au lieu d'en créer un nouveau. Le mode (création/édition) est piloté par la variable `idEnEditionAjout` (`null` = création).
- Cliquer sur le nom/rayon d'un produit ouvre une modale pour **changer son rayon** (liste déroulante des rayons existants, sans option de création) — raccourci qui reste disponible en plus du crayon, pour un changement de rayon rapide sans ouvrir la modale complète.

### Onglet "Course" 🛒
- N'affiche **que** les produits actuellement cochés `aAcheter:true`, **groupés par rayon** (rayons triés alphabétiquement, produits triés alphabétiquement dans chaque rayon).
- Un badge sur l'onglet affiche le nombre de produits restants à acheter.
- Chaque carte produit a sa propre case à cocher (couleur rose "Lisa" en mode Course, distincte du bleu "Corentin" en mode Saisie) pour marquer un produit comme trouvé/acheté pendant les courses.
- Un bouton fixe **"Course terminée"** (visible uniquement sur cet onglet) efface (repasse à `false`, via un `batch`) les champs `aAcheter` et `achete` de tous les produits marqués comme achetés, les faisant disparaître de la liste Course **et** les décochant du même coup dans Saisie (même donnée partagée). Les produits non trouvés restent cochés `aAcheter:true` et donc visibles, jusqu'à un achat effectif ultérieur.
- **Pas de réinitialisation globale automatique** : décocher un produit dans Course le décoche aussi immédiatement dans Saisie (même donnée partagée), et rien n'expire tout seul avec le temps.

## Interface & thème
- **Design "Fonte & Craie"** : identité visuelle reprise à l'identique de Muscu (Duo Training) pour une cohérence entre les apps du portail — fond ardoise sombre par défaut, cartes/boutons/modales sur le même système d'ombres et de rayons, léger grain "poussière de craie" en fond (désactivé en thème clair).
- **Bascule de thème manuelle** (bouton 🌙/☀️ fixe en haut à droite, classe `html.light-mode`) au lieu de l'ancien `prefers-color-scheme: dark` automatique. Préférence stockée en `localStorage` (clé `courses_theme`, distincte de `courses_profil`) — visuel uniquement, aucune donnée Firestore concernée.
- **Design tokens CSS** (variables `:root`) pour couleurs, rayons de bordure, ombres et zones de sécurité (encoches iPhone via `env(safe-area-inset-*)`) — même vocabulaire de tokens que Muscu (`--radius-*`, `--shadow-*`, `--corentin`/`--lisa` + variantes RGB, `--f-display`).
- Couleur d'identité **Corentin = bleu** (`#1f8fff`), **Lisa = rose** (`#ff3d7e`) — utilisée pour les cases à cocher (à acheter = bleu en Saisie, acheté = rose en Course), les titres de section, le bouton "+" (bleu) et "Course terminée" (rose, dégradé).
- Typographie : `Bebas Neue` en majuscules pour tous les titres "display" (splash, écrans login/profil, titre d'onglet, titres de rayon, modales), police système pour le reste — repris du traitement typographique de Muscu.
- Modales en "bottom sheet" avec effet verre dépoli (`backdrop-filter: blur`), glissent depuis le bas, coins arrondis en haut, pour l'ajout de produit et le changement de rayon.
- Retour haptique (vibration) sur les actions clés : cocher/décocher un produit, changer d'onglet, ajouter un produit, terminer la course (fonction `vibrer(ms)`, no-op si `navigator.vibrate` indisponible).
- Protection XSS basique : tout texte utilisateur (nom de produit, quantité, rayon) passe par `escapeHtml`/`escapeAttr` avant injection dans le DOM.

## Mise en route (si l'app doit être redéployée ailleurs)
1. Créer un projet Firebase sur https://console.firebase.google.com (ou réutiliser `course-app-36e9d`).
2. Créer une base **Firestore** (mode natif) si ce n'est pas déjà fait.
3. Définir des règles de sécurité Firestore exigeant `request.auth != null` pour lecture/écriture.
4. Activer l'authentification **Email/Mot de passe** dans Firebase Auth, et créer le compte partagé (un seul couple email/mot de passe pour Corentin et Lisa).
5. Copier la config du projet dans le bloc `firebaseConfig` en haut du `<script>` de `index.html`.
6. Déployer les 3 fichiers (`index.html`, `manifest.json`, `icone.png`) sur GitHub Pages, dans `/Course/`.
7. Au premier chargement avec des collections Firestore vides, l'app importe automatiquement le catalogue de départ (128 produits / 12 rayons) — rien à faire manuellement.

## Historique / décisions notables
- L'app a été migrée depuis un ancien repo dédié (`COURSE-APP`, voué à suppression) vers `PORTAIL-DUO/Course/`, pour cohabiter avec Muscu et Budget derrière un portail de lancement commun.
- Le choix d'un projet Firebase séparé (`course-app-36e9d`) plutôt que de réutiliser celui de Budget L&C a été volontaire, pour isoler les données des deux apps.
- Le SDK Firebase "compat" (et non les modules ES) est utilisé pour éviter les problèmes de compatibilité Safari iOS déjà rencontrés sur Budget L&C.
- L'authentification a évolué : le projet est parti sur l'idée d'un accès anonyme, mais l'implémentation réelle utilise email/mot de passe avec un compte unique partagé — c'est l'état actuel qui fait foi.
- Bug corrigé (avant migration Firestore) : le bouton de case à cocher de l'onglet Course appelait une fonction inexistante (`marquerAchete`) au lieu de `toggleAcheteCourse` ; corrigé dans `renderCourse()`.
- Bug corrigé : le bouton "Course terminée" existait déjà dans le HTML et était déjà relié à `terminerCourse()`, mais restait figé en `display:none` — il n'apparaissait jamais. Il s'affiche désormais uniquement sur l'onglet Course (basculement ajouté dans le handler de navigation d'onglets).
- **Migration Realtime Database → Firestore** : le code utilisait Realtime Database (`courses/produits`, `courses/rayons` sous un même nœud racine), alors qu'une base Firestore existait déjà en parallèle côté console (créée manuellement, jamais branchée au code), ce qui expliquait que la liste ne se synchronisait plus comme attendu. Le code a été réécrit pour utiliser Firestore nativement : deux collections top-level `produits` et `rayons` (correspondant à ce qui existait déjà dans la console), écoute temps réel via `onSnapshot` au lieu de `.on('value')`, écritures groupées via `db.batch()` pour le seed et pour "Course terminée", et cache hors-ligne activé via `enablePersistence({ synchronizeTabs: true })`. La forme interne de `state.produits` / `state.rayons` a été conservée à l'identique pour ne pas impacter le code de rendu.
- **Révision ergonomie iPhone** : bug de zoom auto iOS corrigé (`.quantite-input` était en `font-size:15px`, sous le seuil de 16px qui déclenche le zoom automatique de Safari au focus d'un champ) ; case à cocher agrandie de 26×26 à 32×32px (élément le plus tapé de l'app, se rapproche de la cible tactile de 44px recommandée par Apple) ; espacement entre les cartes produit légèrement augmenté pour réduire les taps accidentels.
- **Édition d'un produit via le crayon** : ajout d'un bouton crayon à côté du champ quantité dans l'onglet Saisie, qui réutilise la modale d'ajout existante en mode édition (titre et bouton adaptés dynamiquement, champs pré-remplis) plutôt que de dupliquer un second formulaire. Le raccourci "tap sur le nom → changer le rayon" a été conservé tel quel pour les changements rapides.
- **Reprise du design "Fonte & Craie" de Muscu** : l'app utilisait un thème clair par défaut avec bascule automatique `prefers-color-scheme: dark`. Elle a été restylée pour reprendre à l'identique le design system de Muscu (Duo Training) — fond ardoise sombre par défaut avec bouton de bascule manuel vers un thème clair, mêmes tokens CSS (rayons, ombres, couleurs), même traitement Bebas Neue en majuscules, mêmes modales en verre dépoli — dans un objectif de cohérence visuelle entre les apps du portail. Aucune structure de données, ID, classe fonctionnelle (`.checkbox`, `.onglet-btn`, `.overlay`, etc.) ni logique Firestore n'a été modifiée : seuls le CSS et l'ajout autonome de la bascule de thème ont été touchés.
- **Ajout du mode hors-ligne (service worker)** : un `sw.js` existait déjà dans le dossier mais n'était **jamais enregistré** par `index.html` (donc totalement inactif) et utilisait une stratégie stale-while-revalidate qui précachait aussi les polices Google et le SDK Firebase en CDN. Il a été réécrit avec une stratégie **cache-first stricte**, limitée aux 3 fichiers du shell statique (`index.html`, `manifest.json`, `icone.png`), sans toucher à Firebase/CDN, puis effectivement enregistré dans `index.html` — sur le même principe que le service worker du portail racine (`/sw.js`), qui met en cache son propre shell sans jamais intercepter les sous-dossiers `/Muscu/`, `/Budget/` ou `/Course/`.
