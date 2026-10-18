# Budget V2 — tableau de bord (essai, 18/10/2026)

> **📌 État actuel** — à lire en premier.
> - **Copie de Budget** (`/Budget/`, v4.0.0) avec une **nouvelle interface de l'onglet Mois**, inspirée de la maquette « Budget — refonte onglet Mois » (design en sombre validé par Corentin le 18/10/2026).
> - **Mêmes données que Budget** : même projet Firebase (`course-app-36e9d`), mêmes collections `mois` et `config`, même compte. Une saisie dans V2 apparaît dans Budget et inversement. Aucune règle Firestore à changer.
> - **But** : utiliser les deux en parallèle, puis garder une seule version. Pour adopter V2 : recopier `BudgetV2/*` dans `Budget/` (et garder `CACHE_PREFIX` de Budget dans `sw.js`), puis supprimer `BudgetV2/` et ses entrées (workflow, `sw.js` racine). Pour l'abandonner : supprimer `BudgetV2/` et ces mêmes entrées.
> - Adresse : `…/PORTAIL-DUO/BudgetV2/` (à ajouter sur l'écran d'accueil depuis Safari).
> - Historique complet de Budget (avant la copie) : `../Budget/README.md`.

## Ce qui change par rapport à Budget

**Onglet Mois** (les onglets Année, Fixes et Réglages sont identiques à Budget) :
- **Navigateur de mois** « ‹ Sept. · Octobre 2026 · Nov. › » au lieu de la liste par année (`rendreMenu`). « + Démarrer … » n'apparaît que sur le dernier mois.
- **Tous les mois** (18/10/2026, soir) : un appui sur le nom du mois ouvre la feuille `#sheet-mois` (mois groupés par année, 3 colonnes) pour sauter directement à n'importe quel mois — remplace l'accès direct de l'ancienne liste.
- **Bascule Résumé / Calendrier** (`state.vueMois`).
- **Chiffre héros** : reste à vivre (centimes en petit), jours restants, ≈ € par jour, barre de progression du mois.
- **Barre empilée** Charges / Dépenses / Provisions (rayé) / Reste, à la place des 4 jauges « Répartition » ; montant **et pourcentage** sous chaque poste (les % arrondis peuvent totaliser 99 ou 101 %).
- **Vignettes 2×2** Charges · Dépenses · Provisions · Espèces : un appui ouvre une **feuille** (bottom sheet) avec la liste éditable d'origine (mêmes champs, glisser-déposer, mode Mixte, suppression + Annuler, notifications).
- **Actions rapides** : − Dépense (ouvre la feuille et crée la ligne, curseur dans le libellé), + Revenu (« Ajouts en cours »), Espèces (« Espèces ajoutées »).
- **Dernières opérations** : les 6 dépenses les plus récentes (emoji de la catégorie, mode de paiement, montant en pastille).
- **Feuille Dépenses** : recherche, filtre **Tous / Corentin / Lisa**, total par catégorie.
- **Feuille Revenus & espèces** : soldes reportés, revenus, espèces ajoutées, ajouts, et « Supprimer ce mois » (déplacé ici).
- **Calendrier** : dépenses et charges **datées** du mois ; rouge = dépense, vert = remboursement, pointillé ambre = charge datée après aujourd'hui (« à venir »). Un appui sur un jour affiche ses opérations.

**Données** : un seul champ ajouté, `par` (`'corentin' | 'lisa'`) sur les **nouvelles** dépenses créées dans V2 (profil du téléphone) → point bleu/rose et filtre Qui. Budget l'ignore. Les anciennes dépenses n'ont pas de point.

**Limite connue** : les charges sont recopiées d'un mois à l'autre avec leur ancienne date (`btn-next-month`), donc « À venir » reste à 0 tant que les dates des charges ne sont pas mises à jour dans le mois.

## Fichiers
- `index.html` : en-tête (navigateur de mois), vue Mois V2, feuilles `#v2-sheets` (hors de `<main>`, car `changerVue` masque tous les `main > div`).
- `app.js` : code de Budget + bloc « V2 (18/10/2026) » (`rendreV2`, `rendreCalendrier`, `ouvrirFeuille`/`fermerFeuille`). `setupTableListeners('v2-sheets')` remplace `'mois-content-wrapper'` ; garde ajoutée dans l'écouteur `input` (les champs de revenus sont dans la même feuille).
- `style.css` : styles de Budget + bloc « BUDGET V2 » en fin de fichier. Feuilles en fond **opaque** `#161b22` (`--card` est translucide en Verre).
- `sw.js` : `CACHE_PREFIX = 'budget-v2-shell-'` (caches séparés de Budget). `manifest.json` : « Budget V2 ».
- Hors du dossier : `.github/workflows/auto-version.yml` (BudgetV2 ajouté), `/sw.js` racine (`isSubApp`).

**Vérifié** (Chromium, Firebase simulé avec les vraies données lues en lecture seule) : rendu Résumé / feuille Dépenses / Calendrier, navigation de mois, ajout d'une dépense (`par` enregistré), aucune erreur JS. **Non vérifié sur iPhone** (clavier dans les feuilles, safe-area).
