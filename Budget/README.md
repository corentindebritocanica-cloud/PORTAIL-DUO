# Lisa-CorentinBudget

## Changelog

### v2.9.6 — Correctif Accordéons (2026-09-18)
- Correctif : les flèches d'accordéon (▼) des cartes de la vue Mensuelle (Répartition, Charges, Dépenses, Épargne, Provisions) étaient inertes — le clic sur l'en-tête ne repliait/dépliait pas la carte.
- Cause : l'écouteur de clic gérant l'accordéon (`toggleSection`) n'était attaché qu'à l'intérieur de la vue Admin (pour la corbeille), et non de façon globale.
- Correction : remplacement par un écouteur délégué unique sur `document.body`, qui capte tout `.card-header[data-target]` cliqué, quelle que soit la vue active.

### v2.9.7 — Cartes repliées par défaut (2026-09-18)
- Changement : dans la vue Mensuelle, les cartes Répartition, Charges, Dépenses, Épargne et Provisions s'affichent désormais repliées par défaut à l'ouverture d'un mois.
- Il suffit d'appuyer sur la flèche ▼ de l'en-tête pour déplier la carte qui vous intéresse (comportement inchangé, seul l'état initial change).

### v3.0.0 — Migration Realtime Database → Firestore (2026-09-18)
- Changement majeur : la persistance des données passe de Firebase Realtime Database à Firebase Firestore.
- Structure : chaque mois est désormais un document Firestore distinct (collection `mois`, identifiant = l'id du mois), au lieu d'un unique tableau réécrit en entier à chaque modification (`budgetDataLC`). La config (catégories, corbeille, objectifs de provisions) est dans un document unique `config/global`.
- Avant bascule : sauvegarde JSON complète de la RTDB effectuée et vérifiée (9 mois + config, comparaison champ par champ à 100%). La Realtime Database n'a pas été supprimée et reste disponible en lecture comme filet de sécurité, mais l'app n'y écrit et n'y lit plus rien après cette version.
- Le nœud `budgetVoyagesLC` (ancienne fonctionnalité Vacances, déjà inutilisée par l'app) n'a pas été migré ; il reste uniquement dans la RTDB et dans la sauvegarde JSON archivée.
- Règles de sécurité Firestore mises en place : lecture/écriture réservées aux utilisateurs authentifiés (`request.auth != null`), sur le même principe que les règles RTDB précédentes.
- Corrections associées : la suppression d'un mois supprime désormais réellement le document Firestore correspondant ; le bouton "Annuler" (undo) après suppression d'une ligne sauvegarde le bon mois même si l'utilisateur a changé d'onglet entre-temps ; la restauration manuelle par fichier .json remplace proprement toute la collection (ajouts, mises à jour et suppressions des mois absents du fichier importé) au lieu de ne sauvegarder que le mois actif.
