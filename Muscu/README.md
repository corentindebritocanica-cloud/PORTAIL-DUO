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
Pour un exercice à plusieurs méthodes (`equipment.length > 1`, voir « Équipement » plus haut), un second réglage **Méthode** apparaît au-dessus de la Période dans `progress-controls` — un bouton « Toutes » plus un par méthode déclarée pour cet exercice (`EQUIPMENT_METHODS`).

- **Clé composée** `__method__:<exercice>||<méthode>` (`methodProgressKey`, `isMethodProgressKey`, `methodProgressExerciseName`, `methodProgressMethodId`) — même famille que les clés de tonnage (`__tonnage__:`), séparateur `||` choisi car aucun nom d'exercice n'en contient.
- `archiveExerciseMethodId(archive, nom)` retrouve la méthode réellement utilisée ce jour-là (même repli que `archiveLoadFactor` : première de la liste si rien de stocké/valide) ; retourne `null` si l'exercice n'a qu'une méthode fixe — pas de filtre pertinent dans ce cas.
- `getProgressPoints` ne garde, pour une clé méthode, que les archives où `archiveExerciseMethodId` correspond — chaque méthode a donc sa propre courbe, son propre record affiché, sa propre période. Choisir « Toutes » revient au comportement d'origine (toutes les séances mélangées, quelle que soit la méthode).
- Le menu déroulant d'exercice ne propose qu'une entrée par nom — la méthode se choisit **après**, dans les boutons Méthode. `select.value` est donc réconcilié sur le nom de base même quand `progressSelection` est une clé méthode, sinon le menu retomberait visuellement sur l'amorce.
- **Portée volontairement limitée à cet onglet.** Le badge de record affiché pendant la saisie (`getPersonalRecord`) et le rappel « Dernière fois » (`getLastPerformance`) restent, eux, toutes méthodes confondues — les isoler par méthode aussi n'a pas été demandé et changerait un comportement déjà en place ailleurs.

### Onglet Poids & mensurations
Sept mensurations en plus du poids : **Pec/Poitrine, Cuisse, Tour de fesse, Tour de hanche, Tour de taille, Bras, Tour d'épaule** (`BODY_FIELDS`, chacun `{ id, key, unit, label(profile) }`).

- **Le libellé de « pec » dépend du profil consulté** : « Poitrine » pour Lisa, « Pec » pour Corentin — même champ, même courbe, juste un mot qui change (`bodyFieldLabel(id, profile)`).
- **Une mesure est ajoutée à une date choisie**, pas seulement aujourd'hui (`<input type="date">`, pré-rempli à la date du jour). `saveBodyEntry()` calcule un timestamp `at` à midi ce jour-là.
- ⚠️ **Enregistrer fusionne avec l'entrée existante à cette date, ne la remplace jamais.** Une première version reconstruisait l'entrée entière à partir des seuls champs du formulaire : ajouter le tour de taille un jour où le poids avait déjà été noté effaçait ce poids, puisque son champ, laissé vide cette fois, écrasait la valeur précédente. Le code part maintenant de l'entrée existante (`Object.assign({...}, existingEntry)`) et ne remplace que les champs effectivement remplis.
- ⚠️ **Anciennes clés préservées** : les toutes premières mesures utilisaient `arm`/`waist`/`thigh` avant que les noms définitifs (`bras`/`taille`/`cuisse`) n'existent. `BODY_LEGACY_KEYS` fait le pont, `bodyEntryValue(entry, id)` lit la nouvelle clé avec repli sur l'ancienne — aucune mesure déjà enregistrée n'est perdue.
- **Sélection à tracer** (`renderBodySelect`) : un `<select>` qui ne propose que les champs réellement renseignés pour ce profil, avec `bodyProgressSelection` séparé de `progressSelection` (l'onglet Entraînement) — changer d'onglet ne perturbe pas l'autre.
- **Période dédiée** (`bodyProgressPeriod`, `setBodyProgressPeriod`) : indépendante de celle de l'onglet Entraînement.
- Le tracé (`renderBodyProgressChart`) réutilise `buildChartSvg`/`buildDeltaHtml`/`getProgressPoints`/`progressMetricInfo`, avec une clé `__body__:<champ>` (`bodyProgressKey`, `isBodyProgressKey`) pour distinguer une mensuration d'un exercice ou d'un tonnage sans risque de collision.
- **Historique** (`renderBodyList`) : les mesures récentes, avec **modification** (✏️, `editBodyEntry` pré-remplit le formulaire, `cancelEditBodyEntry` annule ; `editingBodyAt` retient l'entrée en cours d'édition ; si la date est changée pendant l'édition, l'ancienne et la nouvelle entrée sont toutes deux prises en compte pour éviter un doublon) et suppression (`deleteBodyEntry`).
- Stocké dans `settings/coach.body[profil]`, un tableau d'entrées — voir l'avertissement sur `settings/coach` plus haut avant d'y toucher.

## Réglages

Compte connecté, bouton de déconnexion, et un **sélecteur de profil Corentin/Lisa explicite** (`renderSettingsProfileToggle`, bascule segmentée appelant `setProfile(id)` et `applyThemeColor()`, rendu depuis `goToSettingsView()`). Ajouté pour corriger un bug où le chat du coach affichait la mauvaise identité sur un appareil donné — le profil actif dépend maintenant d'un choix explicite ici, pas d'une déduction implicite. **Le poids de corps et les mensurations n'y vivent plus** — ils ont d'abord été conçus ici, avant d'être jugés plus à leur place dans Suivi Progression (voir ci-dessus), qui est l'endroit naturel pour un *suivi* dans le temps. Un réglage pour activer la colonne RPE y a aussi existé brièvement, avant que le RPE ne devienne actif en permanence.

### Sauvegarde / Import (migration du catalogue, 14/09/26)
Deux boutons pensés pour une migration ponctuelle du catalogue d'exercices (renommage, changement d'architecture équipement), pas pour un usage quotidien :

