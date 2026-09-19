# 📱 Guide Ultime du Développement Web App (PWA) pour iOS

**Statut** : Document de référence obligatoire — à consulter avant tout développement ou reprise d'une app existante de l'écosystème PORTAIL-DUO.
**Dernière vérification factuelle** : 19 septembre 2026 (recherches web à l'appui — voir sources en fin de document).
**Historique** : Document de base fourni par Corentin, complété et corrigé après vérification.

---

## 0. ⚠️ À lire en premier — enseignements vécus sur PORTAIL-DUO (18-19/09/2026)

Cette section résume, en langage direct, les pièges qui nous ont réellement fait perdre du temps sur Course lors de la mise en conformité UX/UI. Ce ne sont pas des cas théoriques : ce sont des bugs WebKit **documentés et confirmés par recherche**, qu'on a percutés en vrai.

### 🐛 Bug WebKit confirmé n°1 : `100dvh` / `height:100%` / `100svh` mentent en PWA standalone
En mode standalone sur iOS, avec `viewport-fit=cover`, ces trois unités **soustraient à tort l'inset de sécurité du HAUT** de la hauteur totale — alors qu'elles ne devraient pas y toucher. Résultat concret : un bandeau vide de la hauteur de la barre de statut apparaît **en BAS** de l'écran, sous ta barre d'onglets, alors que le bug est mathématiquement causé par le HAUT. C'est exactement le "bloc de couleur différente" qu'on a chassé toute une soirée sur Course.

**Correctif qui marche (validé en pratique aujourd'hui, confirmé par plusieurs sources)** :
```css
#app{ position:fixed; inset:0; display:flex; flex-direction:column; }
```
`position:fixed;inset:0` s'aligne toujours sur le vrai viewport visuel, sans dépendre du calcul buggé de `dvh`. Alternative trouvée en recherche : l'unité `100lvh` (large viewport height) rapporterait la vraie hauteur d'écran sans ce bug — non testée sur nos apps, `position:fixed;inset:0` suffit.

**Ne jamais faire** : `body{height:100vh; height:100dvh;}` seul, sans ancrer le conteneur principal en `position:fixed;inset:0` par-dessus, sur une app standalone iOS avec barre fixe en haut ET en bas.

### 🐛 Bug WebKit confirmé n°2 : `env(safe-area-inset-*)` peut renvoyer une valeur fausse au lancement à froid
Plusieurs sources indépendantes confirment que ces valeurs peuvent être **temporairement incorrectes (souvent 0) juste après le lancement** d'une PWA standalone, avant de se corriger d'elles-mêmes après un court délai. Si un jour un espacement de sécurité semble "sauter" ou clignoter au démarrage, ce n'est probablement pas une erreur de code — c'est ce bug de timing. Contournement documenté (non implémenté chez nous, à garder sous le coude si le problème se présente un jour) : relire la valeur via `setTimeout` à 100ms/500ms/1s après le chargement, ou forcer un recalcul en togglant temporairement `viewport-fit` dans le meta tag.

### 🐛 Cause n°3 (la vraie coupable de notre confusion du 18/09) : cache du Service Worker jamais invalidé
Un Service Worker ne se réinstalle QUE si le navigateur détecte que le fichier `sw.js` **lui-même** a changé (comparaison d'octets). Modifier `index.html` cent fois ne déclenche rien si `sw.js` reste identique : le cache-first continue de servir l'ancienne version indéfiniment. **Systématiquement, à chaque fix visuel qui semble "ne rien changer" malgré une vérification du bon contenu sur GitHub : vérifier/incrémenter la version du cache dans le `sw.js` de l'app concernée.** C'est ce qui nous a fait tourner en rond pendant des heures sur Course.

**Solution long-terme recommandée (section 5 ci-dessous)** : implémenter la détection de Service Worker "en attente" avec popup "Nouvelle version disponible", plutôt que de compter sur la mémoire pour bumper la version à la main.

### 📱 Changement iOS 26 (sorti sept. 2025, donc déjà actif) : "Ajouter à l'écran d'accueil" a changé de comportement
- Le bouton Partager n'est plus directement visible dans la barre d'adresse : il faut d'abord taper l'icône **"···"** (points de suspension), *puis* Partager, puis "Sur l'écran d'accueil".
- **Point critique** : iOS 26 ajoute un bouton bascule **"Ouvrir en tant qu'app Web"** dans la boîte de dialogue d'ajout. Il est activé par défaut, mais si jamais quelqu'un le désactive par erreur, l'icône ouvre le site comme un simple signet dans Safari classique (avec toute l'interface navigateur) au lieu du mode standalone plein écran — aucun des styles CSS liés au standalone (safe-area, status-bar-style, etc.) ne s'applique alors, ce qui peut ressembler à un bug alors que c'est juste ce réglage.
- Si jamais Corentin ou Lisa doivent réinstaller une icône (comme on l'a fait plusieurs fois aujourd'hui), bien vérifier que ce toggle reste sur ON.

### 🐛 Bug WebKit confirmé n°4 : le "traitement de bord" d'iOS 26+ peut assombrir/flouter la zone au-dessus du header, surtout lors d'une navigation interne
Un projet open-source dédié à ce problème précis (Homeframe, sept. 2026) documente noir sur blanc ce comportement, sous le nom **"iOS 26's edge treatment"** : *"iOS leaves a blurry/translucent strip above the app header"*. Leur solution : le header doit être un élément **persistant** qui ne se redémonte jamais depuis zéro pendant une navigation — sinon, le temps du rechargement, iOS peut brièvement exposer une "couche système de flou détachée" par-dessus une zone sans contenu propre. C'est très probablement l'explication technique précise de ce qu'on a vécu sur Course : le flou revenait plus facilement en arrivant **via une navigation depuis le Portail** (`window.location.href`, donc un rechargement complet de document) qu'en ouvrant l'icône Course directement.
**Pour nos 4 apps (HTML statique, pas de framework)** : le header est déjà écrit en dur dans le HTML de chaque page (jamais injecté dynamiquement en JS après coup), ce qui limite déjà ce risque — mais si le flou revient un jour spécifiquement lors d'une navigation Portail → sous-app (et pas en accès direct), c'est ce mécanisme précis à regarder en premier, avant de re-suspecter le cache.

### 🆕 iOS 27 (sorti le 14 septembre 2026 — donc très récent)
D'après le suivi de changements WebKit et plusieurs projets déjà mis à jour pour cette version :
- **Comportement d'installation "Ajouter à l'écran d'accueil" inchangé** par rapport à iOS 26 (donc tout ce qui est dit plus haut reste valable).
- **Nouveau : le "scroll anchoring"** — Safari 27 empêche désormais les sauts visuels de défilement quand du contenu est inséré *au-dessus* de la zone visible. Si un jour on ajoute un article en haut d'une liste déjà affichée (ex. Muscu qui préfixe un nouvel exercice, Course qui insère un produit en haut de liste triée), le comportement de scroll pourrait légèrement changer par rapport à avant. À surveiller si un souci de ce type apparaît un jour ; contournement documenté : `overflow-anchor: none` sur le conteneur concerné.
- Rendu du texte et des bordures légèrement plus précis au pixel près (positionnement subpixel) — aucune action requise, mentionné pour référence si un décalage visuel d'un pixel apparaissait un jour sur un élément très finement calé.
- Rien trouvé de spécifique à Safari 27 sur `viewport-fit`, `env(safe-area-inset-*)` ou `dvh` : les bugs n°1 et n°2 ci-dessus restent d'actualité sur cette version.

---

## 1. L'Écosystème Apple : Comprendre le moteur WebKit

Sur iOS, tous les navigateurs (Chrome, Firefox, Safari) et toutes les web apps installées sur l'écran d'accueil ("WebClips") utilisent obligatoirement le moteur de rendu WebKit. Tu développes donc selon les règles et les implémentations d'Apple — jamais celles de Chrome/Chromium, même si Chrome est installé sur l'iPhone.

### Le Sandboxing (Isolation)
- **État vierge** : Lorsqu'une app est ajoutée à l'écran d'accueil, elle s'ouvre dans un environnement totalement isolé de Safari.
- **Conséquence** : Les cookies, sessions actives (ex: connexion utilisateur) ou données `localStorage` stockées dans le navigateur Safari ne sont pas transférés vers l'app installée. L'utilisateur devra se reconnecter.

---

## 2. Les Fondations Techniques (Les 3 Piliers)

### A. Le Contexte Sécurisé (HTTPS)
Obligatoire. Les Service Workers et les API modernes (Push, Géolocalisation) refusent de s'exécuter en HTTP (sauf sur `localhost` pour le développement). GitHub Pages sert nativement en HTTPS, donc rien à faire de spécial pour PORTAIL-DUO sur ce point.

### B. Le Web App Manifest (`manifest.json`)
Ce fichier JSON configure l'apparence de l'application.

- **ATTENTION iOS** : Historiquement (et encore souvent aujourd'hui), iOS ignore les icônes du manifeste. Il faut absolument ajouter ceci dans le `<head>` de ton fichier `index.html` :
```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```
(L'image doit idéalement être en 180×180 px, format PNG, sans transparence — Apple accepte aussi 152×152 et 167×167 pour iPad, mais 180×180 couvre tous les cas courants sur iPhone récent.)

- **Meta tags à toujours inclure ensemble** (le premier reste le seul réellement lu par iOS Safari, mais Chrome DevTools affiche un avertissement de dépréciation si le second est absent — les deux coexistent sans conflit) :
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
```
Ne jamais retirer le premier pour ne garder que le second : iOS Safari ne lit QUE l'orthographe `apple-mobile-web-app-capable`, quoi qu'en dise l'avertissement Chrome.

### C. Le Service Worker
Script d'arrière-plan agissant comme un proxy réseau. Il est responsable de la mise en cache et du mode hors-ligne. **Voir section 0 ci-dessus et section 5 plus bas — c'est la source n°1 de confusion vécue sur ce projet.**

---

## 3. UI & UX : Casser les comportements du Web

Pour qu'un site web ressemble à une application native, il faut supprimer les comportements par défaut du navigateur.

### A. Le CSS "Anti-Web" (à appliquer sur le `body`)
```css
* {
  -webkit-tap-highlight-color: transparent; /* supprime le flash gris au tap */
  -webkit-user-select: none;                /* pas de sélection de texte accidentelle */
}
input, textarea {
  -webkit-user-select: text; /* IMPORTANT : sans ça, impossible de taper dans un champ */
}
body {
  -webkit-overflow-scrolling: touch; /* scroll momentum natif */
  overscroll-behavior: none;         /* empêche le rebond/pull-to-refresh indésirable */
}
```

### B. Gestion des "Safe Areas" (l'encoche / Dynamic Island)
Si ton manifeste est en `display: standalone`, l'app prend tout l'écran. Tu dois éviter que ton contenu passe sous l'heure ou sous la barre d'accueil en bas.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```
```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

**Mais attention** : voir le Bug WebKit confirmé n°1 en section 0 — sur une app avec header ET barre d'onglets fixes, ancrer le conteneur racine en `position:fixed;inset:0` plutôt que de faire confiance à `height:100dvh` seul.

### C. Le Splash Screen (écran de lancement)
iOS ne le génère pas automatiquement à partir du manifeste seul. Tu dois générer des images statiques pour chaque résolution d'écran d'iPhone/iPad et les lier dans le `<head>` :
```html
<link rel="apple-touch-startup-image" href="splash-iphone-14.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)">
```
(Astuce : utiliser un package NPM comme `pwa-asset-generator` pour générer automatiquement toutes ces balises et images — non fait sur PORTAIL-DUO actuellement, nos 4 apps affichent un splash généré depuis `background_color`/`theme_color` du manifeste, ce qui suffit largement pour un usage à 2 personnes.)

---

## 4. Cycle de vie, Mémoire et Stockage

### A. Persistance des données (IndexedDB vs LocalStorage)

- **La règle des 7 jours d'Apple, nuancée** : Safari supprime tout le stockage script (localStorage, IndexedDB, Cache Storage, Service Worker) d'une origine si l'utilisateur n'a eu **aucune interaction** avec elle pendant 7 jours *dans Safari*. **Point important, absent de la version originale de ce document** : une web app **ajoutée à l'écran d'accueil n'est PAS considérée comme faisant partie de Safari** — elle a son propre compteur de jours d'utilisation, basé sur l'usage réel de l'app elle-même, indépendant du compteur de Safari. Autrement dit : pour Muscu/Budget/Course, tant qu'elles sont ouvertes via leur icône de temps en temps (pas besoin d'interagir avec du contenu spécifique), leur stockage local ne devrait pas être évincé — même si Safari lui-même n'est pas ouvert pendant une semaine. WebKit reconnaît lui-même que le comportement exact reste flou par endroits et encourage à signaler tout cas où ça ne se passerait pas comme prévu.
- **Aucune donnée métier n'est concernée sur nos 4 apps** : Muscu/Course/Budget stockent tout sur Firestore (cloud), le `localStorage` ne sert qu'à des préférences (thème, profil actif). Une éviction serait indolore : au pire, retour au thème par défaut.
- **Quota** : L'espace de stockage est limité (environ 50 Mo de base, extensible via demande par le navigateur, mais ne compte pas dessus pour stocker des gigaoctets de vidéos).
- Préfère IndexedDB (via des librairies comme `localForage` ou `idb`) au `localStorage` pour de gros volumes, car il est asynchrone et ne bloque pas le thread principal — non nécessaire pour nos 4 apps actuelles (préférences légères uniquement).

### B. Gestion de la mise en arrière-plan
iOS tue les applications web en arrière-plan très rapidement pour économiser la batterie et la RAM. Ne jamais compter sur un traitement qui continue de tourner après que l'utilisateur a quitté l'app.

---

## 5. Gestion Hors-ligne et Mises à jour (Service Worker)

- **Architecture actuelle sur PORTAIL-DUO** : chaque app (Muscu/Budget/Course/Portail) a son propre `sw.js` fait main, cache-first sur le shell statique (`index.html`, `manifest.json`, icônes), sans dépendance à Workbox. C'est volontairement simple et suffisant pour 4 apps personnelles — pas besoin d'ajouter Workbox pour l'instant.
- **Le problème vécu, en clair** : un Service Worker ne se met à jour QUE si le fichier `sw.js` change d'octets. Modifier seulement `index.html` ne déclenche jamais de mise à jour, quel que soit le nombre de push sur GitHub. **Règle à appliquer systématiquement désormais : à chaque modification visible d'une app (CSS, HTML, JS), incrémenter la version du cache dans le `sw.js` correspondant, dans le même commit.**
- **Solution recommandée pour éliminer ce risque définitivement** : implémenter la détection de Service Worker "en attente" (`waiting`) avec une popup dans l'app : *"Nouvelle version disponible. [Mettre à jour]"*. Au clic, envoyer un message au Service Worker pour déclencher `skipWaiting()`, puis forcer un `window.location.reload()`. Ça retire complètement le besoin de se souvenir de bumper une version à la main — proposé par Corentin comme prochain chantier possible (section "Ce qui reste à faire" plus bas).

---

## 6. Capacités Matérielles & API (Ce qui marche / Ce qui bloque)

### ✅ Ce qui fonctionne bien sur iOS (vérifié à jour, sept. 2026)
- **Notifications Push Web (depuis iOS 16.4)** : Supporté, y compris en France/UE (voir section 6bis ci-dessous sur l'épisode DMA). Condition stricte : l'app doit être ajoutée à l'écran d'accueil pour pouvoir demander l'autorisation de push. Sur Safari normal (onglet, non installé), ça ne marche pas. Les badges rouges sur l'icône fonctionnent (API Badging).
- **Caméra / Micro (WebRTC)** : Fonctionne pour prendre des photos, scanner des QR codes, faire des appels vidéo en direct (API `getUserMedia()`).
- **Géolocalisation** : Fonctionne avec l'API standard.
- **Web Share API** : Pour déclencher le menu de partage natif d'iOS (Envoyer un lien par SMS, WhatsApp, etc.).
- **Apple Pay (via Web Payments API)** : Totalement intégré.

### ❌ Ce qui est bloqué par Apple sur iOS
- **Web Bluetooth API** : Impossible de se connecter à des périphériques Bluetooth directement depuis la PWA.
- **Web Serial API / Web USB** : Impossible de se connecter en filaire à des microcontrôleurs (Arduino, Raspberry Pi).
- **Background Sync (one-shot)** : Non supporté sur Safari/iOS (Chromium uniquement, toutes plateformes). Les tâches en arrière-plan (ex: envoyer un message stocké hors-ligne dès que le réseau revient, pendant que l'app est fermée) ne fonctionnent pas sur iOS — prévoir systématiquement une logique de retry côté page, jamais uniquement côté Service Worker.
- **Maintien d'exécution** : Impossible de faire jouer un son en continu en arrière-plan (sauf via le composant natif de contrôle média dans certains cas précis), ou de maintenir un appel vidéo si l'app est minimisée.

**Solution de contournement pour le matériel (IoT)** : Si tu dois communiquer avec des capteurs physiques, ton périphérique (ex: un Raspberry Pi) doit se connecter en Wi-Fi à un serveur. Ta PWA communique ensuite avec ce serveur via WebSockets, et le serveur relaie l'information au matériel.

---

## 6bis. 🇪🇺 Épisode Digital Markets Act (UE) — pour info, sans impact aujourd'hui

En février 2024, Apple avait annoncé la suppression des web apps sur écran d'accueil dans toute l'Union Européenne (donc en France), officiellement pour se conformer au *Digital Markets Act*. Suite à une levée de boucliers de la communauté développeurs, **Apple a fait marche arrière moins d'un mois plus tard** et a réintroduit le support complet dès iOS 17.4 (sorti en mars 2024). **Aucun impact sur PORTAIL-DUO aujourd'hui** : le mode standalone, le stockage local et les notifications push fonctionnent normalement en France comme partout ailleurs. Mentionné ici uniquement pour éviter toute inquiétude si l'un de vous tombe un jour sur un article évoquant cet épisode — c'est de l'histoire ancienne, résolue.

---

## 7. Le Parcours d'Installation (Onboarding)

- **Pas de pop-up automatique** : Contrairement à Android, iOS ne propose jamais de bannière native "Ajouter à l'écran d'accueil".
- **Depuis iOS 26 (voir section 0)** : le chemin a changé — bouton "···" puis Partager puis "Sur l'écran d'accueil", avec un toggle "Ouvrir en tant qu'app Web" à laisser activé.
- Non pertinent à développer pour PORTAIL-DUO : seuls Corentin et Lisa utilisent ces apps, l'un comme l'autre savent déjà comment les installer. Pas besoin d'un composant d'onboarding dédié (flèche animée, etc.) contrairement à ce qu'on ferait pour une app grand public.

---

## 8. Débogage

Pour voir les erreurs de console, les requêtes réseau et le DOM de ton app iOS en direct :

1. Sur l'iPhone : Réglages → Safari → Avancé → activer **Inspecteur web**.
2. Connecter l'iPhone au Mac par câble USB (ou même réseau local sans câble selon config).
3. Ouvrir Safari sur le Mac, menu **Développement** en haut, trouver le nom de l'iPhone, sélectionner l'app PWA ouverte.
4. L'inspecteur web s'ouvre sur le Mac, connecté en direct à l'iPhone.

**Fortement recommandé de configurer ça dès que possible** : ça aurait permis de voir en direct, aujourd'hui, quel Service Worker/cache était actif sur Course, et d'éviter des heures d'aller-retour par captures d'écran.

---

## 9. 📋 Pense-bête : checklist avant de considérer un fix iOS "terminé"

Avant de dire à Corentin qu'un correctif visuel/layout est en ligne et prêt à tester :

- [ ] Le fichier modifié (`index.html` généralement) est bien vérifié en ligne via l'API GitHub (contenu exact confirmé)
- [ ] Le `sw.js` de la même app a été bumpé en version SI le fichier modifié fait partie du shell mis en cache (`index.html`, `manifest.json`) — sinon le fix restera invisible pour l'utilisateur
- [ ] Si le layout touche à `height`/`100vh`/`100dvh` sur une app standalone : le conteneur racine est bien ancré en `position:fixed;inset:0`, pas seulement en `height:100%` en cascade
- [ ] Le test demandé à l'utilisateur précise clairement : fermeture complète de l'app (multitâche) avant réouverture — un simple retour à l'accueil ne suffit pas toujours à activer un nouveau Service Worker

---

## 🔗 Sources consultées (recherche du 19/09/2026)

- WebKit Blog — *Updates to Storage Policy* (politique de stockage, exemption home screen)
- MDN — *Storage quotas and eviction criteria*
- The Register / Wikipedia (Cryptee) / TechTimes — épisode DMA UE 2024 et sa résolution
- GitHub (plusieurs PR/issues 2026) — bug `100dvh`/`height:100%` en PWA standalone iOS et son correctif `position:fixed;inset:0`
- MacRumors Forums / Glide Community / idownloadblog — changements iOS 26 sur "Ajouter à l'écran d'accueil"
- javascript.ac, Mendix docs, hidekazu-konishi.com — bonnes pratiques Service Worker 2026 (détection de mise à jour, skipWaiting)
- GitHub issues (Next.js, Flutter, FlutterFlow) — statut réel de `apple-mobile-web-app-capable` vs `mobile-web-app-capable`
- webkit.org — *WebKit Features for Safari 27.0* et *News from WWDC26* (iOS 27, sorti le 14/09/2026, scroll anchoring)
- GitHub (Padel-Battle, FreightLogic issues) — retours de développeurs sur l'adoption d'iOS 27
- GitHub (BuiltByTed/Homeframe) — framework dédié aux quirks iOS Home Screen, documente noir sur blanc le "iOS 26's edge treatment" (flou au-dessus du header) et sa solution (shell persistant)
- MacRumors Forums, Glide Community, idownloadblog — changements iOS 26 sur "Ajouter à l'écran d'accueil"

**Ce document doit être mis à jour si une nouvelle version d'iOS change un comportement documenté ici.**
