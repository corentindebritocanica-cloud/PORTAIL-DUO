# Portail Duo

Portail de lancement (launcher) HTML unique pour les 3 apps de Corentin & Lisa :
**Musculation** (Duo Training), **Budget** (Budget L&C), **Courses** (App Courses).

- **Live** : https://corentindebritocanica-cloud.github.io/PORTAIL-DUO/
- **Repo** : `corentindebritocanica-cloud/PORTAIL-DUO`
- **Raw index.html** : https://raw.githubusercontent.com/corentindebritocanica-cloud/PORTAIL-DUO/refs/heads/main/index.html

Aucun compte, aucun cloud, aucune dépendance externe — un seul fichier HTML/CSS/JS avec un manifest PWA.

---

## 1. Pourquoi ce repo existe (historique)

À l'origine, Portail Duo et ses 3 apps vivaient chacune dans leur propre repo GitHub
(`MUSCU-DUO`, `Lisa-CorentinBudget`, `COURSE-APP`), avec Portail Duo qui pointait vers
leurs URLs GitHub Pages respectives.

**Problème rencontré** : une fois Portail Duo ajouté à l'écran d'accueil iOS (mode
standalone), naviguer vers une autre app faisait réapparaître la barre Safari, car
chaque app avait son propre `manifest.json` avec son propre `scope` — dès qu'on
sortait de ce scope, iOS considérait qu'on quittait l'app.

**Solution appliquée (confirmée en ligne)** : tout regrouper dans un seul repo
GitHub Pages, avec un `manifest.json` unique scope `./` à la racine, et les 3 apps
dans des sous-dossiers. Les boutons du portail utilisent désormais des chemins
relatifs (`./Muscu/`, `./Budget/`, `./Course/`) au lieu des anciennes URLs absolues.

## 2. Structure du repo (vérifiée en ligne le 14/09/2026)

```
PORTAIL-DUO/
├── index.html              ← Portail Duo (ce document)
├── manifest.json           ← PWA, scope "./"
├── icone-192.png
├── icone-512.png
├── icone-512-maskable.png
├── Muscu/                  ← Duo Training (musculation)
│   └── index.html
├── Budget/                 ← Budget L&C
│   └── index.html
└── Course/                 ← App Courses
    └── index.html
```

Les 3 sous-dossiers répondent bien en HTTP 200 et contiennent les bonnes apps
(vérifié par leur `<title>` : "Duo Training — Corentin & Lisa", "Budget L&C",
"Courses L&C").

