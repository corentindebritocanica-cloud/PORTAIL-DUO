# Recettes (11/11/2026)

App de recettes partagées (Corentin + Lisa). 5e dossier du monorepo, même architecture que Todo (SDK Firebase « compat », persistance hors ligne, aperçu localStorage, compte e-mail du duo via `connexionDuo()` de `../commun.js`).

## Données (projet `course-app-36e9d`)
`recettes/{id}` = `{ titre, categorie, portions, prepa (min), cuisson (min), temp (°C), four ('' | 'classique' | 'tournante'), ingredients [string], etapes [string], notes, favori, creePar, creeLe, maj }`
Collection déclarée dans `/firestore.rules`, **publiée le 11/11/2026** par l'API Firebase Rules (ruleset c1895199…).
`portail/recettes` = `{ maj, total, favoris, categories:[{nom,n}] }` (écrit par l'app, lu par la 6e vitre du Portail).

## Fonctions
- Liste triée A→Z, recherche (titre, catégorie, ingrédients), filtres par catégorie et favoris.
- Fiche : ingrédients (toucher = barrer pendant la cuisine), étapes numérotées, notes, temps, température, type de four.
- Édition : ingrédients et étapes saisis une ligne par élément.
- « Coller un texte » : analyse un texte copié (IA, site) avec ses rubriques Ingrédients / Préparation et remplit les champs (titre, portions, température détectée).

## Choix
- Style autonome (`style.css`, jetons de la charte, sombre uniquement) : `verre.css` n'est pas branché (ses règles visent Course/Todo). À faire si on veut le même habillage.
- Portail : 6e vitre (orange, `verre.css` : pile à 6 rangs, `--dy` de devant 330 px). Bouton « + » → `?saisie=recette`.
- Icônes générées (bol orange) : à remplacer si besoin.
