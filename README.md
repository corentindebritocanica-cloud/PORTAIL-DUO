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

**Corrigé le 18/09/2026** : `background_color` et `theme_color` du manifest sont
désormais alignés sur `#0d1014` (le `--bg` du thème Ardoise & Craie), cohérents avec
le `<meta name="theme-color">` du HTML.

## 4. Design / palette

**Refonte du 18/09/2026 : thème "Ardoise & Craie", repris à l'identique des jetons
de design de Muscu**, pour une cohérence visuelle entre le Portail et les 3 apps.
L'ancienne esthétique "plaque industrielle" (vis en coin, liseré laiton) a été
entièrement retirée.

| Variable CSS | Valeur | Usage |
|---|---|---|
| `--bg` | `#0d1014` | Fond de page (charbon) |
| `--card` / `--card-2` | `#161b22` / `#1e2530` | Fond des cartes |
| `--border` / `--border-strong` | `rgba(255,255,255,0.09)` / `0.17` | Liserés des cartes |
| `--text` / `--text-dim` | `#e9eff6` / `#8a97a8` | Texte principal / secondaire |
| `--blue` / `--blue-dark` | `#1f8fff` / `#1a5fc4` | Icône & carte Musculation |
| `--gold` / `--gold-dark` | `#ffb800` / `#c48e00` | Icône & carte Budget |
| `--green` / `--green-dark` | `#12b981` / `#0d8f64` | Icône & carte Courses |

- Police **Bebas Neue** (Google Fonts, chargée via `<link>`) réservée au grand titre
  ("OÙ VA-T-ON ?") et au libellé de chaque carte, en majuscules — même usage que
  dans Muscu, où elle sert aux titres d'écran et gros chiffres. Le reste du texte
  reste en police système.
- Texture de poussière de craie très discrète en fond (`body::before`, dégradés
  radiaux), identique à celle de Muscu, façon tableau noir essuyé.
- Chaque app est une carte `.big-choice-btn` (fond `--card`, bordure `--border`,
  rayon 18px) avec icône ronde à dégradé coloré (`.choice-icon`) + libellé Bebas Neue
  + description + chevron — repris du composant du même nom dans Muscu.
- `theme-color` (meta) = `#0d1014`, aligné sur le nouveau `--bg`.
- Pas de bascule clair/sombre (`light-mode`) contrairement à Muscu — non demandée,
  le Portail reste en thème sombre unique. À ajouter si besoin.

## 5. Comportement / fonctionnalités du portail

- **Mise en page (mise à jour le 18/09/2026)** : tout le contenu (titre + 3 cartes +
  bouton de rechargement) est centré verticalement au milieu de l'écran (`body` en
  `flex` avec `justify-content:center; align-items:center`), quelle que soit la
  hauteur du viewport — plus de contenu plaqué en haut de page.
- 3 cartes pleine largeur, une par app, avec icône ronde à dégradé coloré + nom en
  Bebas Neue + description courte + chevron (voir section 4).
- Clic → léger effet d'enfoncement (scale 0.96) puis redirection (`window.location.href`)
  vers le sous-dossier correspondant, avec un délai de 120 ms pour laisser voir
  l'animation.
- **Bouton de rechargement forcé** (icône ↻) — ajouté le 18/09/2026. **Déplacé le
  18/09/2026** : n'est plus en `position:fixed` en haut à droite de l'écran, mais
  dans le flux normal de la page, centré juste sous la carte Courses (`.reload-row`).
  Au clic :
  1. Vide le Cache Storage du navigateur (`caches.delete()` sur toutes les entrées),
  2. Désinscrit tout service worker éventuellement enregistré sur le scope,
  3. Recharge la page avec un paramètre anti-cache (`?_r=<timestamp>`) pour forcer
     le rechargement des fichiers modifiés sur GitHub (utile en mode PWA standalone
     sur l'écran d'accueil iOS, où il n'y a ni geste "tirer pour rafraîchir" ni
     contrôle Safari visible).
- **Footer retiré le 18/09/2026** : la phrase *"Portail Duo · pas de compte, pas de
  cloud"* qui figurait sous les cartes a été supprimée à la demande de Corentin.