⚠️ **À vérifier / nettoyer côté GitHub** : les anciens repos `MUSCU-DUO`,
`Lisa-CorentinBudget` et `COURSE-APP` étaient prévus à la suppression une fois la
migration validée. Leur statut actuel n'a pas pu être confirmé automatiquement
(rate-limit API GitHub au moment de l'audit) — à vérifier manuellement avant de les
supprimer définitivement.

## 3. Manifest PWA (contenu réel actuel)

```json
{
  "name": "Portail Duo",
  "short_name": "Portail Duo",
  "description": "Portail de lancement vers Musculation, Budget et Courses",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#101113",
  "theme_color": "#17181b",
  "icons": [
    { "src": "icone-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icone-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icone-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Les icônes sont de vrais fichiers PNG (192, 512, 512 maskable) — la première
version du portail utilisait des SVG en data-URI, remplacés depuis pour un support
iOS/Android fiable une fois hébergé.

## 4. Design / identité visuelle — "Affiches de cinéma" (3e refonte, 18/09/2026)

Après "Carte céleste" (rejetée) et "Jardin zen" (encore trop élaboré au goût
de Corentin), demande explicite d'un concept "plus simple" : des affiches de
cinéma avec une salle en arrière-plan.

**Métaphore retenue** : un mur de cinéma avec 3 affiches éclairées, chacune
représentant une app comme un film (genre, titre, accroche). Un simple tap
sur l'affiche = on "entre dans la salle" (rideau qui se ferme sur l'écran)
avant la redirection. Concept volontairement plus direct que les deux
précédents : pas de geste à apprendre, pas de mécanique de sélection, juste
3 affiches posées côte à côte et un rideau.

| Variable CSS | Valeur | Usage |
|---|---|---|
| `--wall-1` / `--wall-2` | `#2a0d12` / `#14060a` | Mur (haut) / sol (bas) |
| `--curtain` / `--curtain-dark` | `#7a1620` / `#4a0d14` | Rideau (velours rayé) |
| `--gold` | `#c9a35c` | Cadres des affiches, filet du bandeau |
| `--paper` / `--paper-2` | `#efe6d2` / `#e2d6b8` | Papier des affiches |
| `--c-muscu` | `#3b6ea5` | Bandeau genre "Action" (Musculation) |
| `--c-budget` | `#a3781f` | Bandeau genre "Drame financier" (Budget) |
| `--c-course` | `#3f7a4a` | Bandeau genre "Aventure" (Courses) |

Chaque affiche a un titre (le nom de l'app), un "genre" façon bandeau de
festival, une accroche façon tagline de film, et la description fonctionnelle
d'origine en petit texte en bas — clin d'œil ludique sans perdre
l'information utile. Rotation légère et hauteur non identique entre les 3
affiches (`--rot: -3deg / 2deg / -1.5deg`) pour éviter l'alignement en
grille parfaite malgré la disposition "3 éléments en ligne".

`theme-color` et barre de statut repassés en tons sombres (`#1c0709`,
`black`) cohérents avec la salle de cinéma (contrairement au "Jardin zen",
clair).

## 5. Navigation / interactions

- **Les 3 affiches sont visibles et tapables directement**, aucune étape
  intermédiaire — cohérent avec la demande précédente de retirer toute
  "mécanique de sélection", et avec le nouvel objectif de simplicité.
- **Taper une affiche** : léger zoom de l'affiche + halo qui s'intensifie,
  puis un vrai rideau de velours se ferme depuis les deux bords de l'écran
  (`translateX` synchronisé, 620 ms) avant la redirection vers le sous-dossier.
- Bandeau de rideau fixe en haut d'écran (`.valance`) et deux halos de
  lumière chaude sur le mur (`.sconce`) : purs éléments d'ambiance, non
  interactifs.
- **Plaque d'identité** sous le bandeau, en haut à gauche : nom du portail,
  jamais un hero centré.
- Aucune logique JS au-delà de la navigation, du geste de la bobine et de
  l'enregistrement du service worker.

## 6. Disponibilité hors-ligne (service worker)

**Problème identifié le 17/09/2026** : contrairement aux 3 sous-apps (Muscu,
Budget, Course), qui gèrent chacune leur propre cache offline, le portail
lui-même n'avait aucun service worker : sans réseau, `index.html` ne pouvait pas
se charger, donc impossible d'accéder au menu (et par ricochet aux 3 apps).

**Corrigé le 17/09/2026** : ajout d'un service worker minimal (`sw.js`) qui met
en cache le "shell" du portail au premier chargement en ligne :

```
./
./index.html
./manifest.json
./icone-192.png
./icone-512.png
./icone-512-maskable.png
```

Stratégie cache-first pour ces fichiers, avec repli sur `index.html` en cas
d'échec réseau. Le service worker ignore explicitement toute requête vers
`/Muscu/`, `/Budget/`, `/Course/` ou une origine externe (Firebase, etc.) — il ne
gère que le shell du portail, jamais les sous-apps qui restent autonomes pour
leur propre cache.

Enregistrement dans `index.html` :

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
```

Nom du cache : `portail-duo-shell-v1` (les anciennes versions de cache sont
supprimées automatiquement à l'activation d'une nouvelle version du service
worker).

## 7. Historique — barre de statut iOS (résolu et poussé)

Un correctif avait été demandé pour supprimer l'effet de flou de la barre de
statut iOS en plein écran, mais l'audit du 14/09/2026 avait constaté que le code
live n'avait pas la modification (`content="black-translucent"` toujours
présent).

**Poussé le 17/09/2026**, en même temps que le service worker :

```html
<meta name="apple-mobile-web-app-status-bar-style" content="black">
```

Vérifié en ligne via l'API GitHub (contenu réel du fichier sur `main`) — le
correctif est bien effectif.

## 8. Vidage du cache — la bobine de film (3e refonte, 18/09/2026)

**Problème identifié** : après une mise à jour poussée sur GitHub (portail ou
sous-apps), le cache côté iPhone (Safari / mode standalone) ne se vide pas tout
seul. Mécanisme déjà passé par un bouton classique, une comète ("Carte
céleste"), puis un bassin d'eau ("Jardin zen") ; version actuelle : une
bobine de film.

**Mécanisme actuel** : une bobine tourne lentement en boucle en bas à droite
(ambiance projectionniste). Maintenir le doigt dessus ~600 ms déclenche :
1. désenregistrement de tous les service workers actifs
   (`navigator.serviceWorker.getRegistrations()` + `unregister()`),
2. suppression de toutes les entrées du Cache Storage (`caches.keys()` +
   `caches.delete()`), y compris `portail-duo-shell-v1` posé par `sw.js`,
3. la bobine se met à tourner très vite (effet "rembobinage"), puis
   rechargement forcé de `index.html` via
   `location.replace('./index.html?_reset=' + Date.now())` — le paramètre
   `_reset` unique empêche de resservir une copie locale.

Accessible aussi au clavier (élément focusable, `Entrée`/`Espace`). Légende
discrète en permanence à côté ("bobine · maintenir pour rafraîchir").

## 9. Historique — démarche de refonte design (18/09/2026)

Corentin a demandé une refonte "radicale" sortant des standards UI habituels
(pas de navbar/sidebar/cards à ombre/hero centré/palette SaaS), puis a itéré
en plusieurs passes le même jour :

1. **1ère vague (8 concepts)** → **"Carte céleste"** choisie et implémentée
   (navigation orbitale, warp) → rejetée ("j'aime pas trop au final").
2. **2ème vague (10 concepts)**, avec consigne supplémentaire de retirer
   toute mécanique de sélection (rotation/alignement) → **"Jardin zen"**
   choisie et implémentée (3 pierres tapables directement, onde au tap) →
   jugée encore trop élaborée.
3. **Demande directe** (hors liste) : "un truc plus simple, genre des
   affiches de cinéma avec un cinéma en arrière-plan" → **"Affiches de
   cinéma" (retenu)** implémenté directement sans nouvelle liste de choix,
   la demande étant déjà précise.

**Pourquoi "Affiches de cinéma" reste non-générique tout en étant plus
simple** :
- Les 3 "cards" sont des affiches de film habillées (papier, cadre doré,
  bandeau de genre, accroche) posées sur un mur de salle éclairé — pas des
  rectangles blancs à coins arrondis avec ombre portée uniforme.
- Rotation et hauteur légèrement différentes entre les 3 affiches pour
  éviter l'alignement en grille parfaite, même en disposition côte à côte.
- La transition (rideau de velours qui se ferme) est un élément de
  narration cinéma, pas une animation générique de fade/slide.
- Le vidage de cache (bobine qui s'emballe) prolonge la métaphore plutôt
  que d'être un bouton isolé.

**Compromis assumé** : contrairement à "Carte céleste" et "Jardin zen", ce
concept accepte une disposition proche d'une rangée (3 éléments côte à
côte) — jugé nécessaire pour la lisibilité et la simplicité demandées ;
l'écart au pattern générique se joue sur l'habillage (affiche, cadre,
rideau) plutôt que sur la disposition spatiale.

## 10. Règle de travail avec l'assistant IA (Claude)

Avant toute modification ou question sur ce projet, demander à Corentin comment
procéder :
1. Lire le fichier via le lien RAW GitHub (ci-dessus),
2. Travailler sur le dernier HTML collé dans la discussion en cours,
3. Ou répondre uniquement sans regarder le code.

---
*Dernière vérification du code live : 18/09/2026, via `git clone` direct du dépôt
(donc sans aucun cache CDN/raw.githubusercontent.com) pour `index.html`,
`README.md` et `sw.js`. Refonte "Affiches de cinéma" (3e refonte du jour,
après "Carte céleste" puis "Jardin zen") poussée le 18/09/2026.*