- **📤 Exporter toutes les données** (`exportFullDataJSON`) : sert dans la modale d'export existante (textarea + Copier) un JSON brut — archives actives et corbeille des deux profils, `customSessions`, et `settings/coach.threads`/`.body`. **Clé API et modèle du coach volontairement exclus** : inutiles à une migration, pas de raison qu'ils circulent dans un texte copié-collé. Distinct de `exportAllArchives()` (bouton dans Archives) qui, lui, sert un texte lisible par un humain, pas une donnée destinée à être retraitée.
- **📥 Importer ces données** (`askImportFullDataJSON` → confirmation via `showConfirm` → `importFullDataJSON`) : colle un JSON préparé pour réimport dans un `<textarea>`, et écrit **par id** (upsert) dans `archives` et `customSessions` — un id déjà existant est remplacé, un nouvel id s'ajoute. Ne supprime **rien par déduction** : seuls les ids listés explicitement dans `customSessionsToDelete` sont effacés (`deleteDoc`). `settings/coach` n'est touché que si le JSON contient `coachSettings.body`, et **toujours fusionné** (`Object.assign({}, coachSettings(), { body: ... })`) — jamais réécrit en entier, conformément à la règle du document partagé (voir plus haut). Écritures offline-first : pas d'attente de confirmation serveur avant le toast, seul un `.catch()` loggue une erreur éventuelle.
- Aucune des deux fonctions ne touche à `coachChat` (les messages du fil de discussion) : décision explicite, cette collection n'a pas de mécanisme de sauvegarde à ce jour.

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

## Bugs iOS déjà corrigés (ne pas régresser)

- `height:100%` sur `html, body` plafonnait la page → `min-height`.
- Bottom-bar recouvrant le dernier exercice → `adjustBottomSpacing()`, appliquée uniquement sur `view-exercises`.
- Bouton undo recouvert par le badge de sync et le bouton de thème → `.header-row` a un `padding-right:86px`.
- Éviter de tuiler un `repeating-linear-gradient` avec un `background-size` qui ne correspond pas à sa période.

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
| Progression — Entraînement | menu déroulant, tonnage par séance, période, écart, étiquettes, absence de doublon avec l'onglet Corps, **filtre par méthode (clé composée, repli sur la 1ʳᵉ méthode, retour à "Toutes")** |
| Progression — Corps | 7 champs, libellé selon profil, date choisie, **fusion sur une même date**, clés historiques, sélection et période indépendantes, historique, **modification d'une entrée existante**, suppression |
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

Traité (liste non exhaustive, dans l'ordre approximatif) : refonte UI/UX, architecture en écrans, notes, cardio enrichi et optionnel, undo, archives Firebase, corbeille, Build Training puis sa restructuration en hub, catalogue d'exercices, mode de charge (remplaçant les variantes matériel), circuits en case libre, séances fixes modifiables par surcharge, note de séance, menu principal à 5 entrées, icône d'application, retour par glissement, graphique de progression, Suivi Progression réorganisé en deux onglets (Entraînement / Poids & mensurations), tonnage par séance, jetons de design, animations et retours d'état, authentification Firebase, coach IA (bilans + fil de discussion à conversations multiples, mémoire trois couches, auto-réparation des modèles, gestion des clés `AQ.`/`AIza`), poids de corps et mensurations complètes avec suivi daté, correction de la perte de données `settings/coach` et mécanisme de récupération, séries d'échauffement additives, RPE permanent, migration du dépôt vers `PORTAIL-DUO/Muscu/` derrière un portail commun avec Budget et Course, refonte identité visuelle « Ardoise & craie » (palette, Bebas Neue, texture craie), records et courbe de progression passés en volume (poids × reps) avec correction rétroactive du doublement par main, édition des mensurations déjà enregistrées, sélecteur de profil explicite dans Réglages (fix identité coach sur appareil partagé), indicateur d'attente avec timeout sur le chat coach, **refonte complète de l'équipement en deux listes séparées (calcul / vocabulaire), renommage du catalogue sans équipement en dur, export et import JSON bruts dans Réglages pour préparer et rejouer une migration, ajout de l'option Machine au Développé incliné, correction rétroactive systématique du tonnage (comparaison du facteur d'origine et du facteur migré, exercice par exercice et archive par archive — pas seulement le cas initialement repéré), correction d'une saisie erronée et regénération des textes d'archive figés (`exportText`) pour les noms renommés (14/09/26)**, **suivi de progression par méthode pour les exercices à plusieurs méthodes plausibles, avec courbe et record propres à chaque méthode (14/09/26)**.

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
