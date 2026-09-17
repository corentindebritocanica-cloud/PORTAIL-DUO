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

## 4. Design / identité visuelle — "Carte céleste" (refonte du 18/09/2026)

Le portail a été entièrement repensé le 18/09/2026 à la demande de Corentin :
sortir radicalement des standards UI (pas de navbar, pas de sidebar, pas de
grille de cards à ombre, pas de hero centré, pas de palette "SaaS"). Ancienne
version ("plaque industrielle", vis + liseré laiton + 3 boutons empilés)
conservée dans l'historique Git mais remplacée sur `main`.

**Métaphore retenue** : une carte du ciel nocturne. Chaque app est une
constellation dessinée en SVG (points reliés par des traits), positionnée
sur une bande 3 fois plus large que l'écran (`300vw`) qu'on fait glisser
horizontalement — on "tourne" la voûte céleste pour faire face à
l'application voulue plutôt que de naviguer dans un menu.

| Variable CSS | Valeur | Usage |
|---|---|---|
| `--void` / `--void-2` | `#05060c` / `#0b0e1c` | Fond (voûte céleste) |
| `--star` / `--star-dim` | `#f4efe0` / `rgba(244,239,224,.4)` | Points/texte |
| `--gold` | `#d9b273` | Plaque d'identité ("Portail Duo") |
| `--blue` | `#63c8ff` | Constellation Musculation |
| `--gold` (Budget) | `#d9b273` | Constellation Budget |
| `--green` | `#71e3a4` | Constellation Courses |
| `--comet` | `#ff9a5c` | Comète (vidage de cache) |

