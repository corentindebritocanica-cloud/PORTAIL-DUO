# Portail Duo

Portail de lancement (launcher) HTML unique pour les 3 apps de Corentin & Lisa :
**Musculation** (Duo Training), **Budget** (Budget L&C), **Courses** (App Courses).

- **Live** : https://corentindebritocanica-cloud.github.io/PORTAIL-DUO/
- **Repo** : `corentindebritocanica-cloud/PORTAIL-DUO`
- **Raw index.html** : https://raw.githubusercontent.com/corentindebritocanica-cloud/PORTAIL-DUO/refs/heads/main/index.html

Depuis le 22/09/2026, le Portail est un **tableau de bord** : chaque carte ouvre son app et affiche un aperçu du jour (prochaine séance, reste à vivre, produits à acheter). Il lit pour cela un petit résumé écrit par chaque app dans Firebase, en **connexion anonyme** (aucun mot de passe) — voir « Tableau de bord » en fin de fichier. HTML/CSS/JS sans build, avec un manifest PWA.

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
- Chaque app est une carte `.dash-card` (fond `--card`, bordure `--border`, rayon 18px) avec icône ronde à dégradé coloré (`.choice-icon`) + libellé Bebas Neue + description + chevron. Remplace `.big-choice-btn` (supprimée le 22/09/2026).
- `theme-color` (meta) = `#0d1014`, aligné sur le nouveau `--bg`.
- **Bascule clair/sombre ajoutée (18/09/2026)** : bouton `theme-toggle` (cercle
  🌙/☀️ en haut à droite, `env(safe-area-inset-top)` pris en compte), classe
  `html.light-mode` avec les mêmes valeurs que Muscu/Course, préférence mémorisée
  dans `localStorage` (`portail-theme`).

## 5. Comportement / fonctionnalités du portail

