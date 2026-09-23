# 🗂️ PROBLÈMES RÉSOLUS — Base de connaissance PORTAIL-DUO

**But de ce document** : conserver la trace de chaque problème technique rencontré et de sa vraie solution, pour ne jamais reperdre des heures à re-déboguer un cas déjà vécu — ni sur Muscu, ni sur Budget, ni sur Course, ni sur Portail.

**Règle d'usage** :
- **À lire systématiquement** avant d'intervenir sur n'importe laquelle des 4 apps, dès qu'un comportement bizarre ou un bug apparaît — le réflexe est de vérifier ici avant de repartir de zéro.
- **À compléter systématiquement** après toute résolution de problème non triviale (pas besoin de logger un simple changement de texte, mais tout bug, comportement inattendu, ou leçon technique généralisable doit être noté), **peu importe quelle app est concernée** — ce fichier est transversal aux 4 apps, pas un README d'app.
- Chaque entrée suit le format ci-dessous. Ajouter les nouvelles entrées en haut de leur section (ou créer une nouvelle section si le sujet est neuf), la plus récente en premier.

**Format d'une entrée** :
```
### [Date] — [App(s) concernée(s)] — Titre court
**Symptôme** : ce qui était observé
**Fausses pistes explorées** : ce qui a été essayé sans succès (évite de refaire les mêmes essais)
**Cause racine** : la vraie explication
**Solution** : ce qui a été fait concrètement
**Fichiers touchés** : liste
```

---

## 🕓 Portail/Muscu/Budget/Course — `maj` ne bougeait pas quand une app était ouverte sans rien changer (23/09/2026)

