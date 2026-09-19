# 🗂️ PROBLÈMES RÉSOLUS — Base de connaissance PORTAIL-DUO

**But de ce document** : conserver la trace de chaque problème technique rencontré et de sa vraie solution, pour ne jamais reperdre des heures à re-déboguer un cas déjà vécu — ni sur Muscu, ni sur Budget, ni sur Course, ni sur Portail.

**Règle d'usage** :
- **À lire systématiquement** avant d'intervenir sur n'importe laquelle des 4 apps, dès qu'un comportement bizarre ou un bug apparaît — le réflexe est de vérifier ici avant de repartir de zéro.
- **À compléter systématiquement** après toute résolution de problème non triviale (pas besoin de logger un simple changement de texte, mais tout bug, comportement inattendu, ou leçon technique généralisable doit être noté), **peu importe quelle app est concernée** — ce fichier est transversal aux 4 apps, pas un README d'app.
- Chaque entrée suit le format ci-dessous. Ajouter les nouvelles entrées en haut de leur section (ou créer une nouvelle section si le sujet est neuf), la plus récente en premier.

**Format d'une entrée** :
```
### [Date] — [App(s) concernée(s)] — Titre court
**Symptôme** : ce qui était observé
**Fausses pistes explorées** : ce qui a été essayé sans succès (évite de refaire les mêmes essais)
**Cause racine** : la vraie explication
**Solution** : ce qui a été fait concrètement
**Fichiers touchés** : liste
```

---

## 🎨 Charte UX/UI — alignement des 4 apps (18/09/2026)

### Contexte
Muscu a été choisie comme app de référence ("Ardoise & Craie") pour standardiser typographie, couleurs, cards et menus sur les 4 apps. Charte documentée dans `/UX_UI_CHARTER.md`.

### Course — mise en conformité
**Cause racine** : app développée indépendamment, jamais alignée sur les tokens de Muscu (couleurs, radius, ombres différents), pas de mode clair, meta tags PWA incomplets, `theme-color` obsolète.
**Solution** : variables CSS renommées vers la nomenclature commune (`--card`, `--text`, `--border`, `--r-*`), couleurs Corentin/Lisa alignées sur les hex exacts de Muscu, ajout mode clair + bouton toggle, meta tags PWA complétés, tokens sémantiques (`--done`/`--danger`/`--gold`) ajoutés.
**Fichiers touchés** : `Course/index.html`, `Course/README.md`

### Muscu — backport de bonnes pratiques trouvées sur Course
**Cause racine** : lors de l'audit de Course, deux points où Course faisait *mieux* que Muscu ont été identifiés : `env(safe-area-inset-top)` (Muscu n'avait que le bottom), et `overscroll-behavior:none` (absent de Muscu).
**Solution** : ajout de `env(safe-area-inset-top, 0px)` sur `.theme-toggle`/`.sync-badge`, ajout de `overscroll-behavior:none` sur `html,body`.
**Fichiers touchés** : `Muscu/index.html`, `Muscu/README.md`

### Portail — mise en conformité
**Cause racine** : `status-bar-style` en `black` (pas `black-translucent`), aucun mode clair, tokens radius/shadow incomplets (pas utilisés mais absents pour cohérence future).
**Solution** : alignement `status-bar-style`, ajout mode clair + toggle, complément des tokens manquants (`--r-xs`, `--r-xl`, `--shadow-lg`, `--t-fast`/`--t-mid`).
**Fichiers touchés** : `index.html` (racine), `README.md` (racine)

### Budget — gros chantier : suppression de 10 thèmes décoratifs
**Symptôme** : Budget avait 11 thèmes sélectionnables ("Garde-robe" : défaut bleu + purple/green/rose/glass/latte/botanic/gatsby/terracotta/moleskine/watercolor), thème **clair par défaut** (à l'inverse des 3 autres apps sombres par défaut), et aucune notion de profil Corentin/Lisa.
**Décision validée par Corentin** : supprimer les 10 thèmes décoratifs, passer en sombre par défaut, ajouter un sélecteur de profil Corentin/Lisa (purement cosmétique — le compte reste unique et partagé).
**Cause racine du bug additionnel trouvé pendant l'audit** : `<body class="theme-glass">` codé en dur dans le HTML statique, indépendamment du système de classes géré par le JS.
**Solution** : suppression complète du tableau `THEMES`, de `applyTheme()`, du rendu du picker, de la section admin "Garde-robe" et de tout le CSS des 10 skins. Logique de dark-mode inversée (`!== 'false'` au lieu de `=== 'true'`) en préservant les choix déjà enregistrés. Accent unique aligné charte (`#1f8fff`). Ajout du sélecteur de profil (`body.profil-lisa`, boutons Corentin/Lisa dans une nouvelle section "👤 Profil").
**Fichiers touchés** : `Budget/index.html`, `Budget/manifest.json`, `Budget/README.md`

---

## 🐛 Course — saga du flou de la barre de statut + bloc vide en bas (18-19/09/2026)

**Le morceau le plus long et le plus instructif de tout le chantier. Lire en entier avant de retoucher à `viewport`, `safe-area`, ou `height` sur n'importe quelle app.**

### Symptôme initial
Un effet de flou/voile visible en haut de l'écran (derrière l'heure et les icônes système), visible uniquement en mode app (jamais en Safari classique).

