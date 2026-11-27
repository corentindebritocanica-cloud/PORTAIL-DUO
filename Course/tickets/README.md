# Tickets de caisse (SAS MATESTRO, Pompertuzat)
- `*.pdf` : tickets originaux (02/10 → 27/11/2026 + 18/04 → 25/09/2026).
- `tickets-lus.json` : tickets lus par le parseur (clé = date JJ-MM-AAAA ; date en ms, articles {libelle, prix, quantite, total, unite?}, remises).
- Facture Drive du 09/04/2026 (`*_Facture_Drive_*.pdf`) : noms de produits complets (pas de libellés de caisse), prix au rayon avant remises immédiates ; total retenu = montant payé (191,01 €) ; poids variables → prix au kg = total / poids livré.

## Procédure hebdo (ticket envoyé à Claude) — décidée le 27/11/2026
Corentin envoie le PDF à Claude au lieu de l'importer dans l'app. Claude, côté serveur (compte de service, sauvegarde JSON avant) :
1. **Course** : prix relevés à la date du ticket (règles de l'import de l'app : `diviseursTicket`, vrac au kg, un relevé par jour), nouveaux libellés rattachés ou signalés, ticket ajouté à `listes/maison.tickets` (`g` calculé sur **toutes** les lignes), PDF + lecture dans `tickets-lus.json`.
2. **Budget** : une dépense dans le mois de la date du ticket (ou la date demandée) : libellé = **nom du magasin** (« Intermarché » pour SAS MATESTRO), 🛒 Courses, montant = « MONTANT DU » (tickets resto compris), `par: 'corentin'`, `notifie: true`. Paiement lu en bas du ticket : `CB SANS CONTACT` → carte, `ESPECES` → `montantEspeces`, `TRD SODEXO` → `montantTicket`, `CARTE PREPAYEE` (= carte cadeau) → `montantCadeau` ; un seul moyen → `CB`/`ESPECES`/`TICKET`/`CADEAU`, sinon `MIXTE`. Ligne insérée en tête de `depenses`, écriture avec précondition `updateTime`.
3. **Notification** aux **deux** téléphones (demande de Corentin) : relais Apps Script de `commun.js` (`RELAIS_NOTIF`), `profil: ''`, titre « Dépense de Corentin », corps « 147,02 € — Intermarché · 🛒 Courses », `url: './Budget/'`, `tag: 'depense-<id>'`. Jeton d'identité du compte duo obtenu par jeton personnalisé (compte de service → `signInWithCustomToken`), jamais dans le dépôt.
- 27/11/2026 : dépense du ticket du 27/11 posée au **01/12/2026** (demande exceptionnelle) : 147,02 € Mixte = 122,02 € 🎁 + 25,00 € 🎫 ; notification reçue par 2 appareils.
