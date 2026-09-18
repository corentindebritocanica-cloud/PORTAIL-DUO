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

⚠️ **Écart constaté le 18/09/2026** : `theme_color` du manifest (`#17181b`) et le
`<meta name="theme-color">` du HTML (`#0d1014`, aligné sur `--bg` du nouveau thème)
ne correspondent plus depuis la refonte design (section 4). Le manifest n'a pas été
retouché — à harmoniser si Corentin le souhaite.

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

- 3 cartes pleine largeur, une par app, avec icône ronde à dégradé coloré + nom en
  Bebas Neue + description courte + chevron (voir section 4).
- Clic → léger effet d'enfoncement (scale 0.96) puis redirection (`window.location.href`)
  vers le sous-dossier correspondant, avec un délai de 120 ms pour laisser voir
  l'animation.
- **Bouton de rechargement forcé** (icône ↻, cercle fixe en haut à droite de
  l'écran) — ajouté le 18/09/2026, repositionné en `position:fixed` lors de la
  refonte design (auparavant ancré au coin de la plaque). Au clic :
  1. Vide le Cache Storage du navigateur (`caches.delete()` sur toutes les entrées),
  2. Désinscrit tout service worker éventuellement enregistré sur le scope,
  3. Recharge la page avec un paramètre anti-cache (`?_r=<timestamp>`) pour forcer
     le rechargement des fichiers modifiés sur GitHub (utile en mode PWA standalone
     sur l'écran d'accueil iOS, où il n'y a ni geste "tirer pour rafraîchir" ni
     contrôle Safari visible).
  - ⚠️ Ce bouton avait déjà été ajouté lors d'une session précédente mais n'avait
    jamais été documenté ici — corrigé le 18/09/2026.
- Aucune autre logique JS au-delà de la navigation (pas de Firebase, pas d'auth, pas
  de state persistant) — cohérent avec le footer : *"Portail Duo · pas de compte,
  pas de cloud"*.

## 6. Historique — barre de statut iOS (non résolu malgré note précédente)

Un correctif avait été demandé et validé dans une discussion précédente pour
supprimer l'effet de flou de la barre de statut iOS en plein écran
(`content="black"` au lieu de `"black-translucent"`), mais **ce correctif n'a en
réalité jamais été poussé** : le fichier live avait toujours
`content="black-translucent"` lors des vérifications des 14/09 et 18/09/2026,
malgré une note antérieure du README affirmant le contraire.

→ **À faire côté Corentin** (ou à la demande, côté assistant) : appliquer réellement

```html
<meta name="apple-mobile-web-app-status-bar-style" content="black">
```

sur `index.html` à la racine pour que le correctif soit enfin effectif en ligne.

## 7. Règle de travail avec l'assistant IA (Claude)

Avant toute modification ou question sur ce projet, demander à Corentin comment
procéder :
1. Lire le fichier via le lien RAW GitHub (ci-dessus),
2. Travailler sur le dernier HTML collé dans la discussion en cours,
3. Ou répondre uniquement sans regarder le code.

Chaque modification du `index.html` doit être accompagnée d'une mise à jour de ce
README (section concernée + date).

---
*Dernière vérification du code live : 18/09/2026, via fetch du lien RAW GitHub.*