- **Mise en page (remplace, le 22/09/2026, le centrage vertical du 18/09/2026)** : le contenu est aligné en haut et défile (barre du haut, titre « Aujourd'hui » + date, 3 cartes, bouton de rechargement). `body` démarre sous la barre d'état (`env(safe-area-inset-top) + 16px`, obligatoire avec `viewport-fit=cover`).
- **3 cartes-liens** (`<a class="dash-card" href="./Muscu/">`, `./Budget/`, `./Course/`) : carte entière cliquable, avec en-tête (icône ronde à dégradé + nom en Bebas Neue + description + chevron) puis aperçu de l'app. L'ancien clic en JS (`data-url`, `scale(0.96)`, délai de 120 ms) est supprimé : un vrai lien suffit, l'enfoncement est en CSS (`:active`).
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
- **Depuis le 22/09/2026** : lecture de Firebase (connexion anonyme) pour le tableau de bord, et dernier état connu gardé dans `localStorage` (`portail-resume`). Voir « Tableau de bord ».

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

**Depuis le 20/09/2026** : `DERNIERE_MAJ` (dans `index.html`) et `CACHE_NAME` (dans `sw.js`) sont mis à jour **automatiquement** par le workflow `.github/workflows/auto-version.yml` à chaque push qui modifie l'`index.html` d'une app (voir l'historique en bas de ce fichier). Les mettre à jour à la main reste inoffensif mais n'est plus nécessaire ; `CACHE_NAME` prend la forme `<préfixe>r<n° d'exécution>`.

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

## 9. Historique — SDK Firebase absent du cache Service Worker (corrigé le 18/09/2026)

Suite à la correction du bug cross-app (section 8), le problème d'ouverture
hors-ligne persistait sur Course. Diagnostic plus poussé, sur suggestion de
Corentin : dans Course, Budget et Muscu, le SDK Firebase (et, pour Budget,
Sortable.js/canvas-confetti) est chargé depuis un CDN externe
(`gstatic.com`, `cdn.jsdelivr.net`) via des balises `<script>` classiques
(Course/Budget) ou des `import` ES statiques (Muscu) — dans les deux cas,
un chargement **bloquant** : le navigateur ne peut pas afficher/exécuter le
reste de la page tant que ces fichiers n'ont pas répondu. Or le `fetch`
handler de chaque `sw.js` ignore explicitement toute origine différente de
la sienne, donc ces fichiers externes n'étaient **jamais mis en cache par
le Service Worker** — ils dépendaient uniquement du cache HTTP par défaut
de Safari, que iOS peut vider (notamment en mode standalone). Hors-ligne,
sans ce cache navigateur, la page restait bloquée en attendant l'échec
réseau de ces scripts, même avec un shell (`index.html`) parfaitement mis
en cache par ailleurs.

**Corrigé dans les 3 apps concernées** (le Portail n'a pas ce problème,
il ne charge aucun SDK externe) : ajout d'une liste explicite des fichiers
externes bloquants à chaque `sw.js`, avec une branche cache-first dédiée
dans le `fetch` handler, en dehors de toute logique de scope/origine.
`CACHE_NAME` de chacun passé en v2 pour forcer la réinstallation du cache
avec ces nouveaux fichiers. Voir le README de chaque app pour le détail
propre à son SDK/ses versions.

---
*Dernière vérification du code live : 18/09/2026, via fetch du lien RAW GitHub.*

## 10. Historique — Alignement charte UX/UI (18/09/2026)

Audit puis mise en conformité avec `/UX_UI_CHARTER.md` (référence : app Muscu) :
- `apple-mobile-web-app-status-bar-style` corrigé de `black` vers `black-translucent`
  (cohérence avec Muscu et Course).
- Ajout de `overscroll-behavior:none` sur `html,body` (évite tout rebond de
  défilement indésirable).
- Complément des jetons de design manquants pour cohérence future : `--r-xs`
  (4px), `--r-xl` (22px), `--shadow-lg`, `--t-fast`/`--t-mid` — non utilisés
  aujourd'hui sur cette page (pas de modale sur le Portail), mais prêts si un
  futur écran (ex. confirmation avant navigation) en a besoin.
- **Mode clair ajouté** (voir section 4) — le Portail était jusque-là la seule
  des 4 pages sans bascule clair/sombre.
- Le `manifest.json` du Portail était déjà conforme (theme_color aligné, icône
  `maskable` en plus — meilleur que Muscu/Course sur ce point, à généraliser
  aux deux autres apps si l'occasion se présente).

## Historique — Bandeau de mise à jour du Service Worker + meta tag standard (19/09/2026)

Suite au chantier de débogage du flou/décalage sur Course (voir son propre README), un document de référence a été créé (`/GUIDE_PWA_IOS.md`, racine du dépôt) synthétisant les bugs WebKit rencontrés et les bonnes pratiques iOS. Deux corrections en ont découlé, appliquées identiquement sur les 4 apps (Portail/Muscu/Budget/Course) :

- **Meta tag standard ajouté** : `<meta name="mobile-web-app-capable" content="yes">` à côté du tag `apple-mobile-web-app-capable` existant (jamais retiré — iOS Safari ne lit que l'orthographe Apple). Fait taire l'avertissement de dépréciation de Chrome DevTools sans rien changer côté iOS.
- **Bandeau "🔄 Nouvelle version disponible"** : le `sw.js` de cette app fait déjà `skipWaiting()` + `clients.claim()` automatiquement à chaque mise à jour détectée, mais rien n'informait l'utilisateur qu'un rechargement était nécessaire pour voir le nouveau code — c'est très exactement ce qui a causé des heures de confusion sur Course le 18/09. Un petit bandeau discret (bas d'écran, conscient de la safe-area) apparaît désormais dès qu'une mise à jour du Service Worker est détectée, avec un bouton "Actualiser". Le rechargement n'est **volontairement pas automatique** (`controllerchange` non écouté pour forcer un reload) afin de ne jamais interrompre une saisie en cours — l'utilisateur choisit le moment.
- Vérifié à cette occasion : le bug `height:100dvh` qui avait affecté Course (voir son historique) ne touche pas cette app, qui utilise déjà `min-height:100vh` partout où c'est pertinent.


## Historique — Horodatage de dernier déploiement (19/09/2026)

Ajout d'un petit texte sous le bouton de rechargement affichant la date/heure du dernier déploiement de code (constante `DERNIERE_MAJ`, format ISO). **À mettre à jour manuellement à chaque futur commit sur cette app.**


## Historique — Mise à jour au retour dans l'app + « réseau d'abord » (20/09/2026)

**But** : ne plus avoir à fermer l'app (swipe vers le haut) ni à la supprimer/réinstaller pour voir une nouvelle version.

- **`sw.js` — `index.html` en réseau d'abord** (`reseauPuisCache()`) : le serveur est interrogé en priorité, donc la dernière version est toujours servie quand il y a du réseau. Si le réseau est absent ou met plus de **4 s** à répondre (connexion « fantôme » sur iPhone), la copie en cache est servie : l'ouverture hors ligne reste garantie. Les autres fichiers du shell (icônes, manifest, SDK) restent en cache-first, inchangés.
- **Vérification de version au retour au premier plan** (bloc en fin de `<script>`, événement `visibilitychange`) : sur iPhone une PWA remise au premier plan n'est pas rechargée. Au retour, la page relit `index.html` sur le serveur (`cache:'no-store'`) et compare sa constante `DERNIERE_MAJ` avec celle du code en cours d'exécution. Si le serveur a une version différente : **rechargement automatique**, sauf si un champ de saisie est actif ou si une fenêtre (pop-up, confirmation, connexion) est ouverte — dans ce cas c'est le bandeau « 🔄 Nouvelle version disponible » existant qui s'affiche (le rechargement n'interrompt donc jamais une saisie). Au plus un contrôle toutes les 30 s ; hors ligne, rien ne se passe.
- ⚠️ **`DERNIERE_MAJ` est désormais un élément fonctionnel** (plus seulement un affichage) : elle sert de numéro de version pour cette détection. Ne pas la supprimer, et garder la forme `DERNIERE_MAJ = '…'` (une seule occurrence par fichier).
- **Une seule fois** : la première mise à jour vers cette version ne bénéficie pas encore du mécanisme (l'ancien code est encore en place). Fermer l'app et la rouvrir une ou deux fois suffit ; ensuite plus aucune manipulation.
- Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `portail-duo-shell-v3` → `portail-duo-shell-v4`.


## Historique — Automatisation de DERNIERE_MAJ et du cache (GitHub Action, 20/09/2026)

Fichier : `.github/workflows/auto-version.yml` (gratuit, quelques secondes par exécution).

- **Déclencheur** : push sur `main` modifiant `index.html`, `style.css` ou `app.js` d'une app (racine, `Budget/`, `Course/`, `Muscu/`). Un commit du robot ne relance jamais le workflow.
- **Action, pour l'app concernée uniquement** : `DERNIERE_MAJ` ← heure de Paris au format ISO ; `style.css?v=…` et `app.js?v=…` (dans `index.html`) ← chiffres de cette date ; `CACHE_NAME` ← `<CACHE_PREFIX>r<n° d'exécution>` (ex. `budget-lc-shell-r1`). Le préfixe est lu dans le `sw.js` de l'app, ce qui préserve le nettoyage par préfixe introduit le 18/09. Le robot committe (`chore: DERNIERE_MAJ + cache SW mis à jour automatiquement`), puis relance la publication GitHub Pages par l'API.
- **Lancement manuel** (onglet Actions → « Auto-version » → Run workflow) : met à jour les 4 apps, pour forcer un rafraîchissement général.
- **Conditions** : `DERNIERE_MAJ = '…'` une seule fois par `index.html` ; `const CACHE_PREFIX` et `const CACHE_NAME` en début de ligne dans chaque `sw.js`. Sinon l'exécution échoue (croix rouge dans Actions) et rien n'est mis à jour.
- **Limite** : un push qui ne touche que `sw.js` ne déclenche pas le robot ; bumper `CACHE_NAME` à la main ou lancer le workflow manuellement.
- Premier passage réel vérifié le 20/09/2026 (Budget) : commit du robot, Pages construit, site publié avec les nouvelles valeurs.


## Historique — Découpage en `index.html` / `style.css` / `app.js` (20/09/2026)

**But** : des fichiers lisibles et modifiables (avant : tout dans un seul `index.html`, ≈ 17 Ko), et un cache navigateur / service worker qui peut traiter le style et le code séparément. **Aucun changement de comportement ni d'apparence** : le contenu a été déplacé tel quel.

**Où trouver quoi** (≈ 17 Ko → ≈ 5 Ko (`index.html`) + ≈ 6 Ko (`style.css`) + ≈ 7 Ko (`app.js`)) :
- `index.html` : la structure HTML, un tout petit script inline qui définit `DERNIERE_MAJ`, et les balises `<link href="style.css?v=…">` / `<script src="app.js?v=…">`.
- `style.css` : tout le CSS (ancien `<style>`).
- `app.js` : tout le JavaScript classique (anciens `<script>`), dans l'ordre d'origine. La constante `DERNIERE_MAJ` n'y figure plus : elle est dans `index.html`.
**Règles** :
- Style → `style.css` ; logique → `app.js` ; structure → `index.html`. Pour une modification, lire les 3 fichiers si nécessaire.
- **Ne jamais modifier à la main** `DERNIERE_MAJ`, ni les `?v=…` de `index.html`, ni `CACHE_NAME` (`sw.js`) : le workflow `auto-version.yml` s'en charge à chaque push touchant `index.html`, `style.css` ou `app.js`. Les `?v=…` (chiffres de `DERNIERE_MAJ`) rendent l'URL de chaque déploiement unique : aucun cache (HTTP, mémoire, service worker) ne peut resservir l'ancien code.
- `sw.js` précache `index.html`, `style.css` et `app.js`, et les sert en **réseau d'abord** (repli sur le cache hors ligne ou après 4 s). Le cache est indexé sans la partie `?v=…`, donc une seule copie par fichier. Les requêtes réseau du service worker utilisent `cache:'no-cache'` (revalidation systématique).

**Vérifié avant mise en ligne** (Chromium headless, ancienne et nouvelle version côte à côte) : DOM identique hors `<script>`/`<style>` (5 éléments à `id`), styles calculés identiques sur tous ces éléments, mêmes variables globales, mêmes messages console ; ouverture hors ligne (page rendue, CSS et JS servis par le cache) ; déploiement simulé visible après un simple rechargement malgré `Cache-Control: max-age=600` (comme GitHub Pages) ; rechargement automatique au retour au premier plan, sauf saisie en cours ou fenêtre ouverte. **Non vérifié sur iPhone.**

## Structure des fichiers (20/09/2026)

Chaque app (racine pour le Portail, `Budget/`, `Course/`, `Muscu/`) comprend : `index.html` (structure), `style.css` (styles), `app.js` (code), `sw.js`, `manifest.json`, `README.md`. Détail et règles dans la section « Découpage en `index.html` / `style.css` / `app.js` » du README de chaque app, et dans `PROBLEMES_RESOLUS.md`.


## Correctif — bandeau « Nouvelle version disponible » affiché à tort (20/09/2026)

**Symptôme** : le bandeau « 🔄 Nouvelle version disponible » s'affichait à l'ouverture après un déploiement, alors que la page était déjà la dernière version.
**Cause** : il était déclenché par la seule installation d'un nouveau service worker (`updatefound` / `reg.waiting`). Or depuis le passage de `index.html` en réseau d'abord, la page est déjà à jour quand le service worker se met à jour : le bandeau était un faux positif, et il court-circuitait en plus le rechargement automatique.
**Correction** (`app.js`) :
- La mise à jour du service worker appelle désormais la vérification de version (`window.__verifierVersion(true)`) au lieu d'afficher le bandeau : elle compare `DERNIERE_MAJ` avec celle du serveur. Page vraiment périmée → **rechargement automatique** ; le bandeau n'apparaît que si une saisie ou une fenêtre est ouverte.
- Le contrôle est aussi fait **~3 s après chaque lancement** (au cas où un réseau lent aurait fait servir une copie ancienne de la page).
- **Garde-fou anti-boucle** : au plus 2 rechargements automatiques par session (`sessionStorage`, clé `majRechargements`) ; ensuite le bandeau s'affiche au lieu de recharger.
**Vérifié** (Chromium headless) : page à jour + simple changement de `sw.js` → aucun bandeau ; vraie nouvelle version → rechargement automatique (bandeau si saisie ou fenêtre ouverte) ; garde-fou ; suite hors ligne / déploiements simulés inchangée. **Non vérifié sur iPhone.**


## Tableau de bord — résumés publiés par les apps (22/09/2026)

**But** : voir d'un coup d'œil, depuis le Portail, la prochaine séance et la semaine de Muscu, le reste à vivre de Budget et la liste de Courses. Décision de Corentin : **variante B1, avec les montants en euros** (voir « Sécurité »).

### Architecture — la base de Courses sert de « boîte aux lettres »

```
Muscu ──┐                                   ┌── Portail (lit portail/*)
Budget ─┼── écrivent portail/<app> ──►  base Firestore de COURSES  ◄──┘
Courses ┘   (connexion ANONYME)            (projet course-app-36e9d)
```

- Les 3 apps sont sur **3 projets Firebase distincts** (Muscu et Budget : e-mail + mot de passe ; Courses : anonyme). Un Portail qui lirait les 3 bases demanderait 2 mots de passe et devrait **recalculer** le reste à vivre et la semaine de Muscu (risque de divergence avec les apps).
- **Courses est le seul projet à l'authentification anonyme** : n'importe quelle app peut donc s'y connecter en silence. Chaque app calcule son propre résumé (elle connaît ses données et sa logique) et l'écrit dans `portail/<app>` ; le Portail ne fait que lire et afficher.
- Aucune règle Firestore modifiée : `allow read, write: if request.auth != null` de Courses couvre déjà la nouvelle collection `portail` (testé le 22/09/2026 : écriture/lecture anonymes OK, lecture sans connexion refusée).
- Écartées : **A** (résumés dans `localStorage` de la même origine : pas en direct, un téléphone ne voit pas ce que fait l'autre) et **B2** (le Portail lit les 3 bases : 2 connexions e-mail/mot de passe + calculs dupliqués).

### Les 3 documents

| Document | Champs | Écrit par |
|---|---|---|
| `portail/muscu` | `maj`, `prochaine` `{corentin, lisa}` = `{label, title, nbExos, cardio}`, `phrase` (texte) | Muscu |
| `portail/budget` | `maj`, `mois`, `reste`, `budget`, `depense`, `joursRestants` (tous `null` si le mois en cours n'existe pas) | Budget |
| `portail/courses` | `maj`, `aAcheter`, `restants`, `rayons` = 3 × `{nom, n}` | Courses |

`maj` = `Date.now()` de l'appareil qui a publié. Le Portail l'affiche (« Mis à jour il y a 3 h ») : **un résumé n'est mis à jour que quand l'app correspondante est ouverte** sur l'un des deux téléphones, il n'est donc pas instantané. Depuis le 23/09/2026, `maj` est republié à **chaque** ouverture confirmée par le serveur, même si le contenu du résumé n'a pas changé (avant cette date, une ouverture sans modification ne republiait rien et laissait un horodatage périmé — voir « Republication systématique » plus bas).

### Comment chaque app publie (mêmes garde-fous partout)

- **Après un snapshot venu du SERVEUR, jamais avec le seul cache local** (sinon un téléphone hors ligne au vieux cache écraserait un résumé récent — c'est l'incident Courses du 21/09 en version « résumé »).
- Regroupé **0,3 s** (depuis le 23/09/2026 v2 ; avant : 2,5 s, 3 s pour Muscu), republié à chaque ouverture, avec **secours `keepalive`** au départ de la page — voir « Publication fiable (v2) » plus bas.
- Toute erreur est absorbée (`console.warn`) : la publication ne doit **jamais** gêner l'app.
- Muscu et Budget ouvrent une **2e application Firebase nommée `'portail'`** pointant sur la base de Courses (connexion anonyme, session persistante) : leur propre base et leur session e-mail/mot de passe ne sont pas touchées. Depuis le 23/09/2026, cette connexion est ouverte **dès le démarrage** de l'app (avant : à la première publication, ce qui retardait l'envoi de 1 à 2 s).
- Détails par app : sections « Résumé pour le Portail » des README de `Muscu/`, `Budget/` et `Course/`.

### Côté Portail (`app.js`, bloc « TABLEAU DE BORD »)

- **Affichage instantané** depuis `localStorage['portail-resume']` (dernier état connu), puis mise à jour en direct via `onSnapshot` sur la collection `portail` (3 documents = 3 lectures à l'ouverture, ensuite seulement les changements). Fonctionne hors ligne.
- **Le SDK Firebase (compat 10.12.2) est chargé APRÈS le premier affichage**, par injection de `<script>` : il ne bloque jamais l'ouverture (leçon du 18/09 : un `<script>` de CDN bloquant plante l'ouverture hors ligne). Application nommée `'portail'`, `enablePersistence`, connexion anonyme.
- `sw.js` met les 3 fichiers du SDK en cache (`FIREBASE_FILES`, **même version que `SDK` dans app.js — à mettre à jour ensemble**). ⚠️ `fetch` + `cache.put`, pas `cache.add` : `add()` rejette une réponse opaque (`no-cors`).
- **Profil** : « Prochaine séance · Corentin/Lisa » suit `localStorage['duo_profile']` de Muscu (même origine) ; `corentin` par défaut.
- **Jours restants** recalculés dans le Portail à partir de la date du jour (le document date de la dernière ouverture de Budget) ; « environ X € par jour » seulement à partir de 1 €/j. Reste négatif : montant et jauge en rouge (`--danger`), « Budget dépassé · … ». **Montants au centime près** (`eur2`, deux décimales) — corrigé le 22/09/2026, l'ancien `eur0` arrondissait à l'euro (retour de Corentin : sa somme au centime ne correspondait pas à l'app).
- Sans données (première fois) : « — » et, dans l'en-tête de la carte, « Ouvre l'app une fois pour remplir cette carte ».
- Pas de raccourcis d'action dans les cartes (« + Dépense », « Démarrer »…) : les apps n'ont pas de lien profond. **Piste non faite** : `./Budget/?action=depense`, `./Course/?action=ajouter`, `./Muscu/?seance=s2`.

### Définitions calculées par Muscu (constantes dans `Muscu/app.js`)

- **Prochaine séance** = celle qui suit, dans l'ordre du programme, la dernière séance **fixe** archivée du profil (une séance personnalisée ne décale rien), avec les surcharges de séances fixes.
- **Phrase motivante du duo** (remplace, le 22/09/2026, le compte « X/4 séances cette semaine » — retour de Corentin : pas représentatif d'un rythme qui n'est pas toujours 4 fois par semaine). **Une seule phrase pour le duo**, ton **motivant et bienveillant** (jamais culpabilisant), choisie par `calculerPhraseMuscu` selon la première situation qui s'applique :
  1. **Séance en duo récente** — dernières séances de Corentin et Lisa le même jour calendaire, il y a moins de 2 jours.
  2. **Silence prolongé** — 5 jours ou plus depuis la plus récente des deux dernières séances.
  3. **Série en cours** — `serie >= 2` (voir ci-dessous).
  4. **Bonne semaine en cours** — 3 séances ou plus à eux deux cette semaine.
  5. **Neutre** — repli si rien de ce qui précède ne s'applique.

  Chaque situation a 2 variantes dans `PORTAIL_PHRASES`, choisies par **le jour du mois** (`new Date(now).getDate() % variantes.length`) : stable toute la journée, change le lendemain — volontairement pas aléatoire à chaque calcul, sinon la signature JSON de `resume` changerait sans arrêt et republierait à chaque ouverture pour rien (voir la garde `signature === portailMuscuDernier`). *Proposée par l'assistant à la demande d'idées de Corentin : les textes exacts sont à ajuster librement dans `PORTAIL_PHRASES`.*
- **Série** = semaines d'affilée où **Corentin ET Lisa** ont fait au moins `PORTAIL_SERIE_MIN = 3` séances ; la semaine en cours compte si c'est déjà atteint, sans casser la série sinon. N'est plus publiée telle quelle dans `portail/muscu` (elle influence seulement le choix de la phrase, ci-dessus).
- **Semaine** = du lundi 00:00 au dimanche, heure de l'appareil ; une archive = une séance. Sert au calcul de la série et de la phrase, mais **n'est plus publiée** dans `portail/muscu` (`objectif` et `semaine` retirés le 22/09/2026 avec le compte hebdomadaire).

### ⚠️ Sécurité — à lire avant de toucher à quoi que ce soit

- **Le dépôt est public et la base de Courses accepte n'importe quelle connexion anonyme** : quiconque lit la configuration Firebase dans le code peut **lire et écrire** toute cette base — les produits, mais aussi les 3 documents `portail/*` (donc le reste à vivre en euros, choix assumé de Corentin le 22/09/2026).
- Conséquence côté code : **les documents `portail/*` ne sont pas de confiance.** Le Portail les valide (types, bornes, longueurs) et les écrit **exclusivement avec `textContent`** — **jamais `innerHTML`** : le Portail partage son origine avec Muscu, Budget et Courses, donc avec leur `localStorage` (dont la clé API du coach IA). Vérifié le 22/09/2026 : des documents piégés (`<img onerror=…>`, `<script>`, types faux, valeurs énormes) s'affichent comme du texte inerte.
- **Durcissements possibles** (non faits) : règle Firestore limitant `portail/{doc}` à un schéma et une taille fixes ; App Check ; ou publier des pourcentages plutôt que des montants.

### Vérifié / non vérifié

- **Vérifié le 22/09/2026** : calculs des 3 résumés sur les vraies données (lecture Admin) ; formule de Budget identique à `calculerTotauxMensuels` ; Courses publie bien (vraie base, connexion anonyme réelle) ; ponts de Muscu et de Budget (SDK réels, écriture puis suppression d'un document de test) ; Portail (vraie base) en sombre et clair, zones de sécurité iPhone simulées (59 px / 34 px), pas de défilement horizontal ; documents piégés ; SDK indisponible ; ouverture hors ligne avec service worker.
- **Non vérifié sur iPhone.** Et **non vérifié en conditions réelles** : Muscu et Budget ne peuvent pas être lancés sans leur mot de passe — leurs blocs de publication ont été testés isolément, pas dans l'app complète.
- **Amorçage** : les 3 documents ont été créés une première fois le 22/09/2026 avec l'accès Admin, à partir des vrais calculs, pour que le Portail ne soit pas vide ; les apps les réécrivent dès leur prochaine ouverture.

### Lisibilité des cartes — retouche du 22/09/2026 (après essai sur iPhone)

**Retour de Corentin** : « titres, sous-titres, informations : difficile à comprendre ». Diagnostic sur sa capture : tout avait le même poids (petites majuscules grises espacées partout), le montant était coupé en deux (« 0 ,83 € »), la jauge pleine n'était pas expliquée, « 1/4 » et « · 1 » ne voulaient rien dire sans contexte, et la description de chaque app (« Séances, progressions… ») prenait de la place sans rien apprendre.

**Règle de lecture d'une carte, à respecter pour toute nouvelle info** : 1) **en-tête** = nom de l'app + « Mis à jour il y a … » (en jaune au-delà de 24 h : chiffres à prendre avec prudence) ; 2) **l'information clé en gros** (montant, nombre, séance) ; 3) **une phrase d'explication en gris**. Libellés en phrase normale (13 px, gris), jamais en petites majuscules espacées.

- **Muscu** : « Prochaine séance de Corentin » → « Séance 4 · Haut du Corps & Abdos » → « 4 exercices » ; « Séances faites cette semaine » avec des jauges et **« 1 sur 4 »** ; encadré **« 3 semaines d'affilée — Corentin et Lisa : 3 séances ou plus chacun »** (le seuil vient du champ optionnel `serieMin` du document, 3 par défaut = `PORTAIL_SERIE_MIN` de Muscu ; *Muscu ne publie pas encore ce champ*).
- **Budget** : « Reste à vivre en septembre » → **« 0,83 € »** d'un seul tenant → « 8 jours restants (· environ X € par jour) » → jauge → « 2 148 € dépensés sur 2 149 € (100 %) » : la jauge est la part du budget déjà dépensée.
- **Courses** : « Sur la liste » → **« 5 produits »** → « Rayons concernés » avec le nombre de produits dans une pastille verte.
- Les pieds de carte « Mis à jour… » et les descriptions d'app sont supprimés (remplacés par la fraîcheur dans l'en-tête).
- **Non traité — flou du haut d'écran** : sur la capture iPhone, la ligne « Portail Duo · Corentin & Lisa » et le bouton de thème sont flous. C'est très probablement l'« edge treatment » d'iOS 26 décrit dans la saga du flou de Courses (`PROBLEMES_RESOLUS.md`), pas un défaut de la page. À confirmer (flou aussi sur Muscu et Budget ? présent quand la page est tout en haut ?) avant de déplacer quoi que ce soit.
- **Vérifié** : rendu sombre et clair, états limites (chiffres de plus de 24 h, budget dépassé, carte vide) ; **non vérifié sur iPhone**.


## Icône de l'app (22/09/2026)

**Un cercle unique, scindé en deux par une courbe souple** : bleu à gauche (Corentin), rose à droite (Lisa) — les mêmes couleurs que les points de la carte Muscu du tableau de bord. Fond dégradé sombre, cohérent avec `background_color`/`theme_color` du manifest.

**Historique** : deux pistes explorées avant celle-ci, toutes deux écartées par Corentin (« pas ouf », puis « pas si détaillé », « pas dingue ») —
1. Une arche/porte dorée avec lueur duo à l'intérieur (simple, puis une version plus travaillée avec claveaux et clef de voûte, puis une version à l'éclairage simulé façon pierre sculptée) : jugée trop chargée ou pas assez « réaliste » selon la version, et finalement pas assez personnelle.
2. Deux cercles superposés (façon Mastercard) et deux points accolés (façon Flickr) : écartés à l'interne, trop proches de logos existants.

**Retenue** : Corentin voulait « une vraie identité, un truc hyper personnel » — un symbole simple du duo plutôt qu'une métaphore (porte, portail). Le cercle scindé reprend l'idée d'« un duo qui n'en fait qu'un », sans ressembler à un logo existant, et reste lisible à la plus petite taille utilisée (60 px).

**Fichiers** : `icone-192.png`, `icone-512.png` (fond plein, sans transparence), `icone-512-maskable.png` (contenu réduit à 72 % et centré, marge de sécurité standard pour les plateformes qui appliquent leur propre découpe). Le SVG source (courbe, couleurs, dégradé de fond) n'est pas versionné : pour retoucher l'icône, repartir de ces mêmes couleurs (`--blue` #1f8fff, rose Lisa #ff3d7e) et de la même idée (une forme, pas deux qui se cognent).

**Non vérifié sur iPhone** (rendu contrôlé en navigateur : taille réelle sur fond d'écran d'accueil simulé, et 60 px).


## Page noire hors-ligne (22/09/2026)

**Symptôme** (retour de Corentin) : hors-ligne, le Portail reste sur une page noire au lieu de s'ouvrir.

**Cause probable** : `cache.addAll()`, utilisé à l'installation du service worker pour mettre en cache tout le « shell » (`index.html`, `style.css`, `app.js`, `manifest.json`, les 3 icônes), est **tout ou rien** — si UN SEUL fichier échoue (404 passager pendant qu'un déploiement se propage sur GitHub Pages, requête qui traîne…), l'installation entière échoue, et **aucun** fichier n'est mis en cache, pas même `index.html`/`app.js`/`style.css`. Le Portail a été poussé plusieurs fois coup sur coup le 22/09/2026 (tableau de bord, icône) : une installation a pu tomber pile dans une de ces fenêtres. Reproduit et confirmé : un simple 404 sur une icône, pendant l'installation, empêchait bien tout le reste d'être mis en cache (test automatisé, voir plus bas).

À cela s'ajoutait un second problème, plus rare mais plus grave : si jamais le cache n'a **rien** à proposer au moment où `reseauPuisCache()` (réseau d'abord, repli sur le cache après 4 s — voir l'entrée du 20/09/2026 ci-dessous) atteint son délai, l'ancien code **attendait alors l'échec du vrai `fetch()` réseau** avant de se rabattre sur le cache. Hors-ligne dans un navigateur de bureau, ce `fetch()` échoue en une fraction de seconde ; mais sur iPhone en zone de mauvais réseau (pas d'« offline » franc, juste aucune réponse), une requête peut mettre bien plus de 4 secondes à échouer côté OS — le Portail restait alors bloqué sur une page noire, potentiellement très longtemps.

**Corrections** (`sw.js`) :
1. **Installation résiliente** : les fichiers sont désormais mis en cache un par un (`SHELL_CRITIQUES` puis `SHELL_ANNEXES`), chacun avec son propre `try/catch`. Un 404 sur une icône ne peut plus empêcher `index.html`/`style.css`/`app.js` d'être mis en cache.
2. **Plus jamais d'attente indéfinie** : `reseauPuisCache()` résout désormais **toujours** au bout de `DELAI_RESEAU_MS` (4 s) — avec le cache s'il a quelque chose, sinon avec une **page de secours** minimale, autonome (aucune dépendance externe, pas même `style.css`), qui explique la situation et propose un bouton « Réessayer ».

**Vérifié** (Playwright + Node, sans navigateur pour le point 2) :
- Installation avec une icône en échec (404 simulé) → les 3 fichiers critiques finissent quand même en cache → hors-ligne fonctionne.
- `reseauPuisCache()` testée en isolation dans Node avec un `fetch` qui ne se termine **jamais** (le pire cas réel) : cache vide → page de secours après 4,0 s (avant le correctif : blocage indéfini) ; cache disponible → contenu du cache après 4,0 s (inchangé).
- Site réellement publié, avant et après le correctif : visite en ligne puis coupure réseau → contenu correct.

**Non vérifié sur iPhone.** Si le problème revient malgré ce correctif : dans Réglages du Portail (ou en le supprimant de l'écran d'accueil puis le rouvrant depuis Safari), rouvrir une fois **en ligne** pour forcer une nouvelle installation propre — voir aussi le bouton de rechargement forcé (roue en bas de l'écran), qui exige lui aussi d'être en ligne pour redevenir utile hors-ligne ensuite.


## Tableau de bord périmé au retour au premier plan (22/09/2026)

**Retour de Corentin** : sur le téléphone de Lisa, le tableau de bord affichait des chiffres périmés alors qu'elle avait internet — il a fallu forcer une actualisation manuelle.

**Cause** : le tableau de bord (section « Tableau de bord » ci-dessus) se met à jour en direct via `db.collection('portail').onSnapshot(...)`, jamais par un minuteur. Sur iPhone, une PWA mise en arrière-plan est **suspendue par iOS** (JS arrêté) ; l'écoute en direct peut rester silencieuse un moment au retour au premier plan, sans se reconnecter tout de suite, même avec une connexion internet qui fonctionne. Le seul mécanisme déjà présent au retour au premier plan (`visibilitychange`, plus bas dans `app.js`) ne fait que réafficher les chiffres déjà en mémoire (pour rafraîchir les « il y a X min ») et vérifier la **version du code** de l'app — jamais relire les documents Firestore.

**Correctif** (`app.js`, bloc « TABLEAU DE BORD ») :
- `db` (jusque-là une constante locale à `demarrerBase()`) est hissée en variable du module (`let db = null`), pour être réutilisable ailleurs.
- Nouvelle fonction `rafraichirDepuisServeur()` : relit les 3 documents `portail/*` avec `db.collection('portail').get({ source: 'server' })` — **force une lecture serveur**, jamais le cache local (même garde-fou que la publication côté Muscu/Budget/Course : ne jamais laisser une vieille copie en cache écraser un état plus récent) — puis met à jour `resume`, `localStorage['portail-resume']` et l'affichage.
- Le gestionnaire `visibilitychange` existant appelle désormais `afficher()` **et** `rafraichirDepuisServeur()` à chaque retour au premier plan, en plus de l'écoute `onSnapshot` déjà en place (qui continue de fonctionner normalement le reste du temps).
- Si `db` n'est pas encore prêt (chargement du SDK pas terminé, ou base indisponible), la fonction ne fait rien : le prochain `onSnapshot` ou le prochain retour au premier plan prendra le relais. Toute erreur est absorbée (`console.warn`), comme le reste du bloc.

**Non vérifié sur iPhone** (relu via l'API GitHub, pas testé en conditions réelles d'arrière-plan/premier plan sur l'appareil).


## Republication systématique du résumé, même sans changement (23/09/2026)

**Retour de Corentin** : en rentrant dans Courses puis en revenant au Portail, la carte affichait toujours « Mis à jour il y a 1 h », alors que l'app venait d'être ouverte. Il se demandait si c'était normal ou s'il manquait une modification côté Courses.

**Cause** : dans chaque app, `planifierPublicationPortailXxx()` calcule une `signature` (JSON du résumé) et comparait à `portailDernier` : `if(signature === portailDernier) return;` — si le contenu du résumé (prochaine séance, reste à vivre, liste de courses…) était strictement identique à la dernière publication, la fonction s'arrêtait **avant** `db.collection('portail').doc(...).set(...)`, donc `maj` n'était jamais réécrit. Ouvrir une app sans rien changer dedans ne republiait donc rien : comportement voulu à l'origine (« au plus 1 écriture par ouverture d'app », pensé pour éviter des écritures inutiles), mais son effet de bord induisait Corentin en erreur — le champ `maj` était censé représenter « dernière fois que l'app a été ouverte et vérifiée », alors qu'il représentait en réalité « dernière fois que le contenu a réellement changé ».

**Décision de Corentin** : privilégier la lisibilité à l'économie d'écritures — `maj` doit toujours refléter la dernière ouverture vérifiée, même sans changement, « pour éviter de se demander si ça a MAJ ou pas ».

**Correctif** (`Course/app.js`, `Muscu/app.js`, `Budget/app.js`, même bloc dans les 3) : la ligne `if(signature === portailDernier) return;` (et son équivalent Muscu/Budget) est retirée. `portailDernier` reste calculée et assignée (utile si on veut réintroduire une comparaison plus tard) mais ne bloque plus l'écriture. Les autres garde-fous restent inchangés : publication seulement après un snapshot **serveur** (jamais depuis le cache local), regroupement (2,5 s ; 3 s pour Muscu) pour éviter les écritures en rafale, erreurs absorbées.

**Conséquence attendue** : une écriture Firestore de plus à **chaque** ouverture réelle de Course/Muscu/Budget (au lieu de seulement quand le contenu change) — volume négligeable au regard du quota gratuit Firestore pour un usage à 2 personnes.

**Non vérifié sur iPhone** (modifié via l'API GitHub ; à confirmer : ouvrir Course sans rien changer → revenir au Portail → l'horodatage doit afficher « à l'instant »).

### Suite — flush immédiat au départ de la page (23/09/2026, même jour)

**Retour de Corentin, après test réel** : Budget affichait bien « à l'instant » après une simple ouverture, mais **Course et Muscu non**.

**Cause** : la publication est **regroupée** (`setTimeout` de 2,5 s pour Course/Budget, 3 s pour Muscu) pour éviter des écritures en rafale. Or Course et Muscu sont de **vraies pages HTML séparées** (pas une SPA) : revenir au Portail depuis l'une d'elles est une vraie navigation, qui détruit entièrement le contexte JavaScript de la page quittée — y compris tout `setTimeout` encore en attente. Si Corentin ressortait de l'app avant l'écoulement du délai (ce qui arrive facilement pour un simple coup d'œil sur Course, moins pour Budget dont l'écran de résumé prend un peu plus de temps à consulter), l'écriture prévue n'avait jamais lieu.

**Correctif** (même bloc dans les 3 apps) : la publication elle-même est extraite dans une fonction dédiée (`publierResumePortail[Muscu]`), appelée soit par le `setTimeout` du regroupement, soit **immédiatement** par une fonction de flush déclenchée sur `pagehide` et sur `visibilitychange` (quand `document.visibilityState === 'hidden'`) — les deux écouteurs coexistent avec ceux déjà en place dans chaque app pour d'autres besoins (vérification de version, statut de synchronisation), sans conflit. Le flush n'agit que s'il y a réellement un envoi en attente (sinon rien à faire). Le `set()` Firestore passe par le cache local persistant de chaque app avant le réseau : la mutation est mise en file d'attente durablement dès l'appel, donc l'écriture survit même si la page meurt juste après (elle se synchronisera au prochain accès réseau, exactement comme n'importe quelle autre écriture hors ligne de ces apps).

**Non vérifié sur iPhone** (modifié via l'API GitHub ; à confirmer : ouvrir Course ou Muscu, ressortir en moins d'1 s sans rien changer → revenir au Portail → l'horodatage doit quand même afficher « à l'instant »).

### Suite — le Portail ne se rafraîchissait pas au retour depuis une app (23/09/2026, même soirée)

**Retour de Corentin** : pour voir le nouvel horodatage d'une app, il devait recharger le Portail avec le bouton du bas.

**Cause** : les apps n'ont pas de lien vers le Portail ; on y revient par le **geste « retour » d'iOS** (historique). Safari ressort alors la page du Portail de son cache « précédent/suivant » (**bfcache**) : pas de rechargement, `visibilitychange` souvent **pas déclenché**, et l'écoute `onSnapshot` dont la connexion a été coupée pendant la pause ne se réveille pas forcément. Seul `pageshow` avec `event.persisted === true` signale ce retour de façon fiable. Deuxième effet : l'app quittée publie son résumé **au moment où on la quitte** (flush `pagehide`, ci-dessus), l'écriture atteint le serveur 1 à 2 s **après** l'arrivée sur le Portail — une relecture immédiate arrive trop tôt.

**Correctif** (`app.js`, bloc « TABLEAU DE BORD ») :
- L'écoute en direct est extraite dans `ecouter()`, qui **coupe l'ancienne écoute** (`desabonner`) avant d'en ouvrir une nouvelle (jamais deux en parallèle).
- Nouvelle fonction `auRetour()` : réaffichage, **réabonnement** `ecouter()`, relecture serveur immédiate, puis **2 relectures différées à 3 s et 8 s** (minuteurs précédents annulés si retours rapprochés).
- Déclenchée par `pageshow` (si `persisted`) **et** par `visibilitychange` (visible) — l'un ou l'autre selon le cas iOS.
- Coût : environ 3 lectures de 3 documents par retour au Portail, négligeable.

**Non vérifié sur iPhone** (à confirmer : ouvrir Course, ressortir tout de suite par le geste retour → le Portail doit passer à « à l'instant » en quelques secondes, sans bouton de rechargement).


## Tirer pour actualiser — ajouté puis RETIRÉ (23/09/2026)

Un geste « tirer vers le bas pour actualiser » a été ajouté puis retiré le même soir, à la demande de Corentin : il ne réglait rien, car le problème n'était pas la LECTURE du Portail mais l'ÉCRITURE des apps (le résumé n'arrivait pas sur le serveur). Voir la section suivante.


## Publication fiable du résumé — v2 (23/09/2026)

**Constat** : malgré la republication systématique et le flush au `pagehide`, le Portail restait souvent périmé après un aller-retour rapide dans une app. Cause : l'écriture lancée au départ de la page n'arrivait pas au serveur.
- Muscu et Budget : la 2e application Firebase `'portail'` garde sa file d'écriture **en mémoire** → perdue quand la page est détruite.
- Courses : file gardée sur le téléphone (cache persistant) mais envoyée seulement à la **prochaine ouverture de Courses**.

**Correctif, identique dans les 3 apps** (bloc « Résumé pour le Portail » de chaque `app.js`, + `Muscu/index.html` pour `window.__portail`) :
1. **Publier tôt** : regroupement ramené à **0,3 s** ; Muscu et Budget ouvrent la connexion anonyme à la boîte aux lettres **dès le démarrage**. Le résumé part dès que les données du serveur sont là, donc en général avant que l'on ressorte.
2. **Savoir si c'est arrivé** : `portailOk` (`portailMuscuOk` dans Muscu) passe à `true` quand la promesse de `set()` se résout, c'est-à-dire à l'accusé de réception du **serveur**. Remis à `false` à chaque nouvelle publication planifiée.
3. **Secours au départ** (`pagehide` + `visibilitychange` caché) : si la dernière écriture n'est pas confirmée, envoi par l'**API REST de Firestore** (`PATCH …/documents/portail/<app>`) avec `fetch(..., { keepalive: true })`, la seule requête qu'un navigateur laisse finir **après** la destruction de la page. Jeton = ID token de la connexion anonyme, obtenu **à l'avance** (au départ, on ne peut plus attendre de promesse) et rafraîchi à chaque publication planifiée (validité 1 h). Conversion des valeurs JS au format REST par `versValeurFirestore()`.

**Garde-fou conservé** : rien n'est publié tant que l'app n'a pas reçu ses données **du serveur**. Si l'on ressort avant (moins de ~2 s à froid), le Portail n'est volontairement pas mis à jour : l'app n'a rien vérifié, afficher « à l'instant » serait faux.

**Vérifié** :
- Courses, vraie base, moteur **WebKit 26** (celui de Safari iOS) : séjour 0,8 s et 1,5 s → pas de données serveur → pas de publication (voulu) ; séjour 2,5 s → données reçues, écriture pas encore confirmée, page détruite → **arrivée par le secours** ; 4 s → confirmée normalement.
- Courses, écriture du SDK bloquée artificiellement + page détruite → arrivée par le secours (WebKit).
- Muscu et Budget : leurs vrais blocs de code, branchés sur des documents de test (`portail/_test_*`, supprimés ensuite), page détruite → arrivée par le secours (WebKit).
- **Attention** : dans Chromium (Chrome), le secours est **annulé** (requête `keepalive` avec pré-vérification CORS). Sans importance ici (apps utilisées uniquement sur iPhone), mais à savoir si un jour elles tournent sur Android/Chrome.
- **Non vérifié sur iPhone réel.**

### Suite — Courses ne publiait pas avec un cache rempli (24/09/2026)

Muscu et Budget fonctionnaient après la v2, pas Courses : son écoute Firestore n'avait pas `includeMetadataChanges`, donc la confirmation « cache déjà à jour » du serveur ne lui parvenait jamais, et le garde-fou « jamais depuis le cache » bloquait la publication. Corrigé dans `Course/app.js` (`dbOnCollection`). Détails : `Course/README.md` et `PROBLEMES_RESOLUS.md`. Leçon pour les tests : **toujours tester aussi avec un cache déjà rempli** (profil de navigateur persistant), pas seulement depuis un navigateur neuf.
