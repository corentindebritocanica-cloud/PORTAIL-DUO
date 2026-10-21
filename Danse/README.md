# Agenda Danse

Agenda des entraînements de danse **partagé** entre Corentin et Lisa. 6e app de PORTAIL-DUO (Portail, Muscu, Budget, Course, Todo, Danse), créée le 21/10/2026, ouverte depuis la 5e vitre du Portail.

URL : `…/PORTAIL-DUO/Danse/`

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure, fenêtre « entraînement », dialogue, connexion, `DERNIERE_MAJ` |
| `style.css` | Copie de `Todo/style.css` (mêmes jetons, mêmes classes) + bloc « AGENDA DANSE » en fin de fichier |
| `app.js` | Code (Firebase, rendu, notifications, Agenda Apple, résumé du Portail) |
| `sw.js` | Service worker, copie de celui de Todo (caches `danse-shell-*`, `danse-sdk-*`) |
| `manifest.json`, `icone-192.png`, `icone-512.png` | PWA (icône : calendrier + note, générée le 21/10/2026) |
| `../commun.js`, `../verre.css` | Noyau et habillage communs |

`DERNIERE_MAJ`, les `?v=` et `CACHE_NAME` sont mis à jour par `.github/workflows/auto-version.yml` (Danse ajouté le 21/10/2026) : ne pas les modifier à la main.

## Fonctionnement

- **Liste « à venir »** groupée par mois, triée par date et heure. Chaque ligne : bloc date (jour + numéro, plein rose le jour J + étiquette « Aujourd'hui »), titre, heures, lieu, note, point bleu/rose = dernière personne qui a ajouté/modifié, pastille **NOUVEAU** si l'autre a ajouté/modifié depuis ta dernière visite (`danse_vu_le`).
- **Passés** : repliable (`danse_passes_ouvert`), un entraînement y passe à son heure de fin (re-rendu toutes les minutes).
- **+** : fenêtre « Nouvel entraînement » (titre, date, début, fin, lieu, note). Contrôles : titre et date obligatoires, fin après le début. Toucher une ligne ou le crayon = modifier / supprimer.
- **Notification à chaque ajout, modification, suppression** : `notifierDuo({ titre:'Agenda Danse', corps:'Corentin a ajouté : Entraînement Angelina · dim. 15 nov., 15h – 18h', url:'./Danse/', tag:'danse-<id>', tous:true })` → **tous** les téléphones abonnés (Corentin ET Lisa, y compris celui qui modifie). Abonnement : Portail › Réglages › Notifications. Hors ligne : la demande attend (file de `commun.js`, 12 h max).
- **Agenda Apple** (21/10/2026) : bouton calendrier sur chaque entraînement à venir et « Ajouter à mon agenda Apple » dans la fenêtre. Génère un fichier `.ics` sur le téléphone (`fabriquerIcs`) : titre **« <Prénom du profil> à <titre> »** (ex. « Corentin à Entraînement Angelina »), heures « flottantes » (heure locale du téléphone), lieu, note, `UID` stable `<id>@portail-duo-danse`. Sur iPhone, l'ouverture du fichier affiche l'aperçu iOS « Ajouter au calendrier » ; sur ordinateur, téléchargement. Rien n'est écrit dans la base ; une modification dans l'app ne met PAS à jour l'événement déjà ajouté dans l'agenda Apple (le rajouter).
- **Réglages** : profil Corentin/Lisa (`duo_profile`), rappel des notifications, recharger l'app (vide les seuls caches `danse-*`).
- **Portail** : `?saisie=evt` ouvre directement la fenêtre d'ajout.

## Données — Firestore (`course-app-36e9d`)

| Collection | Document |
|---|---|
| `danseEvents/{id}` | `{ titre, date:'AAAA-MM-JJ', debut:'HH:MM', fin:'HH:MM', lieu, note, creePar, creeLe, majPar, majLe }` — heures murales, sans fuseau ; `creePar`/`majPar` = `'corentin'` \| `'lisa'`, dates en ms |
| `portail/danse` | `{ maj, aVenir, prochains:[{ titre, date, debut, fin }] }` (3 max) |

- **1 seule écoute `onSnapshot`** (`danseEvents`). Aperçu local `danse_apercu_v1` (affichage seulement, jamais réécrit en base), écritures différées au 1er instantané, ids créés sur le téléphone : fonctionne hors ligne.
- Textes toujours échappés (`escapeHtml`). Règles : `danseEvents` en `compteDuo()`, publiées le 21/10/2026.
- Données initiales (21/10/2026, écrites par le compte de service) : `danse-20261115-angelina` (15/11 15h–18h, Entraînement Angelina), `danse-20261121-maelys` (21/11 9h–12h, Entraînement Maelys).

## Historique

### Création (21/10/2026)
Demande de Corentin : agenda Danse dans le Portail, tout en base, notification à tous les téléphones à chaque mise à jour, puis bouton « agenda Apple » avec le titre « Corentin à <nom> ».
Architecture de Todo (copie de `sw.js` et `style.css`). Notifications : infrastructure existante (relais Apps Script + FCM), pas de Cloud Function ni de plan Blaze ; seule nouveauté `tous:true` dans `commun.js`.
**Vérifié** (Chromium 393×852, Firebase simulé) : affichage des 2 entraînements, ajout → document écrit, `portail/danse` publié, demande de notification avec profil vide (= tous), contenu du `.ics`, 5e vitre du Portail. **Non vérifié sur iPhone** : réception réelle des notifications, aperçu « Ajouter au calendrier » d'iOS depuis l'app écran d'accueil.
