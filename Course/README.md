# Courses L&C

Liste de courses partagée entre Corentin et Lisa. Fichier unique (HTML/CSS/JS vanilla), hébergé sur GitHub Pages, synchronisé en temps réel via **Cloud Firestore**.

## Fichiers
- `index.html` — l'application complète (le logo est encodé en base64 directement dans le fichier, pas besoin de `icone.png` séparé)
- `manifest.json` — configuration PWA (icône en base64, nom, couleurs)

## Fonctionnement
Deux onglets :
- **Saisie** : tous les produits connus, triés par fréquence d'usage (les plus cochés remontent en haut). On coche ce qu'il faut acheter et on ajuste la quantité en texte libre. Le bouton **+** permet d'ajouter un nouveau produit (avec choix ou création de rayon).
- **Course** : uniquement les produits cochés en Saisie, regroupés par rayon. On décoche un produit ici quand il est réellement acheté — ça le retire aussi de la liste "à acheter" côté Saisie. Rien ne se réinitialise automatiquement : un produit non trouvé en magasin reste sur la liste jusqu'à l'achat effectif.

Il n'y a pas d'écran de chargement (splash screen) : au lancement, l'app attend directement la réponse de Firebase Auth avant d'afficher l'écran de connexion, de choix de profil ou l'app elle-même.

## Base de données : Cloud Firestore
L'app lit et écrit dans deux collections Firestore de premier niveau (projet `course-app-36e9d`) :
- `produits/{id}` — champs `nom`, `quantite`, `rayonId`, `aAcheter`, `compteur`, `achete`
- `rayons/{id}` — champ `nom`

Le code se synchronise en temps réel via `onSnapshot` sur ces deux collections. Toutes les écritures (cocher un produit, changer sa quantité, changer son rayon, en ajouter un, terminer une course) passent par de petits wrappers (`dbUpdateDoc`, `dbAddDoc`, `dbOnCollection`) définis en haut du `<script>`.

La persistance hors-ligne Firestore est activée (`enablePersistence`) : les données sont mises en cache localement et restent disponibles en lecture (et modifiables, synchronisées au retour du réseau) même sans connexion. Attention : il n'y a **pas de Service Worker** dans ce projet — seul le manifest PWA (`manifest.json`) est présent, pour l'icône et le mode plein écran. Le chargement initial de la page (`index.html`, les scripts Firebase) dépend donc du cache HTTP par défaut du navigateur/WebView, pas d'une stratégie de cache applicative maîtrisée.

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
