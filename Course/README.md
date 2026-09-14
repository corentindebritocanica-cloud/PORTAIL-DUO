# Courses L&C

Application de liste de courses partagée entre Corentin et Lisa. Fichier unique HTML/CSS/JS (vanilla, sans framework), hébergé sur GitHub Pages, avec synchronisation en temps réel via **Firebase Firestore** (avec cache hors-ligne). Fait partie du repo **PORTAIL-DUO**, aux côtés de Muscu (Duo Training) et Budget (Budget L&C), regroupées par un portail de lancement commun.

- **URL live** : https://corentindebritocanica-cloud.github.io/PORTAIL-DUO/Course/
- **URL raw (édition du code)** : https://raw.githubusercontent.com/corentindebritocanica-cloud/PORTAIL-DUO/refs/heads/main/Course/index.html

## Fichiers du dossier `/Course/`
- `index.html` — l'application complète (HTML + CSS + JS dans un seul fichier). Le logo/icône est encodé en base64 directement dans le `<head>` (deux fois : `apple-touch-icon` et `icon`), donc **aucun fichier image externe n'est requis pour l'icône**.
- `manifest.json` — fichier PWA séparé, obligatoire (référencé via `<link rel="manifest">`), qui définit nom, couleurs et icône de l'app pour l'installation sur l'écran d'accueil.
- `icone.png` — présent dans le dossier mais non utilisé par `index.html` (l'icône réelle est le base64 intégré). Peut être considéré comme obsolète/résiduel.

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
- Une **barre de recherche** en haut filtre la liste par nom de produit (insensible à la casse).
- Chaque produit affiche : case à cocher, nom, rayon (tag sous le nom, cliquable pour changer de rayon via une modale), et un champ **quantité en texte libre** (ex : "4", "grand format", "sans sucre").
- Cocher un produit ici l'ajoute à l'onglet Course.
- Un **bouton flottant "+"** (coin bas-droit) ouvre une modale d'ajout de produit : nom, quantité (optionnelle), et rayon (liste déroulante des rayons existants + option "Nouveau rayon…" qui fait apparaître un champ texte pour créer un rayon à la volée). Le nouveau produit est créé directement avec `aAcheter:true` et `compteur:1` via `colProduits.add(...)`.
- Cliquer sur le nom/rayon d'un produit ouvre une modale pour **changer son rayon** (liste déroulante des rayons existants, sans option de création).

### Onglet "Course" 🛒
- N'affiche **que** les produits actuellement cochés `aAcheter:true`, **groupés par rayon** (rayons triés alphabétiquement, produits triés alphabétiquement dans chaque rayon).
- Un badge sur l'onglet affiche le nombre de produits restants à acheter.
- Chaque carte produit a sa propre case à cocher (couleur rose "Lisa" en mode Course, distincte du bleu "Corentin" en mode Saisie) pour marquer un produit comme trouvé/acheté pendant les courses.
- Un bouton fixe **"Course terminée"** en bas de l'écran efface (repasse à `false`, via un `batch`) les champs `aAcheter` et `achete` de tous les produits marqués comme achetés, les faisant disparaître de la liste Course. Les produits non trouvés restent cochés `aAcheter:true` et donc visibles, jusqu'à un achat effectif ultérieur.
- **Pas de réinitialisation globale automatique** : décocher un produit dans Course le décoche aussi immédiatement dans Saisie (même donnée partagée), et rien n'expire tout seul avec le temps.

## Interface & thème
- **Design tokens CSS** (variables `:root`) pour couleurs, rayons de bordure et zones de sécurité (encoches iPhone via `env(safe-area-inset-*)`).
- **Mode sombre automatique** via `prefers-color-scheme: dark`, avec un jeu de couleurs dédié et un léger effet de grain (dégradés radiaux) en fond.
- Couleur d'identité **Corentin = bleu** (`#1f8fff`), **Lisa = rose** (`#ff3d7e`) — utilisée pour les cases à cocher, les titres de section, etc.
- Typographie : `Bebas Neue` pour les titres "display" (splash, écrans login/profil, titres de rayon), police système pour le reste.
- Retour haptique (vibration) sur les actions clés : cocher/décocher un produit, changer d'onglet, ajouter un produit, terminer la course (fonction `vibrer(ms)`, no-op si `navigator.vibrate` indisponible).
- Modales en "bottom sheet" (glissent depuis le bas, coins arrondis en haut) pour l'ajout de produit et le changement de rayon.
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
- **Migration Realtime Database → Firestore** : le code utilisait Realtime Database (`courses/produits`, `courses/rayons` sous un même nœud racine), alors qu'une base Firestore existait déjà en parallèle côté console (créée manuellement, jamais branchée au code), ce qui expliquait que la liste ne se synchronisait plus comme attendu. Le code a été réécrit pour utiliser Firestore nativement : deux collections top-level `produits` et `rayons` (correspondant à ce qui existait déjà dans la console), écoute temps réel via `onSnapshot` au lieu de `.on('value')`, écritures groupées via `db.batch()` pour le seed et pour "Course terminée", et cache hors-ligne activé via `enablePersistence({ synchronizeTabs: true })`. La forme interne de `state.produits` / `state.rayons` a été conservée à l'identique pour ne pas impacter le code de rendu.