### Fausses pistes explorées (dans l'ordre, aucune n'a suffi seule)
1. `apple-mobile-web-app-status-bar-style` : `black-translucent` → `black`. **Aucun effet.**
2. Retrait de `viewport-fit=cover` du meta viewport seul. **Aucun effet sur le flou**, et a **cassé la barre du bas** : `env(safe-area-inset-bottom)` dépend de `viewport-fit=cover` pour renvoyer une vraie valeur, mais le body gardait `height:100dvh` qui force le plein écran physique *indépendamment* de `viewport-fit=cover` — résultat : barre d'onglets sans protection, tapée dans la zone de geste du home indicator, déclenchant Siri par erreur.
3. Reviens en arrière (restauration de `viewport-fit=cover`), puis retrait combiné de `viewport-fit=cover` **et** de `height:100dvh` (garder `height:100vh` seul). **N'a pas non plus fait disparaître le flou** sur l'appareil réel.
4. Marge tampon manuelle de 16px (haut) / 8px (bas) ajoutée en plus de la vraie `env(safe-area-inset-*)`, en restaurant `viewport-fit=cover` + `height:100dvh`. Contournement pragmatique qui a fonctionné visuellement, mais qui masquait le vrai problème sans le résoudre.

### Cause racine n°1 (le flou) : cache du Service Worker jamais invalidé
`sw.js` sert `index.html` en cache-first, sans jamais revérifier le réseau tant que le fichier `sw.js` **lui-même** n'a pas changé d'octets (le navigateur ne détecte une mise à jour de Service Worker qu'en comparant le fichier `sw.js`, jamais le contenu qu'il sert). Modifier `index.html` cent fois sans jamais toucher `sw.js` = zéro mise à jour visible, indéfiniment.
**Solution** : incrémenter `CACHE_NAME` dans `sw.js` à chaque modification du shell (`index.html`, `manifest.json`). **Confirmé en pratique** : après un reset complet (suppression icône + vidage données Safari + réinstallation + bump cache), le flou du haut a disparu.

### Cause racine n°2 (le bloc vide en bas, persistant même après le fix du cache) : bug WebKit `height:100dvh`
En PWA standalone iOS, `height:100%`/`100vh`/`100dvh` **soustraient à tort l'inset de sécurité du HAUT** de la hauteur totale calculée — bug WebKit confirmé par plusieurs sources indépendantes (voir `/GUIDE_PWA_IOS.md`). Résultat : un bandeau vide (couleur différente du reste) apparaît **en BAS** de l'écran, sous la barre d'onglets, alors que le bug est mathématiquement causé par le calcul du HAUT.
**Solution qui marche** : ancrer le conteneur racine de l'app directement sur le vrai viewport, indépendamment de toute la chaîne `html/body/height`:
```css
#app{ position:fixed; inset:0; display:flex; flex-direction:column; }
body{ overflow:hidden; }
```
`position:fixed;inset:0` s'aligne toujours sur le vrai viewport visuel, sans dépendre du calcul buggé de `dvh`.

### Ajustement final
Une fois les deux vraies causes corrigées, la marge tampon manuelle (16px/8px) est devenue redondante — retirée du bas (`--safe-bottom` repassé à `env(safe-area-inset-bottom)` pur), gardée à +16px en haut par choix esthétique (pas de bug à cet endroit, juste une préférence visuelle).

### Piste complémentaire (non confirmée mais plausible) : "iOS 26's edge treatment"
Un projet open-source dédié aux quirks iOS PWA (BuiltByTed/Homeframe) documente un comportement nommé *"iOS 26's edge treatment"* : un flou/assombrissement natif au-dessus du header d'une web app standalone, qui persiste sauf si le header est un élément **persistant** ne se redémontant jamais pendant une navigation interne. Corrèle avec l'observation initiale : le flou revenait plus facilement en arrivant **via navigation depuis le Portail** (`window.location.href`, rechargement complet de document) qu'en ouvrant l'icône Course directement. Nos 4 apps ont déjà le header en HTML statique (jamais injecté en JS après coup), ce qui limite déjà ce risque.