Typographie : pile de polices serif système (`ui-serif, "Iowan Old Style",
"Palatino Linotype", Palatino, Georgia, ...`), pas de Google Fonts — cohérent
avec la contrainte "aucune dépendance externe" du projet (et donc compatible
avec le cache hors-ligne du service worker, qui ne gère que des fichiers du
repo). Les noms de constellations sont en petites capitales espacées (façon
légende d'atlas), jamais en gras/sans-serif "SaaS".

`theme-color` (meta) mis à jour à `#05060c` pour matcher le nouveau fond.
⚠️ Le `manifest.json` (background_color `#101113` / theme_color `#17181b`,
utilisés par l'écran de démarrage iOS) n'a pas été modifié dans cette passe —
resté proche du noir donc peu visible au lancement, mais à harmoniser avec
`#05060c` dans un prochain commit si Corentin le souhaite.

## 5. Navigation / interactions

- **Glisser horizontalement** n'importe où sur l'écran fait pivoter la
  voûte : chaque constellation occupe un "créneau" plein écran (`.slot`),
  avec un effet de rubber-band aux extrémités et un magnétisme (snap) vers
  le créneau le plus proche au relâchement (distance ou vélocité du geste).
  Les constellations non actives sont désaturées et réduites (`scale(.86)`,
  `saturate(.35)`) pour bien signaler laquelle est "en visée".
- **Taper l'étoile la plus brillante** (le "hub" de la constellation active)
  déclenche un **warp** : la constellation grossit et son étoile centrale
  explose en un halo, toute la voûte zoome et se floute, un flash coloré
  (couleur propre à l'app) recouvre l'écran, puis redirection vers le
  sous-dossier — après 640 ms, le temps que l'animation se joue.
- **Petits points en bas d'écran** : rappel discret de la position dans la
  voûte (constellation active en surbrillance), aussi cliquables pour un
  saut direct — seule concession à un pattern "carousel" classique, mais
  stylée en étoiles et non en puces génériques.
- **Plaque d'identité** en haut à gauche ("Portail Duo — Corentin & Lisa"),
  fixe et non interactive : fait office de titre sans jouer le rôle d'un
  hero (pas centré, pas de CTA, purement une légende de carte).
- Aucune logique JS au-delà de la navigation, du geste de la comète et de
  l'enregistrement du service worker (toujours pas de Firebase, pas d'auth,
  pas de state serveur).

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

## 8. Vidage du cache — la comète (refonte du 18/09/2026)

**Problème identifié** : après une mise à jour poussée sur GitHub (portail ou
sous-apps), le cache côté iPhone (Safari / mode standalone) ne se vide pas tout
seul — Corentin continuait de voir une ancienne version tant qu'il ne
supprimait pas l'app de l'écran d'accueil et ne la réinstallait pas. Un bouton
classique "Vider le cache" avait été ajouté le 18/09/2026 dans l'ancienne
version (plaque industrielle) ; il a été remplacé le même jour par un geste
intégré au concept "Carte céleste".

**Mécanisme actuel** : une comète dérive doucement en bas à droite de l'écran.
Deux gestes déclenchent la même action :
1. **Maintenir le doigt dessus** ~650 ms (elle "charge" — son halo s'intensifie),
2. **La faire glisser** rapidement (> 36 px en moins de 450 ms) — comme si on
   la lançait.

Dans les deux cas :
1. désenregistrement de tous les service workers actifs
   (`navigator.serviceWorker.getRegistrations()` + `unregister()`),
2. suppression de toutes les entrées du Cache Storage (`caches.keys()` +
   `caches.delete()`), y compris `portail-duo-shell-v1` posé par `sw.js`,
3. la comète file hors de l'écran (`translate` + fondu), puis rechargement
   forcé de `index.html` via `location.replace('./index.html?_reset=' +
   Date.now())` — le paramètre `_reset` unique empêche de resservir une copie
   locale.

Accessible aussi au clavier (élément focusable, `Entrée`/`Espace` déclenche le
même geste) pour ne pas dépendre uniquement du tactile. Une légende discrète
("comète · glisser ou maintenir") reste affichée en permanence à côté, pour
que le geste ne soit pas totalement caché sans indice.

## 9. Historique — démarche de refonte design (18/09/2026)

Corentin a demandé une refonte "radicale" sortant des standards UI habituels
(pas de navbar/sidebar/cards à ombre/hero centré/palette SaaS). 8 concepts ont
été proposés avant codage :

1. Coffret électrique (disjoncteurs à bascule)
2. Établi-plan (cyanotype, zoom spatial)
3. Carnet de bord (pages qui se tournent)
4. Platine vinyle (rotation, bras de lecture)
5. Hublots de sous-marin (buée à essuyer, sas)
6. **Carte céleste (retenu)** — constellations, navigation orbitale, warp
7. Distributeur automatique rétro (touches à ressort)
8. Origami en éventail (pliage/dépliage 3D)

**Pourquoi "Carte céleste" tient la contrainte "non-générique"** :
- Navigation par glissement horizontal + snap est un pattern de carrousel
  connu, mais ici il sert une métaphore cohérente (tourner la voûte céleste)
  et non un slideshow de promo — seule concession assumée : les points de
  pagination en bas, sobrement stylés en étoiles plutôt qu'en puces
  Bootstrap.
- Le seul élément qui aurait pu ressembler à un "bouton" générique — le
  vidage de cache — a été transformé en geste (comète à maintenir/lancer)
  plutôt qu'un `<button>` avec un fond et une bordure.
- Palette et typographie (bleu nuit profond, or gravé, serif système en
  petites capitales) rompent volontairement avec le duo blanc/dégradé
  bleu-violet + Inter/Poppins des interfaces SaaS.
- Les transitions (warp, halo qui explose, flash coloré, comète qui charge
  puis s'envole) sont la mécanique de navigation elle-même, pas des
  animations ajoutées après coup sur des boutons statiques.

**Limite connue** : la navigation entre constellations n'est pas
accessible au clavier (seul le geste de la comète l'est) — acceptable pour
un usage privé à deux sur mobile, mais à noter si le portail devait un jour
s'ouvrir à d'autres usages/appareils.

## 10. Règle de travail avec l'assistant IA (Claude)

Avant toute modification ou question sur ce projet, demander à Corentin comment
procéder :
1. Lire le fichier via le lien RAW GitHub (ci-dessus),
2. Travailler sur le dernier HTML collé dans la discussion en cours,
3. Ou répondre uniquement sans regarder le code.

---
*Dernière vérification du code live : 18/09/2026, via `git clone` direct du dépôt
(donc sans aucun cache CDN/raw.githubusercontent.com) pour `index.html`,
`README.md` et `sw.js`. Refonte "Carte céleste" poussée le 18/09/2026.*
