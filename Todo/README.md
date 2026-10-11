# Todo

Listes de choses à faire **partagées** entre Corentin et Lisa (esprit « Notes partagées » / Rappels d'iPhone). 5e app de PORTAIL-DUO, créée le 11/10/2026, ouverte depuis la 4e vitre du Portail.

URL : `…/PORTAIL-DUO/Todo/`

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure, fenêtres (tâche, liste, dialogue, connexion), `DERNIERE_MAJ` |
| `style.css` | Base reprise de `Course/style.css` (mêmes jetons, mêmes noms de classes) |
| `app.js` | Code (Firebase, rendu, listes, résumé du Portail) |
| `sw.js` | Service worker, copie de celui de Course (noms de cache `todo-shell-*`, `todo-sdk-*`) |
| `manifest.json`, `icone-192.png`, `icone-512.png` | PWA |
| `../commun.js`, `../verre.css` | Noyau et habillage communs aux apps |

`DERNIERE_MAJ`, les `?v=` de `index.html` et `CACHE_NAME` de `sw.js` sont mis à jour par `.github/workflows/auto-version.yml` (Todo y a été ajouté le 11/10/2026) : ne pas les modifier à la main.

## Fonctionnement

- **Pastilles de listes** en haut (Général + les listes créées), avec le nombre de tâches à faire. `+` = nouvelle liste. Liste choisie mémorisée par téléphone (`localStorage todo_liste_active`).
- **Ajout rapide** : champ collé en haut de l'écran. Entrée (ou la flèche) ajoute la tâche et garde le clavier ouvert pour la suivante. Nouvelle tâche en bas de « À faire ». Bouton rond `+` : remonte en haut et ouvre le clavier.
- **Cocher** : la case. La tâche passe dans **Terminé** (repliable, état mémorisé `todo_termine_ouvert`), avec « Fait par … · date ». **Effacer** supprime les terminées de la liste (confirmation).
- **Modifier** : toucher le texte → fenêtre (texte, changer de liste, supprimer).
- **Qui** : point bleu (Corentin) ou rose (Lisa) = auteur. Pastille **NOUVEAU** sur les tâches ajoutées par l'autre depuis ta dernière visite (`todo_vu_le`, mémorisé quand l'app passe en arrière-plan).
- **Réglages** : profil Corentin/Lisa (clé commune `duo_profile`), listes (renommer, couleur, supprimer — Général ne se supprime pas ; supprimer une liste supprime ses tâches, après confirmation), recharger l'application (désinscrit le service worker de Todo et vide ses seuls caches `todo-*`).

## Données — Firestore (`course-app-36e9d`)

| Collection | Document |
|---|---|
| `todoListes/{id}` | `{ nom, couleur, ordre }` — `general` = liste par défaut, **virtuelle** tant qu'elle n'est pas renommée (jamais créée par l'app au démarrage : leçon des doublons de Course, 18/09/2026) |
| `todoTaches/{id}` | `{ listeId, texte, fait, ordre, creePar, creeLe, faitPar, faitLe }` — `creePar`/`faitPar` = `'corentin'` \| `'lisa'`, dates en ms |
| `portail/todo` | Résumé pour le Portail : `{ maj, aFaire, listes:[{ nom, n, couleur }] }` (3 listes max) |

- **Une tâche = un document** : cocher à deux en même temps n'écrase jamais l'autre. **2 écoutes `onSnapshot`** seulement (listes, tâches).
- Couleur d'une liste : prise dans une palette fixe de 8 (`PALETTE_LISTES`) ; une valeur hors palette venue de la base est ignorée (jamais injectée dans le style).
- Textes toujours échappés (`escapeHtml`) avant `innerHTML`.
- Règles : `todoListes` et `todoTaches` en `compteDuo()` dans `/firestore.rules` — **publiées le 11/10/2026** par l'API Firebase Rules après 330 cas testés à l'émulateur (compte du duo autorisé ; anonyme, autre compte, même UID via un autre fournisseur, sans session : refusés ; sur les 13 collections + une non déclarée).

## Hors ligne et connexion

- Même architecture que Course : SDK compat + `enablePersistence()`, **aperçu local** (`todo_apercu_v1`) affiché avant Firebase puis remplacé par le 1er instantané (jamais réécrit dans la base), écritures **différées** jusqu'à ce 1er instantané mais interface mise à jour tout de suite (état local), ids créés sur le téléphone (`nouvelId()`) : ajouter, cocher, créer une liste fonctionne sans réseau, envoi au retour du réseau.
- Pastille à côté du titre : vert = serveur, or = cache local, rouge = hors ligne.
- **Compte du duo uniquement** (`connexionDuo()` de `commun.js`) : session partagée avec le Portail et les autres apps de la même installation. Écran de connexion seulement si aucune session (ex. Todo installée seule sur l'écran d'accueil : stockage séparé sous iOS).

## Design

- `../verre.css` : Todo réutilise **toutes les règles de Course** (sélecteurs `:is([data-app="course"],[data-app="todo"])`) dans les 4 styles (Verre, Relief, Argile, Simple), plus quelques règles `[data-app="todo"]` (bouton Effacer, zone de texte). Lumière de l'app : violet `--v-todo` (#a855f7).
- Zones tactiles ≥ 44 px (case : 28 px + `::after` de 8 px de chaque côté).

## Historique

### Création (11/10/2026)
Demande de Corentin : une app type « Notes partagées » pour des listes de choses à faire, hors ligne comme les autres. Choix validés : plusieurs listes, nom « Todo », accès par le compte du duo (Course n'est plus en session anonyme depuis le 29/09/2026 — une session anonyme n'aurait accès à rien).
Testé dans Chromium (iPhone 393×852, faux SDK Firebase en mémoire) : ajout en série, coche, Terminé, effacement, nouvelle liste, déplacement d'une tâche, suppression de liste, publication de `portail/todo`, rendu des 4 styles, 4e vitre du Portail. **Non testé sur iPhone ni avec la vraie base** (mot de passe du duo non disponible pour les tests).