- **Ouverture hors ligne activée le 18/09/2026** : un fichier `sw.js` (Service
  Worker) existait déjà à la racine du dépôt — mettant en cache le shell
  (`index.html`, `manifest.json`, les 3 icônes) — mais n'avait **jamais été
  enregistré** depuis `index.html`, donc jamais réellement actif. Ajout de :
  ```js
  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { scope: './' })
        .catch((err) => console.warn('[sw] enregistrement échoué :', err));
    });
  }
  ```
  Le Portail s'ouvre désormais même sans réseau, une fois visité au moins une
  fois en ligne. Fait dans le cadre d'une harmonisation offline sur les 4 apps
  du dépôt (voir aussi `Muscu/README.md`, `Course/README.md`, `Budget/README.md`
  — Budget n'avait ni Service Worker ni persistance Firestore, tous deux ajoutés
  ce même jour).
- Aucune autre logique JS au-delà de la navigation (pas de Firebase, pas d'auth, pas
  de state persistant).

## 6. Historique — barre de statut iOS (résolu le 18/09/2026)

Un correctif avait été demandé et validé dans une discussion précédente pour
supprimer l'effet de flou de la barre de statut iOS en plein écran
(`content="black"` au lieu de `"black-translucent"`), mais il n'avait en réalité
jamais été réellement poussé : le fichier live avait toujours
`content="black-translucent"` lors des vérifications des 14/09 et 18/09/2026,
malgré une note antérieure du README affirmant le contraire.

**Corrigé pour de bon le 18/09/2026** : `index.html` a désormais bien

```html
<meta name="apple-mobile-web-app-status-bar-style" content="black">
```

— vérifié directement sur le contenu réel du fichier via l'API GitHub (le cache
CDN de `raw.githubusercontent.com` peut mettre quelques minutes à se rafraîchir,
voir note en fin de document).

## 7. Règle de travail avec l'assistant IA (Claude)

Avant toute modification ou question sur ce projet, demander à Corentin comment
procéder :
1. Lire le fichier via le lien RAW GitHub (ci-dessus),
2. Travailler sur le dernier HTML collé dans la discussion en cours,
3. Ou répondre uniquement sans regarder le code.

Chaque modification du `index.html` doit être accompagnée d'une mise à jour de ce
README (section concernée + date).

## 8. Historique — bug cross-app du cache/Service Worker (corrigé le 18/09/2026)

**Contexte** : chacune des 4 apps du dépôt (Portail, Course, Muscu, Budget) a son
propre `sw.js`, avec son propre `CACHE_NAME` (`portail-duo-shell-v1`,
`courses-lc-shell-v1`, `muscu-shell-v1`, `budget-lc-shell-v1`).

**Bug** : le `activate` handler de chaque `sw.js` faisait
`caches.keys().filter(k => k !== CACHE_NAME).map(k => caches.delete(k))`.
Or `caches.keys()` renvoie **tous les caches de tout le domaine**, pas
seulement ceux de l'app en cours — donc ce filtre supprimait aussi le cache
des 3 autres apps à chaque activation d'un Service Worker (ce qui arrive
automatiquement, sans action de l'utilisateur, dès qu'iOS/Safari décide de
réactiver un SW). Résultat concret : l'ouverture hors-ligne de Course (ou
Muscu, ou Budget) pouvait cesser de fonctionner sans raison apparente, dès
que le Portail (ou une autre app) réactivait son propre Service Worker.

**Corrigé** : chaque `sw.js` a désormais un `CACHE_PREFIX` propre
(`'portail-duo-shell-'`, `'courses-lc-shell-'`, `'muscu-shell-'`,
`'budget-lc-shell-'`), et l'`activate` handler ne supprime plus que
`keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)` — chaque
app ne nettoie plus que ses propres anciennes versions de cache, jamais
celles des autres.

**Bug additionnel corrigé sur le même sujet** : le bouton "Vider le cache et
recharger" du Portail (`id="hardReload"`) appelait `caches.keys()` (toutes
les apps) et `navigator.serviceWorker.getRegistrations()` (tous les
scopes) sans filtre, et supprimait/désinscrivait tout. Corrigé pour ne
toucher que le cache et le Service Worker du Portail lui-même
(`caches` filtrées par `CACHE_PREFIX`, `registrations` filtrées par
`scope === new URL('./', location.href).href`), avec ajout d'une
confirmation (`window.confirm(...)`) avant l'action, puisqu'elle reste
destructive pour le hors-ligne du Portail seul.

---
*Dernière vérification du code live : 18/09/2026, via fetch du lien RAW GitHub.*
