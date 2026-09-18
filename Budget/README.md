# Lisa-CorentinBudget

## Changelog

### v2.9.6 — Correctif Accordéons (2026-09-18)
- Correctif : les flèches d'accordéon (▼) des cartes de la vue Mensuelle (Répartition, Charges, Dépenses, Épargne, Provisions) étaient inertes — le clic sur l'en-tête ne repliait/dépliait pas la carte.
- Cause : l'écouteur de clic gérant l'accordéon (`toggleSection`) n'était attaché qu'à l'intérieur de la vue Admin (pour la corbeille), et non de façon globale.
- Correction : remplacement par un écouteur délégué unique sur `document.body`, qui capte tout `.card-header[data-target]` cliqué, quelle que soit la vue active.

### v2.9.7 — Cartes repliées par défaut (2026-09-18)
- Changement : dans la vue Mensuelle, les cartes Répartition, Charges, Dépenses, Épargne et Provisions s'affichent désormais repliées par défaut à l'ouverture d'un mois.
- Il suffit d'appuyer sur la flèche ▼ de l'en-tête pour déplier la carte qui vous intéresse (comportement inchangé, seul l'état initial change).
