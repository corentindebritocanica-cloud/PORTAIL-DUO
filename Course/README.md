# Courses L&C

Liste de courses partagée entre Corentin et Lisa. Fichier unique (HTML/CSS/JS vanilla), hébergé sur GitHub Pages, synchronisé en temps réel via **Cloud Firestore**.

## Fichiers
- `index.html` — l'application complète (le logo est encodé en base64 directement dans le fichier, pas besoin de `icone.png` séparé)
- `manifest.json` — configuration PWA (icône en base64, nom, couleurs)

## Fonctionnement
Deux onglets :
- **Saisie** : tous les produits connus, triés par fréquence d'usage (les plus cochés remontent en haut). On coche ce qu'il faut acheter et on ajuste la quantité en texte libre. Le bouton **+** permet d'ajouter un nouveau produit (avec choix ou création de rayon).
- **Course** : uniquement les produits cochés en Saisie, regroupés par rayon. On **coche** un produit ici quand il est réellement acheté (case remplie, nom barré, carte estompée) ; il reste affiché — rien ne le retire automatiquement de la liste "à acheter" côté Saisie. Le bouton **Course terminée** retire alors d'un coup tous les produits ainsi cochés. Un produit non trouvé en magasin (jamais coché ici) reste sur la liste jusqu'à l'achat effectif.

Il n'y a pas d'écran de chargement (splash screen) : au lancement, l'app attend directement la réponse de Firebase Auth avant d'afficher l'écran de connexion, de choix de profil ou l'app elle-même.

## Base de données : Cloud Firestore
L'app lit et écrit dans deux collections Firestore de premier niveau (projet `course-app-36e9d`) :
- `produits/{id}` — champs `nom`, `quantite`, `rayonId`, `aAcheter`, `compteur`, `achete`
- `rayons/{id}` — champ `nom`

Le code se synchronise en temps réel via `onSnapshot` sur ces deux collections. Toutes les écritures (cocher un produit, changer sa quantité, changer son rayon, en ajouter un, terminer une course) passent par de petits wrappers (`dbUpdateDoc`, `dbAddDoc`, `dbOnCollection`) définis en haut du `<script>`.

La persistance hors-ligne Firestore est activée (`enablePersistence`) : les données sont mises en cache localement et restent disponibles en lecture (et modifiables, synchronisées au retour du réseau) même sans connexion. **Mise à jour du 18/09/2026** : un fichier `sw.js` (Service Worker) était déjà présent dans ce dossier mais n'avait jamais été enregistré depuis `index.html` — corrigé, l'app s'ouvre désormais aussi sans réseau du tout (shell mis en cache : `index.html`, `manifest.json`, `icone.png`), pas seulement ses données. La ligne ci-dessous, qui affirmait le contraire, ne correspond donc plus à l'état réel du code :

~~Attention : il n'y a pas de Service Worker dans ce projet — seul le manifest PWA (manifest.json) est présent, pour l'icône et le mode plein écran. Le chargement initial de la page dépend donc du cache HTTP par défaut du navigateur/WebView, pas d'une stratégie de cache applicative maîtrisée.~~