### 23/09/2026 — Portail — « Mis à jour il y a 1 h » ne changeait pas après avoir rouvert Courses
**Symptôme** : Corentin rentre dans l'app Courses, n'ajoute/ne modifie rien, en ressort, revient sur le Portail → la carte Courses affiche toujours le même « Mis à jour il y a 1 h » qu'avant. Il se demandait si c'était normal ou s'il fallait une modification dans l'app pour déclencher une nouvelle mise à jour.
**Fausses pistes explorées** : aucune côté Portail — la lecture en direct (`onSnapshot` + relecture serveur au retour au premier plan, voir entrée du 22/09 juste en dessous) fonctionnait normalement ; le problème n'était pas une donnée périmée non relue, mais une donnée qui n'avait tout simplement jamais été réécrite.
**Cause racine** : dans les 3 apps, `planifierPublicationPortailXxx()` calcule une `signature` (JSON du résumé) et comparait à la dernière signature publiée (`portailDernier`) : `if(signature === portailDernier) return;` — si le contenu recalculé était identique au précédent (rien n'avait changé dans les données), la fonction s'arrêtait **avant** l'écriture Firestore, donc `maj` (`Date.now()`) n'était jamais réécrit. Comportement voulu à l'origine pour limiter les écritures (« au plus 1 écriture par ouverture d'app »), mais son effet de bord trompait Corentin : `maj` était censé représenter « dernière ouverture vérifiée », alors qu'il représentait en réalité « dernier changement réel du contenu ».
**Décision de Corentin** : privilégier la lisibilité à l'économie d'écritures — il veut voir l'horodatage bouger à chaque ouverture réelle de l'app, même sans changement, « pour éviter de se demander si ça a MAJ ou pas ».
**Solution** : retrait de la ligne `if(signature === portailDernier) return;` (et son équivalent) dans les 3 blocs de publication (`Course/app.js`, `Muscu/app.js`, `Budget/app.js`). `portailDernier` reste calculée/assignée mais ne bloque plus l'écriture. Les autres garde-fous sont inchangés : publication uniquement après un snapshot **serveur** (jamais depuis le cache local, pour ne jamais écraser un résumé récent avec des données périmées), regroupement en un seul envoi (2,5 s ; 3 s pour Muscu) pour éviter les écritures en rafale, erreurs absorbées (`console.warn`).
**Leçon généralisable** : un champ nommé « dernière mise à jour » affiché à l'utilisateur doit refléter la dernière **vérification**, pas le dernier **changement** — une optimisation « n'écrire que si le contenu a changé » (très correcte pour économiser des écritures) peut silencieusement transformer la sémantique d'un horodatage affiché, sans qu'aucune erreur ne se produise nulle part. À vérifier chaque fois qu'un timestamp de fraîcheur est calculé à partir d'un point d'écriture conditionnel plutôt que d'un point de lecture/vérification.
**Vérifié** : relecture du code des 3 apps confirmant le même garde-fou partout (`grep` ciblé). **Non vérifié sur iPhone** (modifié via l'API GitHub ; à confirmer : ouvrir Course sans rien changer → revenir au Portail → l'horodatage doit afficher « à l'instant »).
**Fichiers touchés** : `Course/app.js`, `Muscu/app.js`, `Budget/app.js`, `README.md` (racine, Course, Muscu, Budget), `PROBLEMES_RESOLUS.md`

---

## 📤 Muscu — écran Suivi : exports groupés Corentin + Lisa pour Gemini externe (23/09/2026)

### 23/09/2026 — Muscu — Après l'abandon du coach IA, un flux d'export manuel simple
**Contexte** : suite directe de l'entrée juste en dessous (abandon du coach IA intégré). Corentin voulait un accès rapide, après chaque séance, à sa dernière séance ET celle de Lisa (pas juste la sienne) pour coller dans une conversation Gemini classique — plus la dernière mensuration de chacun, plus l'export complet déjà existant.
**Décision de conception notable** : avertir sans jamais bloquer. Demande explicite : *"Ok pour les message d'avertissement mais ne m'empêche pas de copier quand même si je le veux."* Concrètement : l'avertissement (date de la dernière séance/mensuration différente d'aujourd'hui) s'affiche dans la ligne au-dessus du texte, jamais comme une confirmation à valider ou une modale bloquante — le texte à copier reste toujours intact et accessible.
**Piège évité** : prendre "la dernière séance" comme premier ou dernier élément brut du tableau d'archives aurait été un bug silencieux si l'ordre du cache changeait un jour (aucune garantie de tri documentée sur `window.archivesCache`) — tri explicite sur `createdAt` à chaque appel plutôt que de faire confiance à l'ordre reçu.
**Réutilisation** : aucune nouvelle modale — la modale de récapitulatif de fin de séance (`export-modal`, déjà connue de Corentin) sert aux trois exports. Un oubli à surveiller pour la prochaine fois qu'on y touche : `coach-block` (zone qui affichait autrefois un bilan IA) doit être explicitement vidée à l'ouverture de ces nouveaux exports, sinon un bilan consulté juste avant via une archive resterait affiché par erreur en dessous du nouveau texte.
**Vérifié** : scénarios Node avec mocks (tri par date, avertissement conditionnel, profil sans donnée). **Non testé sur iPhone.**
**Fichiers touchés** : `Muscu/app.js`, `Muscu/index.html`, `Muscu/README.md`, `PROBLEMES_RESOLUS.md`

---

## 🛑 Muscu — abandon du coach IA intégré, décision de repli sur Gemini manuel (23/09/2026)

### 23/09/2026 — Muscu — Après cascade Gemini, badge multi-fournisseur et correctif Groq, décision d'arrêter
**Contexte** : même journée que les trois entrées juste en dessous (cascade de repli Gemini, bug 404 qui coupait la cascade, confusion "Google" affiché avec Groq actif, plafond de tokens/minute Groq pris pour une panne). Malgré une résolution technique réelle à chaque étape, l'empilement d'incidents en une seule session a eu raison de la confiance de Corentin dans la fiabilité du coach intégré.
**Décision** : abandon du coach conversationnel dans l'app (bilans + chat + choix de fournisseur Gemini/Groq). Remplacé par un flux manuel : Corentin copie/colle les données pertinentes dans une conversation Gemini classique (l'app grand public sur son iPhone, pas l'API) après chaque séance.
**Ce qui change dans Muscu** : l'écran "Coach" devient un écran d'export de données plutôt qu'un chat — deux boutons prévus, l'un pour les données "neuves" depuis le dernier export (hors ce qui a été donné en une fois au démarrage du nouveau flux), l'autre pour un export complet à la demande. Détail de l'implémentation et de ce qui a été retiré/conservé du code : voir `Muscu/README.md`, section coach, mise à jour au moment du changement de code (peut suivre cette entrée de quelques échanges si l'implémentation est faite en plusieurs temps).
**Leçon généralisable** : la fiabilité perçue d'une fonctionnalité dépend autant du nombre d'incidents rencontrés PENDANT une session de mise au point que de la fiabilité réelle une fois stabilisée — chaque correctif était individuellement juste et vérifié, mais leur accumulation en une seule journée a suffi à rendre la fonctionnalité inutilisable en pratique aux yeux de l'utilisateur. Vaut aussi pour l'avenir : préférer étaler les changements risqués sur plusieurs sessions courtes plutôt qu'une seule session longue avec plusieurs allers-retours de débogage, quand c'est possible.
**Fichiers concernés** : `Muscu/app.js`, `Muscu/index.html`, `Muscu/README.md`, `PROBLEMES_RESOLUS.md` — implémentation faite le même jour, ~58 Ko retirés d'`app.js` (chat, cascades Gemini/Groq, constructeurs de prompt), écran de chat et deux modales retirés d'`index.html`. Détail technique complet : `Muscu/README.md`. Aucune donnée Firestore supprimée (archives, mensurations, conversations, anciens bilans tous intacts et exportables).

---

## 🔄 Muscu (coach IA) — 503 "model overloaded" Gemini : pas de fix garanti, seulement une cascade de repli (23/09/2026)

### 23/09/2026 — Muscu — Le coach "réfléchit" ~40s puis "réessaie dans un instant"
**Symptôme** : le coach mettait ~40s avant d'échouer systématiquement, malgré une clé API valide et des modèles bien chargés dans les réglages.
**Fausse piste écartée d'emblée** : aucune régression de code — `geminiFetch()`, le timeout, la gestion d'erreurs n'avaient pas changé récemment. Vérifié en relisant les commits et en testant la clé réelle (stockée dans `settings/coach`) directement contre l'API Gemini via un compte de service (lecture Firestore en Python, sans exposer la clé dans le chat).
**Cause racine** : deux choses en même temps côté Google, indépendantes du code de l'app.
1. Toute la famille **Gemini 2.5** (dont `gemini-flash-latest`, le modèle de repli historique) a été **retirée** — 404 "no longer available to new users, use gemini-3.x".
2. Le modèle configuré (`gemini-3.5-flash-lite`) et son cousin `gemini-flash-lite-latest` sont sous forte tension : 20 à 49s de latence quand ils répondent, **503 "The model is overloaded"** le reste du temps (constaté par tests directs répétés). En comparaison, `gemini-3.6-flash` et `gemini-3-flash-preview` répondaient en 6 à 8,5s dans les mêmes tests — les modèles "Lite" encaissent visiblement plus mal la charge gratuite que leurs équivalents non-lite.
**Recherche approfondie (forum officiel `discuss.ai.google.dev`, issues `google-gemini/gemini-cli`, PR communautaires)** : consensus unanime, y compris dans la doc officielle de troubleshooting (`ai.google.dev/gemini-api/docs/troubleshooting`) — **un 503 est un problème de capacité serveur PARTAGÉE chez Google, gratuit et payant confondus. Rien côté client ne peut l'empêcher à coup sûr.** Seule une offre à débit provisionné (payante, "Provisioned Throughput") donne une capacité garantie. Ce qui ramène le taux d'échec visible à quasi zéro sans ça, retrouvé à l'identique dans plusieurs projets réels (ex. PR GitHub `fix(ai): implement Gemini 503 retry, model fallback cascade` sur un dépôt tiers) : **cascade de modèles de repli + retry avec backoff sur les erreurs retryable (429/500/502/503/504) + timeout PROPRE À CHAQUE TENTATIVE**, distinct du seul timeout global. Ce dernier point est important : une issue GitHub (`googleapis/python-genai#1893`) documente des hangs **indéfinis au niveau du socket réseau** sur un modèle Gemini saturé, sans jamais renvoyer de 503 — un timeout global seul ne suffit pas à distinguer "ça travaille encore" de "ça ne répondra jamais".
**Piège de confusion découvert au passage — abonnement payant ≠ facturation API** : Corentin paie un abonnement Google AI (app Gemini grand public, ex-"Gemini Advanced", visible dans l'app avec des modèles comme "3.1 Pro" et "Raisonnement étendu"). **Ça ne compte pour rien sur l'API** utilisée par Muscu (`generativelanguage.googleapis.com`) : ce sont deux produits Google séparés, avec deux facturations séparées. Confirmé par le forum officiel Google : "Your Google One subscription does not count as Cloud Billing for this purpose." Pour changer de tier sur la clé API (limites de débit bien plus hautes, moins de 503), il faut activer la **facturation Cloud** sur le projet Google Cloud derrière la clé (`aistudio.google.com` → clés API → "Activer la facturation") — décision distincte, refusée sciemment ici (tier gratuit conservé).
**Solution appliquée (tier gratuit conservé)** : nouvelle fonction `callGeminiResilient()` dans `Muscu/app.js` — cascade `gemini-3.6-flash` → `gemini-3.5-flash` → `gemini-3.1-flash-lite`, retry+jitter entre modèles sur erreur retryable uniquement (fail-fast sur erreur de clé, ça ne dépend pas du modèle), timeout de 20s par tentative combiné à la main avec le signal d'annulation global (pas de `AbortSignal.any()`, non supporté sur les anciennes versions de Safari iOS). Minuteur global du chat remonté de 45s à 75s pour laisser la place à la cascade. `requestCoachFeedback()` (bilan de fin de séance) n'avait **aucun** minuteur de sécurité avant ce correctif — ajouté au passage.
**Méthode de test réutilisable** : fonctions extraites et testées en isolation dans Node avec un `fetch` mocké — même technique que la leçon "reseauPuisCache()" plus bas dans ce fichier (simuler explicitement "le réseau ne répond jamais" via `new Promise(() => {})`/un `AbortController` qui ne se résout que sur `abort`, pas seulement "le réseau échoue tout de suite"). 5 scénarios couverts : cascade réussie au 3e modèle, tous les modèles surchargés, 1er modèle qui ne répond jamais (vérifié à ~20s réels), clé invalide (doit échouer immédiatement sans changer de modèle), minuteur global déjà expiré avant le premier essai (0 appel réseau gaspillé).
**Leçon généralisable** : face à une erreur "service overloaded" d'un LLM tiers (Gemini, mais le principe vaut pour n'importe quel fournisseur), ne jamais chercher un réglage qui l'empêcherait totalement — ça n'existe pas en tier gratuit/partagé. La seule mitigation robuste est **cascade de repli + retry borné + timeout par tentative**, avec un message d'erreur final qui dit clairement "tout a été tenté" plutôt qu'un simple timeout générique. Et : un abonnement payant à l'app grand public d'un fournisseur d'IA ne présume jamais du tier de facturation de son API — toujours vérifier que la facturation est activée sur le bon compte/projet, au bon endroit.
**Vérifié** : clé API réelle testée directement (latences et 503 mesurés), 5 scénarios Node passés. **Non testé sur iPhone / réseau Safari réel.**
**Fichiers touchés** : `Muscu/app.js`, `Muscu/README.md`, `PROBLEMES_RESOLUS.md`


### 23/09/2026 (suite, même jour) — le correctif lui-même avait un bug : 404 traité comme fatal
**Symptôme** : juste après avoir déployé la cascade de repli ci-dessus, premier test réel → "Google est surchargé sur tous les modèles", du jamais-vu selon Corentin ("y'a toujours un modèle qui fonctionne au moins").
**Cause** : `COACH_RETRYABLE_STATUS` (la liste des codes HTTP qui font basculer sur le modèle suivant) ne contenait que 429/500/502/503/504 — **le 404 n'y était pas**. Or le modèle enregistré en base (`settings/coach.model`) était `gemini-2.5-flash`, toute la famille Gemini 2.5 étant entre-temps retirée par Google (404 "no longer available to new users"). La cascade s'arrêtait donc **dès la 1re tentative**, sans jamais essayer `gemini-3.6-flash` — qui répondait pourtant normalement en 6s au même moment, vérifié en direct avec la vraie clé. Le message "tous surchargés" était donc faux : un seul modèle était en cause, mort et non surchargé.
**Leçon généralisable, au-delà de ce cas précis** : une liste blanche de codes "à retenter" (`COACH_RETRYABLE_STATUS`) est un piège classique — il est plus sûr de raisonner en liste NOIRE ("qu'est-ce qui doit vraiment arrêter la cascade ?", ici : uniquement les erreurs de clé, indépendantes de tout modèle) que de deviner à l'avance tous les codes qui doivent la laisser continuer. Une liste blanche oubliée d'un cas fait échouer silencieusement le mécanisme entier qu'elle est censée renforcer.
**Correction** : seules `BAD_KEY`/`NO_KEY`/`KEY_*` restent fatales ; tout le reste (404 inclus) bascule sur le modèle suivant. Ajout de `persistWorkingModel()` : auto-correction en base du modèle mort vers le premier qui répond, en tâche de fond.
**Vérifié** : scénario exact reproduit dans le harnais de test Node (modèle primaire 404 → bascule → succès → correction persistée). **Non testé sur iPhone.**
**Fichiers touchés** : `Muscu/app.js`, `Muscu/README.md`, `PROBLEMES_RESOLUS.md`

---

## 📡 Portail — écoute Firestore en direct silencieuse après suspension iOS (22/09/2026)

### 22/09/2026 — Portail — tableau de bord périmé malgré une connexion internet fonctionnelle
**Symptôme** : sur le téléphone de Lisa, le tableau de bord du Portail affichait des chiffres périmés ; il a fallu forcer une actualisation manuelle alors qu'elle avait internet.
**Fausses pistes explorées** : aucune — le mécanisme de publication (côté Budget/Muscu/Course, déclenché à l'ouverture de chaque app) fonctionnait normalement ; ce n'était pas un problème d'écriture mais de lecture côté Portail.
**Cause racine** : le tableau de bord se met à jour uniquement via `db.collection('portail').onSnapshot(...)`, jamais par un minuteur (aucune app ne republie à intervalle fixe, seulement quand elle est ouverte). Sur iPhone, une PWA mise en arrière-plan est **suspendue par iOS** (JS arrêté) ; au retour au premier plan, une écoute en direct déjà ouverte peut rester silencieuse un moment sans se reconnecter tout de suite — indépendamment de la qualité de la connexion internet. Le seul mécanisme déjà présent au retour au premier plan (`visibilitychange`) ne faisait que réafficher les chiffres déjà en mémoire et vérifier la version du code de l'app, jamais relire Firestore.
**Solution** : ajout d'une relecture forcée **depuis le serveur** (`get({ source: 'server' })`, jamais le cache local) à chaque retour au premier plan (`visibilitychange`), en complément de l'écoute `onSnapshot` existante qui continue de fonctionner le reste du temps.
**Leçon généralisable** : toute app de cet écosystème qui affiche des données via une écoute Firestore en direct (`onSnapshot`) et qui peut rester ouverte longtemps en arrière-plan sur iPhone doit prévoir un filet de sécurité au retour au premier plan (`visibilitychange` → relecture serveur forcée) — l'écoute en direct seule ne suffit pas à garantir la fraîcheur après une suspension iOS, même avec une bonne connexion.
**Fichiers touchés** : `Portail` (`app.js`, `README.md`)

---

## 💬 Portail/Muscu — d'un chiffre figé à une phrase qui a du sens (22/09/2026)

### 22/09/2026 — Portail — « Séance X/4 » ne voulait rien dire pour un rythme qui varie
**Retour de Corentin** : le rythme n'est pas toujours de 4 séances par semaine, donc rapporter les séances faites à un objectif fixe de 4 était trompeur.
**Décision** (après un échange de plusieurs séries d'idées) : remplacer le compte hebdomadaire par **une phrase motivante, unique pour le duo**, ton bienveillant, calculée à partir de signaux réels (séance en duo récente, silence prolongé, série, bonne semaine), pas un texte générique statique.
**Leçons réutilisables** :
- **Un contenu texte généré doit rester déterministe à données égales** : la variante est choisie par `new Date().getDate() % n` (change de jour en jour), pas par `Math.random()` — un calcul aléatoire aurait fait varier la signature JSON du résumé à chaque publication et republié pour rien (la garde « sans effet si rien n'a changé » existe justement pour éviter ça).
- **Une priorité de règles simples bat un score composite** pour ce genre de texte : la première situation qui s'applique (parmi 5, triées de la plus spécifique à la plus générale) donne un résultat prévisible et facile à ajuster, plutôt qu'une formule à pondérations.
- **Retirer les champs qui ne servent plus le document publié** (`objectif`, `semaine`, `serie` de `portail/muscu`) plutôt que les garder « au cas où » : un document plus petit se relit plus vite, et le champ retiré n'était de toute façon jamais montré nu, seulement à travers la phrase.
- **Demander d'autres idées plusieurs fois de suite est un signal utile** : aucune des 4 premières pistes ne convenait tout à fait ; les 4 suivantes ont fait émerger la bonne direction (une phrase plutôt qu'un chiffre), confirmée par 10 idées de plus avant que Corentin choisisse. Mieux vaut élargir que remodeler une mauvaise option.
**Fichiers touchés** : `Muscu/app.js`, `Portail` (`index.html`, `style.css`, `app.js`), `README.md` (Portail et Muscu)

---

## 💶 Portail/Budget — un montant « au centime près » arrondi par erreur (22/09/2026)

### 22/09/2026 — Portail — `eur0` arrondissait à l'euro, retour de Corentin le jour même
**Symptôme** : la ligne « X € dépensés sur Y € » du Portail affichait des euros ronds (« 2 148 € »), alors que Budget calcule et affiche ses montants au centime.
**Cause racine** : la fonction de formatage `eur0` (nommée ainsi à dessein, écrite le 22/09/2026 dans le premier jet du tableau de bord) avait `maximumFractionDigits: 0`.
**Solution** : `eur2`, avec `minimumFractionDigits`/`maximumFractionDigits` à `2`.
**Leçon réutilisable** : nommer une fonction de formatage par le nombre de décimales qu'elle produit (`eur0`, `eur2`) rend l'erreur visible dans le code au lieu de rester cachée dans un comportement — mais ne dispense pas de vérifier le rendu contre l'app source avant de committer.
**Fichiers touchés** : `Portail/app.js`, `README.md`

---

## 🎛️ Portail — un tableau de bord « difficile à comprendre » (22/09/2026)

### 22/09/2026 — Portail — Tout avait le même poids visuel
**Symptôme** (capture iPhone de Corentin) : « titres, sous-titres, informations : difficile à comprendre ».
**Cause racine** : (1) libellés en petites majuscules grises espacées **partout**, donc aucun niveau de lecture ; (2) montant coupé en deux tailles (« 0 ,83 € ») ; (3) chiffres sans mot pour les expliquer (« 1/4 », « · 1 », une jauge pleine sans légende) ; (4) une ligne de description d'app qui répétait ce que l'icône disait déjà ; (5) « Mis à jour… » répété en pied de chaque carte.
**Solution** : une règle de lecture à 3 niveaux — en-tête (nom + fraîcheur), **information clé en gros**, une phrase d'explication en gris — et des libellés en phrase normale. Détail dans le README du Portail, « Lisibilité des cartes ».
**Leçons réutilisables** :
- **Écrire les chiffres en français complet** (« 1 sur 4 », « 3 semaines d'affilée », « 2 148 € dépensés sur 2 149 € ») ; un ratio nu n'est pas une information.
- **Ne jamais couper un nombre en deux tailles** dans un montant : lecture hachée.
- **Une jauge doit dire ce qu'elle mesure** (ici la part déjà dépensée) dans la ligne qui la suit.
- **Signaler la fraîcheur là où on regarde en premier** (en-tête) et **alerter** quand elle dépasse le seuil utile (24 h → jaune).
- **Un attribut `hidden` est écrasé par un `display:` de classe** : ajouter `.classe[hidden]{display:none}` (une carte vide affichait un libellé orphelin).
- **Le rendu sur l'appareil réel est le seul juge** de la lisibilité : la capture d'écran de l'utilisateur a montré en 10 secondes ce que les captures de bureau ne montraient pas.
- Outils de test : la visionneuse d'images **garde en cache une capture de même nom** (enregistrer sous un nouveau nom à chaque essai) ; le motif Playwright `**/gstatic.com/**` **ne bloque pas** `www.gstatic.com` (utiliser `**/*gstatic.com/**`), ce qui a fait croire à tort que les données de test étaient ignorées.
**Observation non traitée** : flou du haut d'écran (ligne « Portail Duo » et bouton de thème) sur la capture iPhone — voir « iOS 26's edge treatment » dans la saga du flou de Courses ; à confirmer avant toute modification.
**Fichiers touchés** : `style.css`, `index.html`, `app.js` (Portail), `README.md`

---

## ⬛ Portail — page noire hors-ligne : `cache.addAll` tout-ou-rien + attente indéfinie (22/09/2026)

### 22/09/2026 — Portail — Retour de Corentin : « quand je n'ai plus de réseau, je reste sur une page noire »
**Symptôme** : hors-ligne, la page ne s'affiche pas du tout.
**Cause racine, deux bugs cumulés dans `sw.js`** :
1. **`cache.addAll(SHELL_FILES...)` est tout-ou-rien.** Un seul fichier en échec (404 passager pendant qu'un déploiement GitHub Pages se propage — plausible ce jour-là, plusieurs pushs coup sur coup sur le Portail) fait échouer **toute** l'installation : même `index.html`/`app.js`/`style.css`, pourtant récupérés sans problème, ne sont jamais mis en cache.
2. **`reseauPuisCache()`** (réseau d'abord, repli sur le cache après 4 s — voir l'entrée du 20/09/2026) ne gérait que deux issues au bout du délai : le cache a quelque chose (résout avec) ou le vrai `fetch()` finit par échouer (résout alors). Le cas « le cache n'a rien ET le fetch ne répond ni ne rejette avant longtemps » n'était **pas couvert** : la promesse restait ouverte, en attente du fetch réseau — rapide à échouer en simulation « offline » de bureau, mais potentiellement long (bien plus de 4 s) sur iPhone en zone de mauvais réseau, où une requête peut rester en attente côté OS avant d'échouer franchement.
**Solutions** :
1. Mise en cache **fichier par fichier**, avec repli individuel (`SHELL_CRITIQUES` essayés en groupe puis un par un si besoin, `SHELL_ANNEXES` toujours un par un) : un fichier secondaire en échec ne peut plus jamais empêcher les fichiers essentiels d'être mis en cache.
2. `reseauPuisCache()` résout désormais **systématiquement** au bout du délai — cache si possible, sinon une **page de secours** HTML minimale, écrite en dur (aucune dépendance externe : elle doit s'afficher même si rien d'autre n'a pu être mis en cache).
**Méthode de test réutilisable, sans dépendre de la fidélité de la simulation « offline » d'un navigateur** :
- Le point 1 se teste bien avec Playwright (serveur local renvoyant un 404 volontaire sur un fichier, installation du SW, vérification du contenu du cache).
- Le point 2, en revanche, **résiste mal à la simulation offline d'un navigateur** : `context.set_offline(True)` de Playwright fait échouer les `fetch()` quasi instantanément, donc jamais assez lentement pour révéler un bug qui ne se manifeste que si le fetch traîne. **Extraire la fonction dans un fichier `.js` isolé et la tester dans Node**, avec un faux `fetch` qui ne se résout ni ne rejette **jamais** (`new Promise(() => {})`), révèle immédiatement ce genre de bug — et se vérifie en une seconde, sans navigateur.
- Plus généralement : une fonction avec un délai de repli (« timeout puis secours ») mérite un test qui simule explicitement « le réseau ne répond jamais », pas seulement « le réseau échoue tout de suite » — ce sont deux scénarios différents, et les outils de simulation réseau des navigateurs ne couvrent en général que le second.
**Fichiers touchés** : `sw.js` (Portail), `README.md`

---

## 🧭 Portail — tableau de bord alimenté par 3 bases Firebase (22/09/2026)

### 22/09/2026 — Portail, Muscu, Budget, Courses — Un aperçu de chaque app sur une seule page, sans 2 mots de passe de plus
**Contexte** : les 3 apps sont sur 3 projets Firebase distincts (Muscu et Budget en e-mail/mot de passe, Courses en anonyme). Architecture retenue (« B1 ») et alternatives écartées : `README.md` du Portail, section « Tableau de bord ».
**Décision clé** : la **base de Courses sert de boîte aux lettres** (connexion anonyme = aucun mot de passe) ; chaque app y écrit un résumé `portail/<app>` calculé par SA logique ; le Portail lit et affiche. Pas de recalcul dans le Portail (donc pas de divergence avec les apps).
**Pièges et leçons, réutilisables** :
- **Une base publique + un dépôt public = des données non fiables.** L'authentification anonyme n'empêche personne de lire/écrire ; ces documents alimentent une page qui partage son origine avec les 3 autres apps (donc leur `localStorage`). Règle : tout valider (types, bornes, longueurs) et n'écrire qu'avec `textContent`, **jamais `innerHTML`**. Test : injecter dans le cache `<img onerror=…>`, `<script>`, chaînes à la place de nombres, valeurs énormes, et vérifier qu'aucun code ne s'exécute.
- **Ne publier un résumé qu'après un snapshot venu du SERVEUR** (`snap.metadata.fromCache === false`). Sinon un téléphone hors ligne au vieux cache écrase un résumé récent avec des chiffres périmés (même famille que l'incident Courses du 21/09).
- **`cache.add()` rejette une réponse opaque** (`no-cors`, statut 0) dans Chromium : le SDK n'était pas dans le cache. `fetch(new Request(url, {mode:'no-cors'})).then(rep => cache.put(url, rep))` fonctionne. À vérifier sur `Course/sw.js`, qui utilise `cache.add` avec `no-cors` pour son SDK (fonctionne peut-être sur Safari, pas garanti ailleurs).
- **Charger le SDK Firebase après le premier affichage** (injection de `<script>`) : un `<script>` de CDN bloquant plante l'ouverture hors ligne (cf. 18/09). Le Portail s'affiche depuis `localStorage` puis se met à jour.
- **Deux SDK, deux versions, une même session** : Muscu (modulaire 12.18) et Budget (compat 10.8) ouvrent chacun une application nommée `'portail'` vers la base de Courses ; la clé de session Firebase dépend du nom d'application, ce qui isole ces sessions de celles des apps (les apps gardent leur propre connexion). Ne pas nommer cette 2e application `[DEFAULT]`.
- **Un `const`/`let` dans un script classique n'est pas sur `window`** ; les blocs de publication de Muscu passent par `window.__portail` (défini dans le module), avec un garde `if(!window.__portail) return`.
- **Recalculer côté Portail ce qui dépend de la date** (jours restants) : le document date de la dernière ouverture de l'app. Et **ne pas afficher « ≈ 0 €/j »** : n'afficher un budget par jour qu'à partir de 1 €.
**Méthode réutilisable (tests sans iPhone ni mots de passe)** :
- Extraire les fonctions de calcul d'`app.js` par ancres de texte, les exécuter dans Node sur les **vraies données lues avec l'accès Admin**, et comparer à la formule de l'app (ici : reste à vivre identique à `calculerTotauxMensuels`).
- Tester un pont de connexion avec une **page-harnais** contenant le vrai bloc de code, le vrai SDK et la vraie base ; écrire un document `_test_…`, le relire, le supprimer.
- Tester une règle Firestore depuis l'extérieur : `signUp` anonyme (Identity Toolkit REST) puis écriture REST sur une collection neuve, lecture sans jeton (attendu : 403).
- Chromium simule les zones de sécurité iPhone (`Emulation.setSafeAreaInsetsOverride`) ; `context.set_offline(True)` après une première visite teste le service worker.
**Process (leçons de mise en ligne)** :
- **Vérifier que la copie locale d'un fichier est bien la version en ligne avant de la patcher** : mes copies de Muscu dataient d'avant les flammes et le workflow d'auto-version ; un envoi les aurait écrasées. Le contrôle est maintenant : empreinte distante = empreinte de la base, sinon on abandonne.
- **Ordre des commits** : d'abord ce qui reste compatible avec l'ancien état (`style.css`, `sw.js`, puis `index.html`), en dernier `app.js` (un nouvel `app.js` sur l'ancien HTML aurait planté sur un élément absent, avant même l'enregistrement du service worker). Le workflow d'auto-version réécrit `index.html` (`?v=`) après chaque poussée : repartir de la version distante pour `index.html`.
- **Les dates** : la date du jour était le 22/09 après minuit ; les commentaires étaient d'abord datés du 23/09. Vérifier avec `date` avant d'écrire une date dans du code ou un README.
**Fichiers touchés** : `index.html`, `style.css`, `app.js`, `sw.js` (Portail) ; `Muscu/index.html`, `Muscu/app.js` ; `Budget/app.js` ; `Course/app.js` ; les 4 `README.md` ; (+ création des documents `portail/*` dans la base de Courses)

---

## 🔥 Muscu — flammes de record : tuiles SVG rejetées (« emoji »), passage au canvas de particules (21/09/2026)

### 21/09/2026 — Muscu — Un effet de feu « réaliste » ne se fait pas avec un motif répété
**Symptôme** : 1re version (tuiles SVG de flammes répétées le long des bords, animées en `scaleY`) : rendu jugé « emoticonesque » — flammes identiques, alignées, clairement des icônes.
**Cause racine (de conception)** : un motif répété est régulier par construction ; le feu réel est irrégulier, additif (les zones de recouvrement chauffent vers le blanc), change de couleur au fil de sa vie et monte en accélérant.
**Solution** : système de **particules sur `<canvas>`** — sprites radiaux pré-rendus, mélange `lighter`, hauteur modulée par une somme de sinus glissants (langues de feu), étincelles, lit de braises à la base, flammes qui s'éteignent en douceur. Détails et réglages : README de Muscu, section « Flammes de record ».
**Pièges rencontrés, réutilisables** :
- **Data-URI SVG en CSS : le `#` brut tronque l'image** (début du fragment d'URL). `stop-color='#ffb000'` coupait le SVG ; le CSS ne signale rien, l'image est juste absente alors que `background-image` est « correct » dans l'inspecteur. Encoder **tous** les `#` en `%23` (couleurs et `url(#id)`), plus `<` → `%3C`, `>` → `%3E`. **Test rapide** : `new Image()` avec la valeur → `onload` / `onerror`.
- **Effet hors d'une carte** : rogné par son `overflow:hidden`. Passer en `overflow:visible` sur l'état concerné et redonner l'arrondi à l'enfant qui en dépendait.
- **Couche `position:absolute; inset:-Npx` plus large que la marge de la page** : défilement horizontal (à droite ; à gauche c'est inoffensif). Garder N inférieur à la marge.
- **`prefers-reduced-motion` ignoré** si son sélecteur est moins spécifique que la règle qui déclare l'animation : vérifier `getComputedStyle(el).animationName` avec `reduced_motion="reduce"`.
- **Canvas avec animation continue** : une seule boucle `requestAnimationFrame` partagée, `dt` plafonné, `IntersectionObserver` pour ne pas calculer hors écran, et **nettoyage des éléments détachés du DOM** (l'app re-`render()` tout : sans `isConnected`, la boucle tournerait pour des cartes disparues). Plafonner le `devicePixelRatio` (1,5) pour un effet flou.
- **Un effet additif sur fond clair** perd son cœur blanc : le tester dans les deux thèmes.
**Méthode** : prototyper hors de l'app (page de test + Playwright, captures à plusieurs instants) avant de committer — l'iteration visuelle sur un effet se fait en quelques minutes ainsi.
**Fichiers touchés** : `Muscu/style.css`, `Muscu/app.js`, `Muscu/README.md`

---

## 🧬 Course — doublons de rayons/produits : un appareil au vieux cache réinjecte le catalogue (21/09/2026)

### 21/09/2026 — Course — 25 rayons et 257 produits au lieu de 13 et 133
**Symptôme** : rayons en double dans Course (« encore », après l'incident du 18/09).
**Fausses pistes** : le code client actuel (aucune logique de réinjection ; le bouton « + Nouveau rayon » ne crée qu'un rayon à la fois).
**Cause racine** : un lot unique de 136 documents créé le 19/09 à 11:05:30 (Paris) par l'ancienne fonction `lancerSeedSiVide()` tournant sur un appareil resté sur l'ancienne version en cache. **Empreinte à reconnaître** : tous les documents suspects ont la **même `create_time` à la seconde** (écriture par lot) et un schéma différent du reste (ici : `compteur:0`, pas de champ `achete`).
**Solution** : sauvegarde JSON, puis fusion par nom (plus ancien gardé, états `aAcheter`/`achete` en « ou », `compteur` en somme, rayons rattachés au plus ancien), vérification avant/après de l'état par produit. Plus un anti-doublon sur la création de rayon dans l'app.
**Méthode réutilisable** : pour dater une pollution Firestore, lire `create_time` / `update_time` des documents (Admin SDK) — un histogramme des `create_time` montre chaque épisode d'écriture en masse. Ne jamais supposer que « propre » le jour J le reste : tout appareil au vieux cache peut ré-écrire.
**Piste non faite** : règle Firestore exigeant `achete` à la création d'un produit (bloquerait l'ancien code).
**Fichiers touchés** : `Course/app.js`, `Course/README.md` (+ nettoyage direct dans Firestore)

---

## 🖼️ Muscu — icône d'écran d'accueil référencée mais jamais commitée (21/09/2026)

### 21/09/2026 — Muscu — `apple-touch-icon.png` en 404 pendant 4 jours
**Symptôme** : `index.html` pointait vers `apple-touch-icon.png` (et `icon-512.png`), fichiers absents du dépôt ; l'icône d'écran d'accueil de Muscu n'était donc pas celle prévue.
**Cause racine** : l'image avait été envoyée sur GitHub le 11/09 (« Add files via upload ») sous son nom d'appareil photo, `IMG_4867.png`, et jamais renommée. Détectée lors d'un audit de code mort : le fichier « orphelin » était en réalité la pièce manquante. Le `sw.js` documentait déjà le 404, sans qu'on relie le fichier au lien.
**Solution** : `IMG_4867.png` (180 × 180 px) renommé `Muscu/apple-touch-icon.png`. Il faut supprimer puis rrajouter le raccourci sur l'écran d'accueil pour voir la nouvelle icône.
**Règle à retenir** : avant de supprimer un fichier « non référencé », le rapprocher des liens **cassés** (404) du dépôt — l'un est peut-être l'autre. Et une icône iOS doit être un vrai fichier à la racine du dossier de l'app (pas de data URI).
**Fichiers touchés** : `Muscu/apple-touch-icon.png` (ex-`IMG_4867.png`), `Muscu/README.md`

---

## 🧹 Budget — supprimer une fonctionnalité ET ses données Firestore (21/09/2026)

### 21/09/2026 — Budget — Retrait de la carte « Projets / Épargne » sans laisser de données fantômes
**Symptôme / besoin** : supprimer une carte de l'app et les données qu'elle stockait (champ `epargne` dans chaque document `mois`, plus des lignes de type `epargne` dans `config/global.corbeille`).
**Pièges identifiés** :
- L'app écrit chaque mois en entier (`set(clean(mois))`) : un client encore sur l'ancien code (onglet ouvert, cache) peut **réécrire le champ supprimé**. Ordre retenu : déployer le code d'abord, purger Firestore ensuite.
- Une ancienne sauvegarde `.json` restaurée ou une ligne restaurée depuis la corbeille peut recréer le champ : `normaliserMois()` écarte `epargne` et la corbeille filtre `typeOriginal === 'epargne'`.
- Ne pas oublier les **dépendances d'affichage** : jauge de la Répartition, total annuel, objectifs de provisions, liste des types du pop-up « Nouveautés », import confetti (+ précache `sw.js`).
**Solution** : voir README Budget (section du 21/09/2026). Sauvegarde JSON complète de Firestore avant toute suppression.
**Méthode réutilisable (environnement de test)** :
- `firebase-admin` (Python) via le proxy du sandbox : le gRPC échoue avec `CERTIFICATE_VERIFY_FAILED` tant que `GRPC_DEFAULT_SSL_ROOTS_FILE_PATH=/etc/ssl/certs/ca-certificates.crt` n'est pas défini.
- Ne jamais nommer un script `inspect.py` (masque le module standard `inspect` → import circulaire).
- Test de rendu sans navigateur : jsdom ne gère pas `innerText` (lire `.innerText` et non `.textContent` pour les valeurs posées par l'app) et n'exécute pas le `<script>` inline qui définit `DERNIERE_MAJ` (à définir avant d'évaluer `app.js`).
**Fichiers touchés** : `Budget/index.html`, `Budget/app.js`, `Budget/sw.js`, `Budget/README.md`

---

## 📱 Muscu — haut de l'écran flou après `viewport-fit=cover` (20/09/2026)

### 20/09/2026 — Muscu — Le contenu du haut passait sous la barre d'état
**Symptôme** : le haut de Muscu était « tout flou » sur iPhone juste après l'ajout de `viewport-fit=cover`.
**Cause racine** : avec `viewport-fit=cover` la page s'étend sous la barre d'état (≈ 59 px à Dynamic Island). Les titres et boutons du haut démarraient à 14–22 px du bord, dans cette zone où iOS applique son flou natif (« edge treatment », cf. saga Course). Avant `cover`, iOS décalait la page sous la barre d'état, ce qui masquait le défaut. Je l'avais annoncé comme un effet possible mais sans le compenser : le `cover` aurait dû partir avec la marge de sécurité.
**Solution** : variable `--safe-top: calc(env(safe-area-inset-top, 0px) + 16px)` (même valeur que Course) appliquée à `.view-inner`, à l'en-tête sticky `header` (exercices), à la `.chat-bar` sticky (marge négative + padding pour que son fond couvre la zone de la barre d'état), et aux boutons fixes `.theme-toggle` / `.sync-badge`.
**Règle à retenir** : **ajouter `viewport-fit=cover` sur une app impose, dans le même commit, de décaler tout ce qui touche le haut de l'écran de `env(safe-area-inset-top)`** (contenu, en-têtes sticky, boutons fixes) ; les éléments sticky doivent porter la marge dans leur propre padding pour que leur fond opaque couvre la barre d'état au défilement.
**Méthode réutilisable** : Chromium sait simuler les zones de sécurité iPhone — `Emulation.setSafeAreaInsetsOverride` via une session CDP (`{'insets': {'top': 59, 'bottom': 34, 'left': 0, 'right': 0}}`) — ce qui permet de mesurer et de photographier le haut des écrans sans iPhone (Playwright : `context.new_cdp_session(page)`). Le flou lui-même est un comportement d'iOS et n'est pas reproductible ainsi ; on vérifie seulement que rien ne démarre dans la zone.
**Vérifié** : simulation 59 px / 34 px — premier titre du menu de 22 → 97 px, bouton « ← Séances » de 14 → 89 px, sélecteur du coach collé à 86 px, bascule de thème alignée. **Non vérifié sur iPhone.**
**Fichiers touchés** : `Muscu/style.css`, `Muscu/README.md`

---

## 🔔 Toutes apps — bandeau « Nouvelle version disponible » affiché à tort (20/09/2026)

### 20/09/2026 — Portail, Muscu, Course, Budget — Faux positif du bandeau de mise à jour
**Symptôme** : le bandeau « 🔄 Nouvelle version disponible » s'affichait à l'ouverture des apps après un déploiement, alors qu'elles étaient déjà à jour.
**Cause racine** : le bandeau (ajouté le 19/09) se déclenchait sur la seule installation d'un nouveau service worker (`updatefound`, `reg.waiting`). Ça avait un sens tant que `index.html` était servi en cache-first ; depuis le passage en réseau d'abord (20/09), la page est déjà la dernière version quand le service worker se met à jour. Oubli de ma part lors de la mise en place du réseau d'abord : l'ancien mécanisme n'avait pas été remis en cause. Le bandeau court-circuitait en plus le rechargement automatique.
**Solution** : la mise à jour du service worker déclenche maintenant `window.__verifierVersion(true)` (comparaison de `DERNIERE_MAJ` avec le serveur) au lieu d'afficher le bandeau : rechargement automatique si la page est vraiment périmée, bandeau seulement si une saisie ou une fenêtre est ouverte. Contrôle aussi ~3 s après chaque lancement. Garde-fou anti-boucle : 2 rechargements automatiques maximum par session (`sessionStorage`, clé `majRechargements`), puis bandeau.
**Règle à retenir** : un signal « le service worker a changé » n'est pas un signal « la page est périmée » dès que la page est servie en réseau d'abord ; seul le numéro de version du code réellement chargé (`DERNIERE_MAJ`) fait foi.
**Vérifié** : reproduit dans Chromium avant correction (page à jour + `sw.js` modifié → bandeau à tort sur les 4 apps, et vraie nouvelle version → bandeau au lieu de rechargement), corrigé ensuite ; suite hors ligne / déploiements simulés inchangée. Non vérifié sur iPhone.
**Fichiers touchés** : `app.js` × 4, `README.md` × 4.

---

## 🧩 Toutes apps — découpage en index.html / style.css / app.js (20/09/2026)

### 20/09/2026 — Portail, Muscu, Course, Budget — Un `index.html` de 350 Ko découpé sans rien changer au comportement
**Contexte** : chaque app tenait dans un seul `index.html` (Muscu : 351 Ko, ≈ 7 000 lignes). Difficile à relire, à modifier sans risque, et tout était retéléchargé/recaché d'un bloc.
**Solution (identique sur les 4 apps)** : `index.html` (structure + petit script inline `DERNIERE_MAJ` + balises `<link href="style.css?v=…">` / `<script src="app.js?v=…">`), `style.css` (ancien `<style>`), `app.js` (anciens `<script>` classiques, ordre d'origine ; `DERNIERE_MAJ` sortie du JS). `sw.js` : les 3 fichiers en précache et en réseau d'abord ; cache indexé **sans** la partie `?v=`. Le robot `auto-version.yml` se déclenche si l'un des 3 fichiers change et met à jour `DERNIERE_MAJ`, les deux `?v=` (chiffres de `DERNIERE_MAJ`) et `CACHE_NAME`.
**Cas particulier Muscu** : le `<script type="module">` Firebase reste inline (un module ES ne se fusionne pas avec du code classique : les `onclick="…"` du HTML cesseraient de trouver leurs fonctions) ; les 3 scripts classiques sont fusionnés dans `app.js`.
**Pièges rencontrés pendant les tests (Chromium headless, serveur avec `Cache-Control: max-age=600` comme GitHub Pages)** :
- **`cache:'no-cache'` dans le service worker ne suffisait pas** : après un déploiement simulé, un simple rechargement continuait d'exécuter l'ancien `app.js` (le navigateur ne redemandait même pas les sous-ressources au serveur), alors que `index.html` était bien à jour. **Correctif : URLs versionnées `?v=<chiffres de DERNIERE_MAJ>`** — une URL neuve à chaque déploiement, quel que soit le cache. Constaté sur Chromium ; le comportement exact de WebKit/iOS n'a pas été vérifié, mais cette parade ne dépend d'aucun navigateur.
- Le cache du service worker doit ignorer `?v=` (`cleCache()`), sinon chaque déploiement empilerait une nouvelle entrée par fichier.
- À l'écran de connexion de Muscu, le rechargement automatique est volontairement remplacé par le bandeau (la fenêtre de connexion compte comme « fenêtre ouverte »).
**Méthode de non-régression réutilisable** (Playwright + Chromium, ancienne et nouvelle version servies côte à côte) : comparer le DOM hors `<script>`/`<style>`, les styles calculés de tous les éléments à `id`, la liste des variables globales et les messages console ; puis tester hors ligne, un déploiement simulé et le rechargement automatique. Résultat ici : identique sur les 4 apps (5, 27, 97 et 75 éléments à `id`).
**Règle de travail** : lire `index.html`, `style.css` et `app.js` de l'app concernée ; ne jamais modifier à la main `DERNIERE_MAJ`, les `?v=` ni `CACHE_NAME`.
**Fichiers touchés** : `index.html`, `style.css` (nouveau), `app.js` (nouveau), `sw.js`, `README.md` × 4 ; `.github/workflows/auto-version.yml`.

---

## 🔄 Toutes apps — mises à jour visibles sans fermer l'app ni réinstaller (20/09/2026)

### 20/09/2026 — Portail, Muscu, Course, Budget — Plus de swipe ni de réinstallation pour voir une nouvelle version
**Symptôme** : après un push, il fallait fermer l'app (swipe vers le haut), voire la supprimer et la réinstaller, pour voir la nouvelle version. Le rituel manuel (incrémenter `CACHE_NAME` + mettre à jour `DERNIERE_MAJ` à chaque commit) était la seule parade à la confusion du 18/09, et un oubli suffisait à la faire revenir (9 incréments de cache pour Budget rien que le 20/09).
**Fausses pistes écartées** : rechargement automatique sur `controllerchange` (couperait une saisie en cours) ; Workbox (surdimensionné pour 4 apps personnelles).
**Cause racine** : trois causes cumulées — (1) `sw.js` servait `index.html` en **cache-first** : la copie en cache passait toujours avant le serveur ; (2) iOS **ne recharge pas** une PWA simplement remise au premier plan : le JavaScript en mémoire reste l'ancien ; (3) le contournement dépendait d'une action humaine.
**Solution (identique sur les 4 apps)** :
1. `sw.js` : `index.html` en **réseau d'abord** (`reseauPuisCache()`), repli sur le cache après 4 s ou hors ligne. Les autres fichiers du shell restent en cache-first.
2. `index.html` : au retour au premier plan (`visibilitychange`), `fetch('index.html', {cache:'no-store'})`, comparaison de `DERNIERE_MAJ` avec celle du code en cours, puis **rechargement automatique** — sauf champ de saisie actif ou fenêtre ouverte, auquel cas le bandeau « Nouvelle version disponible » s'affiche. Max un contrôle / 30 s.
3. **GitHub Action** `.github/workflows/auto-version.yml` : à chaque push modifiant l'`index.html` d'une app, met à jour `DERNIERE_MAJ` (heure de Paris) et `CACHE_NAME` (`<préfixe>r<n° d'exécution>`) de **cette app seulement**, committe, puis relance la publication Pages par l'API. Lancement manuel possible (onglet Actions) : met à jour les 4 apps pour forcer un rafraîchissement général.
**Pièges à connaître** :
- `DERNIERE_MAJ` est **fonctionnelle** (numéro de version pour la détection) : garder une seule occurrence de `DERNIERE_MAJ = '…'` par `index.html`.
- Le workflow s'appuie sur `const CACHE_PREFIX = '…';` et `const CACHE_NAME = '…';` **en début de ligne** dans chaque `sw.js` ; sinon l'exécution échoue (croix rouge dans l'onglet Actions) et rien n'est mis à jour.
- Le filtre du workflow porte sur les `index.html` : un push qui ne touche que `sw.js` ne déclenche pas le robot (bumper `CACHE_NAME` à la main ou lancer le workflow manuellement).
- Ne pas mettre `[skip ci]` dans un message de commit (non testé, mais peut aussi empêcher la publication Pages).
- La première mise à jour vers cette version ne profite pas encore du mécanisme : fermer et rouvrir l'app une ou deux fois.
**Vérifié** : premier passage réel du workflow OK (commit du robot, Pages construit sur ce commit, site publié avec les valeurs à jour) ; logique du service worker testée avec des stubs Node (5 cas : réseau OK, hors ligne, réseau lent, avec et sans cache). **Non vérifié sur iPhone** : le rechargement automatique au retour au premier plan.
**Fichiers touchés** : `index.html` + `sw.js` × 4, `.github/workflows/auto-version.yml`, `README.md` × 4, `GUIDE_PWA_IOS.md`

---

## 🔔 Budget — le pop-up « Nouveautés » ne voyait plus les dépenses de Lisa (20/09/2026)

### 20/09/2026 — Budget — Pop-up « Nouveautés » silencieusement inopérant avec le cache Firestore persistant
**Symptôme attendu** : Lisa ajoute une dépense sur son téléphone ; à l'ouverture suivante de Budget chez Corentin, aucun pop-up (comportement historique : un pop-up listant les nouveautés).
**Cause racine** : le pop-up comparait le **premier** snapshot `onSnapshot` à une copie locale (`budgetLC_cache`) réécrite à chaque snapshot. Depuis l'activation du cache persistant (v3.0.2/v3.0.3), ce premier snapshot vient du **cache local**, identique à la copie : écart nul, `firstLoad` passait à `false`, et le snapshot **serveur** contenant les nouveautés n'était jamais comparé. `snap.metadata.fromCache` n'était consulté nulle part. Aggravants : référence écrasée à chaque snapshot (donc perdue si l'app est tuée pendant l'affichage), aucune détection au retour d'arrière-plan (iOS ne relance pas la page), catégories injectées sans échappement dans `innerHTML`.
**Règle générale à retenir** : avec `persistentLocalCache`, **tout traitement « à la première donnée reçue » doit vérifier `snap.metadata.fromCache`** et attendre le snapshot serveur ; l'écho de ses propres écritures se reconnaît à `snap.metadata.hasPendingWrites`.
**Solution** : référence « dernier état vu » dans `budgetLC_vu`, enregistrée à la fermeture du pop-up ; comparaison uniquement sur snapshot serveur, à l'ouverture et à chaque retour au premier plan ; ses propres modifications mettent la référence à jour sans pop-up ; ancien → nouveau montant affiché ; échappement HTML. Le mois par défaut n'est plus créé sur un snapshot vide issu du cache. Détail dans `Budget/README.md` (v3.5.0).
**Vérifié** : harnais de test Node, 14 vérifications sur 8 scénarios (cache puis serveur, ajout de Lisa, ma propre modification, relance sans fermer, fermeture, premier lancement, arrière-plan puis retour, changement en direct, modification de montant). **Cause établie par lecture du code, non observée sur appareil avant correction ; correctif non testé sur iPhone.**
**Fichiers touchés** : `Budget/index.html`, `Budget/sw.js`, `Budget/README.md`

---

## 🔑 Gemini API — clés et API : état vérifié le 20/09/2026

### 20/09/2026 — Muscu (coach IA) — Ce qu'il faut savoir avant de toucher à `geminiFetch()` ou à la clé
**Contexte** : la clé du coach semblait « instable ». La vraie cause était une clé effacée de Firestore (voir l'entrée « la clé API du coach disparaissait »), pas la clé elle-même — mais les règles Google ont réellement changé cette année.
**Ce qui est établi** (docs `ai.google.dev/gemini-api/docs/api-key` et `/interactions-overview`) :
- Clés d'autorisation **`AQ.`** : créées par défaut dans AI Studio depuis le 28/05/2026, limitées par défaut à l'API Gemini, avec coupure rapide en cas de fuite détectée.
- Clés standard **`AIza`** : les non restreintes sont rejetées depuis le 19/06/2026 ; **toutes les clés standard sont rejetées à partir de septembre 2026**. Une vieille clé `AIza` qui traîne ne marchera plus.
- **`generateContent`** (utilisé par `geminiFetch()`) est classé « legacy » mais **reste entièrement supporté**. L'**Interactions API** est GA depuis juin 2026 et recommandée pour les nouveaux projets ; les nouvelles capacités (agents, tâches longues) arriveront d'abord dessus. **Aucune migration nécessaire à ce stade.**
- Google déconseille d'exposer une clé côté client et recommande un proxy serveur. **Muscu s'en écarte sciemment** : clé dans `settings/coach`, règles Firestore `request.auth != null`. Acceptable **uniquement si l'inscription libre est désactivée dans Firebase Authentication** — elle était ouverte le 20/09/2026 (n'importe qui pouvait créer un compte et lire la base). À fermer dans la console, projet par projet.
**Alternatives écartées** : secret GitHub Actions (injecté dans un HTML public → clé exposée) ; proxy Cloudflare Worker ou Cloud Function (service en plus / plan Blaze) — non retenus pour ne pas ajouter un troisième service à gérer.
**Piège de lecture** : les pages `aistudio.google.com/docs/…` sont rendues en JavaScript et arrivent **vides** à un `fetch` ; lire les équivalents sur `ai.google.dev/gemini-api/docs/…`.
**Fichiers touchés** : aucun (connaissance seulement).

---

## 📧 Budget + Muscu — la sauvegarde hebdomadaire par mail lisait l'ancienne base (20/09/2026)

### 20/09/2026 — Budget, Muscu — Mail du dimanche = données figées au 18/09
**Symptôme** : un mail de sauvegarde arrivait bien chaque dimanche, donnant l'impression que Budget était sauvegardé. Le bouton manuel « Envoyer fichier .json par mail » de Budget pointait en plus sur une adresse par défaut (`VOTRE_ADRESSE_MAIL@gmail.com`) dans le code source du script.
**Fausses pistes explorées** : le README de Budget supposait une **Cloud Function Firebase planifiée** — fausse hypothèse, cherchée dans `index.html` sans succès. Le mécanisme est un **Google Apps Script** dans le Drive de Corentin (hors dépôt), ce qui se voit dans `index.html` uniquement par l'URL `script.google.com/macros/s/…/exec` du bouton manuel.
**Cause racine** : le script (dernière modification le 09/03/2026) lisait `budgetDataLC.json` dans la Realtime Database avec un secret de base en clair dans l'URL. Depuis la migration Firestore du 18/09/2026, l'app n'écrit plus dans cette base : les mails contenaient des données périmées. Personne ne pouvait le voir sans ouvrir la pièce jointe. Muscu n'avait aucune sauvegarde automatique.
**Solution** : script réécrit. Lecture de Firestore par **compte de service** (JWT signé avec `Utilities.computeRsaSha256Signature`, clés dans les **propriétés du script** `SA_BUDGET` / `SA_MUSCU`, jamais dans le code). Budget : tableau de mois réimportable + fichier de config. Muscu : format de « Exporter toutes les données » + `coachChat`, **sans `apiKey`**. Mail « ⚠️ Échec » si une lecture échoue ou revient vide. Nom `sauvegardeHebdomadaireBudget` **conservé** pour que le déclencheur existant continue de fonctionner. `doPost` corrigé (adresse) — nécessite **Déployer → Gérer les déploiements → Nouvelle version**. Testé avant livraison : le vrai code contre le vrai Firestore (lecture seule), avec Apps Script et MailApp simulés.
**Leçon généralisable** : après une migration de base, **lister tout ce qui lit encore l'ancienne** — scripts externes, sauvegardes, automatisations hors dépôt — pas seulement le code de l'app. Une sauvegarde périmée ne se voit pas : prévoir une alerte en cas d'échec ou de résultat vide, et contrôler de temps en temps la date de la dernière donnée dans la pièce jointe. Le secret de l'ancienne Realtime Database n'est plus dans le script ; à révoquer si cette base n'est plus utile.
**Suite (20/09/2026) — bouton dans Muscu** : ajout de « ✉️ Envoyer fichier .json par mail » dans les Réglages de Muscu, même mécanisme que Budget. Le **même** script sert les deux boutons : `doPost` reconnaît l'objet `{ _app: 'muscu', … }` (Muscu) et traite un tableau comme avant (Budget). La clé API du coach est retirée du payload côté app. ⚠️ **Le script doit être mis à jour ET redéployé** (Déployer → Gérer les déploiements → Nouvelle version) : un `doPost` non redéployé garde l'ancien code, et le mail Muscu part alors quand même mais étiqueté « Budget ».
**À vérifier sur Course** : si une automatisation du même genre y existe.
**Fichiers touchés** : Google Apps Script (hors dépôt), `Budget/README.md`, `Muscu/README.md`, `PROBLEMES_RESOLUS.md`

---

## 🔑 Muscu — la clé API du coach disparaissait de `settings/coach` (20/09/2026)

### 20/09/2026 — Muscu — Clé Google à recoller régulièrement dans l'app
**Symptôme** : le coach cesse de répondre, la clé doit être recollée dans les réglages du coach. Constat en base : `settings/coach` ne contenait que le champ `threads` — ni `apiKey`, ni `model`.
**Fausses pistes explorées** : (1) stocker la clé dans un secret GitHub Actions — écarté : un secret n'est lisible que par un workflow, et l'injecter dans `index.html` la rendrait publique (dépôt + Pages publics). (2) Incriminer la migration Google `AIza` → `AQ.` — la clé `AQ.` testée répond bien (HTTP 200 sur `models`) ; la migration n'explique pas une clé absente de la base.
**Cause racine (probable, non reproduite)** : `setDoc` sans option remplace le document entier. Une écriture de `threads` (création/suppression de conversation, `repairChatThreads()`) faite avant le premier snapshot part de `coachSettings()` vide et remplace donc le document par `{ threads }` seul — effaçant `apiKey`, `model` et `body`.
**Solution** : `setDoc(…, { merge: true })` dans `saveCoachSettingsRemote()` et dans l'import JSON (`body`). Les champs absents de l'écriture sont conservés côté serveur. Cache SW passé en `muscu-shell-v5`.
**Leçon généralisable** : sur un document Firestore partagé entre plusieurs fonctionnalités, `{ merge: true }` est le réglage par défaut. Le « merge à la main » depuis un cache local ne protège pas tant que le premier snapshot n'est pas arrivé. **À vérifier sur Budget et Course** pour tout document partagé.
**Suite le même jour — les mensurations (`body`) avaient disparu aussi** : l'onglet Poids & mensurations était vide pour Corentin et Lisa. Chronologie relue avec `readTime` : `body` présent à 16:44Z, absent à 16:54Z, puis `apiKey` et `model` absents à 17:04Z — donc avant le correctif, même cause. **Récupération** : Firestore permet de lire un document dans le passé (paramètre `readTime` de l'API REST), mais seulement sur la fenêtre de rétention — ici **1 heure**, car le PITR est désactivé. Passé ce délai, plus rien à récupérer. On a relu la version de 16:44Z, sauvegardé `body` en JSON, puis réécrit **uniquement** ce champ (PATCH avec `updateMask.fieldPaths=body`) après avoir vérifié qu'il était toujours absent ; `threads`, `apiKey` et `model` n'ont pas été touchés. **Réflexe à retenir** : dès qu'une donnée disparaît de Firestore, chercher tout de suite l'ancienne version par `readTime`, avant que l'heure n'expire. **Prévention** : activer le PITR (rétention 7 jours) côté Google Cloud, et/ou faire régulièrement « Exporter toutes les données » dans Réglages, qui inclut les mensurations.
**Point de sécurité relevé au passage** : l'inscription libre Firebase Auth était ouverte alors que les règles ne font que `request.auth != null` — n'importe qui pouvait créer un compte via l'API et lire la base (clé Gemini comprise). À fermer dans la console Firebase de chaque projet.
**Fichiers touchés** : `Muscu/index.html`, `Muscu/sw.js`, `Muscu/README.md`, `PROBLEMES_RESOLUS.md`

---

## 🎨 Charte UX/UI — alignement des 4 apps (18/09/2026)

### Contexte
Muscu a été choisie comme app de référence ("Ardoise & Craie") pour standardiser typographie, couleurs, cards et menus sur les 4 apps. Charte documentée dans `/UX_UI_CHARTER.md`.

### Course — mise en conformité
**Cause racine** : app développée indépendamment, jamais alignée sur les tokens de Muscu (couleurs, radius, ombres différents), pas de mode clair, meta tags PWA incomplets, `theme-color` obsolète.
**Solution** : variables CSS renommées vers la nomenclature commune (`--card`, `--text`, `--border`, `--r-*`), couleurs Corentin/Lisa alignées sur les hex exacts de Muscu, ajout mode clair + bouton toggle, meta tags PWA complétés, tokens sémantiques (`--done`/`--danger`/`--gold`) ajoutés.
**Fichiers touchés** : `Course/index.html`, `Course/README.md`

### Muscu — backport de bonnes pratiques trouvées sur Course
**Cause racine** : lors de l'audit de Course, deux points où Course faisait *mieux* que Muscu ont été identifiés : `env(safe-area-inset-top)` (Muscu n'avait que le bottom), et `overscroll-behavior:none` (absent de Muscu).
**Solution** : ajout de `env(safe-area-inset-top, 0px)` sur `.theme-toggle`/`.sync-badge`, ajout de `overscroll-behavior:none` sur `html,body`.
**Fichiers touchés** : `Muscu/index.html`, `Muscu/README.md`

### Portail — mise en conformité
**Cause racine** : `status-bar-style` en `black` (pas `black-translucent`), aucun mode clair, tokens radius/shadow incomplets (pas utilisés mais absents pour cohérence future).
**Solution** : alignement `status-bar-style`, ajout mode clair + toggle, complément des tokens manquants (`--r-xs`, `--r-xl`, `--shadow-lg`, `--t-fast`/`--t-mid`).
**Fichiers touchés** : `index.html` (racine), `README.md` (racine)

### Budget — gros chantier : suppression de 10 thèmes décoratifs
**Symptôme** : Budget avait 11 thèmes sélectionnables ("Garde-robe" : défaut bleu + purple/green/rose/glass/latte/botanic/gatsby/terracotta/moleskine/watercolor), thème **clair par défaut** (à l'inverse des 3 autres apps sombres par défaut), et aucune notion de profil Corentin/Lisa.
**Décision validée par Corentin** : supprimer les 10 thèmes décoratifs, passer en sombre par défaut, ajouter un sélecteur de profil Corentin/Lisa (purement cosmétique — le compte reste unique et partagé).
**Cause racine du bug additionnel trouvé pendant l'audit** : `<body class="theme-glass">` codé en dur dans le HTML statique, indépendamment du système de classes géré par le JS.
**Solution** : suppression complète du tableau `THEMES`, de `applyTheme()`, du rendu du picker, de la section admin "Garde-robe" et de tout le CSS des 10 skins. Logique de dark-mode inversée (`!== 'false'` au lieu de `=== 'true'`) en préservant les choix déjà enregistrés. Accent unique aligné charte (`#1f8fff`). Ajout du sélecteur de profil (`body.profil-lisa`, boutons Corentin/Lisa dans une nouvelle section "👤 Profil").
**Fichiers touchés** : `Budget/index.html`, `Budget/manifest.json`, `Budget/README.md`

---

## 🐛 Course — saga du flou de la barre de statut + bloc vide en bas (18-19/09/2026)

**Le morceau le plus long et le plus instructif de tout le chantier. Lire en entier avant de retoucher à `viewport`, `safe-area`, ou `height` sur n'importe quelle app.**

### Symptôme initial
Un effet de flou/voile visible en haut de l'écran (derrière l'heure et les icônes système), visible uniquement en mode app (jamais en Safari classique).

### Fausses pistes explorées (dans l'ordre, aucune n'a suffi seule)
1. `apple-mobile-web-app-status-bar-style` : `black-translucent` → `black`. **Aucun effet.**
2. Retrait de `viewport-fit=cover` du meta viewport seul. **Aucun effet sur le flou**, et a **cassé la barre du bas** : `env(safe-area-inset-bottom)` dépend de `viewport-fit=cover` pour renvoyer une vraie valeur, mais le body gardait `height:100dvh` qui force le plein écran physique *indépendamment* de `viewport-fit=cover` — résultat : barre d'onglets sans protection, tapée dans la zone de geste du home indicator, déclenchant Siri par erreur.
3. Reviens en arrière (restauration de `viewport-fit=cover`), puis retrait combiné de `viewport-fit=cover` **et** de `height:100dvh` (garder `height:100vh` seul). **N'a pas non plus fait disparaître le flou** sur l'appareil réel.
4. Marge tampon manuelle de 16px (haut) / 8px (bas) ajoutée en plus de la vraie `env(safe-area-inset-*)`, en restaurant `viewport-fit=cover` + `height:100dvh`. Contournement pragmatique qui a fonctionné visuellement, mais qui masquait le vrai problème sans le résoudre.

### Cause racine n°1 (le flou) : cache du Service Worker jamais invalidé
`sw.js` sert `index.html` en cache-first, sans jamais revérifier le réseau tant que le fichier `sw.js` **lui-même** n'a pas changé d'octets (le navigateur ne détecte une mise à jour de Service Worker qu'en comparant le fichier `sw.js`, jamais le contenu qu'il sert). Modifier `index.html` cent fois sans jamais toucher `sw.js` = zéro mise à jour visible, indéfiniment.
**Solution** : incrémenter `CACHE_NAME` dans `sw.js` à chaque modification du shell (`index.html`, `manifest.json`). **Confirmé en pratique** : après un reset complet (suppression icône + vidage données Safari + réinstallation + bump cache), le flou du haut a disparu.

### Cause racine n°2 (le bloc vide en bas, persistant même après le fix du cache) : bug WebKit `height:100dvh`
En PWA standalone iOS, `height:100%`/`100vh`/`100dvh` **soustraient à tort l'inset de sécurité du HAUT** de la hauteur totale calculée — bug WebKit confirmé par plusieurs sources indépendantes (voir `/GUIDE_PWA_IOS.md`). Résultat : un bandeau vide (couleur différente du reste) apparaît **en BAS** de l'écran, sous la barre d'onglets, alors que le bug est mathématiquement causé par le calcul du HAUT.
**Solution qui marche** : ancrer le conteneur racine de l'app directement sur le vrai viewport, indépendamment de toute la chaîne `html/body/height`:
```css
#app{ position:fixed; inset:0; display:flex; flex-direction:column; }
body{ overflow:hidden; }
```
`position:fixed;inset:0` s'aligne toujours sur le vrai viewport visuel, sans dépendre du calcul buggé de `dvh`.

### Ajustement final
Une fois les deux vraies causes corrigées, la marge tampon manuelle (16px/8px) est devenue redondante — retirée du bas (`--safe-bottom` repassé à `env(safe-area-inset-bottom)` pur), gardée à +16px en haut par choix esthétique (pas de bug à cet endroit, juste une préférence visuelle).

### Piste complémentaire (non confirmée mais plausible) : "iOS 26's edge treatment"
Un projet open-source dédié aux quirks iOS PWA (BuiltByTed/Homeframe) documente un comportement nommé *"iOS 26's edge treatment"* : un flou/assombrissement natif au-dessus du header d'une web app standalone, qui persiste sauf si le header est un élément **persistant** ne se redémontant jamais pendant une navigation interne. Corrèle avec l'observation initiale : le flou revenait plus facilement en arrivant **via navigation depuis le Portail** (`window.location.href`, rechargement complet de document) qu'en ouvrant l'icône Course directement. Nos 4 apps ont déjà le header en HTML statique (jamais injecté en JS après coup), ce qui limite déjà ce risque.

**Fichiers touchés** : `Course/index.html`, `Course/sw.js`, `Course/README.md`

---

## 🔔 Système de notification de mise à jour du Service Worker (19/09/2026)

**Symptôme structurel (généralisation de la cause racine n°1 ci-dessus)** : sur les 4 apps, `sw.js` fait déjà `skipWaiting()` + `clients.claim()` automatiquement, mais rien n'informait jamais l'utilisateur qu'une mise à jour avait été installée et qu'un rechargement était nécessaire pour la voir apparaître.

**Solution appliquée identiquement sur les 4 apps** : un bandeau discret "🔄 Nouvelle version disponible" (bas d'écran, conscient de la safe-area) apparaît dès que le Service Worker détecte et installe une mise à jour en tâche de fond (écoute de `updatefound` + `statechange` sur le worker en cours d'installation, et de `reg.waiting` au chargement). Le rechargement n'est **volontairement pas automatique** (pas d'écoute de `controllerchange` pour forcer un reload) — l'utilisateur clique sur "Actualiser" quand il veut, pour ne jamais couper une saisie en cours (pertinent sur Budget en particulier).

Ajout complémentaire : `<meta name="mobile-web-app-capable" content="yes">` à côté de `apple-mobile-web-app-capable` (jamais retiré ce dernier — iOS Safari ne lit que l'orthographe Apple ; le tag standard fait juste taire l'avertissement de dépréciation de Chrome DevTools).

**Fichiers touchés** : `index.html` × 4 (Portail/Muscu/Budget/Course), `README.md` × 4

---

## 🏷️ Horodatage de dernier déploiement — `DERNIERE_MAJ` (19/09/2026)

**But** : afficher dans l'app la date/heure du dernier déploiement de **code** (pas des données), pour savoir en un coup d'œil si on a la dernière version — complément direct du bandeau de mise à jour ci-dessus.

**Implémentation** : une constante `DERNIERE_MAJ = 'YYYY-MM-DDTHH:MM:SS+02:00'` (format ISO) en tête de script sur chaque app, affichée formatée en français ("19/09/2026 à 23h27"). Emplacements d'affichage : onglet Réglages pour Muscu/Course/Budget, bas de page pour Portail.

**⚠️ Règle (modifiée le 20/09/2026 : désormais automatisée par le workflow `auto-version.yml`, voir l'entrée du 20/09 plus haut)** : cette constante est mise à jour à chaque commit qui modifie `index.html` de l'app concernée — le robot s'en charge (recherchable via `grep -n "DERNIERE_MAJ ="`). Une constante non mise à jour devient trompeuse (affiche une ancienne date alors que du code plus récent est en ligne) et, depuis le 20/09/2026, fausse la détection de nouvelle version.

**Fichiers touchés** : `index.html` × 4

---

## 🐛 Budget — le toast « Annuler » n'apparaissait jamais : `</main>` manquant (20/09/2026)

**Symptôme** : après suppression d'une ligne dans Budget, le bandeau « Ligne supprimée — Annuler » ne s'affichait pas (fonction d'annulation décrite au README v3.0.0, mais inutilisable en pratique).
**Fausses pistes explorées** : aucune — repéré en lisant le DOM lors de l'ajout de la barre flottante ; le JS d'affichage (`classList.add('show')`) et le CSS (`#toast.show`) étaient corrects.
**Cause racine** : `<main class="main-content">` sans `</main>`. L'analyseur HTML laisse alors tout ce qui suit *dans* `<main>` : `<div id="toast">` devenait un enfant direct de `main`. `changerVue()` masque tous les `main > div` dont l'id ≠ `vue-…` avec la classe `.hidden` (`display:none !important`) → le toast était masqué en permanence, quel que soit `.show`.
**Solution** : ajout de `</main>` avant `<div id="toast">` (+ `white-space:nowrap` sur le toast). Vérifié par un test avant/après : parent `MAIN` + `display:none` → parent `BODY` + `display:flex`.
**Leçon généralisable** : un élément « global » (toast, barre, popup) ne doit jamais se trouver sous un conteneur dont le JS masque/affiche les enfants par sélecteur (`main > div`). Et une balise structurante non refermée ne fait aucune erreur visible : à chaque ajout de bloc HTML, vérifier l'arbre DOM (parent réel de l'élément), pas seulement l'indentation. **Symptôme type à rechercher** : un élément correctement stylé et correctement déclenché en JS qui « ne s'affiche jamais » → regarder son parent réel et les règles `.hidden` appliquées par sélecteur.
**Fichiers touchés** : `Budget/index.html`, `Budget/sw.js` (cache v5→v6), `Budget/README.md`

---

## 🎨 Budget — barre d'onglets flottante + `viewport-fit=cover` + `</main>` manquant (20/09/2026)

**Besoin** : appliquer à Budget le design de barre d'onglets flottante « pilule » de Course.
**Particularités rencontrées** (Budget n'est pas structuré comme Course — pas de `#app` en `position:fixed;inset:0`, onglets **en haut** dans une `top-nav` sticky, mise en page desktop avec sidebar) :
- Budget n'avait **pas `viewport-fit=cover`** : sans lui, `env(safe-area-inset-bottom)` vaut 0 et la position de la barre ne serait pas comparable à Course. Ajouté, avec `padding-top: calc(15px + env(safe-area-inset-top))` sur `.top-nav` pour compenser. Budget n'a pas le bug `100dvh` (document qui défile, `min-height:100vh`, pas de conteneur à hauteur verrouillée), donc pas besoin d'ancrer un `#app`.
- Le JS de navigation s'accroche sur `.tab-buttons` (délégation de clic) : **conserver le nom de classe** en déplaçant le bloc évite de toucher au JS.
- Un `position:fixed` en bas oblige à revoir **tous les éléments qui se posaient en bas** : `padding-bottom` de `.main-content`, toast d'annulation, toast « Nouvelle version » (sinon ils recouvrent la barre).
- ✅ **Piège structurel découvert puis corrigé (voir l'entrée du 20/09/2026 ci-dessous, « Budget — bouton Annuler jamais visible »)** : `<main>` n'était jamais refermé, donc `<div id="toast">` et le `<script>` sont dans `<main>`, et `changerVue()` (`document.querySelectorAll('main > div')` + `.hidden`) masque aussi `#toast`. Le bouton « Annuler » après suppression d'une ligne est très probablement invisible. **Leçon** : toute balise structurante doit être refermée ; ajouter un élément « global » (barre, toast) *dans* `<main>` le soumettrait à ce masquage — placer les éléments globaux avant `<main>` ou hors du parent.
**Fichiers touchés** : `Budget/index.html`, `Budget/sw.js` (cache v4→v5), `Budget/README.md`, `UX_UI_CHARTER.md`

---

## 🐛 Course — horodatage absent + Service Worker jamais enregistré (20/09/2026)

**Symptôme** : dans Réglages de Course, la ligne « Dernière mise à jour du code » n'apparaissait pas (alors que Portail, Budget et Muscu l'affichaient).
**Fausses pistes explorées** : aucune — cache et constante `DERNIERE_MAJ` étaient corrects ; un `grep` du HTML a suffi.
**Cause racine** : le JS `document.getElementById('derniere-maj').textContent = …` existait, mais l'élément HTML `id="derniere-maj"` n'a **jamais été ajouté** à Course (commit du 19/09). `getElementById` renvoie `null`, la ligne lève un `TypeError` au niveau racine du script et **stoppe toute la suite du `<script>`** — ici l'enregistrement du Service Worker et le bandeau « Nouvelle version disponible », placés juste après. Une erreur silencieuse (pas d'écran d'erreur en PWA) qui cassait bien plus que l'affichage de la date.
**Solution** : ajout de l'élément dans Réglages, et **garde systématique** sur toute écriture dans le DOM en fin de script : `const el = document.getElementById(...); if (el) el.textContent = ...`.
**Leçon généralisable** : ne jamais écrire `getElementById(...).xxx = ...` sur un élément non garanti, surtout dans un script où du code critique (Service Worker) suit. Après avoir ajouté du JS qui référence un id, **vérifier par `grep` que l'id existe dans le HTML**.
**Vérifié** : Portail, Budget et Muscu ne sont pas concernés (élément présent, ou id différent et déjà gardé par `if`).
**Fichiers touchés** : `Course/index.html`, `Course/sw.js` (cache v7→v8), `Course/README.md`

---

## 🎯 Petites fonctionnalités (19/09/2026)

### 20/09/2026 — Course — barre d'onglets flottante « pilule » + bouton rond
**Besoin** : remplacer la tabbar pleine largeur collée en bas par une barre flottante arrondie (style d'une app e-commerce vue par Corentin), avec un bouton d'action rond à côté.
**Pièges évités / leçons généralisables** :
- Une barre flottante n'est plus un enfant flex de `#app` : elle passe en `position:absolute` (dans un parent déjà `position:fixed;inset:0`, donc sans risque `dvh`). Conséquence : **tous les `padding-bottom` du contenu scrollable doivent être recalculés** avec la hauteur réelle de la barre + `env(safe-area-inset-bottom)`, sinon le dernier élément est masqué. Ici, une seule variable (`--tabbar-height`) alimente déjà `.liste`, `.params`, « Course terminée » : changer la variable suffit à tout répercuter.
- Un conteneur transparent qui couvre la largeur de l'écran **bloque le scroll et les taps** de la liste dessous : mettre `pointer-events:none` sur le conteneur et `pointer-events:auto` uniquement sur les éléments interactifs.
- Un bouton `position:fixed` rangé dans une `<section>` masquée (`display:none`) disparaît avec elle — c'est ainsi que l'ancien FAB se cachait hors de l'onglet Liste. Déplacé dans la barre, cette visibilité implicite disparaît : elle est reproduite explicitement via un attribut `data-onglet` sur `#app` + une règle CSS `#app:not([data-onglet="liste"]) …`.
- `backdrop-filter` n'a d'effet visible que si du contenu passe réellement *derrière* la barre : c'est le cas seulement parce qu'elle flotte au-dessus du contenu, pas parce qu'elle occupe sa propre ligne flex.
**Fichiers touchés** : `Course/index.html`, `Course/sw.js` (cache v5→v6), `Course/README.md`

### Course — bouton "Course terminée" masqué si aucune sélection
**Avant** : le bouton restait affiché en permanence, semi-transparent (`opacity:0.35` via `:disabled`) quand aucun produit n'était coché — jugé peu lisible.
**Solution** : `display:none` par défaut, classe `.visible` ajoutée dès qu'au moins un produit est coché (recalculé dans `renderCourse()` à chaque rendu, seule source de vérité).
**Bug latent corrigé au passage** : `toggleAchete()` remettait inconditionnellement le bouton "actif" à chaque clic, y compris en décochant le dernier produit coché (où il aurait dû redevenir masqué). Corrigé en supprimant cette mise à jour optimiste incorrecte — le listener temps réel Firestore (`onSnapshot` sur `produits`) déclenche déjà un re-rendu correct à chaque écriture.

### Budget — onglet "Admin" renommé "Réglages"
Changement du libellé visible uniquement. `data-view="admin"`, `#vue-admin`, et la fonction `rendreAdmin()` sont restés inchangés volontairement, pour ne prendre aucun risque sur la logique existante pour un simple renommage cosmétique.

---

## 📚 Documents de référence créés ce jour-là

- `/UX_UI_CHARTER.md` — design system standardisé (couleurs, typo, cards, radius), Muscu comme référence
- `/GUIDE_PWA_IOS.md` — guide complet PWA iOS, vérifié et complété par recherche web (bugs WebKit `100dvh`, comportement iOS 26/27, cycle de vie Service Worker, storage, etc.)
- `/FUTURE_APPS_ROADMAP.md` — roadmap des futures apps de l'écosystème (Agenda, Recettes, Goals, Défis, Trip Planner, Memories, Habits)
- `/PROBLEMES_RESOLUS.md` — ce document

---

**Dernière mise à jour de ce fichier** : 22 septembre 2026
