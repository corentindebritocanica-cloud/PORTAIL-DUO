# Budget L&C

Application PWA de suivi budgétaire personnelle pour deux personnes (Lisa & Corentin). Fichier unique `index.html` (HTML + CSS + JS inline), hébergée sur GitHub Pages, avec Firebase (Realtime Database + Auth) comme backend.

> Portfolio piece / outil perso — pas un produit commercial.

## Accès

- **App en ligne :** https://corentindebritocanica-cloud.github.io/PORTAIL-DUO/Budget/
- **Code source (RAW) :** https://raw.githubusercontent.com/corentindebritocanica-cloud/PORTAIL-DUO/refs/heads/main/Budget/index.html

Le repo `PORTAIL-DUO` regroupe cette app avec deux autres (Muscu, Courses) dans des sous-dossiers séparés, plus un portail de lancement commun à la racine. L'ancien repo `Lisa-CorentinBudget` est obsolète et voué à disparaître — ne plus l'utiliser comme référence.

## Fichiers du dossier `/Budget/`

- `index.html` — toute l'application (markup, styles, logique)
- `manifest.json` — manifeste PWA (nom "Budget L&C", icône `icone.png`, couleur de thème `#007AFF`, mode `standalone`)
- `icone.PNG` — icône de l'app
- `README.md` — ce fichier

## Stack technique

- Aucun framework : HTML/CSS/JS vanilla, un seul fichier
- **Firebase Realtime Database** (pas Firestore) pour la persistance
- **Firebase Auth** (email/mot de passe) pour l'accès, en SDK *compat* (`<script src>` classique, pas les imports ES module) — nécessaire pour éviter des échecs d'authentification silencieux sur Safari iOS
- **SortableJS** pour le drag & drop des lignes
- **canvas-confetti** pour l'animation de confettis à l'ajout d'une épargne
- Hébergement : GitHub Pages
- Appareil de test principal : iPhone (Safari iOS) — c'est une contrainte dure du projet

### Config Firebase
Projet Firebase : `lisa-et-corentin` (Realtime Database région `europe-west1`). Le détail de la config est dans le `<script>` d'`index.html`.

## Structure des données (Realtime Database)

Deux nœuds racine :

- **`budgetDataLC`** — tableau des mois. Chaque mois :
  ```
  { id, nom ("Mars 2026"), annee, revenus, revenus_add,
    charges: [], depenses: [], epargne: [], provisions: [], fixes: [] }
  ```
  Chaque ligne (charge/dépense/épargne/provision/fixe) a la forme :
  ```
  { id, libelle ou categorie, montant, date, moyenPaiement? (CB/TR/ESPECES), isRetrait? }
  ```
- **`budgetConfigLC`** — objet unique :
  ```
  { categories: [...], corbeille: [...], objectifsProvisions: [{nom, montant}] }
  ```

`normaliserMois()` s'assure à la lecture que chaque sous-tableau est bien un array (Firebase peut renvoyer un objet si les clés ne sont pas contiguës).

## Fonctionnalités par onglet