**Historique** : l'app utilisait auparavant **Realtime Database** (chemin `courses/produits`, `courses/rayons`). Une migration vers Firestore a été effectuée le 18 septembre 2026 — voir "Historique des modifications" ci-dessous. Realtime Database n'est plus utilisée par le code et peut être ignorée (elle contient encore l'ancien jeu de données, non synchronisé avec Firestore).

## Mise en route (à faire une seule fois)
1. Créer un projet Firebase (ou réutiliser un projet existant) sur https://console.firebase.google.com
2. Activer **Cloud Firestore** (mode natif, avec des règles adaptées)
3. Activer l'authentification **Email/Mot de passe** dans Firebase Auth (l'app utilise un écran de connexion email + mot de passe, pas l'auth anonyme)
4. Copier la config du projet (clé API, projectId, etc.) dans le bloc `firebaseConfig` en haut du `<script>` de `index.html`
5. Déployer sur GitHub Pages

Au premier chargement avec une base vide (collection `rayons` inexistante ou vide), l'app importe automatiquement un catalogue de départ (~130 produits classés par rayon) pour ne pas repartir de zéro.

## Historique des modifications
- Suppression de l'écran de chargement (splash screen) affiché entre le lancement de l'app et la réponse de Firebase Auth.
- Correctif : un produit dont le champ `nom` est manquant/vide dans la base faisait planter le tri (`localeCompare` sur `undefined`) dans `renderSaisie` et `renderCourse`, ce qui figeait l'affichage de la liste (le compteur restait juste mais le contenu ne se mettait plus à jour). Le tri tolère désormais un nom absent.
- **Migration complète de Realtime Database vers Cloud Firestore** : l'app pointait sur Realtime Database alors qu'un jeu de données plus riche et à jour existait déjà dans Firestore (créé/alimenté en parallèle par ailleurs), causant une désynchronisation entre ce que voyait l'app et l'état réel des courses. Le code lit et écrit désormais exclusivement dans Firestore (collections `produits` et `rayons`). Les données Firestore existantes (128 produits, 50 marqués "à acheter") ont été conservées telles quelles comme état de départ.
- Correctif : le bouton de coche dans l'onglet Course appelait une fonction inexistante (`marquerAchete`) au lieu de `toggleAcheteCourse`, ce qui provoquait une erreur silencieuse au clic. Corrigé au passage lors de la migration Firestore.
- Correctif : le bouton "Course terminée" était codé en dur avec `display:none` et n'avait aucune logique pour le rendre visible — il n'a donc probablement jamais fonctionné. Il s'affiche désormais quand l'onglet Course est actif (même logique que le bouton `+` de l'onglet Saisie).
- Activation de la persistance hors-ligne Firestore (`db.enablePersistence({synchronizeTabs:true})`) : auparavant, l'app n'avait aucun mécanisme d'accès hors-ligne fiable (pas de persistance Firestore, pas de Service Worker), ce qui donnait un comportement incohérent entre les onglets Saisie et Course en coupure réseau. Avec la persistance activée, les données des deux onglets sont mises en cache localement (IndexedDB) et survivent à une fermeture/réouverture de l'app hors-ligne. Limite connue : si l'app est ouverte simultanément dans plusieurs onglets/fenêtres du même navigateur, la persistance se désactive automatiquement dans les onglets excédentaires (limitation Firestore) — sans impact en usage normal (une seule fenêtre à la fois).
- **Enregistrement du Service Worker (18/09/2026)** : `sw.js` existait déjà dans ce dossier (mise en cache du shell : `index.html`, `manifest.json`, `icone.png` — ce dernier absent en pratique, sans conséquence, le cache des autres fichiers réussit quand même) mais n'était jamais activé, faute d'appel à `navigator.serviceWorker.register('sw.js', { scope: './' })` dans `index.html`. Ajouté à la suite de `demarrer()`. L'app peut désormais s'ouvrir sans réseau du tout, en plus de ses données déjà disponibles hors ligne via Firestore.
- **Correctif (18/09/2026)** : dans l'onglet Course, cocher une ligne mettait bien à jour Firestore (`toggleAcheteCourse` fonctionnait) mais la case cochée restait affichée vide à l'écran — `renderCourse()` n'appliquait jamais la classe CSS `checked` en fonction de `p.achete` (contrairement à l'onglet Saisie, qui le fait pour `p.aAcheter`). Corrigé : la case, le nom du produit (barré) et la carte (opacité réduite) reflètent désormais l'état `achete` du produit, via les classes `checked`, `nom-produit.achete` et `carte-produit.achete-carte` déjà prévues dans le CSS mais jusque-là inutilisées.
- **Audit complet (18/09/2026)** suite à des signalements répétés de bugs : trois problèmes trouvés et corrigés d'un coup —
  1. Le bouton croix (`btn-effacer-recherche`) de la barre de recherche (onglet Saisie) avait disparu du CSS, du HTML *et* du JS à un moment non identifié précisément entre le 17/09 (présent) et le commit "suppression de l'écran de chargement" du 18/09 au matin (absent). Réintégré à l'identique (bouton `✕`, affichage conditionnel à la saisie, clic pour vider le champ et remettre le focus).
  2. Le filtre de recherche (`renderSaisie`) faisait `p.nom.toLowerCase()` sans protection — un produit avec un champ `nom` vide/absent dans la base plantait silencieusement le filtre dès qu'on tapait dans la recherche (même symptôme que le bug de tri déjà corrigé plus haut, mais sur le filtre, pas le tri). Corrigé en `(p.nom||'').toLowerCase()`.
  3. La description du fonctionnement de l'onglet Course dans ce README ne correspondait plus au code (elle décrivait un retrait immédiat de la liste au décochage, alors que le code fait un cochage qui reste affiché jusqu'au bouton "Course terminée"). Description corrigée ci-dessus.
  Vérifications faites en plus, sans anomalie trouvée : tous les `getElementById` du JS correspondent à un `id` existant dans le HTML (pas de crash au chargement), toutes les balises HTML sont correctement fermées, le JavaScript est syntaxiquement valide.
