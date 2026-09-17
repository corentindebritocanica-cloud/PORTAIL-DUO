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

## 4. Design / palette (vérifiée dans le CSS live)

Esthétique "plaque industrielle" sombre avec vis en coin et liseré laiton.

| Variable CSS | Valeur | Usage |
|---|---|---|
| `--bg` | `#101113` | Fond de page |
| `--panel` / `--panel-edge` | `#201f22` / `#2b2a2e` | Plaque centrale |
| `--brass` / `--brass-dim` | `#c9a35c` / `#8a7346` | Liseré, footer, vis |
| `--ink` / `--ink-dim` | `#eae6db` / `#8b877e` | Texte principal / secondaire |
| `--blue` | `#1f8fff` | Bouton Musculation |
| `--gold` | `#e0a940` | Bouton Budget |
| `--green` | `#4caf6d` | Bouton Courses |

`theme-color` (meta) = `#17181b`, cohérent avec le fond.

## 5. Comportement / fonctionnalités du portail

- 3 boutons ("doors") pleine largeur, un par app, avec icône ronde colorée + nom +
  description courte + chevron.
- Clic → léger effet d'enfoncement (scale 0.96) puis redirection (`window.location.href`)
  vers le sous-dossier correspondant, avec un délai de 120 ms pour laisser voir
  l'animation.
- Apparition du panneau au chargement via une animation `rise` (fade + translateY),
  désactivée si `prefers-reduced-motion: reduce`.
- Aucune logique JS au-delà de la navigation et de l'enregistrement du service
  worker (pas de Firebase, pas d'auth, pas de state) — cohérent avec le footer :
  *"Portail Duo · pas de compte, pas de cloud"*.

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

## 8. Règle de travail avec l'assistant IA (Claude)

Avant toute modification ou question sur ce projet, demander à Corentin comment
procéder :
1. Lire le fichier via le lien RAW GitHub (ci-dessus),
2. Travailler sur le dernier HTML collé dans la discussion en cours,
3. Ou répondre uniquement sans regarder le code.

---
*Dernière vérification du code live : 17/09/2026, via l'API GitHub (contenu réel
sur `main`, sans cache CDN) pour `index.html` et `sw.js`.*