### Mois (vue mensuelle)
- Barre de recherche filtrant toutes les lignes du mois (insensible aux accents)
- Bloc revenus : solde reporté (calculé automatiquement à partir de l'historique, lecture seule), revenus initiaux, ajouts en cours
- Carte "Reste à vivre (Revolut)" : montant total, jours restants dans le mois en cours, badge de comparaison **`#comparaison-n1`** présent dans le markup mais **jamais rempli par le JS** — élément mort/non fini, toujours masqué
- Section "Répartition" : 5 barres de progression (Charges fixes, Dépenses, Épargne, Provisions, Reste), chacune affichant montant en € **et** pourcentage
- Sections Charges / Dépenses / Épargne / Provisions : ajout, édition inline, suppression avec undo (toast 4s), réordonnancement par drag & drop
- Dépenses : bouton cyclique de moyen de paiement (💳 CB → 🎟️ TR → 💵 Espèces), détection automatique de la catégorie "🛒 Courses" par regex sur le libellé (enseignes : Leclerc, Carrefour, Auchan, Intermarché, Super U, Lidl, Aldi, Cora, Casino, Netto, ou mot "frais")
- Épargne : bouton "+ Épargner" déclenche des confettis ; les lignes marquées `isRetrait` s'affichent en négatif/rouge
- Le calcul du "reste à vivre" exclut l'épargne et les dépenses payées en Tickets Restaurant/Espèces (seuls revenus − charges − dépenses CB − provisions comptent)

### Fixes (charges fixes mensuelles)
- Vue dédiée pour calculer le virement mensuel sur le compte commun
- Total à diviser + part individuelle (**division fixe par 2**, non paramétrable dans l'UI)
- Lignes minimalistes : catégorie + montant seulement (pas de date, pas de libellé libre)

### Année (bilan annuel)
- Sélecteur d'année
- Total épargné sur l'année
- Totaux Charges fixes / Dépenses / Provisions
- Suivi d'objectifs : chaque "objectif de provision" (mot-clé + montant cible, défini dans Admin) est comparé au cumul des lignes de provisions/épargne dont la catégorie contient ce mot-clé, avec barre de progression

### Admin
- **Sécurité** : déconnexion de l'appareil
- **Outils système** : rechargement forcé (vide le cache)
- **Créer un mois spécifique** : ajout manuel d'un mois (sélecteur mois/année), reprend les revenus du dernier mois connu
- **Gestion des catégories** : ajout/suppression des catégories par défaut (liste de base : Loyer, Électricité, Eau, Assurance, Internet, Courses, Restaurant, Loisirs, Santé, Vacances, Travaux, Autre)
- **Budgets de provisions (annuel)** : création/suppression des objectifs mot-clé + montant
- **Garde-robe (thèmes)** : sélecteur visuel des 11 thèmes (voir ci-dessous)
- **Sauvegarde automatique** : bouton d'envoi manuel d'un export JSON par email via un webhook Google Apps Script. Le texte affiché ("le dimanche à minuit, un email est envoyé automatiquement") suppose un déclencheur automatique côté script Google — **non vérifiable depuis ce fichier**, à confirmer côté Apps Script si besoin
- **Corbeille** : affiche les 5 derniers éléments supprimés. Bouton **"Restaurer"** : remet la ligne dans le mois **actuellement affiché** (le mois d'origine n'est pas mémorisé dans la corbeille, donc la restauration se fait toujours vers le mois actif, pas nécessairement celui d'où la ligne venait). Bouton **"Vider la corbeille"** : suppression définitive après confirmation
- **Restauration manuelle** : import d'un fichier `.json` qui écrase toutes les données actuelles (avec confirmation)
- Numéro de version affiché en bas de page (actuellement **2.9.6** — "Correctif Corbeille : restauration/vidage")

## Thèmes (11 au total)

Bleu par défaut (iOS), Purple, Green, Rose (simples surcharges de couleur), **Glass** (glassmorphism : dégradés radiaux + `backdrop-filter: blur`), puis 6 thèmes "hors tech" : Latte, Botanic, Gatsby, Terracotta, Moleskine, Watercolor. Tous ont une variante mode sombre définie séparément. Le thème est stocké en `localStorage` et appliqué au chargement.

Note : le `<body>` du fichier source a `class="theme-glass"` codé en dur — c'est donc le thème affiché tant que l'utilisateur n'a pas encore de préférence en `localStorage`.

## Système de changelog au login

À chaque connexion, l'app compare le cache local (`localStorage`) au nouveau snapshot reçu de Firebase et affiche une popup listant les lignes ajoutées/modifiées/supprimées depuis la dernière visite (montant + catégorie + mois concerné).

## Comportements spécifiques iOS / Safari — à ne jamais casser

- **Aucun emoji dans le texte des onglets** (`.btn-tab`) : un emoji dans un libellé d'onglet provoque un plantage silencieux au démarrage sur Safari iOS
- **Firebase en SDK compat** (`<script src>`), jamais en import ES module — sinon échec d'authentification sur Safari iOS
- **Drag & drop (SortableJS)** : `touch-action: pan-y` sur `.item-row`, `touch-action: none` uniquement sur `.drag-handle`, avec `delay: 150` / `delayOnTouchOnly: true` — sinon conflit avec le scroll tactile
- **Décimales françaises** : toujours utiliser `parseMontant()` (gère la virgule), jamais `parseFloat()` seul, pour tout ce qui touche aux objectifs/provisions ; les emojis sont retirés avant comparaison de catégories
- **Persistance de session Firebase Auth** : `LOCAL` (reste connecté à la fermeture de Safari/PWA). Limite connue : l'ITP de Safari peut purger ce stockage après plusieurs jours d'inactivité — comportement navigateur documenté dans le code, pas un bug à corriger

## Historique / décisions prises

- Un onglet "Vacances" (façon Tricount) a été développé puis entièrement retiré de l'interface. Reste un appel mort à `rendreVueVacances()` dans l'aiguillage des vues (jamais atteint, aucun onglet n'y mène) — code résiduel sans impact, à nettoyer un jour si besoin
- Un import de dépenses par capture d'écran + IA avait été envisagé puis abandonné (jugé trop lourd à développer)
- L'app vivait auparavant sur un repo séparé (`Lisa-CorentinBudget`), migrée dans `PORTAIL-DUO/Budget/` pour permettre une navigation en plein écran entre les 3 apps du foyer sans repasser par la barre Safari

## Bugs connus / éléments à finir

- `#comparaison-n1` : badge de comparaison au mois N-1 présent dans le markup, jamais implémenté côté JS
- Répartition des charges fixes toujours divisée par 2 en dur (pas adapté si un jour ce n'est plus un couple à deux)
- La restauration depuis la corbeille ne remet pas la ligne dans son mois d'origine (non mémorisé) mais dans le mois actif au moment du clic — comportement volontaire du correctif, pas un bug, mais à garder en tête

## Historique des correctifs

- **v2.9.6** : ajout des fonctions `restaurerCorbeille()` et `viderCorbeille()`, absentes du code jusque-là malgré des boutons déjà présents dans l'interface (repérées par audit du 14/09/2026)
