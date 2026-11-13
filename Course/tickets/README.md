# Tickets de caisse (SAS MATESTRO, Pompertuzat)
- `*.pdf` : tickets originaux (02/10 → 13/11/2026 + 18/04 → 25/09/2026).
- `tickets-lus.json` : tickets lus par le parseur (clé = date JJ-MM-AAAA ; date en ms, articles {libelle, prix, quantite, total, unite?}, remises).
- Facture Drive du 09/04/2026 (`*_Facture_Drive_*.pdf`) : noms de produits complets (pas de libellés de caisse), prix au rayon avant remises immédiates ; total retenu = montant payé (191,01 €) ; poids variables → prix au kg = total / poids livré.
