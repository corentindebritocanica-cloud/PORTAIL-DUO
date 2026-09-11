# Courses L&C

Liste de courses partagée entre Corentin et Lisa. Fichier unique (HTML/CSS/JS vanilla), hébergé sur GitHub Pages, synchronisé en temps réel via Firebase Realtime Database.

## Fichiers
- `index.html` — l'application complète (le logo est encodé en base64 directement dans le fichier, pas besoin de `icone.png` séparé)
- `manifest.json` — configuration PWA (icône en base64, nom, couleurs)

## Fonctionnement
Deux onglets :
- **Saisie** : tous les produits connus, triés par fréquence d'usage (les plus cochés remontent en haut). On coche ce qu'il faut acheter et on ajuste la quantité en texte libre. Le bouton **+** permet d'ajouter un nouveau produit (avec choix ou création de rayon).
- **Course** : uniquement les produits cochés en Saisie, regroupés par rayon. On décoche un produit ici quand il est réellement acheté — ça le retire aussi de la liste "à acheter" côté Saisie. Rien ne se réinitialise automatiquement : un produit non trouvé en magasin reste sur la liste jusqu'à l'achat effectif.

## Mise en route (à faire une seule fois)
1. Créer un projet Firebase (ou réutiliser un projet existant) sur https://console.firebase.google.com
2. Activer **Realtime Database** (mode test ou avec des règles adaptées)
3. Activer l'authentification **Anonyme** dans Firebase Auth
4. Copier la config du projet (clé API, databaseURL, etc.) dans le bloc `firebaseConfig` en haut du `<script>` de `index.html`
5. Déployer sur GitHub Pages

Au premier chargement avec une base vide, l'app importe automatiquement un catalogue de départ (~130 produits classés par rayon) pour ne pas repartir de zéro.
