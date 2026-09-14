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
- Aucune logique JS au-delà de la navigation (pas de Firebase, pas d'auth, pas de
  state) — cohérent avec le footer : *"Portail Duo · pas de compte, pas de cloud"*.

## 6. Historique — barre de statut iOS (résolu)

Un correctif avait été demandé et validé dans une discussion précédente pour
supprimer l'effet de flou de la barre de statut iOS en plein écran, mais l'audit du
14/09/2026 avait constaté que le code live n'avait pas cette modification
(`content="black-translucent"` toujours présent).

**Corrigé le 14/09/2026** : le fichier `index.html` a été remis à jour avec

```html
<meta name="apple-mobile-web-app-status-bar-style" content="black">
```

→ **À faire côté Corentin** : pousser ce fichier `index.html` mis à jour sur la
branche `main` du repo `PORTAIL-DUO` pour que le correctif soit effectif en ligne.

## 7. Règle de travail avec l'assistant IA (Claude)

Avant toute modification ou question sur ce projet, demander à Corentin comment
procéder :
1. Lire le fichier via le lien RAW GitHub (ci-dessus),
2. Travailler sur le dernier HTML collé dans la discussion en cours,
3. Ou répondre uniquement sans regarder le code.

---
*Dernière vérification du code live : 14/09/2026, via fetch du lien RAW GitHub et
curl sur les sous-dossiers / manifest / icônes.*
