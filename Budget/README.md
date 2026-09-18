# Lisa-CorentinBudget

## Changelog

### v2.9.6 — Correctif Accordéons (2026-09-18)
- Correctif : les flèches d'accordéon (▼) des cartes de la vue Mensuelle (Répartition, Charges, Dépenses, Épargne, Provisions) étaient inertes — le clic sur l'en-tête ne repliait/dépliait pas la carte.
- Cause : l'écouteur de clic gérant l'accordéon (`toggleSection`) n'était attaché qu'à l'intérieur de la vue Admin (pour la corbeille), et non de façon globale.
- Correction : remplacement par un écouteur délégué unique sur `document.body`, qui capte tout `.card-header[data-target]` cliqué, quelle que soit la vue active.