**Fichiers touchés** : `Course/index.html`, `Course/sw.js`, `Course/README.md`

---

## 🔔 Système de notification de mise à jour du Service Worker (19/09/2026)

**Symptôme structurel (généralisation de la cause racine n°1 ci-dessus)** : sur les 4 apps, `sw.js` fait déjà `skipWaiting()` + `clients.claim()` automatiquement, mais rien n'informait jamais l'utilisateur qu'une mise à jour avait été installée et qu'un rechargement était nécessaire pour la voir apparaître.

**Solution appliquée identiquement sur les 4 apps** : un bandeau discret "🔄 Nouvelle version disponible" (bas d'écran, conscient de la safe-area) apparaît dès que le Service Worker détecte et installe une mise à jour en tâche de fond (écoute de `updatefound` + `statechange` sur le worker en cours d'installation, et de `reg.waiting` au chargement). Le rechargement n'est **volontairement pas automatique** (pas d'écoute de `controllerchange` pour forcer un reload) — l'utilisateur clique sur "Actualiser" quand il veut, pour ne jamais couper une saisie en cours (pertinent sur Budget en particulier).

Ajout complémentaire : `<meta name="mobile-web-app-capable" content="yes">` à côté de `apple-mobile-web-app-capable` (jamais retiré ce dernier — iOS Safari ne lit que l'orthographe Apple ; le tag standard fait juste taire l'avertissement de dépréciation de Chrome DevTools).

**Fichiers touchés** : `index.html` × 4 (Portail/Muscu/Budget/Course), `README.md` × 4

---

## 🏷️ Horodatage de dernier déploiement — `DERNIERE_MAJ` (19/09/2026)

**But** : afficher dans l'app la date/heure du dernier déploiement de **code** (pas des données), pour savoir en un coup d'œil si on a la dernière version — complément direct du bandeau de mise à jour ci-dessus.

**Implémentation** : une constante `DERNIERE_MAJ = 'YYYY-MM-DDTHH:MM:SS+02:00'` (format ISO) en tête de script sur chaque app, affichée formatée en français ("19/09/2026 à 23h27"). Emplacements d'affichage : onglet Réglages pour Muscu/Course/Budget, bas de page pour Portail.

**⚠️ Règle impérative pour la suite** : cette constante doit être **mise à jour manuellement à chaque commit qui modifie `index.html`** sur l'app concernée — voir le prompt système pour les emplacements exacts (recherchable via `grep -n "DERNIERE_MAJ ="`). Une constante non mise à jour devient trompeuse (affiche une ancienne date alors que du code plus récent est en ligne).

**Fichiers touchés** : `index.html` × 4

---

## 🎯 Petites fonctionnalités (19/09/2026)

### Course — bouton "Course terminée" masqué si aucune sélection
**Avant** : le bouton restait affiché en permanence, semi-transparent (`opacity:0.35` via `:disabled`) quand aucun produit n'était coché — jugé peu lisible.
**Solution** : `display:none` par défaut, classe `.visible` ajoutée dès qu'au moins un produit est coché (recalculé dans `renderCourse()` à chaque rendu, seule source de vérité).
**Bug latent corrigé au passage** : `toggleAchete()` remettait inconditionnellement le bouton "actif" à chaque clic, y compris en décochant le dernier produit coché (où il aurait dû redevenir masqué). Corrigé en supprimant cette mise à jour optimiste incorrecte — le listener temps réel Firestore (`onSnapshot` sur `produits`) déclenche déjà un re-rendu correct à chaque écriture.

### Budget — onglet "Admin" renommé "Réglages"
Changement du libellé visible uniquement. `data-view="admin"`, `#vue-admin`, et la fonction `rendreAdmin()` sont restés inchangés volontairement, pour ne prendre aucun risque sur la logique existante pour un simple renommage cosmétique.

---

## 📚 Documents de référence créés ce jour-là

- `/UX_UI_CHARTER.md` — design system standardisé (couleurs, typo, cards, radius), Muscu comme référence
- `/GUIDE_PWA_IOS.md` — guide complet PWA iOS, vérifié et complété par recherche web (bugs WebKit `100dvh`, comportement iOS 26/27, cycle de vie Service Worker, storage, etc.)
- `/FUTURE_APPS_ROADMAP.md` — roadmap des futures apps de l'écosystème (Agenda, Recettes, Goals, Défis, Trip Planner, Memories, Habits)
- `/PROBLEMES_RESOLUS.md` — ce document

---

**Dernière mise à jour de ce fichier** : 19 septembre 2026
