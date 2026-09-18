# Courses L&C

Liste de courses partagée entre Corentin et Lisa. Fichier unique (HTML/CSS/JS vanilla), hébergé sur GitHub Pages, synchronisé en temps réel via Firebase Realtime Database.

## Fichiers
- `index.html` — l'application complète (le logo est encodé en base64 directement dans le fichier, pas besoin de `icone.png` séparé)
- `manifest.json` — configuration PWA (icône en base64, nom, couleurs)

## Fonctionnement
Deux onglets :
- **Saisie** : tous les produits connus, triés par fréquence d'usage (les plus cochés remontent en haut). On coche ce qu'il faut acheter et on ajuste la quantité en texte libre. Le bouton **+** permet d'ajouter un nouveau produit (avec choix ou création de rayon).
- **Course** : uniquement les produits cochés en Saisie, regroupés par rayon. On décoche un produit ici quand il est réellement acheté — ça le retire aussi de la liste "à acheter" côté Saisie. Rien ne se réinitialise automatiquement : un produit non trouvé en magasin reste sur la liste jusqu'à l'achat effectif.

Il n'y a pas d'écran de chargement (splash screen) : au lancement, l'app attend directement la réponse de Firebase Auth avant d'afficher l'écran de connexion, de choix de profil ou l'app elle-même.

## Mise en route (à faire une seule fois)
1. Créer un projet Firebase (ou réutiliser un projet existant) sur https://console.firebase.google.com
2. Activer **Realtime Database** (mode test ou avec des règles adaptées)
3. Activer l'authentification **Anonyme** dans Firebase Auth
4. Copier la config du projet (clé API, databaseURL, etc.) dans le bloc `firebaseConfig` en haut du `<script>` de `index.html`
5. Déployer sur GitHub Pages

Au premier chargement avec une base vide, l'app importe automatiquement un catalogue de départ (~130 produits classés par rayon) pour ne pas repartir de zéro.

## Historique des modifications
- Suppression de l'écran de chargement (splash screen) affiché entre le lancement de l'app et la réponse de Firebase Auth.
- Correctif : un produit dont le champ `nom` est manquant/vide dans la base faisait planter le tri (`localeCompare` sur `undefined`) dans `renderSaisie` et `renderCourse`, ce qui figeait l'affichage de la liste (le compteur restait juste mais le contenu ne se mettait plus à jour). Le tri tolère désormais un nom absent.
