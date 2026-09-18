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

## 4. Design / identité visuelle — "Jardin zen" (refonte du 18/09/2026)

Deuxième refonte du 18/09/2026 : Corentin n'a pas retenu "Carte céleste"
(1ère refonte, conservée dans l'historique Git) et a demandé, après une
liste de 10 nouvelles directions, que soit retirée toute "mécanique de
sélection" (rotation, alignement, glisser-viser) — les 3 apps doivent être
visibles et tapables directement, sans étape intermédiaire.

**Métaphore retenue** : un jardin sec japonais (karesansui) vu du dessus.
Les 3 apps sont 3 pierres posées en composition asymétrique (jamais alignées
ni en grille) sur un lit de gravier ratissé (motif SVG en vaguelettes,
faible contraste). Taper une pierre directement propage une onde colorée
(dégradé radial centré sur la pierre) qui recouvre l'écran avant la
redirection — pas de geste d'orientation préalable.

| Variable CSS | Valeur | Usage |
|---|---|---|
| `--sand` / `--sand-2` | `#f1ead8` / `#e4dabf` | Fond (gravier, lumière du jour) |
| `--ink` / `--ink-dim` | `#3c362b` / `rgba(60,54,43,.5)` | Texte, traits ratissés |
| `--stone-blue` | `#64767e` | Pierre Musculation (ardoise) |
| `--stone-gold` | `#b3854a` | Pierre Budget (ocre) |
| `--stone-green` | `#6d8a5b` | Pierre Courses (mousse) |
| `--water` | `#6fa3bf` | Bassin (vidage de cache) |

Rupture volontaire avec les 2 designs précédents (sombres, nocturnes) : ici
fond clair et lumineux, ambiance diurne — évite que "sortir des standards"
ne devienne systématiquement synonyme de "thème sombre". Palette
volontairement désaturée (tons pierre/terre/mousse) plutôt que les couleurs
vives bleu/or/vert des versions précédentes, pour rester cohérente avec le
matériau (pierre, gravier) plutôt qu'avec un code couleur applicatif.

`apple-mobile-web-app-status-bar-style` repassé à `default` (texte de la
barre de statut sombre sur fond clair) et `theme-color` à `#eee6d3` — les
deux anciens réglages ("black") étaient pensés pour un fond sombre et
casseraient la lisibilité ici.

## 5. Navigation / interactions

- **Les 3 pierres sont visibles et tapables en permanence**, sans étape
  d'alignement ou de sélection préalable — contrainte explicitement demandée
  par Corentin après les propositions de refonte n°2.
- **Taper une pierre** déclenche une onde radiale (dégradé circulaire,
  couleur propre à la pierre) centrée sur son point d'impact réel à l'écran
  (calculé via `getBoundingClientRect`), qui grandit et s'intensifie
  pendant 760 ms avant la redirection — pas de flash dur ni de zoom brutal,
  rythme volontairement plus lent/calme que la version "Carte céleste"
  (cohérent avec l'ambiance zen).
- Les anneaux ratissés en pointillés autour de chaque pierre sont
  purement décoratifs (ambiance jardin sec), jamais interactifs.
- **Plaque d'identité** en haut à gauche ("Portail Duo — Corentin & Lisa"),
  fixe et non interactive : légende de jardin plutôt que hero.
- Aucune logique JS au-delà de la navigation, du geste du bassin et de
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

## 8. Vidage du cache — le bassin (refonte "Jardin zen" du 18/09/2026)

**Problème identifié** : après une mise à jour poussée sur GitHub (portail ou
sous-apps), le cache côté iPhone (Safari / mode standalone) ne se vide pas tout
seul. Un bouton classique avait été ajouté le 18/09/2026 (version "plaque
industrielle"), puis remplacé par une comète à lancer (version "Carte
céleste"), puis par le mécanisme actuel dans la version "Jardin zen".

**Mécanisme actuel** : un petit bassin d'eau (tsukubai stylisé) en bas à
droite, avec une goutte qui tombe en boucle (animation d'ambiance). Maintenir
le doigt dessus ~600 ms déclenche :
1. désenregistrement de tous les service workers actifs
   (`navigator.serviceWorker.getRegistrations()` + `unregister()`),
2. suppression de toutes les entrées du Cache Storage (`caches.keys()` +
   `caches.delete()`), y compris `portail-duo-shell-v1` posé par `sw.js`,
3. une onde claire (couleur du sable) part du bassin et recouvre tout le
   jardin, puis rechargement forcé de `index.html` via
   `location.replace('./index.html?_reset=' + Date.now())` — le paramètre
   `_reset` unique empêche de resservir une copie locale.

Accessible aussi au clavier (élément focusable, `Entrée`/`Espace` déclenche
le même geste). Légende discrète en permanence à côté ("bassin · maintenir
pour rafraîchir").

## 9. Historique — démarche de refonte design (18/09/2026)

Corentin a demandé une refonte "radicale" sortant des standards UI habituels
(pas de navbar/sidebar/cards à ombre/hero centré/palette SaaS).

**1ère vague (8 concepts)** : coffret électrique, établi-plan cyanotype,
carnet de bord, platine vinyle, hublots de sous-marin, **carte céleste**,
distributeur automatique rétro, origami en éventail. "Carte céleste" a été
choisie et implémentée (navigation orbitale par glissement + tap pour
lancer), puis finalement écartée par Corentin ("j'aime pas trop au final").

**2ème vague (10 concepts)**, demandée explicitement : horloge astronomique,
jardin zen, sismographe, lanternes nocturnes, table d'orientation, fonds
marins bioluminescents, cabinet de curiosités, partition qui défile,
terrarium, casiers à clés d'hôtel. Corentin a ensuite demandé de retirer
**toute mécanique de sélection** (rotation, alignement, glisser-viser) des
10 concepts : les 3 apps devaient rester visibles et tapables directement.
**"Jardin zen" (retenu)** a été reformulé en ce sens et implémenté.

**Pourquoi "Jardin zen" tient la contrainte "non-générique"** :
- Composition asymétrique à 3 éléments de tailles différentes (pas de
  grille, pas d'alignement) — rompt directement avec le pattern de cards
  identiques en rangée.
- La sélection est un tap direct sur un élément narratif (une pierre dans
  son décor), pas un bouton avec fond/bordure — le seul retour visuel est
  une onde qui part du point de contact réel.
- Palette diurne désaturée (sable, ardoise, ocre, mousse) délibérément
  choisie pour trancher avec les deux premières refontes (sombres,
  nocturnes) et éviter que "non-générique" ne devienne un simple réflexe
  "thème sombre".
- Le vidage de cache (bassin + goutte d'eau) reste un geste (maintenir),
  pas un `<button>` classique, et partage la mécanique visuelle des ondes
  utilisée pour la navigation — cohérence entre les deux usages.

**Limite connue** : les micro-interactions (onde, goutte) demandent un
minimum d'animation JS ; testé avec `prefers-reduced-motion` mais pas sur
device réel — à vérifier par Corentin.

## 10. Règle de travail avec l'assistant IA (Claude)

Avant toute modification ou question sur ce projet, demander à Corentin comment
procéder :
1. Lire le fichier via le lien RAW GitHub (ci-dessus),
2. Travailler sur le dernier HTML collé dans la discussion en cours,
3. Ou répondre uniquement sans regarder le code.

---
*Dernière vérification du code live : 18/09/2026, via `git clone` direct du dépôt
(donc sans aucun cache CDN/raw.githubusercontent.com) pour `index.html`,
`README.md` et `sw.js`. Refonte "Jardin zen" (2e refonte du jour, après
"Carte céleste") poussée le 18/09/2026.*
