# Duo Training

Application web mono-fichier (HTML/CSS/JS vanilla, aucun build, aucun npm) de suivi de musculation en duo pour **Corentin** et **Lisa**. Ouverte dans Safari sur iPhone. Thème sombre par défaut avec bascule vers un thème clair, identité visuelle « Ardoise & craie ». ~6 100 lignes, ~295 Ko (dont ~17 Ko d'icône encodée en base64).

## Où vit le projet

| | |
|---|---|
| Dépôt | `github.com/corentindebritocanica-cloud/PORTAIL-DUO` (anciennement `MUSCU-DUO`, puis avant ça `PLANNING-CAB-LISA`) |
| Sous-dossier de l'app | `/Muscu/` — le même repo héberge aussi `/Budget/` et `/Course/`, derrière un portail de lancement commun (`/` à la racine) |
| App déployée | `corentindebritocanica-cloud.github.io/PORTAIL-DUO/Muscu/` |
| Code (lecture directe) | `https://raw.githubusercontent.com/corentindebritocanica-cloud/PORTAIL-DUO/refs/heads/main/Muscu/index.html` |
| Ce fichier (lecture directe) | `https://raw.githubusercontent.com/corentindebritocanica-cloud/PORTAIL-DUO/refs/heads/main/Muscu/README.md` |

Le fichier s'appelle `index.html` dans le dépôt (contrainte GitHub Pages), et `muscu-duo.html` dans les échanges. C'est le même fichier. Les anciens dépôts (`MUSCU-DUO`, et avant lui `PLANNING-CAB-LISA`) sont obsolètes — ne plus s'y référer.

## Méthode de travail avec Claude

**Avant toute nouvelle demande de modification ou question, Claude demande d'abord** s'il faut (1) lire le fichier via le lien RAW ci-dessus, (2) repartir du dernier HTML déjà présent dans la discussion, ou (3) simplement répondre/expliquer sans toucher au code. Cette règle remplace l'ancien réflexe de relecture automatique à chaque tour.

Points à connaître, tous vérifiés :

- **Seul `raw.githubusercontent.com` est lisible.** Le lien « Raw » de `github.com` et la page `/branches` sont bloqués aux robots. La page `/blob/` du fichier s'arrête à la ligne 1000 et peut servir un rendu en cache périmé — ne pas s'y fier.
- **La lecture porte sur ce qui est poussé**, jamais sur les modifications locales non commitées.
- **Le fichier complet est rendu, pas un correctif** : appliquer un diff à la main dans un fichier de cette taille sur téléphone est le meilleur moyen d'introduire une erreur.
- **Regrouper les demandes** dans une même session reste plus efficace que d'ouvrir cinq discussions pour cinq petites modifications.
- **Les suites de tests ne survivent pas d'une session à l'autre.** Elles sont réécrites au besoin, en couvrant la zone touchée — d'où l'importance de la section « Tests » plus bas.
- ⚠️ **Un fichier de travail peut déjà contenir des changements non demandés dans le tour en cours.** Plusieurs fois pendant ce projet, la reprise d'une demande a révélé qu'une fonctionnalité entière (parfois bien conçue, parfois incomplète ou buguée) existait déjà dans le fichier sans avoir été annoncée. Toujours **auditer avant de coder par-dessus** : grep les noms de fonctions probables, lire ce qui existe, tester, puis compléter ou corriger plutôt que réécrire à l'aveugle.

## Contraintes techniques à toujours respecter

- **Fichier HTML unique**, tout le CSS et JS dedans. Pas de framework, pas de bundler. Décision confirmée : le découpage en `style.css` / `app.js` serait techniquement possible (l'app est forcément servie en HTTP, sinon le `<script type="module">` ne fonctionnerait pas), mais on garde la propriété « un fichier qu'on dépose et qui marche ».
- Firebase SDK chargé **en CDN via `<script type="module">`**. Version : `firebasejs/12.18.0`.
- Robustesse LocalStorage obligatoire : try/catch + fallback mémoire (préférences locales et données de la séance en cours ; tout le reste est dans Firestore).
- **Tous les champs de saisie en `font-size:16px` minimum** : en dessous, Safari iOS zoome au focus.
- Cible : iPhone Safari. Voir « Bugs iOS déjà corrigés ».
- Avant toute livraison : `node --check` sur les quatre blocs `<script>` **et** les suites de tests (voir « Tests »).

## Architecture de navigation

```
[écran de connexion] → view-menu (Menu principal, 5 entrées)
├── Entraînement      → view-profile → view-session → view-exercises
│                                            └────── → view-archives ⇄ corbeille
├── Build Training    → view-builder (hub → formulaire)
├── Coach             → view-coach (fil de discussion, plusieurs conversations)
├── Suivi Progression → view-progress (onglets Entraînement / Poids & mensurations)
└── Réglages          → view-settings (compte, déconnexion)
```

**Retour par glissement.** Un balayage vers la droite déclenche le **bouton retour de l'écran actif** (`goBackFromActiveView`) plutôt qu'une table de destinations : le geste ne peut donc pas diverger du tap, y compris pour le rappel d'archivage. Neutralisé sur les champs, les boutons, les listes déroulantes, les barres segmentées et la zone de rédaction, ainsi que pendant la connexion et toute modale ouverte. Exige un geste franchement horizontal (`SWIPE_MIN_X`, `SWIPE_MAX_Y`, `SWIPE_MAX_MS`), sinon un défilement oblique déclencherait un retour.

`showView(viewId, direction)` gère l'affichage, le glissement et appelle systématiquement `adjustBottomSpacing()`. L'écran de chargement (splash de 2,5 s) a été retiré : l'app affiche directement l'écran de connexion ou le menu principal selon l'état d'authentification.

**Tous les écrans alignent leur contenu en haut**, via `.view-inner` — seul `view-exercises` a une structure différente (header collant + `main` + barre du bas).

## Jetons de design (CSS)

**Toute couleur, tout rayon et toute ombre passe par un jeton défini en tête du `<style>`.** Une valeur codée en dur plus bas est une anomalie.

- **Palette** : charcoal légèrement bleuté (`--bg:#0d1014`, `--card:#161b22`, `--card-2:#1e2530`), choisi pour évoquer l'acier laqué d'un rack sous néon plutôt qu'un gris neutre interchangeable.
- `--tint` / `--tint-strong` : voiles clairs posés sur les fonds (icônes, états sélectionnés). **Ils s'inversent en thème clair.**
- `--sheen` : reflet blanc des animations de balayage (passe toujours sur une surface colorée).
- **Rayons**, cinq crans + pilule : `--r-xs` 4px (jauges), `--r-sm` 10px (champs), `--r-md` 14px (boutons), `--r-lg` 18px (cartes), `--r-xl` 22px (modales), `--r-pill`. **La taille encode la hiérarchie.**
- **Ombres** : `--shadow-sm`, `--shadow`, `--shadow-lg`. Rien d'autre.
- **Durées** : `--t-fast` .14s, `--t-mid` .22s.
- Identité : `--corentin` `#1f8fff`, `--lisa` `#ff3d7e`, `--done` `#12b981`, `--danger` `#ef4444`. `--accent` suit le profil actif. Couleurs plus saturées que la version d'origine (`#4c8dfb` / `#f2599e`), issues de la refonte visuelle « Ardoise & craie ».

### Identité « Ardoise & craie »
Choisie après présentation de 3 pistes (bleu technique/blueprint, ardoise & craie, carnet à grille). Éléments distinctifs :
- Police **Bebas Neue** (Google Fonts CDN) réservée aux titres/gros chiffres : titres de menu, titre de séance, titre de connexion, valeur cumulée à vie. Le texte courant et les champs de formulaire restent sur la pile système, pour éviter les régressions Safari iOS déjà rencontrées avec des polices custom sur les inputs.
- Texture fine de poussière de craie sur le fond, en thème sombre uniquement.
- Badge de record personnel : traitement en pointillés, légèrement incliné.
- ⚠️ Un essai de barre d'onglets persistante en bas d'écran (Accueil/Entraînement/Progression/Coach), pour remplacer le menu principal plat, a été testé puis **rejeté** après visualisation en conditions réelles. Le menu principal est resté à ses 5 boutons d'origine (Entraînement, Build Training, Coach, Réglages, Suivi Progression) — ne pas réintroduire cette barre sans qu'on le redemande.

### Couche « Fonte & Craie » (17/09/26)
Ajoutée par-dessus l'identité « Ardoise & craie » ci-dessus, sans la remplacer — après exploration de plusieurs maquettes (dont une inspirée du design Winamax), le choix retenu garde le rouge/or comme touche de marque ponctuelle plutôt que comme habillage global.

- Nouveaux jetons : `--brand` (rouge), `--brand-dark`, `--brand-glow`, `--gold`. Définis en thème sombre **et** clair (rouge légèrement assombri en clair pour le contraste).
- **Principe strict : `--brand`/`--gold` n'apparaissent que là où aucune couleur de profil n'a de sens.** `--accent` (bleu Corentin / rose Lisa selon le profil actif) reste inchangé partout ailleurs — c'est le même arbitrage que celui déjà tranché dans « Accent personnalisable » (voir Abandonné, plus bas) : le bleu et le rose ne sont pas décoratifs.
- Trois applications concrètes :
  - Bouton de connexion et lueur de fond de l'écran de connexion : `var(--corentin)` → `var(--brand)` (avant le choix d'un profil, une couleur de profil n'a pas de sens ici).
  - Bouton « Entraînement » du menu principal (`.big-choice-btn.primary`, classe ajoutée uniquement sur ce bouton) : dégradé rouge, pour distinguer visuellement l'action la plus utilisée des 4 autres.
  - Badge de record personnel (`.pr-badge`) : vert (`--done`) → or (`--gold`). Le vert reste réservé à « série validée / séance complète » (coche, jauge) ; un nouveau record est désormais un événement visuellement distinct, pas une variante de la validation.
- Sauvegarde faite avant coup : `Muscu/backups/index-2026-09-17-avant-fonte-craie.html` et `README-2026-09-17-avant-fonte-craie.md`, dans ce même dépôt.

**Extension (17/09/26, même jour)** : le rouge de marque a été étendu à tous les boutons d'action et indicateurs qui ne dépendent pas de quel profil consulte l'écran — la ligne de partage retenue :
- **Passent en `--brand`** (rouge) : jauge de progression pendant une séance (dégradé rouge → or), cible d'un exercice (`.exercise-target`), sélection du mode de charge (barre/haltères/un bras), bulle utilisateur et bouton d'envoi du chat coach, barre "le coach écrit", boutons du bilan coach, ligne de motivation de la modale d'export, bouton "Archiver" de fin de séance, bouton "Enregistrer la séance" et "+ Créer une nouvelle séance" du Build Training.
- **Passent en `--gold`** : le mini-badge d'historique `.hist-record` et l'étiquette `.s-tag` ("modifiée") — cohérence avec `.pr-badge`, déjà en or.
- **Restent en `--accent`** (bleu Corentin / rose Lisa selon le profil actif) : tout l'écran Suivi Progression (courbe, valeur cumulée, sélecteurs, mensurations) et l'écran de choix de séance — ces écrans affichent spécifiquement les données ou le contexte d'un profil, la teinte y reste une information utile, pas une décoration.

**Application complète (17/09/26, même jour, sur demande explicite)** : après validation du concept sur l'ensemble des écrans de la maquette, le rouge de marque a finalement été étendu à tout ce qui restait en `--accent`, y compris le Suivi Progression et le choix de séance — icône et sélection de séance, jauge de mesure corporelle en formulaire, focus de tous les champs texte, courbe de progression (SVG généré par `buildChartSvg`), cumul à vie, sélecteurs de période. `--accent`/`--accent-rgb` (calculés par `applyThemeColor()`) ne pilotent plus aucun style visible : ils ne restent utilisés que là où le bleu/rose identifie littéralement un profil (sélecteur Corentin/Lisa, bascule de profil dans Réglages) — cette partie-là n'a pas été touchée. `applyThemeColor()` et `setProperty('--accent'...)` sont laissés en place tels quels (inertes pour le style, mais appelés ailleurs) plutôt que retirés, pour ne pas toucher à la logique JS au passage d'une demande purement visuelle.

**Éléments manquants ajoutés (17/09/26, même jour)** : la première passe n'avait touché que des couleurs sur des éléments déjà existants ; ce qui restait propre à la maquette (des éléments visuels absents du HTML, pas de simples jetons de couleur) a été ajouté :
- **Carte "hero" du menu principal** (`#menu-hero`) : tonnage cumulé de Corentin et de Lisa côte à côte, sous le titre "Menu principal". Réutilise `getLifetimeStats(profile)` (la même fonction que le cumul de Suivi Progression) pour les deux profils à la fois — pas de nouveau calcul, juste un nouvel affichage. Rafraîchie par `renderMenuHero()`, appelée dans `goToMenuView()` et sur l'événement `archives-updated` quand le menu est l'écran actif.
- **Chevrons `›`** sur les 5 boutons du menu principal (`.choice-chev`), et **badge "🔥 Aujourd'hui"** sur le bouton Entraînement (`.badge-tag`, purement visuel, aucune donnée calculée derrière pour l'instant).
- **Icônes de mode de charge** (`EQUIPMENT_ICONS`) : chaque bouton barre/haltères/machine/poulie affiche désormais un petit pictogramme en plus du texte, en `currentColor` (gris au repos, rouge de marque une fois sélectionné) — purement décoratif, aucun effet sur le calcul du tonnage.
- Volontairement **non ajouté** : l'écran de chargement (splash) de la maquette, puisque l'écran de chargement réel a été retiré de l'app avant cette session (voir note plus haut) — le réintroduire serait une décision séparée, pas une simple reprise de couleur.

**Correction de fond (17/09/26, même jour, suite à un retour "ça ne ressemble pas au concept")** : les passes précédentes changeaient des couleurs ponctuelles mais laissaient deux jetons transversaux sur leurs valeurs d'origine, ce qui donnait un rendu encore bleu-gris (« Ardoise ») malgré tout le reste :
- `--tint`/`--tint-strong` (voile posé sur les fonds d'icônes, en-têtes de carte d'exercice, états sélectionnés) : bleuté à l'origine → teinté rouge de marque. Ce jeton est utilisé à plus de 10 endroits (icônes du menu, icône de séance, en-tête de chaque carte d'exercice…), donc ce changement à lui seul rougit une grande partie de l'app d'un coup.
- `--border`/`--border-strong` (contour de **toutes** les cartes/boutons) : bleu-gris à l'origine → blanc neutre, comme dans la maquette. Enlève le liseré froid systématique.
- **Bebas Neue étendue** aux noms d'exercice (`.exercise-name`), noms de séance (`.s-label`), titres d'archive (`.archive-title`) et noms de séance dans le hub Build Training (`.builder-hub-name`) — jusque-là en police système malgré la maquette, qui les affiche tous en capitales condensées. `.s-tag` ("modifiée") garde explicitement la police système pour rester lisible à sa petite taille.

**Correction de fidélité à la maquette (17/09/26, même jour, suite à un nouveau retour "je ne le retrouve pas")** : en comparant ligne à ligne le CSS de la maquette avec le code réel, une vraie erreur est ressortie — l'extension de Bebas Neue faite juste avant (noms d'exercice, de séance, d'archive, de hub) ne correspondait PAS à la maquette : celle-ci réserve Bebas Neue aux titres d'écran (menu, séance, profil) et garde les noms d'éléments de liste en police système grasse. Revenu en arrière sur ces 4 éléments. Deux vrais écarts corrigés dans la foulée :
- **Badge de record** (`.pr-badge`) : la maquette utilise une pastille propre (fond `--card-2`, liseré or fin, pas de pointillés ni de rotation) — pas le motif "marqué à la craie" de l'ancienne identité, qui a été retiré ici.
- **Bouton "Séance terminée"** (`.btn-export`) : passé en Bebas Neue majuscules, comme `.bb-finish` dans la maquette — jusque-là en police système malgré son rôle de bouton d'action principal.

**Corrections à partir de captures d'écran réelles (17/09/26, même jour)** : comparaison directe maquette / vraie app, avec captures fournies par Corentin — nettement plus fiable que deviner sur le seul CSS. Trois écarts confirmés et corrigés :
- **Écran "Qui s'entraîne ?"** : les icônes Corentin/Lisa restaient neutres (jamais bleues/roses) car leur couleur dépendait de `.big-choice-btn.corentin.selected`, une classe que `selectProfile()` ne pose en réalité jamais (il change d'écran immédiatement après le tap). Ajouté une coloration inconditionnelle `.big-choice-btn.corentin .choice-icon` / `.lisa .choice-icon`, sans dépendre de `.selected`.
- **Toggle de profil dans Réglages** : partage la classe générique `.segmented-btn` avec les onglets/périodes de Suivi Progression. Le passage de cette classe au rouge de marque avait fait perdre la couleur d'identité (bleu/rose) à ce toggle précis, alors que c'est justement l'endroit où elle a un sens réel. Ajouté des classes `.segmented-btn.corentin`/`.lisa` posées uniquement sur ce toggle (`renderSettingsProfileToggle()`), avec leurs propres couleurs — le reste du composant partagé (onglets, période) reste en rouge de marque.
- **Bouton "Séance terminée"** : passé de `rgba(var(--brand-rgb), 0.28)` (translucide, qui donnait un rendu marron terne sur fond sombre à l'écran) à `var(--brand)` plein, avec la lueur `--brand-glow` — comme `.bb-finish` dans la maquette.

Point encore incertain, à confirmer avec une capture : la bulle de réponse du coach semble ne montrer aucun fond de carte visible sur la capture fournie, ce qui différerait de `.chat-msg.coach{background:var(--card); border:1px solid var(--border);}`. Pas encore corrigé faute de certitude sur la cause. **Confirmé sans suite (17/09/26)** : juste un effet de la capture, rien à corriger.

**Nouvelle vague de captures (17/09/26, même jour)** : deux écarts concrets identifiés et corrigés.
- **Icône "Bas du corps"** (`ICON_LEGS`) : jusque-là un dessin de "jambe de pantalon" (deux formes verticales), jugé pas clair ("les logos ne sont pas les bons") comparé à la maquette. Remplacée par le même barbell que `ICON_UPPER`, tourné à 90° — cohérent avec le langage graphique déjà en place (menu, réglages) plutôt qu'une icône inédite.
- **Graphique de progression** (`buildChartSvg`) : la maquette a trois lignes de repère horizontales et met en évidence le point le plus récent (rempli, liseré or, légèrement plus gros) pendant que les autres points restent creux (fond `--card`, contour rouge). Le graphique réel n'avait ni l'un ni l'autre — tous les points étaient des disques rouges pleins identiques, sans ligne de repère. Ajouté les deux.

### Retrait du rouge de marque « Fonte & Craie » (18/09/26, sur demande explicite)

Le rouge de marque introduit par toute la séquence « Fonte & Craie » ci-dessus (`--brand`, `--brand-dark`, `--brand-glow`, `--brand-rgb`) a été **entièrement retiré**. L'app entière suit désormais `--accent` (bleu Corentin / rose Lisa selon `currentProfile`, bleu par défaut avant tout choix de profil) partout où `--brand` était utilisé — y compris l'écran de connexion, le bouton « Entraînement » du menu, la jauge de progression, le mode de charge, le fil du coach, les boutons de fin de séance, Build Training, et l'onglet Suivi Progression.

- `--tint`/`--tint-strong` (voile des icônes et en-têtes de carte) suivent maintenant `--accent-rgb` au lieu d'un rouge fixe : `rgba(var(--accent-rgb), 0.07)`, calculé automatiquement puisque les variables CSS personnalisées se recalculent en cascade quand `--accent-rgb` change en JS — pas besoin de re-render manuel de `--tint` lui-même.
- **Nouveaux jetons** `--corentin-dark` (`#1a5fc4`) et `--lisa-dark` (`#c4225f`), promus depuis des valeurs jusque-là codées en dur dans les dégradés de `.big-choice-btn.corentin/.lisa .choice-icon`. `--accent-dark` et `--accent-glow` (`rgba(var(--accent-rgb), 0.30)`, `0.22` en thème clair) remplacent `--brand-dark`/`--brand-glow`, avec une valeur par défaut au niveau `:root` (bleu Corentin) pour rester valides avant même le premier appel JS.
- `applyThemeColor()` pilote désormais `--accent-dark` en plus de `--accent`/`--accent-rgb`. `renderProgressView()` fait de même **localement sur `#view-progress`**, indépendamment du profil actif (`progressProfile`, pas `currentProfile`) — sans ça, un `--brand`→`--accent` dans un élément de cet écran (ex. `.body-input-card.primary`) aurait suivi le mauvais profil.
- Fond de la carte « hero » du menu (`#1a0d10`, rouge-brun codé en dur, anomalie au regard de la règle « toute couleur passe par un jeton ») → `linear-gradient(140deg, var(--card-2), var(--card) 55%)`, neutre.
- **`--gold` n'est pas concerné** : le badge de record (`.pr-badge`) et l'étiquette « modifiée » (`.s-tag`) restent en or, seul le rouge a été demandé en remplacement.
- Tous les commentaires qui décrivaient l'usage du rouge (`.app-title-brand`, jauge de séance, icônes d'équipement, lueur de connexion, bouton « Séance terminée », toggle de profil dans Réglages…) ont été mis à jour pour refléter `--accent`.

### Carte « hero » du menu : compteur du haut remplacé (18/09/26)

Le compteur « Série en cours » (jours consécutifs d'entraînement, `computeTrainingStreak()`) a été retiré à la demande de Corentin et remplacé par le **nombre total de séances faites, en moyenne par personne** : `Math.round((sessions Corentin + sessions Lisa) / 2)`, réutilisant les `sessions` déjà renvoyés par `getLifetimeStats()` (aucun nouveau calcul). Le badge 🔥, spécifique à la série de jours, a été retiré avec lui (markup et règle CSS `.menu-hero-flame`). `computeTrainingStreak()` a été supprimée (code mort, plus aucun appelant).

Les deux puces du bas (tonnage Corentin / Lisa) n'ont **pas été modifiées** : elles affichaient déjà `getLifetimeStats(profile).tonnage`, soit le tonnage cumulé sur **toutes** les archives actives du profil, sans filtre de date — c'est-à-dire déjà « le tonnage total depuis le début », ce qui correspondait à la demande sans qu'aucun changement de code ne soit nécessaire.

## Icône d'application

Générée d'après l'ancien écran de chargement (fond charcoal, dégradé radial bleu à gauche / rose à droite, haltère centré) — écran aujourd'hui retiré, mais l'icône en garde le style. **Encodée en base64 dans le HTML** pour tenir la contrainte du fichier unique.

Avec `apple-mobile-web-app-capable`, « Ajouter à l'écran d'accueil » ouvre l'app en plein écran, sans la barre Safari.

Deux pièges :
- iOS met les icônes d'accueil **en cache très agressivement** : pour voir un changement, supprimer le raccourci et le recréer.
- Si iOS refusait le base64, déposer `icon.png` à côté de `index.html` et remplacer les deux `href="data:image/png;base64,…"` par `href="icon.png"`. L'icône source est reproductible : script PIL + numpy, dégradé radial calculé pixel par pixel, centre du motif vérifié au demi-pixel.

## Programme fixe (SESSIONS) et surcharges

4 séances codées en dur (`s1` à `s4`) : `label`, `title`, `muscleIcon`, `cardio`, `exercises[]` avec `{ name, sets, target:{corentin,lisa}, logType? }`.
- `logType:'circuit'` → pas de charge, une seule case libre (voir « Circuits »).
- `equipment` déclare, par exercice, les méthodes plausibles (voir « Équipement » plus bas) — absent ou à une seule entrée pour la plupart des exercices, plusieurs entrées seulement là où c'est réellement pratiqué.

**Les 4 séances sont modifiables**, uniquement depuis le hub Build Training (voir plus bas). Éditer l'une d'elles enregistre une **surcharge** dans `customSessions`, sous le **même id** (`s1`…), qui prend le pas sur la version codée en dur. Trois conséquences voulues :

- aucune collection ni règle Firestore supplémentaire ;
- les archives référencent `sessionId`, donc le tonnage par séance continue de fonctionner y compris sur les séances archivées avant modification ;
- c'est réversible : supprimer la surcharge (bouton ↺) restaure l'original.

Points d'implémentation :
- `getSession(id)` consulte **d'abord** la surcharge, puis `SESSIONS`.
- `getPureCustomSessions()` exclut les surcharges de la liste des séances personnalisées, sinon `s1` apparaîtrait deux fois.
- `decorateSession()` récupère le `muscleIcon` de l'originale : le SVG n'est pas stocké en base.
- À l'enregistrement, le `title` d'une séance fixe est **repris tel quel** — écraser le sous-titre par « Séance personnalisée » perdrait « Bas du Corps (Quads & Fessiers) ».
- Une séance fixe n'a **pas** de 🗑️ : elle ne doit pas pouvoir disparaître. Le ↺ n'apparaît que si une surcharge existe, et la ligne porte une étiquette « modifiée ».

## Firebase / Firestore / Authentification

- **Projet** : `duo-training-e835b`.
- **La base est fermée.** Les règles exigent `request.auth != null` sur toutes les collections. Un **compte unique** (e-mail/mot de passe) est utilisé sur les deux téléphones.
- ⚠️ **Les abonnements `onSnapshot` sont regroupés dans `subscribeAll()` et ne démarrent qu'après `onAuthStateChanged`.** S'abonner avant la connexion provoquerait un `permission-denied` sur chaque écoute.
- **Le mode hors-ligne survit** : Firebase conserve la session localement, donc après une première connexion l'app fonctionne en salle sans réseau.
- **Champs d'une archive** : `id, dateLabel, timeLabel, createdAt, profile, sessionId, sessionLabel, sessionTitle, exportText, sessionNote, tonnage, exerciseNames, rawSets, variants` — plus `coachFeedback` et `coachProfile` après un bilan. ⚠️ `variants` a été ajouté tardivement : sans lui, un poids archivé ne disait pas s'il était par main. Les archives antérieures ne l'ont pas.
- **Collections** : `archives`, `customSessions`, `coachChat`, et `settings` (document `coach` uniquement — les conversations du coach vivent dans son champ `threads`, pas dans un document séparé, voir ci-dessous). La corbeille (`deletedAt`), le catalogue d'exercices (dérivé), les surcharges de séances fixes et le suivi corporel n'ont demandé aucune collection supplémentaire.
- Règles à publier (console → Firestore → Règles) :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /archives/{id}        { allow read, write: if request.auth != null; }
    match /customSessions/{id}  { allow read, write: if request.auth != null; }
    match /coachChat/{id}       { allow read, write: if request.auth != null; }
    match /settings/{id}        { allow read, write: if request.auth != null; }
    match /{document=**}        { allow read, write: if false; }
  }
}
```

⚠️ **Ordre des opérations** : créer le compte AVANT de publier les règles, sinon l'app affiche un écran de connexion qu'aucun identifiant n'ouvre.

- **Persistance hors-ligne** : `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`, repli sur `getFirestore(app)` si IndexedDB manque. ⚠️ `enableIndexedDbPersistence` est **déprécié**, ne pas y revenir.
- **Écritures offline-first — la règle la plus importante du fichier** : Firestore ne résout la promesse de `setDoc`/`deleteDoc` qu'**après confirmation du serveur**. Hors ligne elle reste pendante indéfiniment alors que l'écriture est en cache. **Ne jamais mettre à jour l'interface dans un `.then()`** : agir immédiatement, et n'utiliser le `.catch()` que pour rattraper une erreur.
- **Marqueurs de chargement** : `window.__archivesLoaded`, `window.__customSessionsLoaded`, `window.__coachSettingsLoaded`, posés au premier snapshot, pilotent les squelettes.
- Caches : `window.archivesCache`, `window.archivesTrashCache`, `window.customSessionsCache`, `window.coachSettingsCache`, `window.coachChatCache`. Événements `archives-updated`, `custom-sessions-updated`, `coach-settings-updated`, `coach-chat-updated`.
- Pont module → script classique : `window.__fb = { db, doc, setDoc, deleteDoc }` et `window.__auth = { signIn, signOut, current }`.

### ⚠️ `settings/coach` est un document PARTAGÉ entre plusieurs fonctionnalités — incident réel

Le document `settings/coach` contient à la fois la clé API, le modèle, les conversations du coach (`threads`) et le suivi corporel (`body`). `setDoc` **remplace le document entier** : une écriture qui construit un objet neuf sans reprendre les champs existants **efface silencieusement tout le reste**.

**C'est arrivé en production** : `saveCoachSettings()` écrivait `{ apiKey, model, weights }` sans fusionner — chaque enregistrement des réglages effaçait la liste des conversations. Les messages (dans `coachChat`, une collection séparée) survivaient, mais devenaient inaccessibles faute de conversation à laquelle se rattacher.

Deux garde-fous en place depuis :
- **Toute écriture sur `settings/coach` doit fusionner** : `Object.assign({}, coachSettings(), { ...champs modifiés })`, jamais un objet construit à neuf. `saveCoachSettingsRemote(next)` refait lui-même ce merge en filet de sécurité, mais ne compte pas dessus pour écrire n'importe quoi en amont.
- **Miroir local des conversations** (`backupChatThreads`, `COACH_THREADS_BACKUP` dans le wrapper `storage`) : à chaque snapshot de `settings/coach`, la liste des conversations (noms + rôles) est dupliquée sur le téléphone. `repairChatThreads()`, appelée à l'ouverture de l'écran Coach, restaure depuis ce miroir toute conversation manquante ou amputée de son rôle. Si le miroir est vide, elle reconstruit au moins l'identifiant et un nom (« Récupérée : … ») depuis les messages orphelins de `coachChat` — mais le rôle, lui, est alors perdu pour de bon.
- **`{ merge: true }` sur toutes les écritures de `settings/coach`** (20/09/2026) : `saveCoachSettingsRemote()` et l'import JSON. Le « merge à la main » depuis le cache local ne suffisait pas : le même jour, `body` (mensurations), puis `apiKey` et `model`, ont été effacés par des écritures parties d'un cache incomplet. `body` a été restauré depuis une version antérieure lue avec `readTime` (voir `PROBLEMES_RESOLUS.md`). ⚠️ La base n'a **pas** de PITR : la fenêtre de lecture dans le passé n'est que d'**1 heure**. Faire « Exporter toutes les données » de temps en temps.

## Écran de saisie

### Champs
- Poids / Reps / ✓ par série, avec bouton ⇊ de recopie à partir de la série 2.
- ⚠️ **Champs numériques en `type="text"` + `inputMode`**, jamais `type="number"` : avec un clavier français, « 22,5 » est jugé invalide par Safari et `input.value` renvoie une chaîne vide. `sanitizeField()` filtre à la frappe ; **`parseNum()` (virgule → point) pour tout calcul**, jamais `parseFloat`.
- Note « 🗒️ Info » par exercice, et sélecteur de méthode (équipement) sur les exercices qui en ont plusieurs de plausibles — voir « Équipement » plus bas.

### Séries d'échauffement (additives, pas un état)
Un échauffement **s'ajoute** avant les séries de travail, il ne peut pas en remplacer une. Sur 4 séries de travail prévues, ajouter 2 échauffements laisse bien 4 séries de travail numérotées 1 à 4 — jamais 2.

- Clés séparées : `ex<idx>_warm<n>`, distinctes de `ex<idx>_set<n>`. Cette seule différence de format de clé suffit à les exclure automatiquement du tonnage, des records et de la progression : aucun filtre sur un champ `kind` n'est nécessaire.
- `warmupCount(data, ex, exIdx)` lit le nombre actuel (stocké dans `data.warmups[exIdx]`, plafonné à 4) ; `setWarmupCount(ex, exIdx, n)` l'écrit et nettoie les clés au-delà de `n`.
- Bouton « + Ajouter un échauffement » sous les lignes existantes, tant que le compte est < 4.
- ⚠️ **Le bouton retirer (×) n'apparaît que sur la DERNIÈRE ligne**, jamais sur toutes. Une première version en mettait un sur chaque ligne : retirer la première effaçait silencieusement les suivantes aussi, puisque la donnée sous-jacente est un compteur, pas une liste adressable une par une. Un seul bouton, sur la dernière ligne, retire toujours celle qu'on vient d'ajouter — sans ambiguïté.
- Champs identiques aux séries de travail (poids, reps, RPE si activé, ✓), sans bouton de recopie.
- Export : « Échauffement 1 : 40 kg x 10 reps ✅ », toujours avant les « Série N » du même exercice.

### RPE
Toujours actif, aucun réglage à activer — une case laissée vide ne coûte rien. Menu déroulant (`buildRpeSelect`, valeurs 1 à 10 plus une case vide), pas un champ de texte libre : impossible de taper une valeur hors plage, et sur iPhone il s'ouvre en molette plein écran. Un réglage existait pour le masquer par défaut ; retiré, `rpeEnabled()` renvoie désormais toujours `true`.

⚠️ Les **types de série** (travail / dégressive / échec, avec un cycle au clic sur le numéro) ont existé un temps puis ont été explicitement retirés : jugés inutiles à l'usage. Ne pas les réintroduire sans qu'on le redemande — le numéro de série est un simple repère, rien d'autre.

### Circuits (`logType:'circuit'`)
Grille : `Tour | Résultat | ✓`, avec **une seule case de texte libre** par tour (champ `info` sur la série). Deux cases chiffrées avaient été essayées puis abandonnées : un circuit enchaîne des mouvements de natures différentes — des répétitions pour l'un, des secondes pour l'autre — et aucun couple de champs numériques ne peut représenter ça. On note « 14 relevés + 50 s de gainage » dans les mots de l'exercice.

Les anciennes saisies `reps` / `duration` sont recomposées à l'affichage et à l'export (« 12 reps + 45 s ») : rien n'est perdu.

La consigne d'origine reste dans le nom de l'exercice et dans la cible (« 3 tours »). Les circuits sont exclus du tonnage, des records, du rappel de dernier poids, de l'équipement et des échauffements — sans charge, aucun de ces calculs n'a de sens.

### Équipement (`EQUIPMENT_METHODS`) — refonte du 14/09/26

⚠️ **Remplace l'ancien système `LOAD_MODES` / `equipmentOptions`**, retiré. Deux listes séparées et volontairement indépendantes, décidées après un incident concret (voir plus bas) :

**Liste A — mécanique de calcul, fermée à deux valeurs.** Le matériel n'est pas le bon critère : la seule question qui change le calcul est *« une charge dans chaque main, ou une charge partagée ? »*
- Deux haltères de 22,5 kg × 10 → chaque répétition déplace 45 kg → 450 kg.
- Poulie à 22,5 kg, 10 à droite puis 10 à gauche → 20 répétitions → 450 kg.
- Simultané ou alterné, le total est le même. Le facteur est **×2, pas ×4** — doubler à la fois le poids et les répétitions compterait chaque kilo deux fois.

**Liste B — vocabulaire équipement, ouverte (`EQUIPMENT_METHODS`).** Chaque entrée pointe vers l'une des deux valeurs de Liste A et porte sa **propre phrase d'aide**, même à facteur identique — « la charge totale (barre + disques) » et « la charge totale affichée sur la poulie » ne se confondent pas, même si toutes deux valent ×1.

| id | Libellé | Facteur |
|---|---|---|
| `barre` | Barre | ×1 |
| `haltere` | Haltères | ×2 |
| `machine` | Machine | ×1 |
| `poulie2` | Poulie 2 mains | ×1 |
| `poulie1` | Poulie unilatérale | ×2 |

**Chaque exercice porte un champ `equipment: [...]`** (ordre = méthode par défaut en premier) :
- **Absent ou une seule entrée** → méthode fixe, aucun sélecteur affiché, facteur figé (ex. `Squat: ['barre']`, `Leg Extension: ['machine']`). La grande majorité du catalogue est dans ce cas.
- **Plusieurs entrées** → sélecteur affiché (`.variant-row`), un bouton par entrée. Exercices concernés aujourd'hui : Développé incliné (`haltere`/`barre`/`machine`), Élévations latérales (`haltere`/`poulie1`/`machine`), Tirage horizontal et Tirage vertical (`poulie2`/`poulie1`), Hip Thrust (`barre`/`machine`), Développé militaire assis (`haltere`/`machine`).

⚠️ **Changement de philosophie assumé sur la présélection.** L'ancien modèle n'avait *aucune* présélection ("on arrive sur un exercice vierge, rien de coché, facteur ×1 par défaut"). Ce choix a provoqué un vrai bug de données : le Développé militaire assis, toujours fait aux haltères en pratique, n'a jamais eu sa variante sélectionnée — chaque séance a donc été comptée ×1 au lieu de ×2, sous-évaluant son tonnage de moitié pendant des mois avant d'être détecté à l'occasion d'une migration de catalogue (voir plus bas). Le nouveau modèle **présélectionne la première entrée de `equipment`** tant que rien n'a été choisi explicitement (`getExerciseEquipmentId`) : la méthode réellement pratiquée par défaut porte le bon facteur dès la première utilisation, sans dépendre d'un tap que personne ne pense à faire. Il reste possible de changer de méthode à tout instant ; le bouton actif ne se désactive plus au second tap (il n'y a plus d'« état vierge » vers lequel revenir, il y a toujours une méthode par défaut).
- Chaque bouton porte sa conséquence **en toutes lettres**, avec un exemple chiffré dans le champ `hint` de `EQUIPMENT_METHODS` — un simple `×2` ne disait pas quoi taper.
- L'en-tête des colonnes devient « Poids / main » et « Reps / bras » quand la méthode active double (`equipmentFactor(ex, exIdx, data) === 2`).
- ⚠️ **La saisie n'est jamais modifiée.** Le doublement n'intervient qu'au calcul (tonnage, record, courbe). Le record reste 22,5 kg par haltère, et le rappel de dernier poids propose bien ce qu'il faut charger de chaque côté.
- **Sur une archive**, la méthode plausible d'un exercice est retrouvée par son nom via `equipmentListForExerciseName()` (cherche dans `SESSIONS` puis `customSessionsCache`) — un nom disparu du catalogue retombe sur ×1, comme le faisait déjà l'ancien modèle pour un cas inconnu.

### Build Training — méthodes possibles d'un exercice
L'ancienne case unique « Proposer variante Haltères / Poulie » (`hasEquipmentOptions`), qui forçait toujours les 3 mêmes options sans effet réel sur le calcul, est retirée. À la place : une case à cocher **par méthode de `EQUIPMENT_METHODS`** sous chaque exercice non-circuit. Cocher une ou plusieurs cases construit le tableau `equipment` de cet exercice, dans l'ordre fixe du catalogue (`EQUIPMENT_METHOD_IDS`) — la première case cochée dans cet ordre devient la méthode par défaut. Aucune case cochée = exercice à charge déjà totale, ×1, pas de sélecteur à l'usage.

### Cardio
Proposé à la fin de **chaque** séance, y compris celles qui n'en prévoient pas (`dayProgram.cardio === null`) : la carte affiche alors « Cardio — Optionnel ».

- Non coché, la carte se réduit à sa ligne du haut (classe `collapsed`).
- ⚠️ **Décocher n'efface rien** : les champs sont masqués, pas vidés.
- Le cardio **optionnel** ne compte pas dans la progression ; le cardio **prévu** par la séance compte, lui, comme avant.
- L'export ne le mentionne que s'il est prévu ou coché ; un cardio fait en plus apparaît comme « Cardio (hors programme) ».
- Champs : minutes, % inclinaison, vitesse (⚠️ niveau affiché sur les tapis Basic Fit, pas des km/h), note libre.

### Note de séance
Distincte des notes par exercice : un champ en tête d'écran pour le contexte du jour (fatigue, douleur, matériel indisponible). Stockée dans `data.sessionNote`, reprise dans l'export et dans l'archive (`sessionNote`) — donc lue par le coach.

### Structure de la carte
Deux zones distinctes : `.exercise-headwrap` (fond teinté — nom, cible, historique, record) et `.exercise-body` (fond neutre — badge, mode de charge, échauffements, séries, note). Une carte dont toutes les séries de travail sont validées reçoit la classe `complete` : bordure verte et liseré sur la tranche gauche.

### Historique et records
- `getLastPerformance(profile, nom)` alimente les **placeholders gris** de chaque série et la ligne « Dernière fois : … ». Le placeholder n'est **jamais** une valeur : champ vide = vide dans l'export et dans le tonnage.
- `getPersonalRecord(profile, nom)` affiche le record et déclenche le badge vert dès qu'une saisie le dépasse. Calculé **sur les archives uniquement**, au sens du **volume** (poids × reps de la meilleure série, `bestSetByVolume`) — voir « Onglet Entraînement » plus bas.
- Les archives en corbeille sont exclues des deux. Les échauffements aussi (clés `_warm`, jamais lues par ces fonctions). Les circuits sont épargnés (pas de poids).
- ⚠️ **Bug corrigé** : pour un exercice en méthode « par main » (haltères / poulie unilatérale), la courbe de progression ne doublait pas le poids comme le fait le tonnage — elle affichait le poids d'une seule main. Corrigé en appliquant le même facteur (`archiveLoadFactor()`, ex-`loadModeInfo().factor`) à la lecture ; effet rétroactif sur toutes les archives où la méthode avait été enregistrée.

### Clés de données
- **Notes et variantes indexées par nom d'exercice** (`exerciseKey()` → `name:<nom>`), pas par position. `readByExercise()` lit le nouveau format avec repli sur l'ancienne clé numérique.
- **Les clés de séries de travail (`ex<idx>_set<n>`) restent indexées par position** : figées dans les archives, elles servent au graphique. Ne pas y toucher.
- **Les clés d'échauffement (`ex<idx>_warm<n>`)** suivent le même schéma positionnel, dans un espace de noms séparé.

### Undo
Snapshot **armé** au focus (`armUndoSnapshot`), **empilé à la première frappe réelle** (`snapshotBeforeEdit`). `pushUndoSnapshot` refuse d'empiler deux états identiques.

### Rappel d'archivage
`leaveExercisesView()` intercepte le retour. Si la séance contient des données non archivées, une modale rappelle que **rien n'est perdu** (tout est en LocalStorage) mais que la séance **ne comptera pas dans la progression**. Le message ne doit jamais parler de perte de données, ce serait faux.

« Plus tard » mémorise **l'état des données au moment du refus** (`leaveReminderDismissed`). Dès qu'une nouvelle saisie arrive, le rappel se réarme.

## Archives et corbeille

- Flux de fin de séance : « Séance terminée ✅ » → copier, ou archiver (vide la séance courante, fonctionne hors ligne).
- **Supprimer ne détruit rien** : on écrit un `deletedAt` et l'archive part en corbeille. Le vidage de la corbeille (`emptyTrash`) est le seul `deleteDoc` réel, sous confirmation explicite.
- **Pas de purge automatique** — décision assumée.
- Bascule Archives ⇄ Corbeille via `archivesMode`.

## Suivi Progression

Entrée du menu principal. **Un seul sélecteur Corentin/Lisa** (`progressProfile`, distinct de `currentProfile`) en tête, partagé par les deux onglets décrits ci-dessous — changer de profil ne fait pas sauter d'onglet, changer d'onglet ne fait pas sauter de profil.

```
Suivi Progression
├── Onglet « Entraînement »          (progress-training-panel)
│     Cumul → Que suivre (exercice ou tonnage) → Période → Courbe
└── Onglet « Poids & mensurations »  (progress-body-panel)
      Nouvelle mesure → Que suivre (quel champ) → Période → Courbe → Historique
```

`setProgressTab('training'|'body')` bascule l'affichage des deux panneaux. `goToProgressView()` réinitialise toujours sur l'onglet Entraînement.

### Onglet Entraînement
- **Cumul** en tête (`getLifetimeStats`) : tonnage total et nombre de séances, corbeille exclue.
- **Sélection** : un `<select>` natif (`renderProgressExerciseList`). Deux `optgroup` : « Tonnage par séance (N) » puis « Exercices (N) ». Option d'amorce « Choisis un exercice… » tant que rien n'est sélectionné. ⚠️ `font-size:16px` impératif sur `.progress-select`, sinon Safari zoome.
- **Métrique : le volume (poids × reps) de la meilleure série**, pas le poids max seul. Après comparaison entre poids max, 1RM estimé (formule d'Epley, jugée peu fiable au-delà de 12-15 reps) et volume, le volume a été retenu — 40 kg × 8 représente plus de charge totale que 45 kg × 5, ce qu'un simple poids max ne reflète pas. Changement appliqué de façon rétroactive (recalculé à la volée depuis `weight`/`reps` stockés) à trois endroits : le badge de record pendant la séance, cette courbe de progression, et le résumé du coach IA. ⚠️ Un commentaire resté dans le code (vers `getArchivedSessions`) mentionne encore l'ancienne règle « une seule métrique : le poids max » — code obsolète à corriger un jour, ne pas s'y fier.
- **Tonnage : une entrée par séance**, jamais un tonnage global. Clé `__tonnage__:<sessionId>` (`PROGRESS_TONNAGE_PREFIX`, `isTonnageKey()`, `tonnageSessionId()`). `getArchivedSessions()` liste les séances réellement archivées et retient le libellé de l'archive la plus récente.
- **Période** (`progressPeriod`) : 1 / 3 / 6 mois, ou tout.
- **Écart** (`getProgressDelta`) : gain absolu, pourcentage et contexte, vert / rouge / gris. Rien ne s'affiche sous deux points.
- **Étiquettes de dates** : au-delà de 8 points, une sur N seulement, première et dernière toujours conservées.
- ⚠️ Les mensurations ont été proposées un temps dans ce même menu (`optgroup` « Mensurations »), avant d'être déplacées dans leur propre onglet ci-dessous. Ne pas les remettre ici : ce serait la même donnée sélectionnable à deux endroits différents.

### Suivi par méthode (14/09/26)
Pour un exercice à plusieurs méthodes (`equipment.length > 1`, voir « Équipement » plus haut), un réglage **Méthode** apparaît au-dessus de la Période dans `progress-controls` — un bouton par méthode déclarée pour cet exercice (`EQUIPMENT_METHODS`).

- **Pas de vue « toutes méthodes confondues ».** Barre et haltères ne se comparent pas : `select.onchange` (menu d'exercice) retombe donc directement sur la **première méthode de la liste** (celle par défaut) dès qu'un exercice à plusieurs méthodes est choisi, jamais sur le nom brut de l'exercice. `getProgressPoints` sait techniquement encore construire une courbe mélangée à partir du seul nom (utile en interne, par exemple pour un exercice à méthode unique), mais plus aucun bouton de l'interface n'y mène pour un exercice à plusieurs méthodes.
- **Clé composée** `__method__:<exercice>||<méthode>` (`methodProgressKey`, `isMethodProgressKey`, `methodProgressExerciseName`, `methodProgressMethodId`) — même famille que les clés de tonnage (`__tonnage__:`), séparateur `||` choisi car aucun nom d'exercice n'en contient.
- `archiveExerciseMethodId(archive, nom)` retrouve la méthode réellement utilisée ce jour-là (même repli que `archiveLoadFactor` : première de la liste si rien de stocké/valide) ; retourne `null` si l'exercice n'a qu'une méthode fixe — pas de filtre pertinent dans ce cas.
- `getProgressPoints` ne garde, pour une clé méthode, que les archives où `archiveExerciseMethodId` correspond — chaque méthode a donc sa propre courbe, son propre record affiché, sa propre période.
- Le menu déroulant d'exercice ne propose qu'une entrée par nom — la méthode se choisit **après**, dans les boutons Méthode. `select.value` est donc réconcilié sur le nom de base même quand `progressSelection` est une clé méthode, sinon le menu retomberait visuellement sur l'amorce.
- **Portée volontairement limitée à cet onglet.** Le badge de record affiché pendant la saisie (`getPersonalRecord`) et le rappel « Dernière fois » (`getLastPerformance`) restent, eux, toutes méthodes confondues — les isoler par méthode aussi n'a pas été demandé et changerait un comportement déjà en place ailleurs.

### Courbe animée (14/09/26)
`buildChartSvg` (partagée par l'onglet Entraînement et l'onglet Corps) construit trois couches SVG plutôt qu'une ligne brisée nue :
- **Aire dégradée** sous la courbe (`<linearGradient>`, id unique par instance via `chartInstanceCounter` — les deux onglets peuvent avoir un graphique dans le DOM en même temps, l'un caché en `display:none`, un id partagé aurait été invalide) ; apparaît en fondu (`chartAreaIn`).
- **Ligne lissée**, bézier quadratique par segment (`smoothPath` : point de contrôle = point de donnée, extrémité = milieu du segment suivant) plutôt que des segments droits — beaucoup plus lisible sur peu de points qu'un zigzag. Elle se dessine progressivement (`chartLineDraw`, `stroke-dasharray:2000` — largement supérieur à toute longueur réelle de tracé sur ce graphique, donc la valeur exacte n'a pas besoin d'être calculée).
- **Points animés en cascade** (`chartDotIn`, `animation-delay` croissant par index) avec une légère lueur derrière chacun (`chart-dot-glow`).
- `prefers-reduced-motion: reduce` respecté comme partout ailleurs dans l'app : l'état par défaut sans animation est déjà l'état final (aire et points visibles, ligne complète).

### Étiquettes « poids × reps » et second graphique « tonnage total » (14/09/26)
La métrique volume (poids × reps × facteur) peut dérouter sans plus de contexte : une charge montée avec moins de répétitions peut faire *baisser* le volume affiché, ce qui a été pris pour un bug avant d'être compris. Deux réponses, complémentaires :

- **Étiquette explicite sur chaque point.** Quand un point porte le détail de sa meilleure série (`weight`/`reps`, ajoutés par `getProgressPoints` via `bestSetByVolume`), `buildChartSvg` affiche `"poids×reps"` (ex. `8×12`) au lieu du seul volume calculé — le chiffre brut du calcul reste dans le titre de la carte et dans l'écart en bas, mais l'étiquette du point dit directement ce qui a été soulevé ce jour-là.
- **Second graphique « tonnage total »** (`getExerciseTonnagePoints`), affiché sous le premier pour tout exercice suivi (jamais pour un tonnage de séance ni une mensuration, qui n'en ont pas besoin). Il additionne **toutes** les séries de l'exercice ce jour-là — comme le tonnage de séance, mais borné à ce seul exercice — plutôt que la seule meilleure. Une charge de travail totale en hausse malgré une meilleure série en baisse s'explique alors d'elle-même, sans texte explicatif à lire : les deux courbes, l'une à côté de l'autre, racontent chacune une partie de l'histoire.
- Le filtre par méthode (voir ci-dessus) s'applique aux deux graphiques de la même façon — chaque méthode a sa propre courbe « meilleure série » et sa propre courbe « tonnage total ».
- `chartInstanceCounter` (voir ci-dessus) garantit un id de dégradé distinct même avec deux cartes de graphique dans le même écran.

### Onglet Poids & mensurations
Sept mensurations en plus du poids : **Pec/Poitrine, Cuisse, Tour de fesse, Tour de hanche, Tour de taille, Bras, Tour d'épaule** (`BODY_FIELDS`, chacun `{ id, key, unit, label(profile) }`).

- **Le libellé de « pec » dépend du profil consulté** : « Poitrine » pour Lisa, « Pec » pour Corentin — même champ, même courbe, juste un mot qui change (`bodyFieldLabel(id, profile)`).
- **Une mesure est ajoutée à une date choisie**, pas seulement aujourd'hui (`<input type="date">`, pré-rempli à la date du jour). `saveBodyEntry()` calcule un timestamp `at` à midi ce jour-là.
- ⚠️ **Enregistrer fusionne avec l'entrée existante à cette date, ne la remplace jamais.** Une première version reconstruisait l'entrée entière à partir des seuls champs du formulaire : ajouter le tour de taille un jour où le poids avait déjà été noté effaçait ce poids, puisque son champ, laissé vide cette fois, écrasait la valeur précédente. Le code part maintenant de l'entrée existante (`Object.assign({...}, existingEntry)`) et ne remplace que les champs effectivement remplis.
- ⚠️ **Anciennes clés préservées** : les toutes premières mesures utilisaient `arm`/`waist`/`thigh` avant que les noms définitifs (`bras`/`taille`/`cuisse`) n'existent. `BODY_LEGACY_KEYS` fait le pont, `bodyEntryValue(entry, id)` lit la nouvelle clé avec repli sur l'ancienne — aucune mesure déjà enregistrée n'est perdue.
- **Sélection à tracer** (`renderBodySelect`) : un `<select>` qui ne propose que les champs réellement renseignés pour ce profil, avec `bodyProgressSelection` séparé de `progressSelection` (l'onglet Entraînement) — changer d'onglet ne perturbe pas l'autre.
- **Période dédiée** (`bodyProgressPeriod`, `setBodyProgressPeriod`) : indépendante de celle de l'onglet Entraînement.
- Le tracé (`renderBodyProgressChart`) réutilise `buildChartSvg`/`buildDeltaHtml`/`getProgressPoints`/`progressMetricInfo`, avec une clé `__body__:<champ>` (`bodyProgressKey`, `isBodyProgressKey`) pour distinguer une mensuration d'un exercice ou d'un tonnage sans risque de collision.
- **Historique** (`renderBodyList`) : une **carte par date** (`.body-history-card`) plutôt qu'une ligne de texte concaténé — chaque mesure du jour apparaît en puce colorée (`.body-chip`, même couleur que sa courbe, voir `BODY_FIELD_COLORS` ci-dessous), avec **modification** (✏️, `editBodyEntry` pré-remplit le formulaire, `cancelEditBodyEntry` annule ; `editingBodyAt` retient l'entrée en cours d'édition ; si la date est changée pendant l'édition, l'ancienne et la nouvelle entrée sont toutes deux prises en compte pour éviter un doublon) et suppression (`deleteBodyEntry`).
- Stocké dans `settings/coach.body[profil]`, un tableau d'entrées — voir l'avertissement sur `settings/coach` plus haut avant d'y toucher.

### Cases de saisie et graphique d'ensemble (refonte du 14/09/26)
- **Cases de saisie** (`.body-input-grid`, `.body-input-card`) : grille à 2 colonnes, unité affichée **dans** le champ plutôt que dans le seul libellé (`.body-input-unit` — kg ou cm en incrustation, pas besoin de relever les yeux). Date et poids sont en pleine largeur et mis en avant (bordure accent, classe `.primary`) : ce sont les deux champs renseignés à chaque mesure, les autres sont ponctuels.
- ⚠️ **La date reste un champ libre, jamais bloqué sur aujourd'hui** : `saveBodyEntry()` lit toujours `#body-date` tel quel, donc renseigner une mesure à une date passée (oubliée sur le moment, rattrapée plus tard) fonctionne exactement comme une mesure du jour — aucune mesure existante n'est requise pour changer la date, et la fusion par date (voir plus haut) s'applique de la même façon.
- **Couleur fixe par type de mesure** (`BODY_FIELD_COLORS`, `bodyFieldColor(id)`) — utilisée à la fois dans le graphique d'ensemble et les puces de l'historique : reconnaître une couleur dans l'historique suffit à retrouver sa courbe au-dessus, pas besoin de relire les libellés.
- **Graphique d'ensemble** (`renderBodyOverviewChart`, `buildBodyOverviewSvg`) : toutes les mesures renseignées superposées sur un même graphique, une courbe par type. ⚠️ **Chaque série est normalisée sur SA PROPRE plage min/max**, pas sur une échelle commune — mélanger un poids en kg et un tour de bras en cm sur les mêmes axes n'aurait aucun sens (le poids écraserait tout visuellement). Seule l'allure (monte/descend/stagne) se compare donc d'une courbe à l'autre ; les valeurs exactes restent lisibles via l'historique juste en dessous. L'axe des dates est **proportionnel au temps réel écoulé** (`xFor`, basé sur les timestamps `at`), pas un simple index par point comme `buildChartSvg` — des mesures prises à intervalles irréguliers s'alignent correctement.
- **Légende à bascule** (`body-legend-row`, `.body-legend-chip`) : une puce par mesure disponible, à la fois légende et interrupteur. `bodyVisibleFields` (un `Set`, ou `null` tant que rien n'a été touché) contrôle quelles courbes s'affichent — **`null` affiche tout par défaut**, comme demandé ; cliquer une puce la première fois calcule le `Set` complet puis retire/ajoute cette seule mesure, les autres restant visibles.
- `smoothPath()` (lissage bézier quadratique) est **partagé** entre `buildChartSvg` (une série) et `buildBodyOverviewSvg` (plusieurs séries superposées) — extrait en fonction commune pour ne pas en maintenir deux versions qui divergeraient.
- Animations cohérentes avec le reste de l'app : chaque courbe et ses points apparaissent en fondu avec un léger décalage par série (`body-overview-line`, `body-overview-dot`), `prefers-reduced-motion: reduce` respecté.

## Réglages

Compte connecté, bouton de déconnexion, et un **sélecteur de profil Corentin/Lisa explicite** (`renderSettingsProfileToggle`, bascule segmentée appelant `setProfile(id)` et `applyThemeColor()`, rendu depuis `goToSettingsView()`). Ajouté pour corriger un bug où le chat du coach affichait la mauvaise identité sur un appareil donné — le profil actif dépend maintenant d'un choix explicite ici, pas d'une déduction implicite. **Le poids de corps et les mensurations n'y vivent plus** — ils ont d'abord été conçus ici, avant d'être jugés plus à leur place dans Suivi Progression (voir ci-dessus), qui est l'endroit naturel pour un *suivi* dans le temps. Un réglage pour activer la colonne RPE y a aussi existé brièvement, avant que le RPE ne devienne actif en permanence.

### Sauvegarde / Import (migration du catalogue, 14/09/26)
Deux boutons pensés pour une migration ponctuelle du catalogue d'exercices (renommage, changement d'architecture équipement), pas pour un usage quotidien :

- **📤 Exporter toutes les données** (`exportFullDataJSON`) : sert dans la modale d'export existante (textarea + Copier) un JSON brut — archives actives et corbeille des deux profils, `customSessions`, et `settings/coach.threads`/`.body`. **Clé API et modèle du coach volontairement exclus** : inutiles à une migration, pas de raison qu'ils circulent dans un texte copié-collé. Distinct de `exportAllArchives()` (bouton dans Archives) qui, lui, sert un texte lisible par un humain, pas une donnée destinée à être retraitée.
- **📥 Importer ces données** (`askImportFullDataJSON` → confirmation via `showConfirm` → `importFullDataJSON`) : colle un JSON préparé pour réimport dans un `<textarea>`, et écrit **par id** (upsert) dans `archives` et `customSessions` — un id déjà existant est remplacé, un nouvel id s'ajoute. Ne supprime **rien par déduction** : seuls les ids listés explicitement dans `customSessionsToDelete` sont effacés (`deleteDoc`). `settings/coach` n'est touché que si le JSON contient `coachSettings.body`, et **toujours fusionné** (`Object.assign({}, coachSettings(), { body: ... })`) — jamais réécrit en entier, conformément à la règle du document partagé (voir plus haut). Écritures offline-first : pas d'attente de confirmation serveur avant le toast, seul un `.catch()` loggue une erreur éventuelle.
- Aucune des deux fonctions ne touche à `coachChat` (les messages du fil de discussion) : décision explicite, cette collection n'a pas de mécanisme de sauvegarde à ce jour.
- **Sauvegarde hebdomadaire par mail (20/09/2026)** : depuis le même projet Google Apps Script que celle de Budget (hors dépôt), un mail « 🏋️ Sauvegarde Hebdomadaire - Muscu » part chaque dimanche avec `Sauvegarde_Muscu_….json`. Il est lu directement dans Firestore (clé de compte de service dans la propriété de script `SA_MUSCU`) et reprend la structure de « Exporter toutes les données » (archives par profil, corbeille, séances personnalisées, `coachSettings` avec `threads` et `body`), **plus `coachChat`** — il couvre donc désormais les messages du coach, contrairement à l'export manuel. **La clé API du coach en est volontairement exclue.** Un mail « ⚠️ Échec » est envoyé si la lecture échoue ou revient vide. Vu l'absence de PITR (fenêtre de lecture dans le passé d'1 h seulement), c'est la seule sauvegarde datée de la base.
- **Bouton « ✉️ Envoyer fichier .json par mail »** (Réglages → « Sauvegarde automatique », `sendBackupByMail`, 20/09/2026) : équivalent de celui de Budget, au même endroit logique, sous « Sauvegarde ». Envoie à la demande, avec un POST `no-cors` vers **le même Google Apps Script que Budget** (`doPost`), la structure de l'export brut + `coachChat` + un marqueur `_app: 'muscu'` qui permet au script de choisir l'objet du mail (« 📥 Sauvegarde Manuelle - Muscu »). **La clé API du coach est retirée du payload avant l'envoi** (le cache de l'app n'est pas modifié). Garde-fous : aucun envoi avant le premier snapshot (`__archivesLoaded`, `__customSessionsLoaded`, `__coachSettingsLoaded`, `__coachChatLoaded`), aucun envoi si la base est vide, timeout 30 s, toasts (pas d'`alert`). Le mail reçu fait foi : en `no-cors` la réponse est illisible. ⚠️ Le script Apps Script doit être à jour (`doPost` qui reconnaît `_app`) **et redéployé** (Nouvelle version), sinon le mail part quand même mais étiqueté « Budget ».

## Coach (IA)

Deux usages distincts, qui partagent la même mémoire :
- **Bilan de séance** : structuré, rattaché à une archive, met à jour le profil. Bouton dans la modale d'archive.
- **Fil de discussion** (`view-coach`) : questions libres, plusieurs conversations nommées.

### Mémoire en trois couches
Envoyer tout l'historique brut atteindrait ~100 000 tokens par appel au bout d'un an. D'où :

1. **Les chiffres**, calculés par le code (`buildCoachDigest`) : records, cinq dernières valeurs par exercice, tonnage par type de séance, **poids de corps et dernières mensurations** (voir ci-dessous). Exact, gratuit, compact, et couvre **tout** l'historique.
2. **Les archives récentes en texte intégral** (`buildArchiveExcerpts`, 6 par défaut) : notes, cardio, contexte.
3. **Un profil évolutif** que le modèle réécrit à chaque bilan, stocké dans `coachProfile` de l'archive.

Le fil de discussion plafonne l'historique envoyé (`CHAT_HISTORY_LIMIT`).

⚠️ **Le poids transmis au coach vient du suivi tenu dans Progression** (`latestBodyWeight(profile)` — la mesure la plus récente), pas d'un champ statique saisi une fois. Un champ « Poids Corentin / Poids Lisa » existait dans les réglages du coach (⚙️) avant l'ajout du suivi corporel complet ; il a été retiré pour ne pas maintenir deux sources de vérité désynchronisées. `buildCoachDigest` se replie sur `coachGetWeights()[profile]` (l'ancien champ) uniquement si aucune mesure n'a encore été enregistrée dans le suivi — transition douce, pas de perte pour un poids déjà saisi avant cette bascule.

### Conversations
Définies en base (`settings/coach.threads`), donc créables et supprimables sans toucher au code, identiques sur les deux téléphones. Chacune porte un `prompt` — le rôle du coach à cet endroit (« tu es diététicien… ») — placé **en tête** du prompt système, les consignes de fond étant conservées.

- Barre **collante** en haut : changer de conversation sans remonter le fil. Menu déroulant plutôt qu'onglets.
- `suivi` et `questions` ne sont **pas supprimables** : les messages écrits avant cette fonctionnalité n'ont pas de champ `thread` et y sont rattachés par défaut (`messageThread`).
- Supprimer une conversation efface aussi ses messages, sous confirmation.
- L'ouverture et le changement de fil défilent en bas (`scrollChatToBottom`).
- **Indicateur d'attente** : barre de progression indéterminée animée avec texte de statut évolutif pendant qu'une réponse arrive. `COACH_REQUEST_TIMEOUT_MS` (45 s) via `AbortController` : au-delà, la requête est abandonnée plutôt que de bloquer indéfiniment. Un écouteur `visibilitychange` débloque immédiatement l'interface au retour sur l'app après une mise en arrière-plan iOS (l'app peut avoir été suspendue pendant l'attente).
- ⚠️ Voir l'avertissement sur `settings/coach` plus haut : c'est le même document qui a déjà perdu ses conversations une fois, en production, faute de fusion à l'écriture.

### Clés API et modèles
- Clé et modèle dans `settings/coach`, donc **saisis une fois pour les deux téléphones**. Acceptable uniquement parce que les règles sont fermées.
- ⚠️ **Google migre des clés `AIza` vers des clés d'autorisation `AQ.`**, liées à un compte de service. `geminiFetch()` tente donc la clé **en paramètre d'URL d'abord** (pas d'en-tête personnalisé, donc pas de requête CORS préalable depuis Safari), puis réessaie avec `x-goog-api-key` sur un 401.
- **Ne jamais coder un nom de modèle en dur.** Le défaut est `gemini-flash-latest`, un alias que Google repointe. Le bouton « Charger les modèles disponibles » interroge l'endpoint `models` et sert aussi de **diagnostic de la clé**.
- **Auto-réparation** : sur un 404, `withModelRepair()` récupère la liste, choisit le meilleur remplaçant (`pickBestModel`), l'enregistre et réessaie **une seule fois**.
- Messages d'erreur distincts : 401 → clé, 403 → API désactivée sur le projet, 404 → modèle, 429 → quota.
- **État des règles Google vérifié le 20/09/2026** : clés `AQ.` par défaut, clés `AIza` standard rejetées à partir de septembre 2026, `generateContent` « legacy » mais toujours supporté (pas de migration nécessaire vers l'Interactions API). Détail et sources dans `PROBLEMES_RESOLUS.md`.
- ⚠️ **La clé ne vit QUE dans `settings/coach.apiKey`** (jamais dans le HTML, jamais dans un secret GitHub : un secret Actions n'est lisible que par un workflow, et l'injecter dans la page l'exposerait publiquement — dépôt et Pages publics). Vérifié le 20/09/2026 : `settings/coach` ne contenait que `threads`, sans `apiKey` ni `model` — d'où la clé à recoller. **Correctif (20/09/2026)** : `saveCoachSettingsRemote()` et l'import JSON écrivent désormais avec `setDoc(…, { merge: true })`, donc une écriture des conversations ne peut plus effacer la clé. Cause probable, non reproduite : une écriture de `threads` (création, suppression ou `repairChatThreads()`) partie avant le premier snapshot, donc d'un cache vide.
- **Sécurité de l'accès** : les règles Firestore exigent `request.auth != null`, ce qui n'est une vraie barrière que si l'inscription libre est désactivée dans Firebase Authentication (Paramètres → Actions de l'utilisateur). Constaté ouverte le 20/09/2026 — à fermer dans la console.

### Cadrage
Le prompt impose la prudence sur les douleurs (réduire l'amplitude, substituer, consulter si ça persiste — jamais forcer), interdit l'encouragement générique, et exige de comparer des séances du **même type**. L'estimation calorique est présentée comme un ordre de grandeur.

### Coût
~7 000 tokens en entrée et ~1 200 en sortie par bilan. À trois séances par semaine, moins d'un euro par mois même avec un modèle haut de gamme.

## Catalogue d'exercices (autocomplétion du Build Training)

Le graphique retrouve un exercice par son **nom exact** : une faute de frappe scinde la courbe.

- **Aucune collection dédiée** : dérivé de `SESSIONS`, `customSessionsCache` et des `exerciseNames` de toutes les archives.
- Trois filets : suggestions filtrées (insensibles casse/accents), alerte de proximité par distance de Levenshtein avec bouton d'adoption, et `canonicalExerciseName()` qui recale casse, accents et espaces à l'enregistrement.
- Panneau maison (`<datalist>` est peu fiable sur Safari iOS), options avec `onmousedown` + `preventDefault()`.
- ⚠️ **Noms nettoyés de leur équipement le 14/09/26** : les noms embarquaient auparavant du matériel en dur (« Développé couché / incliné (Haltères) », « Rowing poulie basse (Tirage horizontal) »…), qui pouvait contredire la méthode choisie séparément. Tous renommés (voir la table `equipment` dans `SESSIONS`) ; les 16 archives existantes ont été migrées en conséquence (renommage + méthode assignée explicitement + tonnage corrigé pour le Développé militaire assis). Règle à suivre pour tout nouvel exercice à plusieurs méthodes plausibles : le nommer **sans** l'équipement, et cocher ses méthodes dans Build Training dès la création plutôt que de rattraper plus tard.

## Build Training

**Restructuré en hub.** `goToBuilderView()` (depuis le menu principal) ouvre désormais un écran de liste — les 4 séances fixes plus les personnalisées, chacune avec un crayon d'édition (`renderBuilderHub`) — et un bouton « + Créer une nouvelle séance ». Le formulaire (`showBuilderForm`) est un sous-écran de ce hub.

- ⚠️ **La modification ne se fait plus directement depuis l'écran Entraînement.** Les crayons ✏️ qui apparaissaient sur la liste des séances (`view-session`) ont été retirés ; toute édition passe par le hub Build Training. La suppression et la restauration (🗑️ / ↺) restent, elles, sur `view-session`.
- `exitBuilder()` ramène toujours au hub depuis le formulaire, et au menu depuis le hub — jamais directement du formulaire au menu, pour ne pas sauter d'étape.
- Après enregistrement, retour au hub (liste rafraîchie), pas au menu : on voit tout de suite le résultat.
- Nom de séance, case cardio, exercices dynamiques (nom avec autocomplétion, séries, reps par profil, case circuit, cases de méthode d'équipement — voir « Build Training — méthodes possibles d'un exercice » plus haut, réordonnancement ▲▼).
- ⚠️ **Le nom de séance et la case cardio sont recopiés dans `builderDraft` à chaque frappe.** Sans ça, tout re-render du formulaire les réécrase avec les valeurs périmées du brouillon.

## Animations et retours d'état

- **Validation de série** : agrandissement + onde verte (`checkRipple`).
- **Séance à 100 %** : jauge verte, reflet qui la parcourt **une seule fois** (classe `celebrate`), libellé « Séance complète ».
- **Record battu** : flammes autour de la carte de l'exercice, en plus du badge doré (voir « Flammes de record (21/09/2026) » en fin de fichier).
- **Transitions d'écran** : 0,22 s / 16 px.
- **Micro-animations** : enfoncement des boutons de variante et de duplication, flash de confirmation à la recopie.
- **Toasts empilables** : 3 maximum, les plus anciens évincés. ⚠️ Le retrait du DOM est **différé** (temps du fondu) : ne jamais faire de `while` sur `stack.children`, ça boucle à l'infini. Filtrer d'abord sur `dataset.leaving`.
- **Squelettes de chargement** sur les archives, la liste des séances et la progression, affichés **seulement si la liste est réellement vide**.
- `prefers-reduced-motion: reduce` respecté partout.

## Autres

- **Thème clair/sombre** : bouton flottant, préférence en LocalStorage (`duo_theme`).
- **Barre de progression + tonnage**, recalculés **à chaque frappe**.
- **Échappement HTML** : `escapeHtml()` obligatoire sur tout contenu saisi injecté via `innerHTML`.
- **Stockage** : `storage.set` marque la clé dans `memoryOnlyKeys` si `setItem` échoue.
- `loadDayData()` normalise systématiquement (`blankDayData()` + `Object.assign`).
- **Vibration** : code présent, sans effet sur Safari iOS.

## Historique — bouton "Forcer le rechargement" dans Réglages (ajouté le 18/09/2026)

Ajout d'un bouton dans l'écran Réglages, section "Application" (nouvelle
section, juste après "Compte") : `onclick="window.location.reload(true)"`,
à l'identique du bouton déjà existant dans Budget (section Réglages,
"Forcer la mise à jour de l'application"). Objectif : donner à Corentin un
moyen simple de forcer un rechargement après un push sur GitHub, cohérent
entre les 3 apps (Course a reçu le même bouton, dans sa topbar).

**Limite connue, assumée** : ce bouton fait un simple rechargement de page
et ne vide pas le cache du Service Worker ni ne le désinscrit (contrairement
au bouton du Portail, voir plus bas) — si le Service Worker sert le shell en
cache-first, un rechargement seul peut ne pas récupérer un `index.html`
fraîchement déployé. Choix délibéré de Corentin pour la simplicité et la
cohérence avec le bouton déjà en place dans Budget, plutôt qu'un vrai
vider-cache par app.

## Historique — SDK Firebase absent du cache Service Worker (corrigé le 18/09/2026)

Suite à une persistance du problème d'ouverture hors-ligne sur **Course**
(app sœur) malgré le correctif du bug cross-app ci-dessous, diagnostic plus
poussé sur suggestion de Corentin. Muscu charge Firebase via des `import`
ES **statiques** dans un `<script type="module">` (`firebase-app.js`,
`firebase-firestore.js`, `firebase-auth.js`, tous sur `gstatic.com`). Or le
`fetch` handler du `sw.js` ignorait explicitement toute origine différente
de la sienne, donc ces 3 fichiers n'étaient **jamais mis en cache par le
Service Worker** — dépendant uniquement du cache HTTP par défaut de
Safari, que iOS peut vider (notamment en mode standalone). Le risque est
ici plus grave que sur Course/Budget (scripts `compat` classiques) : un
`import` ES qui échoue fait échouer **tout le module** — aucune exécution
partielle — donc si ces imports échouaient hors-ligne, aucune
fonctionnalité de l'app ne démarrait, sans possibilité de dégradation
progressive. Corrigé en ajoutant une liste `FIREBASE_FILES` au `sw.js`,
avec une branche cache-first dédiée dans le `fetch` handler (avant le test
d'origine). `CACHE_NAME` passé à `muscu-shell-v2` pour forcer la
réinstallation du cache avec ces nouveaux fichiers.

## Historique — bug cross-app du cache/Service Worker (corrigé le 18/09/2026)

Suite à un signalement de problème d'ouverture hors-ligne sur **Course**
(app sœur dans ce même dépôt), audit du `sw.js` des 4 apps du dépôt
(Portail, Course, Muscu, Budget). Le `activate` handler de Muscu faisait
`caches.keys().filter(n => n !== CACHE_NAME).map(n => caches.delete(n))` —
or `caches.keys()` renvoie **tous les caches de tout le domaine**, pas
seulement celui de Muscu, donc ce code supprimait aussi le cache du
Portail, de Course et de Budget dès que le Service Worker de Muscu
s'activait (et réciproquement, les 3 autres `sw.js` avaient exactement le
même bug et supprimaient le cache de Muscu dès leur propre activation).
Corrigé en ajoutant un `CACHE_PREFIX = 'muscu-shell-'` et en filtrant
`names.filter(n => n.startsWith(CACHE_PREFIX) && n !== CACHE_NAME)` : Muscu
ne nettoie désormais que ses propres anciennes versions de cache, jamais
celles des autres apps. Même correctif appliqué aux 3 autres `sw.js` du
dépôt (voir le README du Portail, section 8, pour le détail complet
incluant le bouton "Vider le cache" du Portail qui avait le même
problème).

## Bugs iOS déjà corrigés (ne pas régresser)

- `height:100%` sur `html, body` plafonnait la page → `min-height`.
- Bottom-bar recouvrant le dernier exercice → `adjustBottomSpacing()`, appliquée uniquement sur `view-exercises`.
- Bouton undo recouvert par le badge de sync et le bouton de thème → `.header-row` a un `padding-right:86px`.
- Éviter de tuiler un `repeating-linear-gradient` avec un `background-size` qui ne correspond pas à sa période.
- **`.theme-toggle` et `.sync-badge` en `top:14px`/`16px` fixe (corrigé le 18/09/2026)** — sur iPhone à encoche/Dynamic Island, ces deux boutons fixes en haut à droite pouvaient se retrouver trop proches de la zone système selon l'orientation. Ajout de `env(safe-area-inset-top, 0px)` dans leur `top`. Repéré lors de l'audit de l'app Course contre `UX_UI_CHARTER.md`, où cette précaution existait déjà.
- **Rebond de défilement iOS (`overscroll-behavior`) absent (corrigé le 18/09/2026)** — seul `-webkit-overflow-scrolling:touch` était présent ; ajout de `overscroll-behavior:none` sur `html,body` pour éviter tout rebond/pull-to-refresh indésirable en haut ou bas d'une liste lors d'un swipe appuyé. Même origine : bonne pratique déjà en place dans Course.

## Tests

Les suites ne sont pas versionnées, elles vivent dans l'environnement d'exécution et sont réécrites à la demande — **plus de 500 assertions** au dernier comptage global, réparties sur une quinzaine de fichiers couvrant chacun un domaine. Ce tableau dit quoi recouvrir, pas où trouver un fichier précis :

| Domaine | À couvrir |
|---|---|
| Saisie | virgule décimale, filtrage des champs, undo armé/empilé |
| Échauffement | additif (ne consomme pas une série de travail), retrait en pile (dernière ligne seulement), exclusion du tonnage par le format de clé |
| RPE | toujours actif, menu déroulant 1-10, aucune valeur hors plage |
| Circuits | case libre, reprise des anciennes saisies, exclusion du tonnage |
| Équipement | facteur ×2, présélection de la première méthode, sélecteur masqué si une seule méthode, en-têtes, export, méthode retrouvée par nom sur une archive |
| Cardio | case à cocher, champs masqués, progression, export |
| Note de séance | champ distinct, export, archive, rappel d'archivage |
| Archivage | hors ligne (promesse non résolue), export texte, rappel d'archivage |
| Corbeille | `deletedAt`, restauration, vidage, exclusion des stats |
| Catalogue | suggestions, fautes de frappe, normalisation à l'enregistrement |
| Séances fixes | surcharge, restauration ↺, absence de doublon, titre et icône |
| Build Training | hub (liste + création), édition, retour contextuel, absence de crayon sur Entraînement |
| Navigation | menu (5 entrées), profils, glissement, retour |
| Progression — Entraînement | menu déroulant, tonnage par séance, période, écart, étiquettes, absence de doublon avec l'onglet Corps, **filtre par méthode (clé composée, sélection automatique de la 1ʳᵉ méthode, pas de vue mélangée), courbe animée (aire, lissage, points en cascade), étiquette poids×reps par point, second graphique tonnage total (toutes séries) sous la courbe meilleure série** |
| Progression — Corps | 7 champs, libellé selon profil, date choisie (y compris antérieure), **fusion sur une même date**, clés historiques, sélection et période indépendantes, **historique en cartes avec puces colorées**, **modification d'une entrée existante**, suppression, **graphique d'ensemble multi-courbes (échelle propre à chaque série, axe des dates proportionnel au temps réel), légende à bascule (tout affiché par défaut)** |
| Réglages | compte + déconnexion, **sélecteur de profil Corentin/Lisa**, export JSON brut (contenu, exclusion clé API), import JSON (upsert par id, suppression seulement sur `customSessionsToDelete`, fusion `settings/coach` sans écraser `threads`/`apiKey`) |
| Historique | dernier poids en placeholder, record personnel **(volume, pas poids max)**, cumul |
| Design | jetons (aucune valeur en dur), structure des cartes, alignement |
| Retours d'état | toasts empilables, validation, 100 %, squelettes |
| Connexion | écran, erreurs, abonnements différés après auth |
| Coach | mémoire trois couches, bilan, poids issu du suivi (pas du champ statique), stockage sur les 2 archives |
| Conversations | création, rôle, cloisonnement, suppression, **fusion à l'écriture de `settings/coach`**, récupération après perte (miroir puis messages orphelins) |
| Clés et modèles | `AQ.`/`AIza`, repli d'en-tête, liste, auto-réparation |

Méthode : charger le HTML dans **jsdom** (`runScripts:'dangerously'`) et appeler les fonctions globales.

Pièges connus :
- Les `const`/`let` de premier niveau ne sont **pas** exposés sur `window` — y accéder via `window.eval('...')`. Les `function` le sont.
- Le script `type="module"` n'est pas exécuté par jsdom : simuler `window.__fb` à la main, avec des promesses **jamais résolues** pour reproduire le hors-ligne.
- `toLocaleString('fr-FR')` produit une **espace insécable fine** (U+202F), pas une espace ordinaire. Normaliser avant comparaison.
- Penser à poser `window.__archivesLoaded` / `__customSessionsLoaded` / `__coachSettingsLoaded`, sinon les squelettes remplacent le contenu attendu.
- Lancer avec un `timeout` : un bug de boucle fait geler la suite plutôt qu'échouer (déjà arrivé avec les toasts).
- Simuler `window.fetch` pour l'API Gemini ; vérifier qu'aucune clé de test ne se retrouve dans le fichier livré. La clé **Firebase** (`AIza…`), elle, est légitimement dans le fichier — publique par conception.
- Poser `window.__authUser` puis émettre `auth-changed`, sinon l'écran de connexion recouvre l'app.
- ⚠️ **Un test qui échoue après une modification n'est pas forcément un bug de l'app.** Plusieurs fois, l'échec venait du test lui-même, resté sur l'ancien comportement (ancien nom de champ, ancienne clé, ancien nombre d'options). Toujours vérifier lequel des deux a raison avant de corriger.
- ⚠️ Attention à l'**ordre des mutations dans un même fichier de test** : une suppression ou une modification plus haut change l'état pour les blocs suivants (ex. « quelle est l'entrée la plus récente » après un ajout puis une suppression). Un échec inattendu en fin de fichier vient souvent d'une hypothèse sur l'état qui ne tient plus compte d'un bloc précédent.

## Audit du code

Un audit complet a été mené par analyse d'arbre syntaxique (`acorn` + `acorn-walk`), pas seulement par lecture.

- **Doublons et code mort** : parcourir l'AST, comparer les `FunctionDeclaration` aux `CallExpression`. ⚠️ Une fonction déclarée deux fois ne lève aucune erreur — la dernière masque la première.
- **Règles du projet** : chercher `.then` accolé à `setDoc`/`deleteDoc`, `parseFloat` hors de `parseNum`, `localStorage` hors du wrapper, valeurs en dur dans le CSS, et — depuis l'incident `settings/coach` — tout `setDoc`/`saveCoachSettingsRemote` appelé avec un objet qui n'est pas passé par un `Object.assign({}, coachSettings(), …)`.
- **Sélecteurs CSS en double** : attention aux faux positifs, un même sélecteur redéfini dans un `@media` est un override légitime.
- **Écouteurs** : vérifier qu'ils sont tous au premier niveau.
- **Charge à long terme** : simuler ~230 séances par profil et mesurer la taille du prompt du coach. Résultat mesuré : ~1 750 tokens, construit en ~35 ms — le condensé plafonne quel que soit le volume, puisqu'il ne garde que les dernières séances et quelques valeurs par exercice.

### Dette connue
⚠️ **`render()` fait plusieurs centaines de lignes** et mélange note de séance, cartes d'exercice, échauffements, historique, mode de charge, séries, circuits et cardio. Elle est testée et fonctionnelle, mais chaque ajout la rallonge. La découper en fonctions dédiées par section de carte est le prochain travail de fond utile — invisible à l'usage, mais ça réduirait le risque des modifications suivantes.

## Données non stockées côté app

Poids/reps/séries, mensurations, notes libres, dates. Firestore exige désormais une authentification (voir plus haut), ce qui a fermé le point faible le plus sérieux de l'architecture. Rien d'assimilable à une donnée médicale ou financière n'y transite.

## Pour la suite

Traité (liste non exhaustive, dans l'ordre approximatif) : refonte UI/UX, architecture en écrans, notes, cardio enrichi et optionnel, undo, archives Firebase, corbeille, Build Training puis sa restructuration en hub, catalogue d'exercices, mode de charge (remplaçant les variantes matériel), circuits en case libre, séances fixes modifiables par surcharge, note de séance, menu principal à 5 entrées, icône d'application, retour par glissement, graphique de progression, Suivi Progression réorganisé en deux onglets (Entraînement / Poids & mensurations), tonnage par séance, jetons de design, animations et retours d'état, authentification Firebase, coach IA (bilans + fil de discussion à conversations multiples, mémoire trois couches, auto-réparation des modèles, gestion des clés `AQ.`/`AIza`), poids de corps et mensurations complètes avec suivi daté, correction de la perte de données `settings/coach` et mécanisme de récupération, séries d'échauffement additives, RPE permanent, migration du dépôt vers `PORTAIL-DUO/Muscu/` derrière un portail commun avec Budget et Course, refonte identité visuelle « Ardoise & craie » (palette, Bebas Neue, texture craie), records et courbe de progression passés en volume (poids × reps) avec correction rétroactive du doublement par main, édition des mensurations déjà enregistrées, sélecteur de profil explicite dans Réglages (fix identité coach sur appareil partagé), indicateur d'attente avec timeout sur le chat coach, **refonte complète de l'équipement en deux listes séparées (calcul / vocabulaire), renommage du catalogue sans équipement en dur, export et import JSON bruts dans Réglages pour préparer et rejouer une migration, ajout de l'option Machine au Développé incliné, correction rétroactive systématique du tonnage (comparaison du facteur d'origine et du facteur migré, exercice par exercice et archive par archive — pas seulement le cas initialement repéré), correction d'une saisie erronée et regénération des textes d'archive figés (`exportText`) pour les noms renommés (14/09/26)**, **suivi de progression par méthode pour les exercices à plusieurs méthodes plausibles, sans vue mélangée, avec courbe et record propres à chaque méthode, courbes animées (aire dégradée, tracé lissé, points en cascade), étiquettes poids×reps par point et second graphique de tonnage total par exercice pour lever l'ambiguïté d'une meilleure série qui recule malgré une charge plus lourde (14/09/26)**, **refonte de l'onglet Poids & mensurations : cases de saisie en grille avec unité incrustée, historique en cartes à puces colorées par type de mesure, graphique d'ensemble multi-courbes (une échelle propre par série, axe des dates proportionnel au temps réel, légende à bascule affichant tout par défaut), saisie à date antérieure toujours possible (14/09/26)**.

Abandonné en connaissance de cause :
- **Types de série** (travail / dégressive / échec, cycle au clic) — ajoutés puis retirés : jugés inutiles à l'usage une fois testés en conditions réelles.
- **Accent personnalisable** — le bleu et le rose ne sont pas décoratifs, ils indiquent quel profil est actif et distinguent les courbes. Pas d'écran de réglages assez développé pour le loger proprement à l'époque où la question s'est posée.
- **Choix de métrique** (volume, reps max) sur l'onglet Entraînement — trois courbes possibles pour un même exercice compliquaient la lecture sans rien apporter.
- **Tonnage toutes séances confondues** — retiré au profit d'une entrée par séance : la courbe globale mélangeait des séances incomparables.
- **Mensurations listées dans le menu déroulant de l'onglet Entraînement** — déplacées dans leur propre onglet « Poids & mensurations » pour éviter qu'une même donnée soit sélectionnable à deux endroits.
- **Poids statique dans les réglages du coach** — remplacé par la lecture du suivi corporel daté, pour n'avoir qu'une seule source de vérité.
- **Écran de chargement (splash 2,5 s)** — retiré : l'app affiche désormais directement l'écran de connexion ou le menu principal. Markup, script isolé, animations (barre qui se dessine, disques qui glissent, jauge, filet de sécurité CSS) et classes CSS dédiées supprimés ; le petit intitulé « Duo Training » de l'écran de connexion, qui réutilisait le style `.splash-sub`, vit maintenant dans sa propre classe `.login-eyebrow`.

Pistes évoquées, non faites :
- **Fusion de deux noms d'exercice déjà archivés.** Le catalogue protège les futures saisies, mais deux orthographes déjà en archive restent deux courbes.
- **Progression des circuits.** Les résultats de circuits sont archivés en texte libre ; aucune courbe n'en est tirée aujourd'hui.
- **Le bilan de séance et le fil de discussion restent indépendants.** Le bilan n'apparaît pas dans le fil, et le fil ne met pas à jour le profil.
- Lieu de séance (salle/maison), supersets, 1RM estimé, groupes musculaires et volume hebdomadaire, calendrier de fréquence, séries de régularité, chrono de repos, boutons +/- de charge, bandeau « séance en cours », dupliquer une séance, bibliothèque d'exercices, comparer Corentin et Lisa sur un même graphe, recherche dans les archives, export CSV, partage iOS natif, installation en PWA, sauvegarde JSON.

## Historique — Bandeau de mise à jour du Service Worker + meta tag standard (19/09/2026)

Suite au chantier de débogage du flou/décalage sur Course (voir son propre README), un document de référence a été créé (`/GUIDE_PWA_IOS.md`, racine du dépôt) synthétisant les bugs WebKit rencontrés et les bonnes pratiques iOS. Deux corrections en ont découlé, appliquées identiquement sur les 4 apps (Portail/Muscu/Budget/Course) :

- **Meta tag standard ajouté** : `<meta name="mobile-web-app-capable" content="yes">` à côté du tag `apple-mobile-web-app-capable` existant (jamais retiré — iOS Safari ne lit que l'orthographe Apple). Fait taire l'avertissement de dépréciation de Chrome DevTools sans rien changer côté iOS.
- **Bandeau "🔄 Nouvelle version disponible"** : le `sw.js` de cette app fait déjà `skipWaiting()` + `clients.claim()` automatiquement à chaque mise à jour détectée, mais rien n'informait l'utilisateur qu'un rechargement était nécessaire pour voir le nouveau code — c'est très exactement ce qui a causé des heures de confusion sur Course le 18/09. Un petit bandeau discret (bas d'écran, conscient de la safe-area) apparaît désormais dès qu'une mise à jour du Service Worker est détectée, avec un bouton "Actualiser". Le rechargement n'est **volontairement pas automatique** (`controllerchange` non écouté pour forcer un reload) afin de ne jamais interrompre une saisie en cours — l'utilisateur choisit le moment.
- Vérifié à cette occasion : le bug `height:100dvh` qui avait affecté Course (voir son historique) ne touche pas cette app, qui utilise déjà `min-height:100vh` partout où c'est pertinent.


## Historique — Horodatage de dernier déploiement (19/09/2026)

Ajout d'une ligne "Version" dans Réglages affichant la date/heure du dernier déploiement de code (constante `DERNIERE_MAJ` en tête du script, format ISO). **À mettre à jour manuellement à chaque futur commit sur cette app** — complète le bandeau "Nouvelle version disponible" ajouté juste avant.


## Historique — Bottom-bar remontée de 14 px (20/09/2026)

Sur l'écran des exercices, la barre du bas (🔄 + « Séance terminée ✅ ») a été remontée de **14 px** à la demande de Corentin (10 px, puis 4 px de plus le même jour) : `.bottom-bar` passe de `padding-bottom: calc(10px + env(safe-area-inset-bottom))` à `calc(24px + env(safe-area-inset-bottom))`.
- **Choix** : on augmente le padding plutôt que de décoller la barre (`bottom:10px`), pour que le fond translucide reste collé au bord bas de l'écran (pas de bande où le contenu défilerait sous la barre). Effet : les boutons montent de 14 px et s'éloignent de la zone du home indicator.
- **Écart volontaire avec la charte** (§5.5 : `calc(10px + …)`), noté dans `UX_UI_CHARTER.md` — ne pas « corriger » en remettant 10 px.
- Rien d'autre à ajuster : `adjustBottomSpacing()` lit `bar.offsetHeight`, la réserve sous le contenu s'agrandit donc toute seule de 14 px.
- Cache SW passé en `muscu-shell-v7`, `DERNIERE_MAJ` mise à jour.


## Historique — Mise à jour au retour dans l'app + « réseau d'abord » (20/09/2026)

**But** : ne plus avoir à fermer l'app (swipe vers le haut) ni à la supprimer/réinstaller pour voir une nouvelle version.

- **`sw.js` — `index.html` en réseau d'abord** (`reseauPuisCache()`) : le serveur est interrogé en priorité, donc la dernière version est toujours servie quand il y a du réseau. Si le réseau est absent ou met plus de **4 s** à répondre (connexion « fantôme » sur iPhone), la copie en cache est servie : l'ouverture hors ligne reste garantie. Les autres fichiers du shell (icônes, manifest, SDK) restent en cache-first, inchangés.
- **Vérification de version au retour au premier plan** (bloc en fin de `<script>`, événement `visibilitychange`) : sur iPhone une PWA remise au premier plan n'est pas rechargée. Au retour, la page relit `index.html` sur le serveur (`cache:'no-store'`) et compare sa constante `DERNIERE_MAJ` avec celle du code en cours d'exécution. Si le serveur a une version différente : **rechargement automatique**, sauf si un champ de saisie est actif ou si une fenêtre (pop-up, confirmation, connexion) est ouverte — dans ce cas c'est le bandeau « 🔄 Nouvelle version disponible » existant qui s'affiche (le rechargement n'interrompt donc jamais une saisie). Au plus un contrôle toutes les 30 s ; hors ligne, rien ne se passe.
- ⚠️ **`DERNIERE_MAJ` est désormais un élément fonctionnel** (plus seulement un affichage) : elle sert de numéro de version pour cette détection. Ne pas la supprimer, et garder la forme `DERNIERE_MAJ = '…'` (une seule occurrence par fichier).
- **Une seule fois** : la première mise à jour vers cette version ne bénéficie pas encore du mécanisme (l'ancien code est encore en place). Fermer l'app et la rouvrir une ou deux fois suffit ; ensuite plus aucune manipulation.
- Déploiement : `DERNIERE_MAJ` mise à jour, `CACHE_NAME` `muscu-shell-v8` → `muscu-shell-v9`.


## Historique — Découpage en `index.html` / `style.css` / `app.js` (20/09/2026)

**But** : des fichiers lisibles et modifiables (avant : tout dans un seul `index.html`, ≈ 351 Ko), et un cache navigateur / service worker qui peut traiter le style et le code séparément. **Aucun changement de comportement ni d'apparence** : le contenu a été déplacé tel quel.

**Où trouver quoi** (≈ 351 Ko → ≈ 66 Ko + ≈ 62 Ko + ≈ 220 Ko) :
- `index.html` : la structure HTML, un tout petit script inline qui définit `DERNIERE_MAJ`, et les balises `<link href="style.css?v=…">` / `<script src="app.js?v=…">`.
- `style.css` : tout le CSS (ancien `<style>`).
- `app.js` : tout le JavaScript classique (anciens `<script>`), dans l'ordre d'origine. La constante `DERNIERE_MAJ` n'y figure plus : elle est dans `index.html`.
- **Cas particulier Muscu** : le `<script type="module">` Firebase (connexion, archives partagées) **reste inline dans `index.html`** — un module ES ne peut pas être fusionné avec le code classique sans casser les `onclick="…"` du HTML. Les 3 anciens `<script>` classiques (valeurs par défaut, cœur de l'app, enregistrement du service worker) sont fusionnés dans `app.js` dans leur ordre d'origine.

**Règles** :
- Style → `style.css` ; logique → `app.js` ; structure → `index.html`. Pour une modification, lire les 3 fichiers si nécessaire.
- **Ne jamais modifier à la main** `DERNIERE_MAJ`, ni les `?v=…` de `index.html`, ni `CACHE_NAME` (`sw.js`) : le workflow `auto-version.yml` s'en charge à chaque push touchant `index.html`, `style.css` ou `app.js`. Les `?v=…` (chiffres de `DERNIERE_MAJ`) rendent l'URL de chaque déploiement unique : aucun cache (HTTP, mémoire, service worker) ne peut resservir l'ancien code.
- `sw.js` précache `index.html`, `style.css` et `app.js`, et les sert en **réseau d'abord** (repli sur le cache hors ligne ou après 4 s). Le cache est indexé sans la partie `?v=…`, donc une seule copie par fichier. Les requêtes réseau du service worker utilisent `cache:'no-cache'` (revalidation systématique).

**Vérifié avant mise en ligne** (Chromium headless, ancienne et nouvelle version côte à côte) : DOM identique hors `<script>`/`<style>` (97 éléments à `id`), styles calculés identiques sur tous ces éléments, mêmes variables globales, mêmes messages console ; ouverture hors ligne (page rendue, CSS et JS servis par le cache) ; déploiement simulé visible après un simple rechargement malgré `Cache-Control: max-age=600` (comme GitHub Pages) ; rechargement automatique au retour au premier plan, sauf saisie en cours ou fenêtre ouverte. **Non vérifié sur iPhone.**


## Historique — `viewport-fit=cover` ajouté (20/09/2026) — à valider sur iPhone

Le meta viewport de `index.html` reçoit `viewport-fit=cover`, comme les 3 autres apps et la charte (`GUIDE_PWA_IOS.md`, §3.B). **Conséquence attendue** : jusque-là, sans cette valeur, iOS renvoyait `0` pour tous les `env(safe-area-inset-*)` de l'app, donc les 6 endroits qui les utilisent (voir ci-dessous) n'avaient aucun effet et les positions actuelles ont été réglées à l'œil avec des marges fixes. Avec `cover`, ces valeurs deviennent réelles (≈ 59 px en haut et ≈ 34 px en bas sur un iPhone à Dynamic Island / à barre d'accueil) :
- `style.css` l.117 et l.124 : boutons en haut à droite (`top: 14px / 16px + safe-area-inset-top`) → **descendent** d'autant, sous la barre d'état ;
- `style.css` l.131 : marge basse du contenu (`120px + safe-area-inset-bottom`) ;
- `style.css` l.721 et l.863 : barre du bas (`10px` / `24px + safe-area-inset-bottom`) → **monte** d'autant ;
- `app.js` (~l.5026) : `paddingBottom` du corps (`24px + safe-area-inset-bottom`) ;
- `index.html` : bandeau « Nouvelle version disponible » (`bottom: max(20px, safe-area + 20px)`).

**Si le rendu est moins bien qu'avant** : revenir en arrière = retirer `, viewport-fit=cover` du meta (un seul commit, `feat(muscu): viewport-fit=cover`), ou garder `cover` et ajuster ces marges à la manière de Course (`max(20px, calc(env(safe-area-inset-bottom) - 12px))`). Point d'attention connu : `100dvh` n'est pas utilisé dans Muscu, donc le bug WebKit du « bandeau vide » décrit dans le guide ne s'applique pas ici.


## Correctif — bandeau « Nouvelle version disponible » affiché à tort (20/09/2026)

**Symptôme** : le bandeau « 🔄 Nouvelle version disponible » s'affichait à l'ouverture après un déploiement, alors que la page était déjà la dernière version.
**Cause** : il était déclenché par la seule installation d'un nouveau service worker (`updatefound` / `reg.waiting`). Or depuis le passage de `index.html` en réseau d'abord, la page est déjà à jour quand le service worker se met à jour : le bandeau était un faux positif, et il court-circuitait en plus le rechargement automatique.
**Correction** (`app.js`) :
- La mise à jour du service worker appelle désormais la vérification de version (`window.__verifierVersion(true)`) au lieu d'afficher le bandeau : elle compare `DERNIERE_MAJ` avec celle du serveur. Page vraiment périmée → **rechargement automatique** ; le bandeau n'apparaît que si une saisie ou une fenêtre est ouverte.
- Le contrôle est aussi fait **~3 s après chaque lancement** (au cas où un réseau lent aurait fait servir une copie ancienne de la page).
- **Garde-fou anti-boucle** : au plus 2 rechargements automatiques par session (`sessionStorage`, clé `majRechargements`) ; ensuite le bandeau s'affiche au lieu de recharger.
- Sur l'écran de connexion (fenêtre « connexion » ouverte), le rechargement automatique est remplacé par le bandeau, comme pour toute fenêtre ouverte.
**Vérifié** (Chromium headless) : page à jour + simple changement de `sw.js` → aucun bandeau ; vraie nouvelle version → rechargement automatique (bandeau si saisie ou fenêtre ouverte) ; garde-fou ; suite hors ligne / déploiements simulés inchangée. **Non vérifié sur iPhone.**


## Correctif — haut de l'écran flou après `viewport-fit=cover` : marge de sécurité `--safe-top` (20/09/2026)

**Symptôme** : le haut de Muscu était « tout flou » sur iPhone juste après l'ajout de `viewport-fit=cover` (section précédente).
**Cause** : avec `cover`, la page s'étend sous la barre d'état (≈ 59 px sur un iPhone à Dynamic Island). Les titres et boutons du haut commençaient à 14–22 px du bord, donc **dans cette zone**, où iOS applique son flou natif (« edge treatment », voir `PROBLEMES_RESOLUS.md`, saga Course). Course n'a pas ce défaut parce que son contenu démarre à `env(safe-area-inset-top) + 16 px`.
**Correction** (`style.css`) : nouvelle variable `--safe-top: calc(env(safe-area-inset-top, 0px) + 16px)` (même valeur que Course), appliquée à tout ce qui touche le haut de l'écran :
- `.view-inner` : `padding-top: calc(22px + var(--safe-top))` (menu, réglages, coach, profil, séance, constructeur, archives, progression) ;
- `header` (écran des exercices, `position:sticky`) : `padding-top: calc(14px + var(--safe-top))` — collé en haut, son fond opaque couvre la zone de la barre d'état ;
- `.chat-bar` (coach, sticky) : `margin-top: calc(-1 * var(--safe-top))` + `padding-top: calc(10px + var(--safe-top))` — même effet, sans décaler sa position initiale ;
- `.theme-toggle` et `.sync-badge` (fixes en haut à droite) : `top: calc(14px|16px + var(--safe-top))`, donc alignés avec la première ligne de chaque écran.
**Vérifié** (Chromium headless, zones de sécurité iPhone simulées 59 px / 34 px via `Emulation.setSafeAreaInsetsOverride`) : premier titre du menu de 22 → 97 px du bord, bouton « ← Séances » de 14 → 89 px, sélecteur du coach collé à 86 px au défilement, bascule de thème alignée (89 px). **Non vérifié sur iPhone.**
**Si le haut est trop bas ou trop haut** : ajuster le `+ 16px` de `--safe-top` (une seule ligne, en tête de `:root`).


## Nettoyage du code mort (21/09/2026)

Audit statique de `app.js`, `style.css` et `index.html`, puis retrait de ce qui n'était plus référencé. **Aucun changement de comportement.**
- `app.js` : `openExportModal()` (jamais appelée) et sa constante `MOTIVATION_LINES` (qui ne servait qu'à elle) ; `getAllSelectableSessions()`. Le reste de la modale d'export (`closeExportModal`, `copyExport`, `#export-modal`, `buildExportText`) est **conservé** : il est réutilisé par la fin de séance, les archives et les exports complets.
- `style.css` : `.big-choice-btn.build` (+ `:active`), `.setting-row` (+ `input[type=checkbox]`), `.setting-text`, `.setting-name`, `.coach-head` (+ `.big-question`). `.setting-desc` reste utilisée.
- **Icône d'écran d'accueil — corrigée** (voir la section suivante) : les liens `apple-touch-icon.png` / `icon-512.png` de `index.html` étaient volontairement laissés, car les fichiers sont voulus (Safari ne lit pas une icône en data URI).
- **Vérifié** : syntaxe JS ; plus aucun identifiant JS inutilisé ni appel à une fonction inexistante ; aucune référence restante aux éléments retirés. **Non vérifié sur iPhone.**


## Icône d'écran d'accueil enfin en ligne (21/09/2026)

`index.html` référence `apple-touch-icon.png` depuis le 17/09/2026, mais le fichier n'a jamais existé dans le dépôt (404) : l'icône de l'app, un haltère bleu/rose de 180 × 180 px, avait été envoyée le 11/09/2026 sous un nom d'appareil photo, `IMG_4867.png`. Elle est désormais **renommée `Muscu/apple-touch-icon.png`** (l'ancien fichier est supprimé, pas dupliqué). Aucune modification de code.
- **Pour la voir sur iPhone** : l'icône déjà posée sur l'écran d'accueil ne change pas toute seule. Il faut la supprimer, puis refaire « Partager → Sur l'écran d'accueil » (en laissant « Ouvrir en tant qu'app Web » sur ON).
- **Reste un 404** : `icon-512.png` (lien `rel="icon"` de `index.html`, précache de `sw.js`) est toujours absent. Sans effet sur l'icône iPhone (ce lien ne sert qu'aux onglets de bureau) ; le service worker tolère l'absence fichier par fichier. À supprimer ou à créer plus tard.
- **Non vérifié sur iPhone.**


## Flammes de record (21/09/2026)

Quand une saisie bat le record archivé, la carte de l'exercice s'embrase : halo doré + **vrai feu de particules** (canvas) qui sort de derrière la carte, sur le haut et les deux côtés. Demandé par Corentin. **Non vérifié sur iPhone** (prototype validé dans un navigateur de bureau, thèmes sombre et clair).

**Historique** : la 1re version (commit `5c2551b`) utilisait des tuiles SVG répétées le long des bords — rejetée par Corentin, « emoticonesque ». Remplacée le jour même par le moteur ci-dessous ; ne pas revenir aux tuiles : un motif répété ne peut pas donner un feu crédible.

- **Déclencheur : exactement la même condition que le badge `.pr-badge`** — `refreshRecordBadge()` appelle `recordFireSet(card, true/false)`. Les flammes suivent donc le badge et sont **éphémères** (rien n'est stocké ; ni archives ni circuits). Appel idempotent.
- **Moteur** : `recordFireSet()` / `createRecordFireEngine()`, juste avant `getPersonalRecord()` dans `app.js`. Une couche `<div class="pr-fire-fx">` contenant un `<canvas>` est créée à la demande (une fois par carte) ; la classe `pr-fire` est posée sur la carte. Sans record, aucun élément supplémentaire.
- **Principe** : des centaines de bulles lumineuses (sprites radiaux pré-dessinés, 24 étapes de couleur) naissent le long du bord, montent en **accélérant**, ondulent, rétrécissent et passent du blanc-jaune à l'orange puis au rouge sombre. Mélange **additif** (`globalCompositeOperation:'lighter'`) : là où elles se superposent, ça chauffe vers le blanc. Trois types : flamme (sprite étiré verticalement), « lit de braises » (gros, lent, faible alpha : comble les creux à la base), étincelle (petite, monte haut). Une fonction `heat()` (somme de sinus glissant dans le temps) module la hauteur le long du bord → des **langues** qui naissent et retombent, pas un mur uniforme. Le haut suit l'arrondi des coins (`cornerDrop`). Le bas n'émet rien : le feu monte, le halo `box-shadow` statique suffit.
- **La carte est « gommée »** en fin de dessin (`destination-out` sur un rectangle arrondi) : le feu sort de derrière la carte au lieu de la recouvrir. Fondu de 16 px en haut du canvas : aucune flamme coupée net.
- **Allumage / extinction** : intensité (`ramp`) qui monte en 0,45 s ; à la fin du record les flammes **s'éteignent en douceur** (émission stoppée, les dernières particules finissent leur vie, puis `finish()` retire la couche et la classe `pr-fire`).
- **Performance iPhone** : une seule boucle `requestAnimationFrame` pour toutes les cartes enflammées, arrêtée quand il n'y en a plus ; `dt` plafonné à 50 ms ; `IntersectionObserver` (carte hors écran = pas de calcul) ; carte détachée du DOM (re-`render()`) = nettoyée automatiquement ; max 520 particules ; canvas en **dpr 1,5 maximum** (le flou n'a pas besoin du plein Retina — à 2, ~41 fps avec 3 cartes en feu en rendu logiciel, à 1,5 ~58 fps). `ResizeObserver` sur la carte (redimensionnement du canvas).
- **`prefers-reduced-motion: reduce`** : une seule image figée (1 s de feu « pré-cuit »), aucune boucle, extinction immédiate.
- **⚠️ Couplage CSS ↔ JS** : `PAD` dans le moteur (`{l:17, t:44, r:17, b:14}`) doit rester égal à `inset` de `.pr-fire-fx` dans `style.css` (`-44px -17px -14px -17px`). Et `R_CARD = 18` = `--r-lg`.
- **⚠️ `overflow:hidden` de `.exercise-card`** : le canvas déborde de la carte, donc `.exercise-card.pr-fire` passe en `overflow:visible` le temps du record, et `.exercise-headwrap` reprend l'arrondi du haut (`overflow:hidden` + `border-radius`). Ne pas remettre `overflow:hidden` sur la carte enflammée.
- **⚠️ Largeur** : 17 px de chaque côté < marge latérale de la vue (18 px). Plus large, la couche dépasserait à droite et créerait un **défilement horizontal**. Si `.view-inner` change de padding, revoir `PAD.l/PAD.r`.
- **Le haut du canvas passe sur la carte du dessus** (44 px au-dessus, 14 px d'écart entre cartes) : voulu, les flammes sont devant. Pour réduire, baisser `PAD.t` **et** les vitesses (`vy`) ensemble.
- **Réglages du rendu** (dans `spawn()` / `step()` / `draw()`) : densité `rates` (particules/s par côté), vitesse `vy`, durée de vie `life`, alpha `0.56` (flamme) / `0.38` (braises) — plus haut, le cœur vire au blanc cramé —, palette `STOPS`. Couleurs en dur (feu ≠ couleur de profil, même principe que `--gold`).
- **Thème clair** : le mélange additif y donne un cœur jaune pâle ; lisible, moins spectaculaire que sur fond sombre.


## Résumé pour le Portail (22/09/2026)

Muscu publie sa **prochaine séance, la semaine de chacun et une série** pour le tableau de bord du Portail. Architecture, sécurité et décisions : `README.md` du Portail, section « Tableau de bord ».

- **`portail/muscu`** est écrit dans la base de l'app **COURSES** (`course-app-36e9d`, connexion anonyme), **pas** dans celle de Muscu : `maj`, `prochaine` `{corentin, lisa}` = `{label, title, nbExos, cardio}`, `phrase` (texte). Allégé le 22/09/2026 (`objectif`, `semaine`, `serie` retirés : la série n'influence plus que le choix de la phrase, en interne).
- **`index.html` (script module)** : 2e application Firebase nommée `'portail'` (`getApps().find(...) || initializeApp(portailConfig, 'portail')`), `authStateReady()` puis `signInAnonymously` seulement si nécessaire, exposée par `window.__portail.publish(id, data)`. La base et la session e-mail/mot de passe de Muscu ne sont pas touchées ; rien n'est lancé au démarrage.
- **`app.js`** (juste avant l'écouteur `archives-updated`) : `calculerResumePortailMuscu` (résumé publié), `calculerPhraseMuscu` (texte motivant, `PORTAIL_PHRASES`, 22/09/2026), `planifierPublicationPortailMuscu`, constante `PORTAIL_SERIE_MIN = 3`. Définitions (semaine du lundi, série, prochaine séance, priorité des phrases) : README du Portail. Déclenché par `archives-updated` et `custom-sessions-updated`, **seulement quand archives ET séances sont arrivées et que le dernier snapshot vient du serveur** (`window.__syncFromCache`), regroupé 3 s. **Depuis le 23/09/2026, republié à chaque snapshot serveur même si le contenu n'a pas changé** (voir README du Portail, section « Résumé pour le Portail » : `maj` doit refléter la dernière ouverture vérifiée, pas le dernier vrai changement). Erreurs absorbées.
- ⚠️ `calculerPhraseMuscu` suppose `window.archivesCache.corentin`/`.lisa` **triés du plus récent au plus ancien** (`archives[p][0]` = dernière séance) : c'est le cas depuis le tri fait dans `subscribeAll()` (script module de `index.html`) — ne pas passer un tableau non trié à cette fonction.
- Le Portail lit le profil actif dans `localStorage['duo_profile']` : **ne pas renommer cette clé sans adapter `Portail/app.js`** (`profilActif()`).
- **Vérifié** : calcul sur les vraies archives (semaines, série et prochaine séance contrôlées à la main) ; pont de connexion anonyme et d'écriture avec le vrai SDK 12.18. **Non vérifié dans l'app complète** (connexion e-mail/mot de passe requise) ni sur iPhone.


## 🔄 Coach — résilience face aux 503 "model overloaded" (23/09/2026)

**Contexte** : le coach mettait ~40s à "réfléchir" puis échouait avec "réessaie dans un instant", de façon récurrente. Diagnostic : pas une régression de code — le modèle configuré (`gemini-3.5-flash-lite`) et le modèle de repli historique (`gemini-flash-latest`) sont sous forte tension côté Google (tests directs du 23/09/26 : 20 à 49s de latence quand ça répond, 503 "high demand" le reste du temps), pendant que toute la famille Gemini 2.5 a été retirée (404 "no longer available to new users"). Recherche approfondie (forum officiel Google, issues `google-gemini/gemini-cli`, PR communautaires type `callGeminiWithFallback`) : un 503 est un problème de **capacité serveur partagée** chez Google, gratuit et payant confondus — **rien côté client ne peut l'empêcher à coup sûr**, seule une offre à débit provisionné (payante) donne une capacité garantie. Corentin utilise le tier gratuit sciemment (facturation Cloud refusée le 23/09/26) : **l'abonnement Google AI payant de l'app Gemini grand public ne compte PAS comme facturation API** — ce sont deux produits séparés chez Google, seul l'activation de la facturation Cloud sur le projet `duo-training-e835b` changerait le tier de la clé API.

**Solution — `callGeminiResilient()`, nouvelle fonction dans `app.js`** :
- **Cascade de modèles de repli** : `gemini-3.6-flash` → `gemini-3.5-flash` → `gemini-3.1-flash-lite` (liste à réviser périodiquement, Google renomme/retire des modèles régulièrement). Le modèle configuré par l'utilisateur reste toujours tenté en premier.
- **Retry avec backoff + jitter** (700-1200ms) entre deux modèles, uniquement sur erreurs retryable (429/500/502/503/504). Sur erreur de clé (401/403/NO_KEY/BAD_KEY), **échec immédiat sans changer de modèle** — inutile d'insister, ça ne dépend pas du modèle.
- **Timeout PAR TENTATIVE** (`COACH_ATTEMPT_TIMEOUT_MS = 20000`), distinct du minuteur global du chat (`COACH_REQUEST_TIMEOUT_MS`, remonté de 45s à 75s pour laisser la place à la cascade). Nécessaire car un modèle saturé peut **ne jamais répondre ni échouer** au niveau du socket réseau, sans jamais renvoyer de 503 — comportement documenté sur `googleapis/python-genai` (issue GitHub) sur `gemini-2.5-flash`, reproduit ici avec un mock `fetch` qui ne se résout jamais (même technique que la leçon de `sw.js`, voir plus haut dans ce fichier).
- `geminiFetchAttempt()` combine le signal d'annulation externe (minuteur global) et un timeout interne à la main, **sans `AbortSignal.any()`** : non supporté sur les anciennes versions de Safari iOS, la cible de l'app.
- `requestCoachFeedback()` (le bilan de fin de séance) **n'avait jusqu'ici aucun minuteur de sécurité du tout** — corrigé au passage, même mécanisme que `sendCoachMessage()`.
- Nouveau message d'erreur distinct `ALL_MODELS_OVERLOADED` ("Google est surchargé sur tous les modèles — réessaie dans quelques minutes") quand toute la cascade échoue, au lieu du message générique de timeout.

**Méthode de test réutilisable** : fonctions extraites et testées en isolation dans Node avec un `fetch` mocké, 5 scénarios — cascade avec succès au 3e modèle, tous les modèles surchargés, 1er modèle qui ne répond jamais (socket qui pend, vérifié à ~20s réels), clé invalide (doit échouer immédiatement sans essayer d'autres modèles), minuteur global déjà expiré (0 appel réseau gaspillé). Les 5 passent. **Non testé sur iPhone / avec le vrai réseau Safari.**

**Fichiers touchés** : `Muscu/app.js`, `Muscu/README.md`, `PROBLEMES_RESOLUS.md`

### Correctif de suivi (23/09/2026, même jour) — le 404 était traité comme fatal au lieu de basculer

**Symptôme réel observé** : Corentin a testé juste après le déploiement ci-dessus et a eu "Google est surchargé sur tous les modèles" — inhabituel selon lui, jamais vu avant.
**Cause** : `COACH_RETRYABLE_STATUS` ne listait que 429/500/502/503/504. Le modèle **enregistré en base** (`gemini-2.5-flash`, toute la famille 2.5 étant retirée par Google) répond en 404 — pas dans cette liste. `callGeminiResilient` levait donc `BAD_MODEL` **dès la 1re tentative**, sans jamais essayer `gemini-3.6-flash` (qui répondait normalement au même moment, vérifié en direct). Le message affiché ("tous surchargés") était trompeur : un seul modèle était réellement en cause, et il n'était même pas surchargé — juste inexistant.
**Correction** : seules les erreurs de **clé** (401/403/`BAD_KEY`/`NO_KEY`) restent fatales désormais — elles ne dépendent d'aucun modèle. Toute autre erreur, 404 compris, fait maintenant basculer sur le modèle suivant de la cascade. Ajout de `persistWorkingModel()` : si le modèle primaire est en 404 et qu'un autre répond, le réglage `settings/coach.model` est corrigé en tâche de fond (fire-and-forget, ne bloque jamais la réponse en cours) — pour ne plus jamais reperdre une tentative dessus.
**Comment le modèle en base a pu retomber sur `gemini-2.5-flash`** (génération plus ancienne que le `gemini-3.5-flash-lite` vu la veille) : cause non identifiée avec certitude — probablement une sélection manuelle dans les réglages du coach à un moment donné. Pas d'impact pratique désormais : n'importe quel modèle mort en base s'auto-corrige au premier appel réussi.
**Vérifié** : 4 scénarios Node, dont le cas exact reproduit (modèle primaire → 404 → bascule → succès → correction en base). **Non testé sur iPhone.**

### Deuxième correctif de suivi (23/09/2026, même jour) — marge de sécurité du minuteur global
**Constat** : Corentin a eu "tous les modèles surchargés" une seconde fois, après avoir bien fermé/rouvert l'app (version confirmée à jour). Vérification en direct avec sa vraie clé, à plusieurs minutes d'écart : `gemini-3.6-flash` fonctionnait, puis échouait (503), puis refonctionnait — comportement qui **fluctue**, signature d'un problème de capacité côté Google et non d'un bug de code (un bug de code échouerait identiquement à chaque appel). Vérifié en parallèle qu'aucun appel du coach (chat ou bilan) ne contourne `callGeminiResilient()` — grep de tous les appels directs à `geminiFetch(` restants dans le fichier en ligne : seuls les deux appels à `geminiFetch('models')` (listage des modèles disponibles, sans rapport avec les réponses du coach) subsistent.
**Faiblesse trouvée par le calcul, pas observée** : le pire cas de la cascade (4 candidats × 20s de timeout par tentative + backoff entre chacun) peut légèrement dépasser les 75s du minuteur global posé la veille — un abandon prématuré de ce minuteur, dans ce cas précis, produit un message différent ("le coach ne répond pas") donc ce n'était pas la cause du symptôme observé, mais autant fermer cette fenêtre. `COACH_REQUEST_TIMEOUT_MS` remonté à 100s.
**Fichiers touchés** : `Muscu/app.js`, `Muscu/README.md`, `PROBLEMES_RESOLUS.md`


### Coach — modèle géré automatiquement, progression visible pendant le chargement (23/09/2026)

**Demande de Corentin** : (1) retirer la possibilité de choisir le modèle à la main dans les réglages, pour éviter une mauvaise manipulation, vu que la cascade de repli s'en charge déjà ; (2) afficher visuellement, pendant que la bulle de chat charge, quel modèle est en cours d'essai et les bascules éventuelles ("essaie 3.6, échoue, passage à 3.5…") — **sans** empiler plusieurs messages d'échec, une seule bulle qui évolue.

**Réglages du coach** : le champ Modèle, le sélecteur, le bouton « Charger les modèles disponibles » et `loadCoachModels()` sont retirés (HTML + JS). `saveCoachSettings()` n'écrit plus jamais le champ `model` — grâce à `{ merge:true }` dans `saveCoachSettingsRemote()`, la valeur déjà en base reste intacte. `fetchAvailableModels()`/`pickBestModel()`/`repairCoachModel()` restent : ce sont des mécanismes de self-heal internes (utilisés par `withModelRepair()`), pas l'ancienne UI de sélection manuelle. `COACH_DEFAULT_MODEL` passe de `gemini-flash-latest` à `gemini-3.6-flash` (le plus fiable des tests en direct de ce jour) — ne sert que si aucun réglage n'existe encore en base.

**Progression en direct** : `callGeminiResilient()` accepte un 4ᵉ paramètre optionnel `onAttempt(model, previousModel)`, appelé juste AVANT chaque tentative (jamais après un échec isolé) — `models[i-1]` est mécaniquement le modèle qui vient d'échouer s'il y en a un, pas besoin de le suivre séparément. Branché uniquement sur la bulle de chat (`sendCoachMessage`) : `attemptState.model` alimente le texte normal (« Le coach réfléchit (3.6-flash)… (12 s) »), et `attemptState.switchNote` affiche pendant ~1,8 s un message de transition (« 3.6-flash indisponible, passage à 3.5-flash… ») avant de revenir au format normal avec le nouveau modèle. `coachModelShortLabel()` retire juste le préfixe `gemini-` pour l'affichage. Le bilan de fin de séance (`requestCoachFeedback`/`callCoach`) n'a **pas** reçu cette UI de progression (son écran de chargement est un simple squelette statique, pas une bulle qui évolue) — seulement la cascade, qu'il avait déjà.

**Vérifié** : séquence d'événements `onAttempt` testée en isolation dans Node (404 → bascule → 503 → bascule → succès), texte attendu à chaque étape contrôlé à la main. **Non vérifié sur iPhone** (rendu visuel réel de la bulle, timing des transitions).

**Fichiers touchés** : `Muscu/app.js`, `Muscu/index.html`, `Muscu/README.md`


### Coach — Groq en fournisseur alternatif, phase de test (23/09/2026)

**Demande de Corentin** : ne pas remplacer Gemini, mais pouvoir choisir Gemini OU Groq (gratuit, infrastructure différente, très rapide) dans les réglages, pour comparer en conditions réelles.

**Catalogue Groq vérifié en direct** (avec la vraie clé de Corentin, `console.groq.com`) : `llama-3.3-70b-versatile` et `llama-3.1-8b-instant`, très documentés ailleurs (y compris dans des sources de 2026), **n'existent plus** côté Groq — 404 `model_not_found`. Catalogue réel à date : `openai/gpt-oss-120b` (retenu comme principal) et `openai/gpt-oss-20b` (repli), tous deux testés en direct et fonctionnels (~0,3-0,9s de réponse, contre 6-49s côté Gemini).

**`settings/coach`** : deux nouveaux champs, `provider` (`gemini` par défaut ou `groq`) et `groqApiKey` — séparé de `apiKey` (Gemini), pour que basculer le sélecteur ne fasse jamais perdre l'une ou l'autre clé. `groqModel` suit le même principe que `model` : jamais choisi à la main, auto-géré et auto-corrigé par `callGroqResilient()`/`persistWorkingGroqModel()`, symétriques de leurs équivalents Gemini.

**`app.js`** : `callGroqResilient()` est un miroir quasi exact de `callGeminiResilient()` (même structure de cascade, retry+backoff, timeout par tentative combiné au signal externe, fatal uniquement sur clé invalide) — adapté à l'API Groq, compatible OpenAI : clé en en-tête `Authorization: Bearer …` (pas en paramètre d'URL), modèle dans le corps JSON (pas dans l'URL). `callCoachChat()`/`callCoach()` aiguillent sur `coachSettings().provider` et reconstruisent le même contexte (digest, historique, séances récentes) au format `messages` (system/user/assistant) plutôt que `contents`/`parts`. Le vocabulaire d'erreur (`KEY_REJECTED`, `BAD_MODEL`, `QUOTA`, `ALL_MODELS_OVERLOADED`…) est resté volontairement identique entre les deux fournisseurs : `coachErrorMessage()` sert aux deux sans aucune modification. La barre de progression en direct (`onAttempt`) ajoutée plus haut était déjà générique par modèle, donc fonctionne pour Groq sans y toucher.

**Réglages** : sélecteur segmenté Gemini/Groq (`#coach-provider-toggle`, même style que le reste de l'app), deux champs de clé distincts toujours visibles. État de sélection tenu dans `coachSettingsProviderDraft` le temps que la modale est ouverte, appliqué seulement au clic sur Enregistrer — même principe que les champs de clé, qui ne sont lus qu'à ce moment-là.

**Vérifié** : catalogue de modèles interrogé en direct (`GET /openai/v1/models`) ; 4 scénarios Node sur `callGroqResilient()` (cascade sur 429, clé invalide fatale immédiate, modèle mort 404 → bascule + correction en base, non-régression de `callGeminiResilient()`) ; **et** un appel réel de bout en bout à travers le code extrait tel quel (pas seulement `curl`), avec la vraie clé de Corentin — 900 ms, réponse cohérente. **Non vérifié sur iPhone.**

**Fichiers touchés** : `Muscu/app.js`, `Muscu/index.html`, `Muscu/README.md`


### Correctif de suivi (23/09/2026, même jour) — le message d'erreur mentait sur le fournisseur

**Symptôme** : Corentin a mis sa clé Groq et sélectionné Groq, mais a reçu « Google est surchargé sur tous les modèles » — de quoi croire que le sélecteur n'avait servi à rien.
**Cause** : `coachErrorMessage()` avait des textes codés en dur ("Google", "l'API Gemini") datant d'avant le support multi-fournisseur — jamais mis à jour pour lire `coachGetProvider()`. Que la cause réelle soit Gemini ou Groq qui échoue, le texte affichait toujours "Google", indépendamment du fournisseur qui avait effectivement été appelé.
**Correction** : tous les messages (`NO_KEY`, `KEY_REJECTED`, `KEY_FORBIDDEN`, `ALL_MODELS_OVERLOADED`) utilisent désormais un label dynamique selon `coachGetProvider()`. Ajout d'un **badge permanent** sur l'écran du coach (`#coach-provider-badge`, à côté de l'icône réglages) affichant "Gemini" ou "Groq ⚡" — pour vérifier d'un coup d'œil lequel est actif sans ouvrir la modale, plutôt que de dépendre uniquement du texte d'un message d'erreur.
**Non exclu** : il reste possible que le sélecteur n'ait simplement pas été basculé sur Groq avant l'enregistrement (juste rempli le champ clé sans taper le bouton) — le badge permanent rend ce cas immédiatement visible désormais, sans avoir besoin de rouvrir les réglages pour vérifier.
**Fichiers touchés** : `Muscu/app.js`, `Muscu/index.html`, `Muscu/README.md`


### Correctif de suivi (23/09/2026, même jour) — le "surchargé" Groq était en fait un plafond de tokens/minute dépassé

**Symptôme** : badge confirmé sur « Groq ⚡ », message correctement attribué à Groq (voir correctif précédent), mais échec systématique en rafale de tests.
**Cause réelle, pas une panne** : les modèles `openai/gpt-oss-*` de Groq sont des modèles de **raisonnement** — sans le paramètre `reasoning_effort`, ils génèrent un raisonnement caché de 2000+ tokens avant même la réponse visible, qui consomme le **même quota** que la réponse. Le tier gratuit Groq plafonne à **8000 tokens/minute**. Avec le contexte déjà volumineux envoyé à chaque message (profils, séances, historique), un seul appel sans ce réglage a été mesuré à 4649 tokens (2201 de contexte + 2448 de raisonnement caché pour répondre... "Bonjour") — 2-3 messages rapprochés suffisent à épuiser tout le quota de la minute, d'où le "surchargé" à répétition alors que ni Groq ni le code n'étaient réellement en tort.
**Solution** : `reasoning_effort: 'low'` ajouté aux deux appels Groq (`callCoachChat`, `callCoach`). Vérifié en direct, même requête : 4649 tokens sans ce réglage → **1595 tokens** avec, pour une qualité de réponse équivalente sur les tests effectués.
**`coachErrorMessage()` distingue désormais** un vrai plafond de débit (429/QUOTA — se résout tout seul en ~1 minute, propre au tier gratuit) d'une vraie panne serveur (503) : les deux étaient confondus sous le même message "surchargé sur tous les modèles" avant ce correctif, ce qui rendait le diagnostic impossible depuis l'app elle-même.
**Vérifié** : test direct avec la vraie clé, contexte de taille réaliste reproduit (35 répétitions d'une note de séance ≈ 1500 tokens), à travers le code extrait tel quel (pas seulement `curl`) — 693ms, réponse cohérente, 1595 tokens au total. **Non testé sur iPhone.**
**Fichiers touchés** : `Muscu/app.js`, `Muscu/README.md`


### Décision (23/09/2026, même jour) — abandon du coach conversationnel intégré

Après cascade Gemini, bug 404 dans la cascade, badge multi-fournisseur, et plafond de tokens/minute Groq pris pour une panne (toutes les entrées juste au-dessus, même journée), Corentin a décidé d'abandonner le coach IA intégré (chat + bilans + choix Gemini/Groq) au profit d'un flux manuel : copier/coller les données pertinentes dans l'app Gemini grand public sur iPhone après chaque séance. Détail complet de la décision : `PROBLEMES_RESOLUS.md`.

### Implémentation (23/09/2026, même jour) — retrait complet

**Retiré de `Muscu/app.js`** : chat (envoi de messages, fil de discussion, gestion des conversations : `sendCoachMessage`, `callCoachChat`, `getChatThreads`, `renderChatSelector`, `createChatThread`, `repairChatThreads`…), génération de bilans via IA (`callCoach`, `requestCoachFeedback`, `saveCoachFeedback`), les deux fournisseurs et leur cascade de résilience en entier (`geminiFetch`, `groqFetch`, `callGeminiResilient`, `callGroqResilient`, self-heal de modèle, `coachGetKey`/`coachGetGroqKey`/`coachGetProvider`…), les constructeurs de prompt (`buildCoachDigest`, `buildCoachPrompt`, `buildArchiveExcerpts`…), le badge et le sélecteur de fournisseur. **Retiré de `Muscu/index.html`** : l'écran de chat (`view-coach`), la modale de réglages (clés + sélecteur), la modale de gestion des conversations, le bouton "Coach" du menu principal.

**Ce qui reste, volontairement** : `coachSettings()` et `saveCoachSettingsRemote()` — utilisés par les mensurations (`saveBodyEntry`/`deleteBodyEntry` écrivent dans `settings/coach.body`) et par l'export, sans rapport avec l'IA. Les écouteurs Firestore (`onSnapshot` sur `coachChat` et `settings/coach`, dans le script module de `index.html`) ne sont **pas touchés** : ils alimentent `window.coachChatCache`/`coachSettingsCache`, dont dépendent `buildMailBackupPayload()` et `exportFullDataJSON()` pour les sauvegardes — les couper aurait vidé les exports. `renderCoachBlock()` simplifié : affiche en lecture seule un bilan déjà généré avant ce retrait, s'il en existe un pour la séance consultée — plus de bouton, plus d'appel réseau.

**Aucune donnée supprimée** : archives, mensurations, conversations passées (collection `coachChat`) et anciens bilans (`archive.coachFeedback`) restent intacts en base, à récupérer via `exportFullDataJSON()` (bouton dans Réglages) à tout moment.

**Vérifié** : `node --check` sur `app.js` après retrait ; recherche exhaustive de toute référence orpheline aux ~50 identifiants retirés (aucune trouvée) ; comptage des balises `<div>`/`</div>` dans `index.html` avant/après (108/108, équilibré) ; relecture du fichier réellement publié sur GitHub pour confirmer l'absence de `sendCoachMessage`, `geminiFetch`, `groqFetch`, etc., et la présence de `renderCoachBlock`/`saveCoachSettingsRemote`. **Non testé sur iPhone.**
**Fichiers touchés** : `Muscu/app.js`, `Muscu/index.html`, `Muscu/README.md`


### Écran Suivi — exports groupés Corentin + Lisa (23/09/2026, même jour)

**Demande de Corentin** : après le retrait du coach IA, un moyen rapide de récupérer la dernière séance de chacun (lui + Lisa) et la dernière mensuration de chacun, prêtes à coller dans sa conversation Gemini personnelle — plus un accès direct à l'export complet déjà existant. Avertir si une donnée n'est pas datée d'aujourd'hui (oubli d'archivage), **sans jamais bloquer la copie** : demande explicite, "ne m'empêche pas de copier quand même si je veux".

**Nouvel écran `view-tracking`**, accessible via un bouton "Suivi" au menu principal (à la place laissée par l'ancien "Coach") :
- **`exportLatestSessions()`** : pour chaque profil, prend l'archive au `createdAt` le plus élevé (tri explicite, pas le premier/dernier élément brut du cache — l'ordre du cache n'est pas garanti ici), réutilise son `exportText` déjà généré (même format que "Séance terminée"). Si la `dateLabel` n'est pas celle du jour, ajoute une ligne d'avertissement dans `motivation-line` au-dessus du texte — le texte lui-même reste identique et copiable normalement.
- **`exportLatestBodyEntries()`** : même principe sur `bodyEntries(profile)[0]` (déjà trié par `at` décroissant), avec le détail de chaque mesure (poids, tour de taille, etc.).
- **Bouton "Exporter toute l'app"** : relié à `exportFullDataJSON()`, déjà existante, aucune nouvelle fonction nécessaire.

Les trois réutilisent la modale de récapitulatif déjà existante (`export-modal` / `export-text` / `motivation-line` / bouton Copier) plutôt que d'en créer une nouvelle — `document.getElementById('coach-block').innerHTML` est explicitement vidé à l'ouverture pour ne pas laisser réapparaître un ancien bilan resté affiché d'une consultation d'archive précédente.

**Vérifié** : testé en isolation avec des mocks (deux profils, une séance plus ancienne que l'autre, un profil sans mensuration) — confirmé que le tri prend bien la plus récente par `createdAt` (pas par position dans le tableau), que l'avertissement n'apparaît que lorsque la date diffère d'aujourd'hui, et qu'un profil sans donnée ne fait pas planter l'export. `node --check` sur le fichier publié. Balises `<div>` comptées avant/après (équilibrées). **Non testé sur iPhone.**
**Fichiers touchés** : `Muscu/app.js`, `Muscu/index.html`, `Muscu/README.md`