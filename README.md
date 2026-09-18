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

## 4. Design / identité visuelle — thème "Ardoise & Craie" repris de Muscu (18/09/2026)

Après trois refontes expérimentales dans la journée ("Carte céleste", "Jardin
zen", "Affiches de cinéma"), demande finale : abandonner la piste "sortir
des standards" et **reprendre tel quel le thème de l'app Muscu**
("Ardoise & Craie") pour que le portail ait la même identité que ses
sous-apps plutôt qu'une esthétique propre.

**Ce qui a été repris à l'identique du CSS live de `Muscu/index.html`** :
- Tokens de couleur : `--bg:#0d1014`, `--card:#161b22`, `--border:rgba(255,255,255,.09)`,
  `--text:#e9eff6`/`--text-dim:#8a97a8`, `--corentin:#1f8fff` (bleu),
  `--lisa:#ff3d7e` (rose, non utilisé ici faute de profils), `--done:#12b981`
  (vert), `--gold:#ffb800`.
- Thème clair (`html.light-mode`) avec les mêmes valeurs de bascule
  (`--bg:#eef1f5`, `--card:#fff`, `--text:#131a23`, etc.).
- Police d'affichage `Bebas Neue` (Google Fonts, mêmes balises `<link>`) pour
  les gros titres, réservée aux titres comme dans Muscu.
- "Poussière de craie" en fond (`body::before`, mêmes `radial-gradient`),
  désactivée en thème clair.
- Composant `.big-choice-btn` (carte cliquable, icône colorée 46×46, libellé,
  chevron) copié à l'identique des styles de Muscu — y compris le rayon
  `--r-lg`, l'ombre `--shadow-sm` et l'effet `:active{scale(.98)}`.
- Bouton rond `.theme-toggle` (38×38, même position `top:14px; right:14px`,
  même emoji 🌙/☀️) avec bascule dark/light.

**Différence assumée** : Muscu a un système de profils Corentin (bleu) /
Lisa (rose) qui n'a pas de sens ici (le portail n'a pas de connexion) — donc
`--lisa` est repris comme token mais non utilisé, et les 3 icônes d'app
utilisent `--corentin` (Musculation), `--gold` (Budget) et `--done` (Courses)
plutôt qu'un système de profil.

**Détail notable** : la préférence de thème est stockée sous la même clé
`localStorage` que Muscu (`duo_theme`). Le portail et les 3 sous-apps étant
sur la même origine GitHub Pages, **changer le thème depuis le portail (ou
depuis Muscu) change aussi les autres** — comportement voulu, pas un bug.

⚠️ Ce choix réintroduit une dépendance externe (Google Fonts, pour Bebas
Neue) que le portail n'avait pas jusqu'ici — assumé pour matcher Muscu à
l'identique ; à garder en tête si "zéro dépendance externe" redevient un
critère.

## 5. Navigation / interactions

- **3 vrais liens `<a href>`** vers `./Muscu/`, `./Budget/`, `./Course/` —
  plus de gestion JS de la navigation (ni transition custom), pour rester
  fidèle à la simplicité du menu de Muscu (qui utilise le même type de
  bouton pour naviguer entre écrans).
- Léger effet d'enfoncement au tap (`scale(.98)`), identique à Muscu.
- Bouton **thème clair/sombre** en haut à droite, partagé avec les 3
  sous-apps (voir plus haut).
- Bouton **vidage de cache** (🔄) juste à côté, tap simple (pas de geste à
  maintenir) — cohérent avec le reste de l'interface, qui ne demande jamais
  de geste long.

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

## 8. Vidage du cache — bouton 🔄 (thème Ardoise & Craie, 18/09/2026)

**Problème identifié** : après une mise à jour poussée sur GitHub (portail ou
sous-apps), le cache côté iPhone (Safari / mode standalone) ne se vide pas tout
seul. Mécanisme déjà passé par un bouton classique, une comète, un bassin
d'eau puis une bobine de film dans les versions expérimentales ; revenu à un
simple bouton rond avec la reprise du thème de Muscu — cohérent avec le
reste de l'interface qui n'utilise que des taps simples, jamais de geste à
maintenir.

**Mécanisme actuel** : bouton rond 🔄 en haut à droite, à côté du bouton de
thème. Un tap déclenche :
1. désenregistrement de tous les service workers actifs
   (`navigator.serviceWorker.getRegistrations()` + `unregister()`),
2. suppression de toutes les entrées du Cache Storage (`caches.keys()` +
   `caches.delete()`), y compris `portail-duo-shell-v1` posé par `sw.js`,
3. l'icône tourne pendant l'opération, puis rechargement forcé de
   `index.html` via `location.replace('./index.html?_reset=' + Date.now())`
   — le paramètre `_reset` unique empêche de resservir une copie locale.

## 9. Historique — démarche de refonte design (18/09/2026)

Corentin a demandé une refonte "radicale" sortant des standards UI habituels,
puis a itéré en plusieurs passes le même jour avant de changer d'objectif :

1. **1ère vague (8 concepts)** → **"Carte céleste"** implémentée (navigation
   orbitale, warp) → rejetée ("j'aime pas trop au final").
2. **2ème vague (10 concepts)**, avec consigne de retirer toute mécanique de
   sélection → **"Jardin zen"** implémentée (3 pierres tapables directement,
   onde au tap) → jugée encore trop élaborée.
3. **Demande directe** (hors liste) : affiches de cinéma → **"Affiches de
   cinéma"** implémentée (rideau qui se ferme, bobine de film) — pas de
   retour explicite dessus.
4. **Revirement** : "va regarder le design de l'app Muscu et applique le
   même thème, la même idée générale" → objectif "sortir des standards"
   abandonné au profit de la **cohérence avec Muscu** → thème **"Ardoise &
   Craie" (retenu)**, repris tel quel (tokens CSS, Bebas Neue, composant
   `.big-choice-btn`, bouton de thème).

**Pourquoi ce revirement n'est pas contradictoire avec le reste du repo** :
Muscu et Course avaient déjà convergé vers ce même thème ("Course : reprise
du design 'Fonte & Craie'/'Ardoise & Craie' de Muscu"). Le portail rejoint
donc une cohérence déjà engagée entre les sous-apps plutôt que d'imposer
un 4e langage visuel isolé. Seul **Budget** reste sur son propre design à ce
jour — à harmoniser un jour si Corentin le souhaite, mais hors du périmètre
de cette conversation (le portail n'a pas vocation à modifier les sous-apps).

Les 3 refontes expérimentales ("Carte céleste", "Jardin zen", "Affiches de
cinéma") restent consultables dans l'historique Git (`git log -- index.html`)
si Corentin veut y revenir ou piocher un élément.

## 10. Règle de travail avec l'assistant IA (Claude)

Avant toute modification ou question sur ce projet, demander à Corentin comment
procéder :
1. Lire le fichier via le lien RAW GitHub (ci-dessus),
2. Travailler sur le dernier HTML collé dans la discussion en cours,
3. Ou répondre uniquement sans regarder le code.

---
*Dernière vérification du code live : 18/09/2026, via `git clone` direct du dépôt
(donc sans aucun cache CDN/raw.githubusercontent.com) pour `index.html`,
`README.md`, `sw.js` et `Muscu/index.html` (thème source). Thème "Ardoise &
Craie" (4e itération design du jour, après "Carte céleste", "Jardin zen" et
"Affiches de cinéma") poussé le 18/09/2026.*
