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
- **Ajout** : uniquement par le bouton rond `+` (la barre d'ajout rapide du haut a été retirée le 12/10/2026). Nouvelle tâche en bas de « À faire ».
- **Cocher** : la case. La tâche passe dans **Terminé** (repliable, état mémorisé `todo_termine_ouvert`), avec « Fait par … · date ». **Effacer** supprime les terminées de la liste (confirmation).
- **Modifier** : crayon à droite de chaque ligne (ou toucher le texte) → fenêtre (texte, liste, **urgence**, supprimer).
- **Bouton +** (12/10/2026) : ouvre la fenêtre « Nouvelle tâche » (texte, liste, urgence ; clavier ouvert d'office). Avant, il ne faisait que focaliser la barre du haut, cachée derrière le clavier iOS.
- **Urgence** (12/10/2026) : champ `urgence` 0 aucune / 1 importante / 2 urgente. Choix « Aucune / Importante / Urgente » dans la fenêtre d'ajout et de modification. Pastille orange « Important » / rouge « Urgent » sur la ligne ; les tâches à faire sont triées urgentes → importantes → ordre d'ajout.
- **Rappel du dimanche 22h** : `notifTodoHebdo` dans `outils/Notifications.gs` (Apps Script, hors dépôt) envoie « N tâches à faire (dont X urgentes) » aux téléphones de Corentin ET Lisa. Installation : coller le fichier à jour, exécuter `notifTodoInstallerDeclencheur` une fois, le déclencheur est fixé sur Europe/Paris (envoi vers 22h, ± 15 min). Les deux téléphones doivent avoir « Notifications : Activées » dans le Portail.
- **Qui** : point bleu (Corentin) ou rose (Lisa) = auteur. Pastille **NOUVEAU** sur les tâches ajoutées par l'autre depuis ta dernière visite (`todo_vu_le`, mémorisé quand l'app passe en arrière-plan).
- **Réglages** : profil Corentin/Lisa (clé commune `duo_profile`), listes (renommer, couleur, supprimer — Général ne se supprime pas ; supprimer une liste supprime ses tâches, après confirmation), recharger l'application (désinscrit le service worker de Todo et vide ses seuls caches `todo-*`).

## Données — Firestore (`course-app-36e9d`)

| Collection | Document |
|---|---|
| `todoListes/{id}` | `{ nom, couleur, ordre }` — `general` = liste par défaut, **virtuelle** tant qu'elle n'est pas renommée (jamais créée par l'app au démarrage : leçon des doublons de Course, 18/09/2026) |
| `todoTaches/{id}` | `{ listeId, texte, fait, ordre, creePar, creeLe, faitPar, faitLe, urgence? }` — `creePar`/`faitPar` = `'corentin'` \| `'lisa'`, dates en ms |
| `portail/todo` | Résumé pour le Portail : `{ maj, aFaire, urgentes, listes:[{ nom, n, couleur }] }` (3 listes max) |

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

## Animations — audit skills Emil Kowalski (12/10/2026) — audit avec les skills d'Emil Kowalski (`.claude/skills/`), validé par Corentin ; règles communes dans la charte §6.5 / §11, détail dans le README racine.
- Mêmes changements que Course : jetons de courbes, fermeture animée des modales tâche / liste / dialogue (`fermerAnime` + `annulerFermeture`), mouvement réduit qui garde les fondus.

## Thème Sombre · Clair (18/10/2026)

- Le thème se choisit sous la pile du **Portail** (« Thème des apps ») : **Sombre** (ex-style Simple, défaut) ou **Clair** (fond beige crème, blocs blancs, textes foncés). Bleu Corentin / rose Lisa inchangés. Verre, Relief et Argile sont supprimés.
- Aucun changement dans le code de l'app : `../commun.js` pose `<html data-style="simple|clair">`, `../verre.css` habille.
- Aucune règle propre à l'app : tout passe par les jetons.
- Détail commun : README racine, « Thème Sombre · Clair ». **Vérifié** (Chromium, Firebase simulé) : liste, nouvelle tâche en clair et en sombre. Non vérifié sur iPhone (barre d'état en clair).

## Lot 1 — corrections (20/10/2026)
- Textes d'état vide corrigés (ils parlaient du « champ du haut », retiré le 12/10) : « Touche + pour ajouter une tâche ».
- Pastilles de listes à 44 px de haut ; zone tactile d'« Effacer » étendue.
- Thème clair : orange « Important » foncé (`#b45309`) pour un contraste lisible (dans verre.css).

## Lot 2 — Entrée ajoute la tâche (20/10/2026)
- Fenêtre « Nouvelle tâche » : **Entrée** ajoute la tâche, **vide le champ et garde la fenêtre ouverte**, clavier ouvert, pour enchaîner (`creerTache`, écouteur `keydown` sur `#modal-tache-texte`). Ligne de confirmation « ✓ « … » ajoutée » ; urgence remise à Aucune ; « Annuler » devient « Fermer ». Touche du clavier iOS : `enterkeyhint="send"`.
- Fenêtre « Modifier » : Entrée = Enregistrer (avant : retour à la ligne, aplati de toute façon à l'enregistrement).
- **Vérifié** (Chromium, Firebase simulé) : « Pain » ⏎ « Lait » ⏎ → 2 tâches, fenêtre ouverte, curseur dans le champ. **Non vérifié sur iPhone.**

## Lot 3 — états communs (20/10/2026)
- `ecrire(action, quoi)` : un refus affiche `duoEchec()` (`../commun.js`).
- `tachesChargees` : lignes grises (`lignesAttente`) tant que ni l'aperçu ni le 1er instantané des tâches ne sont là, au lieu de « Rien à faire ».
- « Hors ligne » en texte à côté du titre (`../verre.css`).
- **Portail (lot 3)** : `?saisie=tache` → fenêtre « Nouvelle tâche » ouverte (`saisieDepuisPortail`, fin de `app.js`). Résumé `portail/todo` : champ `enRetard` (tâches à faire depuis plus de 7 jours).

## Lot 3 — Pour qui, Mes tâches, Tout, balayer + Annuler (20/10/2026)
- **Pour qui** : champ **`pour`** = `corentin` | `lisa` | `tous` (absent = tous), choisi dans la fenêtre (« Pour : Corentin / Lisa / Les deux », défaut Les deux, gardé d'une tâche à l'autre avec Entrée). Étiquette « Pour moi » / « Pour Lisa » sur la ligne (pas sur les tâches faites).
- **Filtre « Mes tâches »** (en tête de liste, mémorisé `todo_mes_taches`) : tâches pour moi ou pour les deux (`pourMoi`).
- **Pastille « Tout »** en tête des listes (id virtuel `__tout__`, jamais écrit en base) : toutes les listes ensemble, chaque ligne à la couleur et avec le nom de sa liste ; une nouvelle tâche créée depuis Tout va dans Général (`listeCible`) ; « Effacer » efface les terminées visibles (`tachesVisibles`).
- **Balayer** une tâche : vers la droite (> 80 px) = faite / remise à faire, vers la gauche = supprimée ; fond vert / rouge au-delà du seuil ; geste horizontal seulement (`touch-action: pan-y`), le toucher qui suit n'ouvre pas la tâche.
- **Annuler 4 s** (`toastAnnuler`) après une coche (case ou balayage) et une suppression par balayage : restaure l'état (`basculerFait`, `supprimerTache` qui réécrit la tâche complète).
- **Vérifié** (Chromium, Firebase simulé) : Tout = 3 tâches de 2 listes, Mes tâches = 2, balayage gauche → supprimée puis Annuler → restaurée, balayage droite → faite sans ouvrir la fenêtre. **Non vérifié sur iPhone** (geste au doigt).

## Audit de code — corrections (20/10/2026)
- **17-01** : balayage ignoré s'il part à moins de 24 px du bord gauche (geste retour d'iOS) ; `pointercancel` remet la ligne en place **sans** cocher ni supprimer.
- **17-02** : `aBalaye` remis à `false` à tout `pointerdown` et 400 ms après la fin du geste (iOS n'envoie pas de `click` après un glisser : le toucher suivant était avalé).
- **17-03** : une tâche créée avant le 1er instantané Firestore est réappliquée sur cet instantané (elle disparaissait puis revenait).
- `sw.js` : même logique réseau d'abord que les autres apps (minuteur pour la navigation seulement, HTML et JS de la même version, `?verif=` en réseau seul) ; feuille Google Fonts non bloquante (`index.html`).
- **Rejeté** : 17-04 (jeton expiré du secours REST : renouvelé à chaque publication).
- **Non vérifié sur iPhone.**
