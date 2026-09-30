/* app.js — code de l'app.
   Extrait des anciens <script> inline de index.html le 20/09/2026 (contenu inchangé,
   sauf la constante DERNIERE_MAJ, qui reste dans index.html : voir README). */
  /* ============================================================
     PROFIL / ACCENT (charte UX/UI §1, 24/09/2026)
     PROFIL COMMUN AUX 4 APPS depuis le 28/09/2026 : une seule clé, localStorage
     duo_profile ('corentin' | 'lisa', même origine), réglée dans Muscu, Course ou Budget.
     Le Portail n'a pas de sélecteur : il la lit (accent bleu/rose via html[data-profil],
     et « la prochaine séance »). Relue au retour sur le Portail (pageshow depuis le cache
     précédent/suivant) : le profil a pu changer dans l'app qu'on vient de quitter.
     ============================================================ */
  (function(){
    function appliquer(){
      let p = 'corentin';
      try { if (localStorage.getItem('duo_profile') === 'lisa') p = 'lisa'; } catch (e) {}
      document.documentElement.setAttribute('data-profil', p);
    }
    appliquer();
    window.addEventListener('pageshow', (e) => { if (e.persisted) appliquer(); });
  })();

  /* ============================================================
     STYLE DES APPS : VERRE · RELIEF · ARGILE (30/09/2026)
     Sélecteur #style-choix (index.html). Le choix est appliqué et mémorisé par commun.js
     (window.duoStyle, clé localStorage duo-style, même origine → les 4 apps suivent).
     Resynchronisé au retour sur le Portail (pageshow depuis le cache précédent/suivant).
     ============================================================ */
  (function(){
    const groupe = document.getElementById('style-choix');
    if (!groupe || !window.duoStyle) return;
    function marquer(){
      const actuel = window.duoStyle.lire();
      groupe.querySelectorAll('[data-style-choix]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.styleChoix === actuel)));
    }
    groupe.addEventListener('click', (e) => {
      const b = e.target.closest('[data-style-choix]');
      if (!b) return;
      window.duoStyle.choisir(b.dataset.styleChoix);
      marquer();
    });
    marquer();
    window.addEventListener('pageshow', (e) => { if (e.persisted) marquer(); });
  })();

  /* ============================================================
     BOÎTE DE DIALOGUE (bottom-sheet, charte §5.9) — remplace window.confirm()
     dialogue({ titre, texte, ok, annuler }) → Promise<boolean>. Tap sur le fond = annuler.
     Classe .modal-overlay : la mise à jour auto au retour (utilisateurOccupe) la voit
     comme une fenêtre ouverte et n'interrompt rien.
     ============================================================ */
  function dialogue({ titre = '', texte = '', ok = 'OK', annuler = 'Annuler' } = {}){
    return new Promise((resolve) => {
      const fond = document.getElementById('dialogue');
      const bOk = document.getElementById('dialogue-ok');
      const bAnnuler = document.getElementById('dialogue-annuler');
      document.getElementById('dialogue-titre').textContent = titre;
      document.getElementById('dialogue-texte').textContent = texte;
      bOk.textContent = ok; bAnnuler.textContent = annuler;
      const fermer = (res) => { fond.classList.remove('open'); bOk.onclick = bAnnuler.onclick = fond.onclick = null; resolve(res); };
      bOk.onclick = () => fermer(true);
      bAnnuler.onclick = () => fermer(false);
      fond.onclick = (e) => { if (e.target === fond) fermer(false); };
      fond.classList.add('open');
    });
  }

  /* THÈME : sombre uniquement depuis le 28/09/2026 (décision de Corentin, valable pour les 4 apps) —
     bouton lune/soleil et mode clair retirés. Nettoyage de l'ancien réglage. */
  try { localStorage.removeItem('portail-theme'); } catch (e) {}

  /* ============================================================
     TABLEAU DE BORD (22/09/2026)
     Chaque carte est un simple lien vers son app. Les chiffres viennent de
     `portail/muscu`, `portail/budget` et `portail/courses`, écrits par les 3 apps dans la
     base commune (course-app-36e9d). Depuis le 29/09/2026 : lecture et écriture réservées au
     compte e-mail du duo (plus de connexion anonyme). Voir README.
     - Affichage instantané depuis le dernier état connu (localStorage), puis mise à jour en
       direct : le Portail reste utilisable hors ligne et ne dépend jamais du SDK pour s'ouvrir.
     - ⚠️ Ces documents restent traités comme NON fiables (défense en profondeur ; jusqu'au
       29/09/2026 la base acceptait n'importe quelle connexion anonyme) : tout est validé (types,
       bornes, longueurs) et écrit avec textContent — jamais innerHTML. Ce Portail partage son
       origine avec les 3 apps.
     ============================================================ */
  (function(){
    const CONFIG_BASE_PORTAIL = {
      apiKey: "AIzaSyCc12HZotF_AmmPHvSr0eXBYWOLSnBOONw",
      authDomain: "course-app-36e9d.firebaseapp.com",
      projectId: "course-app-36e9d",
      storageBucket: "course-app-36e9d.firebasestorage.app",
      messagingSenderId: "55041357024",
      appId: "1:55041357024:web:48ee2d71b97dc15c55cc85"
    };
    /* ⚠️ Même version que FIREBASE_FILES dans sw.js (mise en cache pour le hors-ligne). */
    const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
    const CLE_CACHE = 'portail-resume';
    const NOMS_MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const el = (id) => document.getElementById(id);
    let resume = {};
    let authPortail = null; // session du duo, gardée pour la relecture REST (sonder)
    /* 29/09/2026 : `portail/*` est réservé au compte e-mail du duo (firestore.rules). Une session
       anonyme (anciennes versions) ne compte pas. */
    const connecte = () => !!(authPortail && authPortail.currentUser && !authPortail.currentUser.isAnonymous);
    let db = null; // hissé hors de demarrerBase() pour que rafraichirDepuisServeur() (retour au premier plan) puisse s'en servir

    /* ---- validation : rien de ce qui vient de la base n'est utilisé tel quel ---- */
    /* Pastille de connexion à côté du titre (28/09/2026, voir verre.css) : or au démarrage,
       vert dès qu'une lecture de la base a réussi, rouge hors ligne ou si la lecture échoue. */
    const statut = (etat) => { document.documentElement.dataset.sync = navigator.onLine ? etat : 'hors-ligne'; };
    statut('envoi');
    window.addEventListener('offline', () => statut('hors-ligne'));
    window.addEventListener('online', () => statut('envoi'));
    const nombre = (x, min, max) => (typeof x === 'number' && isFinite(x) && x >= min && x <= max) ? x : null;
    const entier = (x, min, max) => { const n = nombre(x, min, max); return n === null ? null : Math.round(n); };
    const texte = (x, max) => (typeof x === 'string') ? x.slice(0, max) : '';
    const eur2 = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';  /* au centime près (22/09/26) : eur0 arrondissait à l'euro */

    function depuis(ms){
      const m = Math.floor(Math.max(0, Date.now() - ms) / 60000);
      if (m < 1) return "à l'instant";
      if (m < 60) return 'il y a ' + m + ' min';
      const h = Math.floor(m / 60);
      if (h < 24) return 'il y a ' + h + ' h';
      return 'il y a ' + Math.floor(h / 24) + ' j';
    }
    /* En-tête de carte : fraîcheur des chiffres. Plus de 24 h : affichée en couleur d'alerte. */
    function pied(id, d){
      const maj = nombre(d && d.maj, 1e12, 4e12);
      const n = el(id);
      n.textContent = maj ? 'Mis à jour ' + depuis(maj) : "Ouvre l'app une fois pour remplir cette carte";
      n.classList.toggle('vieux', !!maj && Date.now() - maj > 86400000);
    }
    /* Profil actif de Muscu (même origine que le Portail) : sert à choisir « la prochaine séance ». */
    function profilActif(){
      try { return localStorage.getItem('duo_profile') === 'lisa' ? 'lisa' : 'corentin'; } catch (e) { return 'corentin'; }
    }

    function afficherMuscu(d){
      const p = profilActif();
      el('mu-next-label').textContent = 'Prochaine séance de ' + (p === 'lisa' ? 'Lisa' : 'Corentin');
      const pr = d && d.prochaine && d.prochaine[p];
      if (pr && typeof pr === 'object') {
        const titre = texte(pr.title, 70), label = texte(pr.label, 30), nb = entier(pr.nbExos, 0, 99);
        el('mu-next').textContent = (label && titre) ? label + ' · ' + titre : (titre || label || '—');
        el('mu-peek').textContent = label || titre;          /* mode Verre : aperçu sur l'arête de la vitre */
        const morceaux = [];
        if (nb !== null) morceaux.push(nb + ' exercice' + (nb > 1 ? 's' : ''));
        if (pr.cardio === true) morceaux.push('cardio');
        el('mu-next-sub').textContent = morceaux.join(' + ');
      } else {
        el('mu-next').textContent = '—';
        el('mu-peek').textContent = '';
        el('mu-next-sub').textContent = '';
      }
      /* Phrase motivante du duo (22/09/26) : remplace le compte « X/4 séances », pas représentatif
         d'un rythme qui n'est pas toujours le même d'une semaine à l'autre. Calculée par Muscu à
         partir des vraies archives (dernière séance de chacun, série, semaine en cours) ; voir
         calculerPhraseMuscu dans Muscu/app.js. Une phrase par défaut tant qu'aucune donnée n'est arrivée. */
      el('mu-phrase').textContent = texte(d && d.phrase, 140) || 'Une nouvelle semaine à deux, à vous de la rendre belle !';
      pied('mu-maj', d);
    }

    function afficherBudget(d){
      const reste = nombre(d && d.reste, -1e7, 1e7);
      const budget = nombre(d && d.budget, -1e7, 1e7);
      const depense = nombre(d && d.depense, -1e7, 1e7);
      const mois = texte(d && d.mois, 30);
      const nomMois = mois ? mois.split(' ')[0].toLowerCase() : '';
      const big = el('bu-big'), fill = el('bu-fill');
      el('bu-label').textContent = nomMois ? 'Reste à vivre en ' + nomMois : 'Reste à vivre';
      if (reste === null) {
        el('bu-int').textContent = '—';
        el('bu-dec').textContent = '';
        big.classList.remove('neg');
        fill.style.transform = 'translateX(-100%)'; fill.classList.remove('over');
        el('bu-days').textContent = d ? "Ce mois n'est pas encore démarré dans Budget" : '';
        el('bu-peek').textContent = '';
        el('bu-spent').textContent = '';
      } else {
        const neg = reste < 0;
        el('bu-int').textContent = (neg ? '−' : '') + Math.abs(reste).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        el('bu-dec').textContent = '€';
        el('bu-peek').textContent = (neg ? '−' : '') + Math.round(Math.abs(reste)).toLocaleString('fr-FR') + ' €';
        big.classList.toggle('neg', neg);
        const pct = (budget !== null && budget > 0 && depense !== null) ? Math.min(100, Math.max(0, depense / budget * 100)) : (neg ? 100 : 0);
        fill.style.transform = 'translateX(' + (pct - 100).toFixed(1) + '%)'; // translateX (GPU) au lieu de width — charte §11.3
        fill.classList.toggle('over', neg);
        /* Jours restants recalculés ici (le document date de la dernière ouverture de Budget) si c'est bien le mois en cours. */
        const now = new Date();
        const courant = NOMS_MOIS[now.getMonth()] + ' ' + now.getFullYear();
        let phrase = '';
        if (mois === courant) {
          const jours = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
          phrase = jours === 0 ? 'Dernier jour du mois' : jours + (jours > 1 ? ' jours restants' : ' jour restant');
          if (!neg && jours > 0 && reste / jours >= 1) phrase += ' · environ ' + Math.round(reste / jours) + ' € par jour';
        } else if (mois) {
          phrase = "Chiffres d'un mois passé : ouvre Budget pour actualiser";
        }
        el('bu-days').textContent = (neg ? 'Budget dépassé' + (phrase ? ' · ' : '') : '') + phrase;
        el('bu-spent').textContent = (depense !== null && budget !== null)
          ? eur2(depense) + ' dépensés sur ' + eur2(budget) + ' (' + Math.round(pct) + ' %)' : '';
      }
      pied('bu-maj', d);
    }

    function afficherCourses(d){
      const n = entier(d && d.restants, 0, 9999);
      const chips = el('co-chips');
      chips.textContent = '';
      el('co-chips-label').hidden = true;
      if (n === null) {
        el('co-int').textContent = '—';
        el('co-label').textContent = '';
        el('co-peek').textContent = '';
      } else {
        el('co-int').textContent = String(n);
        el('co-peek').textContent = String(n);
        el('co-label').textContent = n === 0 ? 'rien à acheter' : (n > 1 ? 'produits' : 'produit');
        (Array.isArray(d.rayons) ? d.rayons.slice(0, 3) : []).forEach((r) => {
          const nom = texte(r && r.nom, 26), k = entier(r && r.n, 0, 9999);
          if (!nom || k === null) return;
          const chip = document.createElement('span');
          chip.className = 'chip';
          const t = document.createElement('span'); t.textContent = nom;
          const c = document.createElement('span'); c.className = 'chip-n'; c.textContent = String(k);
          chip.appendChild(t); chip.appendChild(c);
          chips.appendChild(chip);
        });
        el('co-chips-label').hidden = chips.children.length === 0;
      }
      pied('co-maj', d);
    }

    function afficher(){
      const j = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      el('dash-date').textContent = j.charAt(0).toUpperCase() + j.slice(1);
      afficherMuscu(resume.muscu);
      afficherBudget(resume.budget);
      afficherCourses(resume.courses);
    }

    /* ---- Firebase : chargé APRÈS le premier affichage, jamais bloquant ---- */
    function chargerScript(src){
      return new Promise((ok, ko) => {
        const s = document.createElement('script');
        s.src = src; s.onload = ok; s.onerror = () => ko(new Error('chargement impossible : ' + src));
        document.head.appendChild(s);
      });
    }
    async function demarrerBase(){
      try {
        await chargerScript(SDK + 'firebase-app-compat.js');
        await Promise.all([chargerScript(SDK + 'firebase-auth-compat.js'), chargerScript(SDK + 'firebase-firestore-compat.js')]);
        /* 29/09/2026 : application Firebase PAR DÉFAUT (avant : 2e application 'portail' en connexion
           anonyme) → même session e-mail que Course, Budget et Muscu sur la même installation : se
           connecter dans l'une connecte les autres. Pas de cache Firestore persistant : il serait
           partagé avec celui des apps (versions du SDK différentes) ; le dernier état connu reste
           affiché depuis localStorage (CLE_CACHE). */
        const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(CONFIG_BASE_PORTAIL);
        const auth = app.auth();
        authPortail = auth;
        db = app.firestore();
        const afficherConnexion = connexionDuo(auth);
        auth.onAuthStateChanged((user) => {
          const compte = !!(user && !user.isAnonymous);
          afficherConnexion(!compte);
          if (compte) { ecouter(); sonder(); } else arreterEcoute();
          notifSession(compte);                             /* NOTIFICATIONS : abonnement de ce téléphone */
        });
      } catch (err) {
        console.warn('[portail] base indisponible, affichage du dernier état connu :', err);
      }
    }

    /* Relecture forcée depuis le SERVEUR (jamais le cache local) au retour au premier plan.
       Sur iPhone, une PWA mise en arrière-plan est suspendue par iOS : l'écoute en direct
       (onSnapshot) peut rester silencieuse un moment au retour, sans se reconnecter tout de
       suite — le Portail affichait alors de vieilles données malgré une connexion internet
       fonctionnelle (retour de Corentin, 22/09/2026 : obligé de forcer un rechargement manuel
       sur le téléphone de Lisa). Ce filet de sécurité force une lecture serveur à chaque retour
       visible, indépendamment de l'état de l'écoute en direct. */
    /* Renvoie true si la lecture serveur a réussi. */
    async function rafraichirDepuisServeur(){
      if (!db || !connecte()) return false; // Firestore pas prêt (ou pas connecté) : le prochain onSnapshot fera foi
      try {
        const snap = await db.collection('portail').get({ source: 'server' });
        const obj = {};
        snap.forEach((doc) => { obj[doc.id] = doc.data(); });
        resume = obj;
        try { localStorage.setItem(CLE_CACHE, JSON.stringify(obj)); } catch (e) {}
        afficher();
        return true;
      } catch (err) {
        console.warn('[portail] relecture au retour au premier plan impossible :', err);
        return false;
      }
    }

    /* Écoute en direct de `portail/*`. Peut être relancée (retour au Portail) : l'ancienne
       écoute est d'abord coupée, pour n'en avoir jamais deux en parallèle. */
    let desabonner = null;
    function arreterEcoute(){
      if (desabonner) { try { desabonner(); } catch (e) {} desabonner = null; }
    }
    function ecouter(){
      if (!db || !connecte()) return;
      arreterEcoute();
      desabonner = db.collection('portail').onSnapshot((snap) => {
        if (!snap.metadata.fromCache) statut('ok');
        const obj = {};
        snap.forEach((doc) => { obj[doc.id] = doc.data(); });
        resume = obj;
        try { localStorage.setItem(CLE_CACHE, JSON.stringify(obj)); } catch (e) {}
        afficher();
      }, (err) => console.warn('[portail] lecture impossible :', err));
    }

    /* 23/09/2026 — Retour au Portail depuis une app (geste « retour » d'iOS).
       Les apps n'ont pas de lien vers le Portail : on y revient par l'historique, et Safari
       ressort alors la page du Portail telle quelle de son cache « précédent/suivant »
       (bfcache) — sans la recharger, souvent SANS `visibilitychange`, et avec une écoute
       Firestore dont la connexion a été coupée pendant la mise en pause. Seul `pageshow`
       (persisted = true) signale ce retour de façon fiable. De plus, l'app quittée publie
       son résumé AU MOMENT où on la quitte (flush `pagehide`) : l'écriture arrive sur le
       serveur une à deux secondes APRÈS le retour au Portail — une lecture immédiate
       arriverait trop tôt. D'où : réabonnement + relecture immédiate + 2 relectures
       différées (3 s et 8 s). Coût : ~3 lectures de 3 documents par retour, négligeable. */
    /* 24/09/2026 — RELECTURE SILENCIEUSE TOUTES LES 3 s tant que le Portail est à l'écran.
       Demande de Corentin : que « Mis à jour à l'instant » apparaisse à coup sûr au retour
       d'une app, sans avoir à recharger. Ce n'est PAS un rechargement de page (pas de
       clignotement, pas de retour en haut, pas de retéléchargement de Firebase) : juste une
       lecture serveur des 3 petits documents `portail/*`, puis réaffichage si besoin.
       - S'arrête dès que le Portail est caché (autre app, écran verrouillé) : rien en fond.
       - Jamais deux lectures en même temps (réseau lent).
       - Coût : 3 lectures Firestore toutes les 3 s d'écran allumé sur le Portail, soit
         60/min ; quelques minutes par jour restent très loin du quota gratuit (50 000/jour,
         partagé avec l'app Courses).
       Remplace les relectures différées à 3 s et 8 s du 23/09. L'écoute en direct
       (`ecouter()`) est conservée : elle reste la voie la plus rapide quand elle marche. */
    const SONDAGE_MS = 3000;
    let sondage = null, lectureEnCours = false;
    /* Lecture par l'API REST de Firestore (simple requête HTTP), et non par le SDK : le SDK
       fait passer ses lectures par le MÊME canal que l'écoute en direct ; si ce canal est
       coincé après une mise en pause par iOS, relire via le SDK échoue aussi (vérifié en
       test). La requête REST, elle, est indépendante. Repli sur le SDK si pas encore de jeton. */
    const URL_REST_PORTAIL = 'https://firestore.googleapis.com/v1/projects/course-app-36e9d/databases/(default)/documents/portail';
    function depuisValeurFirestore(v){
      if (!v || typeof v !== 'object') return null;
      if ('nullValue' in v) return null;
      if ('booleanValue' in v) return v.booleanValue;
      if ('integerValue' in v) return Number(v.integerValue);
      if ('doubleValue' in v) return Number(v.doubleValue);
      if ('stringValue' in v) return v.stringValue;
      if ('timestampValue' in v) return v.timestampValue;
      if ('arrayValue' in v) return (v.arrayValue.values || []).map(depuisValeurFirestore);
      if ('mapValue' in v) {
        const o = {}, f = v.mapValue.fields || {};
        Object.keys(f).forEach((k) => { o[k] = depuisValeurFirestore(f[k]); });
        return o;
      }
      return null;
    }
    async function lireParRest(){
      if (!connecte()) return false;
      const u = authPortail.currentUser;
      const jeton = await u.getIdToken();                 /* mis en cache par Firebase, renouvelé seul */
      const rep = await fetch(URL_REST_PORTAIL, { headers: { 'Authorization': 'Bearer ' + jeton }, cache: 'no-store' });
      if (!rep.ok) return false;
      const corps = await rep.json();
      const obj = {};
      (corps.documents || []).forEach((d) => {
        const id = d.name.split('/').pop();
        obj[id] = depuisValeurFirestore({ mapValue: { fields: d.fields || {} } });
      });
      const avant = JSON.stringify(resume), apres = JSON.stringify(obj);
      if (apres !== avant) {                              /* ne redessine que si quelque chose a changé */
        resume = obj;
        try { localStorage.setItem(CLE_CACHE, apres); } catch (e) {}
        afficher();
      }
      return true;
    }
    async function sonder(){
      if (lectureEnCours || document.visibilityState !== 'visible') return;
      lectureEnCours = true;
      try {
        let ok = false;
        try { ok = await lireParRest(); } catch (e) { ok = false; }
        if (!ok) ok = await rafraichirDepuisServeur();
        statut(ok ? 'ok' : (db ? 'hors-ligne' : 'envoi'));   /* base pas encore prête : on reste « en cours » */
      } finally { lectureEnCours = false; }
    }
    function demarrerSondage(){ if (!sondage) sondage = setInterval(sonder, SONDAGE_MS); }
    function arreterSondage(){ clearInterval(sondage); sondage = null; }
    function auRetour(){
      afficher();
      ecouter();
      sonder();
      demarrerSondage();
    }

    /* ============================================================
       NOTIFICATIONS DU DUO (30/09/2026) — abonnement de CE téléphone
       Demande de Corentin : être prévenu quand l'autre ajoute une dépense (Budget) et quand la
       liste de courses atteint 5 articles (Course). Voir README, « Notifications ».
       - Firebase Cloud Messaging (SDK compat chargé à la demande) avec le service worker RACINE
         du Portail (sw.js, portée « ./ ») : c'est lui qui affiche les notifications.
       - Abonnement enregistré dans notifAbonnes/{id} (firestore.rules : compte du duo) :
         { token, profil, maj, appareil }. id aléatoire propre au téléphone (localStorage
         duo-notif-id) → un téléphone = un document, réécrit au besoin.
       - Le relais Apps Script lit cette collection et n'envoie qu'aux téléphones de L'AUTRE profil.
       - iPhone : uniquement depuis le Portail installé sur l'écran d'accueil (iOS 16.4+), et la
         demande d'autorisation DOIT partir d'un toucher (Notification.requestPermission en tout
         premier dans le gestionnaire de clic, avant toute attente).
       - Jeton FCM revérifié à chaque ouverture (connexion) : réécrit s'il a changé, si le profil
         du téléphone a changé, ou au plus tard tous les 7 jours (1 écriture/semaine).
       ============================================================ */
    const CLE_NOTIF_ID = 'duo-notif-id', CLE_NOTIF_ETAT = 'duo-notif-etat';
    const NOTIF_RAFRAICHIR_MS = 7 * 86400000;
    /* Clé VAPID « Certificats Web Push » de la console Firebase : vide = clé par défaut de Firebase. */
    const NOTIF_VAPID = '';
    const choixNotif = el('notif-choix'), aideNotif = el('notif-aide');
    let notifSessionOk = false, notifTravail = false;
    const lsLire = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const lsEcrire = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
    function lireEtatNotif(){ try { return JSON.parse(lsLire(CLE_NOTIF_ETAT)) || null; } catch (e) { return null; } }
    const estIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const estInstalle = () => navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    const notifPossible = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const prenomAutre = () => profilActif() === 'lisa' ? 'Corentin' : 'Lisa';

    function afficherNotif(message){
      if (!choixNotif) return;
      const actif = !!lireEtatNotif() && notifPossible() && Notification.permission === 'granted';
      choixNotif.querySelectorAll('[data-notif]').forEach((b) => {
        b.setAttribute('aria-checked', String((b.dataset.notif === 'oui') === actif));
        b.disabled = notifTravail || !notifPossible() || (Notification && Notification.permission === 'denied' && b.dataset.notif === 'oui');
      });
      let t = '';
      if (message) t = message;
      else if (!notifPossible()) t = estIOS() && !estInstalle()
        ? "Ajoute le Portail à l'écran d'accueil (Partager › Sur l'écran d'accueil), puis ouvre-le depuis son icône pour activer les notifications."
        : 'Ce navigateur ne gère pas les notifications.';
      else if (Notification.permission === 'denied') t = 'Notifications refusées : Réglages iOS › Notifications › Portail Duo.';
      else if (actif) t = 'Tu es prévenu(e) des dépenses de ' + prenomAutre() + ' et quand la liste de courses atteint 5 articles.';
      aideNotif.textContent = t;
    }

    let messagingPret = null;
    function messaging(){
      if (!messagingPret) messagingPret = chargerScript(SDK + 'firebase-messaging-compat.js')
        .then(() => firebase.messaging())
        .catch((e) => { messagingPret = null; throw e; });
      return messagingPret;
    }
    async function jetonFCM(){
      const m = await messaging();
      const reg = await navigator.serviceWorker.ready;       /* service worker racine du Portail */
      const opts = { serviceWorkerRegistration: reg };
      if (NOTIF_VAPID) opts.vapidKey = NOTIF_VAPID;
      return m.getToken(opts);
    }
    function appareil(){
      const ua = navigator.userAgent;
      return (/iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : 'Ordinateur');
    }
    async function enregistrerAbonnement(token){
      let id = lsLire(CLE_NOTIF_ID);
      if (!id || !/^[a-z0-9]{8,32}$/.test(id)) { id = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)); lsEcrire(CLE_NOTIF_ID, id); }
      const doc = { token, profil: profilActif(), maj: Date.now(), appareil: appareil() };
      await db.collection('notifAbonnes').doc(id).set(doc);
      lsEcrire(CLE_NOTIF_ETAT, JSON.stringify({ token, profil: doc.profil, maj: doc.maj }));
    }
    /* Au démarrage (session du duo confirmée) et au retour sur le Portail : jeton toujours à jour. */
    async function verifierAbonnement(){
      const etat = lireEtatNotif();
      if (!etat || !notifSessionOk || !db || !notifPossible() || Notification.permission !== 'granted' || notifTravail) return;
      try {
        const token = await jetonFCM();
        if (token && (token !== etat.token || etat.profil !== profilActif() || Date.now() - (etat.maj || 0) > NOTIF_RAFRAICHIR_MS)) {
          await enregistrerAbonnement(token);
        }
      } catch (e) { console.warn('[notif] vérification de l\'abonnement impossible :', e); }
      afficherNotif();
    }
    function notifSession(compte){
      notifSessionOk = compte;
      if (compte) verifierAbonnement();
    }
    async function activerNotif(){
      /* ⚠️ En TOUT PREMIER dans le toucher : iOS refuse une demande d'autorisation qui ne suit
         pas directement un geste de l'utilisateur. */
      const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (perm !== 'granted') { afficherNotif(); return; }
      if (!notifSessionOk || !db) { afficherNotif('Connecte-toi au compte du duo, puis réessaie.'); return; }
      notifTravail = true; afficherNotif('Activation…');
      try {
        const token = await jetonFCM();
        if (!token) throw new Error('aucun jeton');
        await enregistrerAbonnement(token);
        notifTravail = false; afficherNotif();
      } catch (e) {
        console.warn('[notif] activation impossible :', e);
        notifTravail = false; afficherNotif('Activation impossible (' + ((e && (e.code || e.message)) || 'erreur') + '). Réessaie connecté à internet.');
      }
    }
    async function desactiverNotif(){
      notifTravail = true; afficherNotif('Désactivation…');
      const id = lsLire(CLE_NOTIF_ID);
      try { if (id && db && notifSessionOk) await db.collection('notifAbonnes').doc(id).delete(); } catch (e) { console.warn('[notif] suppression de l\'abonnement impossible :', e); }
      try { const m = await messaging(); await m.deleteToken(); } catch (e) { console.warn('[notif] jeton non supprimé :', e); }
      lsEcrire(CLE_NOTIF_ETAT, null);
      notifTravail = false; afficherNotif();
    }
    if (choixNotif) {
      choixNotif.addEventListener('click', (e) => {
        const b = e.target.closest('[data-notif]');
        if (!b || b.disabled || notifTravail) return;
        const actif = !!lireEtatNotif() && Notification.permission === 'granted';
        if (b.dataset.notif === 'oui' && !actif) activerNotif();
        else if (b.dataset.notif === 'non' && lireEtatNotif()) desactiverNotif();
      });
      afficherNotif();
      /* Retour sur le Portail : le profil a pu changer dans une app (Réglages) → texte et document à jour. */
      window.addEventListener('pageshow', (e) => { if (e.persisted) { afficherNotif(); verifierAbonnement(); } });
    }

    try { resume = JSON.parse(localStorage.getItem(CLE_CACHE)) || {}; } catch (e) { resume = {}; }
    if (typeof resume !== 'object' || resume === null) resume = {};
    afficher();
    window.addEventListener('load', () => setTimeout(demarrerBase, 0));
    demarrerSondage();                                   /* sans effet tant que Firestore n'est pas prêt */
    setInterval(afficher, 60000);                       /* « il y a 3 min » reste juste */
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') auRetour(); else arreterSondage();
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) auRetour(); });
    window.addEventListener('pagehide', arreterSondage);
  })();

  /* ============================================================
     DESIGN VERRE — DÉFINITIF (28/09/2026)
     Habillage commun (verre.css, à la racine), classe html.verre posée en dur dans index.html.
     PILE : les 3 cartes sont 3 vitres empilées (data-rang : 0 = devant).
     Toucher une vitre du fond la ramène devant (sans ouvrir l'app) ; toucher celle de
     devant ouvre l'app (lien normal) ; glisser la pile vers le haut/bas fait tourner les
     vitres. Ordre mémorisé (portail-verre-pile). La 2e lumière du fond prend la couleur
     de l'app de devant.
     ============================================================ */
  (function(){
    const root = document.documentElement;
    const cartes = { muscu: 'carte-muscu', budget: 'carte-budget', courses: 'carte-courses' };
    const teintes = { muscu: 'var(--v-corps)', budget: 'var(--v-argent)', courses: 'var(--v-frigo)' };
    const ordre = ['muscu', 'budget', 'courses'];
    const carte = (k) => document.getElementById(cartes[k]);
    /* Ordre de la pile, de devant (0) au fond (2). Mémorisé (portail-verre-pile) ; repli sur
       l'ancienne clé portail-verre-devant (1re version du 28/09). */
    let pile = ordre.slice();
    try {
      const p = JSON.parse(localStorage.getItem('portail-verre-pile'));
      if (Array.isArray(p) && p.length === 3 && ordre.every((k) => p.includes(k))) pile = p;
      else { const d = localStorage.getItem('portail-verre-devant'); if (ordre.includes(d)) pile = [d, ...ordre.filter((k) => k !== d)]; }
    } catch (e) {}

    function empiler(){
      pile.forEach((k, i) => carte(k).setAttribute('data-rang', String(i)));
      root.style.setProperty('--v-app', teintes[pile[0]]);
      try { localStorage.setItem('portail-verre-pile', JSON.stringify(pile)); } catch (e) {}
    }
    empiler();

    /* TRANSITION « LA VITRE S'OUVRE EN APP » (28/09/2026, voir verre.css) : la vitre de devant qu'on
       touche prend le nom de transition « vitre » juste avant la navigation ; la plaque de l'app porte le
       même nom, le navigateur passe de l'une à l'autre. Un seul élément nommé à la fois : nom retiré au
       retour sur le Portail (page ressortie du cache précédent/suivant). */
    const retirerNomTransition = () => ordre.forEach((k) => carte(k).style.removeProperty('view-transition-name'));
    window.addEventListener('pageshow', retirerNomTransition);

    /* Toucher une vitre du fond : elle passe devant (les autres gardent leur ordre). */
    ordre.forEach((k) => {
      carte(k).addEventListener('click', (e) => {
        if (root.classList.contains('verre') && k === pile[0] && !e.defaultPrevented) {
          retirerNomTransition();
          carte(k).style.setProperty('view-transition-name', 'vitre');
        }
        if (!root.classList.contains('verre') || k === pile[0]) return;   /* devant (ou mode classique) : ouvre l'app */
        e.preventDefault();
        pile = [k, ...pile.filter((x) => x !== k)];
        empiler();
      });
    });

    /* GLISSER VERTICAL (28/09/2026) — vers le HAUT : la vitre de devant part au fond, la suivante
       passe devant ; vers le BAS : la vitre du fond revient devant. Seuil : 50 px, ou un geste
       rapide (> 0,4 px/ms) d'au moins 20 px. Pendant le geste, la vitre de devant suit le doigt
       (--drag, amorti au-delà de 120 px). Un glisser n'ouvre jamais l'app (clic annulé). */
    const dash = document.querySelector('.dash');
    let depart = null, dernier = null, aGlisse = false;
    dash.addEventListener('pointerdown', (e) => {
      if (!root.classList.contains('verre') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      depart = { y: e.clientY, t: performance.now() }; dernier = depart; aGlisse = false;
    });
    dash.addEventListener('pointermove', (e) => {
      if (!depart) return;
      const dy = e.clientY - depart.y;
      if (!aGlisse && Math.abs(dy) > 8) {
        aGlisse = true; dash.classList.add('glisse');
        try { dash.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (aGlisse) {
        const amorti = Math.sign(dy) * (Math.abs(dy) <= 120 ? Math.abs(dy) : 120 + (Math.abs(dy) - 120) * 0.3);
        carte(pile[0]).style.setProperty('--drag', amorti.toFixed(1) + 'px');
        dernier = { y: e.clientY, t: performance.now(), v: (e.clientY - dernier.y) / Math.max(1, performance.now() - dernier.t) };
      }
    });
    function finir(e){
      if (!depart) return;
      const dy = e.clientY - depart.y, v = (dernier && dernier.v) || 0;
      carte(pile[0]).style.removeProperty('--drag');
      dash.classList.remove('glisse');
      if (aGlisse) {
        const versHaut = dy < -50 || (dy < -20 && v < -0.4);
        const versBas = dy > 50 || (dy > 20 && v > 0.4);
        if (versHaut) pile = [pile[1], pile[2], pile[0]];
        else if (versBas) pile = [pile[2], pile[0], pile[1]];
        if (versHaut || versBas) empiler();
      }
      depart = null;
    }
    dash.addEventListener('pointerup', finir);
    dash.addEventListener('pointercancel', finir);
    /* Le clic qui suit un glisser ne doit rien faire (ni ouvrir l'app, ni changer de vitre). */
    dash.addEventListener('click', (e) => { if (aGlisse) { e.preventDefault(); e.stopPropagation(); aGlisse = false; } }, true);

    /* Nettoyage des réglages de l'essai (interrupteur « Essai Verre » et curseur d'intensité,
       retirés quand le design est devenu définitif le 28/09/2026). */
    try { localStorage.removeItem('duo-verre'); localStorage.removeItem('duo-verre-intensite'); localStorage.removeItem('portail-verre-devant'); } catch (e) {}
  })();

  document.getElementById('hardReload').addEventListener('click', async (e) => {
    // Confirmation ajoutée le 18/09/2026 : ce bouton est destructif pour le
    // hors-ligne du Portail (il faudra le recharger en ligne une fois pour
    // qu'il redevienne disponible sans réseau) — mieux vaut valider le clic.
    // ⚠️ e.currentTarget vaut null après un await : on le capture AVANT la boîte de dialogue.
    const btn = e.currentTarget;
    const ok = await dialogue({
      titre: 'Recharger le Portail ?',
      texte: "Le cache du Portail sera vidé. Il ne sera plus disponible hors-ligne tant qu'il n'aura pas été rouvert au moins une fois avec une connexion.",
      ok: 'Recharger'
    });
    if (!ok) return;

    btn.classList.add('spin');
    try {
      // Correctif 18/09/2026 : caches.keys() et getRegistrations() renvoient
      // TOUT ce qui existe sur le domaine, pas seulement ce qui appartient au
      // Portail. Sans filtre, ce bouton supprimait aussi le cache et le
      // Service Worker de Course/Muscu/Budget — corrigé en limitant chaque
      // suppression à ce qui appartient réellement au Portail.
      if ('caches' in window) {
        const CACHE_PREFIX = 'portail-duo-shell-';
        const names = await caches.keys();
        await Promise.all(
          names.filter(n => n.startsWith(CACHE_PREFIX)).map(n => caches.delete(n))
        );
      }
      if ('serviceWorker' in navigator) {
        const scopePortail = new URL('./', window.location.href).href;
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs.filter(r => r.scope === scopePortail).map(r => r.unregister())
        );
      }
    } catch (err) {
      // silencieux : on recharge quand même
    }
    window.location.href = window.location.pathname + '?_r=' + Date.now();
  });

  /* Date de MAJ, service worker et vérification de version : dans commun.js (noyau commun aux 4 apps,
     28/09/2026), chargé par index.html. */
