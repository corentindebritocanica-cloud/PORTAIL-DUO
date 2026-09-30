# Portail Duo

Portail de lancement (launcher) HTML unique pour les 3 apps de Corentin & Lisa :
**Musculation** (Duo Training), **Budget** (Budget L&C), **Courses** (App Courses).

- **Live** : https://corentindebritocanica-cloud.github.io/PORTAIL-DUO/
- **Repo** : `corentindebritocanica-cloud/PORTAIL-DUO`
- **Raw index.html** : https://raw.githubusercontent.com/corentindebritocanica-cloud/PORTAIL-DUO/refs/heads/main/index.html

**Depuis le 28/09/2026, design « Verre » définitif** (pile de vitres, feuille commune `verre.css`) — voir « Design Verre » en fin de fichier.

> **📌 État actuel (vérifié le 28/09/2026)** — à lire en premier ; les sections plus bas sont chronologiques et peuvent décrire un état dépassé (barré ou signalé « → »).
> - **4 apps, un seul design** : feuille commune `verre.css` (racine) + classe `html.verre` en dur ; **sombre uniquement** (plus de bouton lune) ; titre à gauche en Unbounded 22 px avec la **pastille de connexion** à côté ; haut de page commun (`--v-haut`).
> - **Noyau commun `commun.js`** (racine) : halos calés sur l'horloge, transition « vitre → app », date de MAJ, service worker, vérification de version — plus aucune copie dans les `app.js`.
> - **Profil Corentin/Lisa unique** : `localStorage duo_profile`, réglable dans les Réglages de Muscu, Course ou Budget.
> - **Style au choix (30/09/2026)** : **Verre** (défaut) · **Relief** (neumorphisme) · **Argile** (claymorphisme), choisi sous la pile du Portail, appliqué aux 4 apps (`localStorage duo-style` → `<html data-style>`, posé par `commun.js`). Bleu Corentin / rose Lisa dans les 3 styles. Voir « Styles au choix » en fin de fichier.
> - **Portail** : pile de 3 vitres (toucher une vitre du fond → devant ; toucher celle de devant → ouvre l'app avec la transition ; glisser haut/bas → fait tourner la pile), aperçu du jour de chaque app (résumés `portail/*` dans Firebase), bouton ↻ de rechargement forcé. Retour depuis une app : geste retour d'iOS.
> - **Fichiers du Portail** : `index.html`, `style.css` (base), `app.js`, `sw.js`, `manifest.json`, icônes ; partagés : `verre.css`, `commun.js` ; versionnage auto : `.github/workflows/auto-version.yml`.

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

## 2. Structure du repo (mise à jour le 28/09/2026)

```
PORTAIL-DUO/
├── index.html / style.css / app.js / sw.js  ← Portail Duo (ce document)
├── manifest.json           ← PWA, scope "./"
├── icone-192.png, icone-512.png, icone-512-maskable.png
├── verre.css               ← design « Verre » commun aux 4 apps
├── commun.js               ← noyau JS commun aux 4 apps
├── UX_UI_CHARTER.md, GUIDE_PWA_IOS.md, PROBLEMES_RESOLUS.md, FUTURE_APPS_ROADMAP.md
├── .github/workflows/auto-version.yml  ← DERNIERE_MAJ, ?v=, CACHE_NAME automatiques
├── Muscu/   ← Duo Training : index.html, style.css, app.js, sw.js, README.md, apple-touch-icon.png, backups/
├── Budget/  ← Budget L&C : index.html, style.css, app.js, sw.js, manifest.json, icone.PNG, README.md
└── Course/  ← Courses L&C : index.html, style.css, app.js, sw.js, manifest.json, README.md
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
- ~~**Bascule clair/sombre ajoutée (18/09/2026)**~~ → **retirée le 28/09/2026** (sombre uniquement). ~~ bouton `theme-toggle` (cercle
  🌙/☀️ en haut à droite, `env(safe-area-inset-top)` pris en compte), classe
  `html.light-mode` avec les mêmes valeurs que Muscu/Course, préférence mémorisée
  dans `localStorage` (`portail-theme`).~~
- → **Depuis le 28/09/2026, la palette de cette section est celle du socle `style.css` ; l'apparence réelle vient de `verre.css`** (voir « Design Verre »).

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
- **Depuis le 22/09/2026** : lecture de Firebase (connexion anonyme ; **depuis le 29/09/2026 au soir : compte e-mail du duo**, écran de connexion si besoin) pour le tableau de bord, et dernier état connu gardé dans `localStorage` (`portail-resume`). Voir « Tableau de bord ».

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

- *(Situation au 22/09/2026 — depuis le 29/09/2026 les 4 apps sont sur un projet unique, voir « Projet Firebase UNIQUE » en fin de fichier ; depuis le 29/09/2026 au soir, plus de connexion anonyme ni de 2e application `'portail'`, voir « Course et Portail réservés au compte du duo » en fin de fichier.)* Les 3 apps sont sur **3 projets Firebase distincts** (Muscu et Budget : e-mail + mot de passe ; Courses : anonyme). Un Portail qui lirait les 3 bases demanderait 2 mots de passe et devrait **recalculer** le reste à vivre et la semaine de Muscu (risque de divergence avec les apps).
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

- **29/09/2026 (soir)** : plus aucune connexion anonyme — `produits`, `rayons` et `portail` sont réservés au compte e-mail du duo (voir « Course et Portail réservés au compte du duo », fin de fichier). Les points ci-dessous décrivent la situation d'avant ; la validation des documents `portail/*` et l'écriture par `textContent` sont conservées (défense en profondeur).

- **29/09/2026** : cette base contient désormais aussi Budget et Muscu, **protégés par des règles réservées au compte e-mail** (voir « Projet Firebase UNIQUE ») ; ce qui suit ne vaut plus que pour `produits`, `rayons` et `portail`.
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

**✅ Vérifié sur iPhone par Corentin le 24/09/2026** (ouverture d'une app sans rien changer → retour au Portail → « Mis à jour à l'instant »).

### Suite — flush immédiat au départ de la page (23/09/2026, même jour)

**Retour de Corentin, après test réel** : Budget affichait bien « à l'instant » après une simple ouverture, mais **Course et Muscu non**.

**Cause** : la publication est **regroupée** (`setTimeout` de 2,5 s pour Course/Budget, 3 s pour Muscu) pour éviter des écritures en rafale. Or Course et Muscu sont de **vraies pages HTML séparées** (pas une SPA) : revenir au Portail depuis l'une d'elles est une vraie navigation, qui détruit entièrement le contexte JavaScript de la page quittée — y compris tout `setTimeout` encore en attente. Si Corentin ressortait de l'app avant l'écoulement du délai (ce qui arrive facilement pour un simple coup d'œil sur Course, moins pour Budget dont l'écran de résumé prend un peu plus de temps à consulter), l'écriture prévue n'avait jamais lieu.

**Correctif** (même bloc dans les 3 apps) : la publication elle-même est extraite dans une fonction dédiée (`publierResumePortail[Muscu]`), appelée soit par le `setTimeout` du regroupement, soit **immédiatement** par une fonction de flush déclenchée sur `pagehide` et sur `visibilitychange` (quand `document.visibilityState === 'hidden'`) — les deux écouteurs coexistent avec ceux déjà en place dans chaque app pour d'autres besoins (vérification de version, statut de synchronisation), sans conflit. Le flush n'agit que s'il y a réellement un envoi en attente (sinon rien à faire). Le `set()` Firestore passe par le cache local persistant de chaque app avant le réseau : la mutation est mise en file d'attente durablement dès l'appel, donc l'écriture survit même si la page meurt juste après (elle se synchronisera au prochain accès réseau, exactement comme n'importe quelle autre écriture hors ligne de ces apps).

**Remplacé** par la « Publication fiable du résumé — v2 » ci-dessous (✅ vérifiée sur iPhone par Corentin le 24/09/2026) : ce flush simple ne suffisait pas, c'est ce qui a mené à la v2.

### Suite — le Portail ne se rafraîchissait pas au retour depuis une app (23/09/2026, même soirée)

**Retour de Corentin** : pour voir le nouvel horodatage d'une app, il devait recharger le Portail avec le bouton du bas.

**Cause** : les apps n'ont pas de lien vers le Portail ; on y revient par le **geste « retour » d'iOS** (historique). Safari ressort alors la page du Portail de son cache « précédent/suivant » (**bfcache**) : pas de rechargement, `visibilitychange` souvent **pas déclenché**, et l'écoute `onSnapshot` dont la connexion a été coupée pendant la pause ne se réveille pas forcément. Seul `pageshow` avec `event.persisted === true` signale ce retour de façon fiable. Deuxième effet : l'app quittée publie son résumé **au moment où on la quitte** (flush `pagehide`, ci-dessus), l'écriture atteint le serveur 1 à 2 s **après** l'arrivée sur le Portail — une relecture immédiate arrive trop tôt.

**Correctif** (`app.js`, bloc « TABLEAU DE BORD ») :
- L'écoute en direct est extraite dans `ecouter()`, qui **coupe l'ancienne écoute** (`desabonner`) avant d'en ouvrir une nouvelle (jamais deux en parallèle).
- Nouvelle fonction `auRetour()` : réaffichage, **réabonnement** `ecouter()`, relecture serveur immédiate, puis **2 relectures différées à 3 s et 8 s** (minuteurs précédents annulés si retours rapprochés).
- Déclenchée par `pageshow` (si `persisted`) **et** par `visibilitychange` (visible) — l'un ou l'autre selon le cas iOS.
- Coût : environ 3 lectures de 3 documents par retour au Portail, négligeable.

**✅ Vérifié sur iPhone par Corentin le 24/09/2026**, dans l'ensemble final (retour par le geste d'iOS → cartes à jour, avec la relecture toutes les 3 s).


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
- **✅ Vérifié sur iPhone par Corentin le 24/09/2026** : Muscu et Budget OK dès la v2 ; Courses OK après le correctif `includeMetadataChanges` (section suivante).

### Suite — Courses ne publiait pas avec un cache rempli (24/09/2026)

Muscu et Budget fonctionnaient après la v2, pas Courses : son écoute Firestore n'avait pas `includeMetadataChanges`, donc la confirmation « cache déjà à jour » du serveur ne lui parvenait jamais, et le garde-fou « jamais depuis le cache » bloquait la publication. Corrigé dans `Course/app.js` (`dbOnCollection`). Détails : `Course/README.md` et `PROBLEMES_RESOLUS.md`. Leçon pour les tests : **toujours tester aussi avec un cache déjà rempli** (profil de navigateur persistant), pas seulement depuis un navigateur neuf.


## Relecture silencieuse toutes les 3 s (24/09/2026)

**Demande de Corentin** : que « Mis à jour à l'instant » apparaisse à coup sûr au retour d'une app. En test, les apps publiaient bien (confirmé en vidant le cache avec le bouton du bas), mais le Portail ne l'affichait pas toujours sans rechargement.

**Choix** : pas de rechargement de page toutes les 3 s (clignotement, retour en haut, retéléchargement de Firebase, appui sur une carte annulé), mais une **relecture silencieuse** des 3 documents `portail/*` toutes les 3 s, **uniquement tant que le Portail est visible** (arrêt sur `visibilitychange` caché et `pagehide`, relance sur retour au premier plan / `pageshow`).

**Point clé — lecture par REST, pas par le SDK** : `sonder()` lit via l'API REST de Firestore (`GET …/documents/portail`, jeton de la connexion anonyme via `getIdToken()`), décodée par `depuisValeurFirestore()`. Raison, vérifiée en test : le SDK fait passer ses lectures (`get({ source: 'server' })`) par le **même canal** que l'écoute en direct ; si ce canal est coincé après une mise en pause d'iOS, la relecture SDK échoue aussi. La requête REST est indépendante. Repli sur `rafraichirDepuisServeur()` (SDK) si pas encore de jeton. Réaffichage seulement si le contenu a changé. Jamais deux lectures en parallèle.

**Remplace** les relectures différées à 3 s et 8 s du 23/09. L'écoute en direct (`ecouter()`) est conservée.

**Coût** : 3 lectures toutes les 3 s d'écran allumé sur le Portail (60/min) ; quelques minutes par jour restent très loin du quota gratuit de 50 000 lectures/jour (partagé avec Courses).

**Vérifié** (WebKit 26, vraie base) : écoute en direct **coupée exprès**, horodatage de Courses vieilli de 2 h puis remis à maintenant côté serveur → la carte passe de « il y a 2 h » à « à l'instant » en 2,3 s. **✅ Vérifié sur iPhone par Corentin le 24/09/2026** : retour d'une app → « à l'instant » sans rechargement.


## Animations mises en conformité avec la charte §11 (24/09/2026)

Audit contre la section 11 « Animation & Micro-interactions » de `UX_UI_CHARTER.md` (Portail déjà proche : `prefers-reduced-motion` présent).

- **Jauge « Reste à vivre »** : `width` animée → `transform: translateX()` (0,35 s ease-out). La barre fait toujours 100 % de large et glisse depuis la gauche (`translateX(-100%)` = vide, `0` = pleine), ce qui garde son bout arrondi intact (un `scaleX` l'aurait écrasé). Pilotée dans `app.js` (bloc tableau de bord, `fill.style.transform`). Seule différence visible : sur une jauge partielle, on voit la fin du dégradé or plutôt que son début.
- **Bouton recharger** : rotation de 0,5 s conservée volontairement — c'est un indicateur d'activité, pas une transition d'interface.
- **Token** : `--t-fast` 0,14 s → 0,15 s (plancher de la charte §11.3).

**Non vérifié sur iPhone.**


## Alignement sur la charte UX/UI — sections 1 à 7 (24/09/2026)

Audit statique contre `UX_UI_CHARTER.md`, dernière des 4 apps. Le Portail était déjà très proche (tokens de Muscu, cards, thème clair). Retouches :

- **Accent dynamique** : le Portail suit maintenant le profil choisi dans Muscu (`localStorage duo_profile`, même origine — déjà lu pour « la prochaine séance ») : `app.js` pose `<html data-profil="corentin|lisa">`, `--accent` passe en rose pour Lisa. Effet visible : « PORTAIL DUO » dans le titre (bleu fixe avant) et le contour de focus des cartes. Tokens ajoutés : `--corentin*`, `--lisa*`, `--accent*`, `--glass-modal`.
- **Couleurs d'identité des apps conservées** (`--blue` Musculation, `--gold` Budget, `--green` Courses : icônes des cartes, jauge, pastilles) : écart assumé et documenté dans la charte, au même titre que les couleurs de catégories de Budget.
- **Bouton recharger** : 38 → 44 px, feedback `scale(0.97)` au tap (aussi sur le bouton thème).
- **Radius hors échelle** (jauge 5 px, pastille 11 px) → `--r-pill`. Transitions des cartes sur `--t-fast` ease-out.
- **`window.confirm()` remplacé** par `dialogue({ titre, texte, ok, annuler })` → `Promise<boolean>` (`app.js`, en tête), rendu dans `#dialogue` (bottom-sheet charte §5.9 : voile 0,6, verre, coins `--r-xl`, safe-area, entrée animée). ⚠️ Piège évité : le gestionnaire de `#hardReload` lisait `e.currentTarget` **après** la confirmation ; avec une boîte asynchrone, `currentTarget` vaut `null` après le `await` (l'animation du bouton aurait planté). Il est désormais capturé avant.
- **Style inline** de `#derniere-maj` → classe `.derniere-maj`.

**Non modifié, volontairement** : police Bebas Neue sur les noms d'apps et le chiffre de 52 px (identité « Ardoise & craie » reprise de Muscu, Bebas étant très condensée), poussière de craie en fond.

**Vérifié** : Chromium headless 390×844 — rendu Corentin (bleu) et Lisa (rose), dialogue de rechargement (Annuler → rien ne se passe), bouton à 44 px, aucune erreur JS. `node --check` sur `app.js`. **Non vérifié sur iPhone.**



## Mode « Verre » — phase d'essai (28/09/2026) — historique, voir « Design Verre — DÉFINITIF » plus bas

**Contexte** : refonte visuelle complète décidée par Corentin après 2 mockups (« Le Fil », rejeté ; « Verre », validé : « surtout l'écran principal du Portail, j'adore »). Pour juger sur iPhone avec les vraies données avant de tout basculer, la refonte est livrée comme un **habillage activable**, sans rien retirer au mode actuel.

**Principe** :
- **Une seule feuille commune `verre.css`, à la racine** du dépôt, chargée par chaque app (`verre.css?v=…` pour le Portail, `../verre.css?v=…` pour les apps). C'est elle qui fait « une seule app » : fond sombre éclairé par deux halos (couleur du profil + couleur de l'app), surfaces en verre dépoli, police Unbounded (Google Fonts) pour les grands chiffres, police système pour le reste.
- **Toutes ses règles sont préfixées par `html.verre`** : sans cette classe, le fichier n'a aucun effet. Chaque `index.html` pose `data-app="portail|course|budget|muscu"` sur `<html>` ; les règles propres à une app sont préfixées par `html.verre[data-app="…"]` (classes homonymes d'une app à l'autre).
- **Activation** : `localStorage['duo-verre'] = '1'` (même origine → **un seul réglage pour les 4 apps**). La classe est posée par un mini-script **dans le `<head>`, avant la feuille**, pour éviter un flash de l'ancien thème. Interrupteur « Essai Verre » : sous le bouton recharger du Portail, et dans Réglages › Apparence de Course. Retour au Portail depuis une app : geste retour d'iOS (un lien « ‹ Portail » essayé le 28/09 a été retiré le jour même, jugé inutile par Corentin). Effet immédiat, sans rechargement (pur CSS).
- Les jetons existants des apps (`--bg`, `--card`, `--border`, `--text`…) sont **redirigés** vers ceux du verre : tout ce qui les utilise suit sans règle dédiée.

**Portail — la pile de vitres** (bloc « MODE VERRE » de `app.js`) : les 3 cartes (mêmes éléments, mêmes `id`) sont empilées dans la même cellule de grille. `data-rang` (0 = devant) est posé par `empiler()`. Toucher une vitre du fond la ramène devant (`preventDefault`, pas d'ouverture) ; toucher celle de devant ouvre l'app (lien normal). Vitre de devant mémorisée (`portail-verre-devant`) ; le 2e halo prend la couleur de l'app de devant (`--v-app`). Chaque vitre montre un aperçu sur son arête (`#mu-peek`, `#bu-peek`, `#co-peek`, remplis dans `afficherMuscu/Budget/Courses`) visible seulement quand elle est au fond. Les vitres du fond sont coupées sous leur en-tête (`clip-path`) : sinon leurs arêtes se voyaient à travers la vitre de devant. Toutes les vitres ont la hauteur de la plus haute (étirement de grille) pour une pile régulière.

**Service worker** : `./verre.css` ajouté aux fichiers annexes du shell et au « réseau d'abord ».

**Workflow `auto-version.yml`** : `verre.css` ajouté aux chemins surveillés. S'il change, **chaque app dont l'`index.html` contient `verre.css?v=`** est traitée comme modifiée (DERNIERE_MAJ, `?v=`, `CACHE_NAME`), et son `verre.css?v=` est mis à jour avec le même numéro.

**Écarts assumés à la charte v1.3** (normal : c'est la future charte v2) : transitions de la pile en 0,4 s (navigation occasionnelle, charte §11.2) ; `clip-path` animé (en plus de `transform`/`opacity`) ; `backdrop-filter` limité aux grandes surfaces (jamais une par ligne de liste).

*(Pendant l'essai : interrupteur « Essai Verre » et clé `duo-verre`. Retirés le soir même, voir ci-dessous.)*

**Vérifié** : Chromium headless 390×844 (données de démonstration en `localStorage`, Firebase bouchonné) — Portail pile sombre et clair, vitre du fond ramenée devant, mode classique identique à avant. `node --check` sur `app.js`/`sw.js`. **Non vérifié sur iPhone.**

### Mode Verre — glisser la pile + curseur « Effet verre » (28/09/2026, 19h05)

Demandes de Corentin :
- **Changer de vitre en glissant** (en plus du toucher) : glisser la pile vers le **haut** envoie la vitre de devant au fond (la suivante passe devant) ; vers le **bas**, la vitre du fond revient devant. Seuil 50 px, ou geste rapide (> 0,4 px/ms) d'au moins 20 px. Pendant le geste, la vitre de devant suit le doigt 1:1 (variable `--drag`, amortie au-delà de 120 px, transitions coupées via `.dash.glisse`), puis la transition normale anime le changement. Un glisser n'ouvre jamais l'app (clic suivant annulé, en phase de capture). `touch-action:none` sur la pile en mode Verre : **on ne peut plus faire défiler la page en partant de la pile** (le reste de la page défile normalement). Ordre complet de la pile mémorisé (`portail-verre-pile`, remplace `portail-verre-devant`, relue en repli).
- **Curseur « Effet verre »** sous le bouton recharger (mode Verre seulement), de 0 à 200 % : variable `--v-f` (0 à 2, 1 par défaut) qui pilote dans `verre.css` le flou (`blur(calc(30px × f))`, saturation), l'opacité du verre, ses arêtes et son reflet. Mémorisé dans `duo-verre-intensite` et appliqué dès le `<head>` du Portail **et de Course** (même origine : les apps suivent le réglage).

**Vérifié** (Chromium 390×844) : glisser haut ×2, bas, petit glisser sans effet et sans ouverture d'app, toucher une vitre du fond, toucher la vitre de devant → ouvre l'app, ordre et intensité conservés après rechargement, curseur à 0 et 200 %, aucune erreur JS. **Non vérifié sur iPhone.**


## Design Verre — DÉFINITIF pour le Portail et Course (28/09/2026, 19h15)

Décision de Corentin après l'essai sur iPhone : **le design Verre devient le design du Portail et de Course**. ~~Muscu et Budget seront migrées plus tard~~ → migrées le soir même : les 4 apps sont en Verre.

**Ce qui change par rapport à l'essai** :
- **Plus d'interrupteur** : la classe `verre` est écrite en dur sur `<html>` (`<html lang="fr" data-app="portail" class="verre">`). Mini-script du `<head>` et bouton « Essai Verre » retirés.
- **Curseur « Effet verre » retiré** (Corentin n'en veut pas) : `--v-f` supprimé, valeurs fixes du verre restaurées dans `verre.css` (flou 30 px, verre 7 %, arête 16 %, reflet 30 %).
- **Nettoyage** : au chargement, `app.js` efface les clés de l'essai (`duo-verre`, `duo-verre-intensite`, `portail-verre-devant`).
- **Conservé** : la pile (toucher une vitre du fond → devant ; toucher celle de devant → ouvre l'app ; glisser haut/bas → fait tourner la pile), ordre mémorisé (`portail-verre-pile`), aperçus sur l'arête des vitres (`#mu-peek`, `#bu-peek`, `#co-peek`), thème clair/sombre, accent Corentin/Lisa.

**Architecture** :
- `style.css` = base (jetons, structure, thème clair) — inchangé ; `verre.css` (racine) = habillage, toutes règles préfixées `html.verre` (+ `[data-app="…"]`). Le code « mode classique » de `style.css` sert désormais de socle sous le verre : ne pas le supprimer sans vérifier ce que le verre en réutilise.
- `verre.css` : versionné par le workflow auto-version (toute app qui le référence est rebumpée quand il change) et mis en cache par le service worker (`SHELL_ANNEXES` du Portail, `FICHIERS_COMMUNS` des 3 apps — ex-`FICHIER_VERRE`).

**Migrer une app** (check-list — les 4 apps sont migrées depuis le 28/09/2026 ; à suivre pour toute nouvelle app) :
1. `<html … data-app="muscu|budget" class="verre">`, police Unbounded, `<script src="../commun.js?v=…"></script>` puis `<link rel="stylesheet" href="../verre.css?v=…">` dans le `<head>` (le workflow gère les `?v=`).
2. `sw.js` de l'app : ajouter `../verre.css` et `../commun.js` au précache et au réseau d'abord, AVANT le filtre de périmètre (modèle : `Course/sw.js`, `FICHIERS_COMMUNS`).
3. Règles propres à l'app dans `verre.css`, sous `html.verre[data-app="…"]` — une plaque de verre + des lignes à filets, jamais une carte floutée par ligne.
4. **Bas de page** : la page doit défiler elle-même (pas d'« écran fixe » avec défilement interne), sinon bande de 62 pt en bas (voir `PROBLEMES_RESOLUS.md`). Muscu et Budget sont déjà construites ainsi.
5. Fond de `<html>` : à la couleur du bas du contenu.
6. ~~Copier dans le `<head>` le mini-script « Halos »~~ → fait par `commun.js` depuis le 28/09/2026 (voir « Noyau commun »). Garder dans `index.html` : la constante `DERNIERE_MAJ`, le bandeau `#maj-toast` (bouton `#maj-btn`) et, si l'app l'affiche, `#derniere-maj`.

**Vérifié** (Chromium 390×844, sans aucune clé en `localStorage`) : Portail et Course s'ouvrent directement en Verre, pile (glisser, toucher, ouverture d'app, ordre après rechargement), Réglages de Course sans la carte « Apparence », aucune erreur JS.

### Halos animés (28/09/2026, 19h25)

Demande de Corentin : les deux lumières du fond **bougent en continu**. `verre.css` : deux calques fixes au lieu d'un — `body::before` = couleur du profil (remplace la poussière de craie du Portail), `body::after` = couleur de l'app — plus grands que l'écran (`inset:-20%`) pour que leurs bords ne se voient jamais. Seul `transform` est animé (GPU, pas de recalcul de mise en page), cycles de 23 s et 31 s en `alternate` (durées différentes : le mouvement ne se répète jamais à l'identique). Amplitudes limitées pour que la lumière de l'app reste au-dessus de ~75 % de la hauteur (bas de page uni, cf. bande iOS). Coupées par `prefers-reduced-motion`. S'applique au Portail et à Course (et aux futures apps migrées).
**Vérifié** (Chromium, images à 0, 8, 16 et 23 s) : dérive visible sur les deux apps, bas de page toujours sombre, aucune erreur JS. **Non vérifié sur iPhone** : si le défilement de la liste de Course saccade, ralentir ou couper l'animation en premier.

### Halos continus d'une app à l'autre (28/09/2026, 19h30)

Demande de Corentin : l'animation ne doit pas repartir de zéro à chaque changement d'app. Chaque app étant une page à part, une animation CSS redémarre à chaque ouverture. **Solution : caler l'animation sur l'horloge.** Un mini-script dans le `<head>` (Portail et Course, **identique dans chaque app qui charge `verre.css`** — → déplacé dans `commun.js` depuis le noyau commun) pose `--v-delai-profil = −(maintenant modulo 46 s)` et `--v-delai-app = −(maintenant modulo 62 s)` (46 et 62 s = un aller-retour des cycles `alternate` de 23 et 31 s), utilisés comme `animation-delay` dans `verre.css`. Toutes les apps affichent donc la même position au même instant : le passage de l'une à l'autre est continu. Recalé au retour depuis le cache précédent/suivant (`pageshow` persisté), où l'animation était en pause.
⚠️ Si on change une durée d'animation dans `verre.css`, changer le modulo (2 × durée) dans `commun.js` (depuis le 28/09/2026 le script vit là, une seule fois — voir « Noyau commun »).
**Vérifié** (Chromium) : Portail et Course ouverts en même temps → même position des deux halos (écart < 0,3 px).

### Budget passe au design Verre (28/09/2026, 19h40)

Budget suit la check-list ci-dessus (détail dans `Budget/README.md`, v4.0.0). **Nouveau piège à ajouter à la check-list** : si une app redéfinit ses jetons ailleurs que sur `<html>` (Budget : `body.light-mode`), ils écrasent la redirection du verre → les rediriger aussi à cet endroit dans `verre.css`, et recopier la classe de thème sur `<html>` (verre.css lit le thème sur `<html>`). État : ✅ Portail, Course, Budget — ⏳ Muscu (→ ✅ Muscu migrée le même soir).


## Thème sombre uniquement — bouton lune retiré (28/09/2026)

Décision de Corentin, **valable pour les 4 apps** : plus de thème clair, on reste en sombre d'office. Portail : bouton `#theme-toggle` retiré de l'en-tête (`index.html`), bloc « THEME CLAIR / SOMBRE » d'`app.js` remplacé par l'effacement de l'ancienne clé `portail-theme` ; règles `html.light-mode` et `.theme-toggle` retirées de `style.css`. `verre.css` : règles du thème clair retirées (`html.verre.light-mode`, variantes Budget/Course). Détail des autres apps dans leurs README ; Muscu : bouton retiré aussi, badge de synchro recalé à droite.
**Vérifié** (Chromium 390×844, avec l'ancien réglage « clair » encore en mémoire) : l'app s'ouvre en sombre, plus de bouton, aucune erreur JS. **Non vérifié sur iPhone.**

### Muscu passe au design Verre — les 4 apps sont unifiées (28/09/2026, 19h50)

Détail dans `Muscu/README.md`. Particularités : chaque écran est une plaque (et la zone des cartes sur l'écran des exercices), rayons agrandis (`--r-lg` 24 px → `R_CARD` des flammes de record mis à jour dans `app.js`), réserve du bas reportée dans les plaques (le `padding-bottom` posé en JS sur `body` est neutralisé). **Le Portail, Course, Budget et Muscu partagent désormais un seul design, défini dans `verre.css`.**


## Pastille de connexion à côté du titre (28/09/2026)

Demande de Corentin : dans chaque app, le titre à gauche et la pastille verte/rouge de connexion **juste à côté**, comme « Budget ● ». Pastille commune dessinée par `verre.css` en `::after` sur le titre (un pseudo-élément survit aux titres réécrits en JS), couleur pilotée par `<html data-sync="ok|envoi|hors-ligne">` : **vert** synchronisé, **or** synchronisation en cours, **rouge** hors ligne. Budget garde sa pastille d'origine (`.status-dot`), qui servait de modèle.
- **Portail** : pastille après « Portail Duo ». `app.js` (tableau de bord) : `statut()` — or au démarrage, vert dès qu'une lecture de `portail/*` réussit (REST, SDK ou écoute en direct servie par le serveur), rouge hors ligne ou si la lecture échoue alors que la base est prête.
- Course, Budget, Muscu : voir leurs README. **Vérifié** (Chromium) : pastille à côté du titre dans les 4 apps, passage au rouge en coupant le réseau (Muscu), aucune erreur JS.


## Haut de page aligné sur Budget (28/09/2026)

Demande de Corentin : Budget gère le mieux le haut de l'écran → même en-tête dans les 4 apps. Nouvelle variable commune `--v-haut` (`verre.css`) = zone de l'encoche + 18 px (valeur de Budget) : **le titre démarre au même endroit dans toutes les apps**, en **Unbounded 600 22 px** avec la pastille de connexion à côté, et **les plaques de verre commencent sous l'en-tête**, jamais sous la barre d'état.
Mesuré (Chromium 440×956, zone d'encoche simulée à 62 px) : haut du titre à 79–80 px dans les 4 apps (avant : Portail 88, Course 92, Budget 80, Muscu 132).
- **Portail** : `body` démarre à `--v-haut` (au lieu de encoche + 32 px), nom « Portail Duo » en 22 px (19 avant), barre du haut sans hauteur minimale (elle servait au bouton de thème retiré).
- Course, Budget, Muscu : voir leurs README.


## Profil Corentin/Lisa commun aux 4 apps (28/09/2026)

Demande de Corentin : un seul choix de profil pour tout (avant : une clé par app — `duo_profile` pour Muscu et le Portail, `profil` pour Course, `budgetLC_profil` pour Budget — donc trois choix à faire sur le téléphone de Lisa). **Clé unique : `localStorage duo_profile` = `'corentin' | 'lisa'`** (même origine, donc partagée). Muscu l'utilisait déjà (écran « Qui s'entraîne ? » et Réglages › « Qui es-tu sur ce téléphone ? »), le Portail la lisait déjà.
- **Portail** : relit `duo_profile` aussi au retour sur le Portail (`pageshow` depuis le cache précédent/suivant), le profil ayant pu changer dans l'app qu'on vient de quitter.
- Course et Budget : voir leurs README (anciennes clés reprises une fois puis effacées). Muscu : texte de Réglages mis à jour (« Réglage commun aux 4 apps »).
- ~~Conséquence : choisir « Lisa » dans « Qui s'entraîne ? » de Muscu passait les 3 autres apps en rose~~ → écran retiré le soir même : le profil du téléphone ne se règle plus que dans les Réglages (Muscu, Course ou Budget) ; Muscu garde un sélecteur « Séance pour » local, sans effet sur les autres apps (voir `Muscu/README.md`).
**Vérifié** (Chromium) : anciennes clés Course=Lisa / Budget=lisa migrées vers `duo_profile`, puis changement dans Budget → suivi par Muscu, changement dans Course → suivi par le Portail ; aucune erreur JS.


## Transition « la vitre s'ouvre en app » (28/09/2026)

Demande de Corentin : en touchant la vitre de devant du Portail, la vitre **se transforme** en l'app au lieu d'un simple changement de page. **View Transitions inter-pages** (Safari/iOS 18.2+, Chrome 126+ ; ailleurs : navigation normale) :
- `verre.css` : `@view-transition { navigation: auto; }` (les 4 pages partagent l'origine et la feuille) ; la **plaque** de chaque app porte `view-transition-name: vitre` (Course : `main` ; Budget : `.main-content` ; Muscu : `#view-menu .plaque`) ; la boîte « vitre » se déforme de la taille de la vitre à celle de la plaque en 0,42 s (courbe de la pile), contenu jamais étiré (`object-fit:none`, calé en haut, découpé par la boîte arrondie) ; le reste de la page fond enchaîné. Coupée par `prefers-reduced-motion`.
- Mini-script identique dans le `<head>` des 4 pages (`pagereveal`, → dans `commun.js` depuis le noyau commun) : **transition annulée pour les retours** (geste retour d'iOS, historique : type `traverse` / `back_forward`) et les rechargements — iOS anime déjà lui-même le retour, deux animations se superposeraient.
- **Portail** (`app.js`, bloc de la pile) : au toucher de la vitre de devant (et seulement elle, jamais après un glisser), elle reçoit `view-transition-name: vitre` juste avant la navigation ; nom retiré au retour (`pageshow`) pour qu'un seul élément le porte.
**Vérifié** (Chromium 141, ralenti ×0,15) : Portail → Course, Budget et Muscu : la vitre grandit et devient la plaque ; retour arrière : transition annulée ; aucune erreur JS. **Non vérifié sur iPhone.**


## Noyau commun `commun.js` (28/09/2026)

Proposé par Claude, validé par Corentin : comme `verre.css` pour le design, **le code recopié à l'identique dans les 4 apps vit désormais dans un seul fichier, `commun.js`, à la racine**. Une correction faite dedans vaut pour le Portail, Course, Budget et Muscu (avant : 4 copies à tenir identiques à la main, ~360 lignes en double retirées).

**Contenu** (dans cet ordre dans le fichier) :
1. **Halos calés sur l'horloge** (`--v-delai-profil`, `--v-delai-app`, recalage au `pageshow` persisté) — avant : mini-script dans chaque `<head>`.
2. **Transition « vitre → app »** : annulation pour les retours et rechargements (`pagereveal`) — avant : mini-script dans chaque `<head>`.
3. **Date de dernière mise à jour du code** : `window.formaterDerniereMaj()` (globale : Muscu l'appelle en ouvrant ses Réglages) + remplissage de `#derniere-maj` au chargement.
4. **Service worker** : enregistrement de `sw.js` (chemin et portée relatifs, donc le `sw.js` du dossier de l'app), détection d'une nouvelle version, bouton `#maj-btn` du bandeau → recharge.
5. **Vérification de version au retour dans l'app** (relit `index.html`, compare `DERNIERE_MAJ` ; rechargement auto, ou bandeau si saisie en cours / fenêtre ouverte / déjà 2 rechargements) — `window.__verifierVersion` gardé.

**Reste propre à chaque app** : `DERNIERE_MAJ` (index.html, gérée par le workflow), le bandeau `#maj-toast` (sa position dépend de la barre du bas), `sw.js`.

**Chargement** : `<script src="commun.js?v=…">` (Portail) / `"../commun.js?v=…"` (apps), dans le `<head>`, **sans `defer`** (halos et transition doivent tourner avant le 1er rendu). `DERNIERE_MAJ` est définie plus bas dans la page : le noyau ne la lit qu'au moment de s'en servir (`DOMContentLoaded`, `load`, retour au premier plan), jamais au chargement.
**Cache hors-ligne** : Portail `sw.js` → `SHELL_ANNEXES` + réseau d'abord ; Course, Budget, Muscu → `FICHIERS_COMMUNS = ['../verre.css', '../commun.js']` (précache + réseau d'abord avant le filtre de périmètre ; remplace `FICHIER_VERRE`).
**Workflow `auto-version.yml`** : `commun.js` ajouté aux chemins surveillés ; s'il change, chaque app dont l'`index.html` contient `commun.js?v=` est rebumpée (DERNIERE_MAJ, `?v=`, `CACHE_NAME`), comme pour `verre.css`.
**Portail** (`app.js`) : blocs date de MAJ, service worker et vérification de version retirés ; `index.html` : les deux mini-scripts du `<head>` remplacés par `commun.js`.
**Vérifié** (Chromium 141) : 4 apps sans erreur JS ; halos calés ; « Dernière mise à jour du code » affichée (Portail, Course, Budget ; Muscu dans ses Réglages) ; `sw.js` de chaque dossier enregistré ; `commun.js` et `verre.css` présents dans le cache de chaque app ; version plus récente simulée sur le serveur → rechargement automatique, et bandeau « Actualiser » une fois la limite de 2 rechargements atteinte.

## Projet Firebase UNIQUE pour les 4 apps (29/09/2026)

**Décision de Corentin** : regrouper les 3 projets Firebase en un seul, pour un login unique et pour brancher les futures apps (roadmap) sans créer un projet à chaque fois.

### Où sont les données

| App | Projet avant | Projet depuis le 29/09/2026 | Collections |
|---|---|---|---|
| Course | `course-app-36e9d` | `course-app-36e9d` (inchangé) | `produits`, `rayons`, `listes` (depuis le 30/09/2026) |
| Portail | `course-app-36e9d` | inchangé | `portail/{muscu,budget,courses}` |
| Budget | `lisa-et-corentin` | **`course-app-36e9d`** | `mois`, `config` |
| Muscu | `duo-training-e835b` | **`course-app-36e9d`** | `archives`, `customSessions`, `coachChat`, `settings` |

- **Projet cible = celui de Course** : il servait déjà de boîte aux lettres au tableau de bord, et Course/Portail n'ont donc rien eu à migrer. Son identifiant (`course-app-…`) ne peut pas être renommé : c'est normal qu'il porte ce nom.
- **Aucun conflit de noms** entre collections, et **aucune donnée indexée par UID** : copie à l'identique, document par document, avec les mêmes identifiants (vérifié : 0 écart sur 178 documents).
- **Anciens projets `lisa-et-corentin` et `duo-training-e835b` : gardés comme archives, passés en LECTURE SEULE** (règles `allow write: if false`). Ne pas les supprimer avant plusieurs semaines d'usage sans souci.
- **Sauvegarde complète avant migration** (données typées, règles, comptes) : `Sauvegarde_Firebase_AVANT-MIGRATION_2026-09-29.zip`, remise à Corentin, **hors du dépôt** (le dépôt est public, la sauvegarde contient le budget et la clé du coach).

### Compte et session

- **Un seul compte e-mail / mot de passe** dans `course-app-36e9d` (l'adresse e-mail du duo), **avec le mot de passe de Budget** (choix de Corentin) : son empreinte a été importée telle quelle depuis `lisa-et-corentin` (Admin SDK `importUsers`, paramètres scrypt du projet source). Le mot de passe de l'ancien compte Muscu ne sert plus.
- **Session partagée** : Budget, Muscu et Course utilisent la même application Firebase par défaut, sur le même projet et la même origine → une connexion faite dans Budget ou Muscu vaut pour les 3 (au sein d'une même installation PWA ; une app installée séparément sur l'écran d'accueil a son propre stockage sous iOS).
- *(Remplacé le 29/09/2026 au soir : plus de session anonyme du tout, voir « Course et Portail réservés au compte du duo » en fin de fichier.)* **Piège géré** : Course ouvre une session **anonyme** s'il n'y a personne. Budget et Muscu traitent une session anonyme comme « pas connecté » (`user.isAnonymous`) → écran de connexion ; la connexion e-mail remplace alors la session anonyme pour toutes les apps. Course reprend une session e-mail telle quelle, sans doubler ses écoutes (`ecoutes`), et les arrête puis se reconnecte en anonyme après une déconnexion faite dans Muscu.
- *(Supprimée le 29/09/2026 au soir.)* La 2e application Firebase `'portail'` de Muscu et Budget (boîte aux lettres) est **conservée telle quelle** : elle pointe désormais sur le même projet, avec sa propre session anonyme. Simplification possible plus tard (publier directement via la base principale), non faite pour limiter le risque.

### Règles de sécurité — `/firestore.rules` (versionné)

- **Course / Portail** (`produits`, `rayons`, `portail` ; `listes` ajoutée le 30/09/2026, directement en `compteDuo()`) : toute session, anonyme comprise — **jusqu'au 29/09/2026 au soir**, puis `compteDuo()` comme le reste (voir « Course et Portail réservés au compte du duo » ci-dessous).
- **Muscu / Budget** : `compteDuo()` = connexion **par mot de passe** ET compte du duo (reconnu par son **UID** depuis le 29/09/2026 au soir ; avant : par son adresse e-mail, retirée du fichier public). Une session anonyme (que n'importe qui peut ouvrir avec la config publique du dépôt) **n'y a pas accès**, un autre compte e-mail non plus (ferme aussi le trou de l'inscription libre signalé dans `Muscu/README.md`).
- **Tout le reste est fermé.** Une nouvelle app = ses collections déclarées explicitement dans `firestore.rules`.
- ⚠️ **Le fichier du dépôt n'est pas déployé automatiquement.** Après modification : publier par la console Firebase (Firestore → Règles, copier-coller) ou par l'API Firebase Rules avec le compte de service (créer un `ruleset` puis mettre à jour la release `cloud.firestore`). Toujours tester avant (émulateur Firestore + `@firebase/rules-unit-testing` : 120 cas testés le 29/09/2026 — compte du duo, anonyme, autre e-mail, sans session).
- Publiées **AVANT** la copie des données de Budget et Muscu : l'ancienne règle de ce projet (`request.auth != null` partout) aurait exposé le budget à n'importe quelle session anonyme.

### Ce qui reste hors du dépôt

- **Google Apps Script des sauvegardes du dimanche** (Budget et Muscu) : il lit Firestore avec les clés des propriétés de script `SA_BUDGET` et `SA_MUSCU` (le projet lu = `project_id` de la clé, rien en dur dans le code). **Fait le 29/09/2026** : les deux propriétés contiennent la clé de `course-app-36e9d` ; exécution test OK (Budget 9 mois, Muscu 24 séances). ⚠️ Coller la clé **sur une seule ligne** (JSON minifié, champs `project_id`, `client_email`, `private_key` suffisent) : collé sur plusieurs lignes, le champ des propriétés tronque la valeur (« Unterminated string in JSON at position 751 »). Vérification sans mail : fonction `verifierAcces`.
- **Anciens projets** `lisa-et-corentin` et `duo-training-e835b` : plus aucune dépendance après la mise à jour de l'Apps Script → suppression validée le 29/09/2026 (Google les garde 30 jours récupérables).

### Coûts

- Quotas gratuits (plan Spark) désormais **partagés** entre les 4 apps (50 000 lectures / 20 000 écritures par jour). Volume à deux : très loin des limites. Un `onSnapshot` mal placé dans une app pèserait sur les autres — y penser en ajoutant une app.


## Course et Portail réservés au compte du duo (29/09/2026, soir)

**Décision de Corentin** : sécuriser aussi Course et le Portail. Jusqu'ici, `produits`, `rayons` et `portail` acceptaient n'importe quelle session anonyme — or la configuration Firebase est publique (dépôt et Pages) : n'importe qui pouvait lire, modifier ou vider la liste de courses et les résumés du tableau de bord, et, depuis le projet unique, épuiser les quotas gratuits partagés avec Budget et Muscu.

### Ce qui change
- **`firestore.rules`** : `produits`, `rayons`, `portail` → `compteDuo()`, comme Budget et Muscu. Plus aucune collection ouverte à l'anonyme ; la fonction `connecte()` est supprimée.
- **Course** : plus de `signInAnonymously`. Sans session e-mail (ou avec une ancienne session anonyme), écran **Connexion** ; les écoutes ne démarrent qu'avec le compte du duo et s'arrêtent à la déconnexion (faite dans Muscu ou Budget).
- **Portail** : application Firebase **par défaut** (avant : 2e application `'portail'` en anonyme) → **même session** que Course, Budget et Muscu. Sans session : écran **Connexion**. Plus de cache Firestore persistant (il aurait été partagé avec celui des apps, sur d'autres versions du SDK) : le dernier état connu reste affiché depuis `localStorage`.
- **Muscu et Budget** publient `portail/muscu` et `portail/budget` avec **leur propre base et leur session e-mail** : la 2e application Firebase `'portail'` et sa connexion anonyme sont supprimées (la « simplification possible plus tard » de la section précédente).
- **Écran de connexion commun** : `connexionDuo(auth)` dans `commun.js` (section 6), balisage `#connexion` dans `index.html` (Portail) et `Course/index.html`, habillage `.connexion-duo` dans `verre.css`. Masqué par défaut, ouvert seulement quand Firebase répond « pas de session » (pas de flash au démarrage).
- **Une seule connexion par installation** : sur une même installation (le Portail et les apps ouvertes depuis lui), se connecter dans l'une connecte les autres. Une app ajoutée séparément à l'écran d'accueil a son propre stockage sous iOS : s'y connecter une fois.

### ⚠️ Ordre de mise en service (important)
1. Fusionner dans `main` (le workflow met à jour versions et caches).
2. Sur **chaque téléphone** : ouvrir le Portail (et chaque app installée à part), laisser la mise à jour se faire, **se connecter** avec le compte du duo.
3. **Seulement ensuite**, publier `/firestore.rules` : console Firebase → Firestore → Règles → coller le fichier → Publier. Avant cette étape tout fonctionne déjà (une session e-mail satisfait aussi les anciennes règles) ; publier trop tôt bloquerait un téléphone resté sur l'ancienne version (session anonyme) jusqu'à sa mise à jour.
4. Facultatif : Authentication → Méthode de connexion → désactiver **Anonyme** (plus rien ne s'en sert).

**État au 29/09/2026 (soir)** : fusion faite (PR n°1) et mise en ligne ; téléphones mis à jour et connectés — « tout marche » (retour de Corentin, iPhone) ; connexion **Anonyme désactivée** dans Firebase Authentication par Corentin. Règles : version finale = celle avec l'**UID** (ci-dessous, PR n°2), **publiée dans la console Firebase par Corentin le 29/09/2026 au soir** — le fichier `/firestore.rules` du dépôt est identique à ce qui est en ligne.

### Compte reconnu par son UID (29/09/2026, soir)
- `compteDuo()` vérifie `request.auth.uid` (identifiant Firebase du compte du duo, fixe) au lieu de l'adresse e-mail : même accès, mais l'adresse n'apparaît plus dans le fichier public. Le fournisseur `password` reste exigé.
- UID : console Firebase → Authentication → Utilisateurs, colonne « UID de l'utilisateur ». Ce n'est pas un secret.
- Vérifié (émulateur, 240 cas) : compte du duo par mot de passe → accès complet ; **autre compte avec la même adresse e-mail**, même UID via un autre fournisseur, session anonyme, autre compte, sans session → refusés ; collection non déclarée → refusée à tous.
- ⚠️ Si le compte du duo est un jour **supprimé puis recréé**, il aura un nouvel UID : mettre à jour `firestore.rules` et republier, sinon plus personne n'a accès.

### Hygiène des secrets (29/09/2026, soir)
- **Clés Gemini et Groq du coach** (abandonné le 23/09) : effacées de `settings/coach` par Muscu (voir `Muscu/README.md`) **et révoquées** par Corentin dans Google AI Studio et la console Groq.
- **Aucune clé privée dans le dépôt** : ni clé de compte de service, ni mot de passe, ni jeton (vérifié sur tout l'historique git). Les clés `AIza…` visibles dans le code sont les clés **web** Firebase, publiques par conception : la protection, ce sont les règles.
- **Ne jamais coller de clé de compte de service** (JSON avec `private_key`) dans un fichier du dépôt ni dans une conversation : les règles se publient par copier-coller dans la console, sans clé. Une clé exposée se supprime dans Google Cloud → IAM → Comptes de service → Clés.
- **Adresse e-mail** : retirée des règles (UID) ; GitHub réglé pour masquer l'adresse dans les prochains commits (« Keep my email addresses private »). Les anciens commits la gardent (historique non réécrit, choix assumé).

### Vérifié / non vérifié
- **Règles** (émulateur Firestore, `@firebase/rules-unit-testing`) : 200 cas — compte du duo (mot de passe) : lecture, liste, écriture, suppression OK sur les 9 collections ; session anonyme, autre compte e-mail, même e-mail via un autre fournisseur, sans session : tout refusé ; collection non déclarée : refusée à tous.
- **Chromium + émulateurs Auth/Firestore** (vrais SDK, 16 vérifications) : Portail sans session → écran de connexion ; mauvais mot de passe → message, écran ouvert ; bon mot de passe → écran fermé ; Course reprend la session du Portail, lit la liste et publie `portail/courses` ; Budget reprend la session et publie `portail/budget` ; le Portail n'ouvre plus d'application `'portail'` et lit les résumés ; déconnexion → Course redemande la connexion ; session anonyme → écran de connexion maintenu, lecture de `produits` refusée ; connexion e-mail depuis une session anonyme → liste chargée. Aucune erreur JS.
- **Muscu** (pont `window.__portail` et effacement des clés du coach, extraits de `index.html`, vrai SDK 12 + émulateurs) : session anonyme → publication refusée, aucun jeton ; compte du duo → `portail/muscu` publié, jeton gardé pour le secours `keepalive`. La page Muscu entière n'a pas pu être testée dans ce Chromium (toute requête réseau y restait bloquée, y compris sa connexion d'origine, non modifiée).
- **iPhone, base réelle** : testé par Corentin le 29/09/2026 au soir (« tout marche »), puis règles finales (UID) publiées.

## Pile de vitres centrée verticalement (29/09/2026, soir)

**Retour de Corentin** : les vitres du Portail n'étaient pas centrées à l'écran — collées sous l'en-tête, grand vide en bas.
- `verre.css` (section « PORTAIL — la pile de vitres ») : `main` occupe toute la hauteur (`flex:1 0 auto`), `margin-top:auto` sur `.dash` et `margin-bottom:auto` sur `.derniere-maj` → le groupe pile + astuce + bouton recharger + date est centré dans la hauteur restante sous l'en-tête.
- Écran trop petit pour tout afficher (iPhone SE) : les marges automatiques valent 0, rien ne change.
- **Téléphones du duo** : iPhone 16 Pro Max (Corentin, 440 × 956 pt) et iPhone 16 (Lisa, 393 × 852 pt) — à utiliser comme tailles de référence pour les essais de mise en page.
- Mesuré (Chromium, zones de l'encoche et de la barre d'accueil simulées) : iPhone 16 Pro Max — pile 237→694, centre à 466 px pour un milieu d'écran à 478 px ; iPhone 16 — pile descendue de 42 px, centre à 412 px pour 426 px ; iPhone 13 mini : même écart ; iPhone SE : inchangé. **Non vérifié sur iPhone.**


## Styles au choix : Verre · Relief · Argile (30/09/2026)

**Demande de Corentin** : en plus du glassmorphisme (design Verre), un style **neumorphisme** et un style **claymorphisme**, choisis dans le Portail et appliqués à toutes les apps, en respectant les couleurs de Corentin (bleu) et de Lisa (rose).

- **Sélecteur** : sous la pile du Portail, « Style des apps » : `Verre` · `Relief` · `Argile` (`#style-choix`, `role="radiogroup"`, boutons 74 × 44 px). Effet immédiat, sans rechargement.
- **Relief** = neumorphisme sombre : une seule matière mate (`#1d2026`), les surfaces sortent du fond (ombre claire en haut à gauche + ombre sombre en bas à droite) ou s'y creusent (champs, jauges, cases, onglet actif). Pas de halos, pas de flou. Accent (bleu/rose) sur les actions principales et l'onglet actif.
- **Argile** = claymorphisme sombre : surfaces pleines et « gonflées » (reflet et ombre **intérieurs**), fond et plaques **teintés à la couleur du profil** (bleuté pour Corentin, rosé pour Lisa), halos conservés mais atténués, pas de flou.
- **Mémorisation** : `localStorage['duo-style']` = `verre | relief | argile` — même origine et même installation que les 3 apps (manifest unique, scope `./`), exactement comme `duo_profile`. **Réglage par téléphone** : Lisa et Corentin peuvent avoir chacun leur style. Aucune lecture Firestore, aucun changement de `firestore.rules`.
  - *Écartée* : un document Firestore `portail/style` (proposée en premier) — inutile puisque les 4 apps partagent déjà leur `localStorage` (preuve : `duo_profile`), et elle aurait imposé le même style aux deux téléphones et coûté une lecture à chaque ouverture.
- **Application avant le 1er rendu** : `commun.js` (section 0, chargé dans le `<head>` sans `defer`, avant `verre.css`) pose `<html data-style="relief|argile">` ; attribut absent = Verre. Relu au retour depuis le cache précédent/suivant (`pageshow`) et sur l'événement `storage`. API : `window.duoStyle.lire()` / `.choisir(nom)` (utilisée par `app.js` du Portail). Au changement, la classe `style-bascule` coupe les transitions le temps de deux images (sinon chaque ombre de la page s'anime).
- **CSS** : bloc « STYLES AU CHOIX » à la fin de `verre.css`. Jetons `--t-*` par style, redirection des jetons du verre (`--v-glass`, `--v-soft`, `--v-flou:none`…), puis des règles **par catégorie** (plaques, barres/flottants/modales, panneaux, creux, états actifs, accent), toutes sous `html.verre[data-style]` : **le Verre n'est pas modifié** (vérifié pixel par pixel sur Course, Budget, Muscu).
- **Ajouter une surface dans une app** : la déclarer dans la bonne catégorie du bloc « STYLES AU CHOIX », sinon elle garde son habillage verre (translucide) dans Relief/Argile.
- **Performance** : aucun `backdrop-filter` dans Relief et Argile (plus léger que le Verre).

**Deux pièges rencontrés** (détail dans `PROBLEMES_RESOLUS.md`) :
- **Pile du Portail** : les vitres sont découpées par `clip-path` → leurs ombres portées extérieures sont coupées. En Relief/Argile, le relief est donc porté par l'intérieur (dégradé ou ombres `inset`) et les vitres du fond sont assombries (`filter:brightness`) plutôt que rendues transparentes (matière opaque).
- **Budget pose le profil sur `<body>`** (`body.profil-lisa`) : les jetons calculés sur `<html>` (teinte Argile, accent Relief) restaient bleus pour Lisa. Profil recopié sur `<html>` par `html.verre[data-app="budget"]:has(> body.profil-lisa)`.

**Fichiers touchés** : `commun.js` (section 0), `verre.css` (bloc final), `index.html` + `app.js` du Portail (sélecteur). Aucun fichier des 3 apps modifié : elles suivent via `commun.js` et `verre.css` (versions `?v=` mises à jour par le workflow).

**Vérifié** (Chromium 390 × 844, Firebase simulé, profils Corentin et Lisa) : Portail, Course (Liste, Course, Réglages), Budget (Mois, Fixes, Réglages), Muscu (menu, séance) dans les 3 styles ; clic sur « Argile » → `data-style="argile"` + `duo-style` enregistré, Course ouverte ensuite en Argile, retour à « Verre » → attribut retiré ; Verre identique au pixel près à avant ; aucune erreur JS. **Non vérifié sur iPhone.**
