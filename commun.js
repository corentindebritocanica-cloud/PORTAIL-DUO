/* ==========================================================================
   commun.js — NOYAU COMMUN aux 4 apps de PORTAIL-DUO (28/09/2026)
   --------------------------------------------------------------------------
   Même principe que verre.css pour le design : le code qui était recopié à
   l'identique dans chaque app vit ici, une seule fois. Une correction faite
   dans ce fichier s'applique au Portail, à Course, à Budget et à Muscu.

   CHARGEMENT : <script src="commun.js?v=…"> (Portail) ou "../commun.js?v=…"
   (apps), dans le <head>, SANS defer ni async : les parties « avant
   l'affichage » (halos, transition) doivent tourner avant le 1er rendu.
   Le numéro ?v= est mis à jour par le workflow auto-version (comme verre.css).
   Mis en cache hors-ligne par le service worker de chaque app.

   CONTENU
   0. Thème Sombre / Clair (data-style="simple|clair") posé avant le 1er rendu (18/10/2026)
   1. Halos du fond calés sur l'horloge (continuité d'une app à l'autre)
   2. Transition « la vitre s'ouvre en app » : annulée pour retours/rechargements
   3. Date de dernière mise à jour du code (formaterDerniereMaj, #derniere-maj)
   4. Service worker : enregistrement + détection d'une nouvelle version
   5. Vérification de version au retour dans l'app (rechargement auto ou bandeau)
   6. Connexion du duo pour Course et le Portail (connexionDuo, #connexion)
   7. Notifications du duo : envoi au relais Apps Script (notifierDuo, 30/09/2026)
   8. Gestes : retour d'appui :active sur iOS + fermeture animée des modales (fermerAnime, 12/10/2026)
   9. États communs (lot 3, 20/10/2026) : message si un enregistrement échoue (duoEchec),
      lignes grises d'attente (lignesAttente). Le « Hors ligne » en texte est en CSS (verre.css).

   CE QUI RESTE DANS CHAQUE APP : la constante DERNIERE_MAJ (index.html, mise à
   jour par le workflow), le bandeau #maj-toast (index.html : sa position dépend
   de la barre du bas de chaque app), sw.js (propre à chaque dossier).
   Tout ce qui est ici est volontairement tolérant : une erreur dans le noyau ne
   doit jamais empêcher une app de s'ouvrir.
   ========================================================================== */
(function(){
  'use strict';
  var racine = document.documentElement;

  /* ---------- 0. THÈME : SOMBRE · CLAIR (18/10/2026 ; avant : Verre · Relief · Argile · Simple) ----------
     Choisi dans le Portail, appliqué aux 5 apps : localStorage['duo-style'] (même origine,
     comme duo_profile) → <html data-style="simple|clair">, TOUJOURS posé.
       • simple = thème SOMBRE (natif iOS, ex-style « Simple » du 05/10/2026) — défaut ;
       • clair  = thème CLAIR (fond beige crème, blocs blancs, textes foncés).
     Anciennes valeurs (verre, relief, argile) ou clé absente → sombre. Bleu Corentin / rose Lisa
     inchangés dans les deux thèmes (--accent). Posé ICI, dans le <head> avant verre.css : aucun
     flash à l'ouverture. Relu au retour depuis le cache précédent/suivant et à l'événement storage.
     Barre d'état iOS : en clair, meta apple-mobile-web-app-status-bar-style = « default » (texte
     noir) au lieu de « black-translucent » (texte blanc, illisible sur le beige) — iOS ne relit
     cette balise qu'au lancement de l'app : effet au prochain lancement.
     window.duoStyle.choisir(s) : utilisé par le sélecteur du Portail. */
  var STYLES = ['simple', 'clair'];
  function lireStyle(){
    try { var s = localStorage.getItem('duo-style'); return STYLES.indexOf(s) >= 0 ? s : 'simple'; }
    catch (e) { return 'simple'; }
  }
  function appliquerStyle(s){
    racine.setAttribute('data-style', s);
    var barre = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (barre) barre.setAttribute('content', s === 'clair' ? 'default' : 'black-translucent');
    var teinte = document.querySelector('meta[name="theme-color"]');
    if (teinte) teinte.setAttribute('content', s === 'clair' ? '#f3ede2' : '#000000');
  }
  appliquerStyle(lireStyle());
  window.addEventListener('pageshow', function(e){ if (e.persisted) appliquerStyle(lireStyle()); });
  window.addEventListener('storage', function(e){ if (e.key === 'duo-style') appliquerStyle(lireStyle()); });
  window.duoStyle = {
    liste: STYLES.slice(),
    lire: lireStyle,
    choisir: function(s){
      if (STYLES.indexOf(s) < 0) return;
      try { localStorage.setItem('duo-style', s); } catch (e) {}
      /* bascule franche : on coupe les transitions le temps d'une image (sinon chaque ombre s'anime) */
      racine.classList.add('style-bascule');
      appliquerStyle(s);
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ racine.classList.remove('style-bascule'); }); });
    }
  };

  /* ---------- 1. HALOS CALÉS SUR L'HORLOGE (28/09/2026) ----------
     Chaque app étant une page séparée, une animation CSS repartirait de zéro à chaque
     ouverture. Délai négatif = −(maintenant modulo un aller-retour) : toutes les apps
     affichent la même position au même instant. Aller-retour = 2 × durée des animations
     de verre.css (23 s et 31 s en alternate) — à changer ENSEMBLE. Recalé au retour depuis
     le cache précédent/suivant (l'animation y était en pause). */
  function calerHalos(){
    var t = Date.now();
    racine.style.setProperty('--v-delai-profil', (-(t % 46000) / 1000) + 's');
    racine.style.setProperty('--v-delai-app', (-(t % 62000) / 1000) + 's');
  }
  calerHalos();
  window.addEventListener('pageshow', function(e){ if (e.persisted) calerHalos(); });

  /* ---------- 2. TRANSITION « LA VITRE S'OUVRE EN APP » (28/09/2026) ----------
     verre.css active les View Transitions inter-pages. On n'anime que l'ouverture d'une
     app depuis le Portail : retours (geste retour d'iOS, historique) et rechargements
     sont annulés — iOS anime déjà lui-même le retour. Doit être écouté AVANT le 1er
     rendu, d'où le chargement de ce fichier dans le <head>. */
  window.addEventListener('pagereveal', function(e){
    if (!e.viewTransition) return;
    var type = '';
    try { type = navigation.activation.navigationType; } catch (x) {}
    if (!type) { try { type = performance.getEntriesByType('navigation')[0].type; } catch (x) {} }
    if (type === 'traverse' || type === 'back_forward' || type === 'reload') e.viewTransition.skipTransition();
  });

  /* ---------- 3. DATE DE DERNIÈRE MISE À JOUR DU CODE ----------
     DERNIERE_MAJ (index.html) = horodatage du dernier déploiement, pas des données.
     formaterDerniereMaj() reste globale : Muscu l'appelle en ouvrant ses Réglages
     (#settings-derniere-maj). Les autres apps affichent #derniere-maj au chargement. */
  function formaterDerniereMaj(iso){
    var d = new Date(iso);
    var p = function(n){ return String(n).padStart(2, '0'); };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' à ' + p(d.getHours()) + 'h' + p(d.getMinutes());
  }
  window.formaterDerniereMaj = formaterDerniereMaj;
  function derniereMaj(){ return (typeof DERNIERE_MAJ !== 'undefined') ? DERNIERE_MAJ : null; }

  document.addEventListener('DOMContentLoaded', function(){
    var el = document.getElementById('derniere-maj');
    if (el && derniereMaj()) el.textContent = 'Dernière mise à jour du code : ' + formaterDerniereMaj(derniereMaj());
  });

  /* ---------- 5. VÉRIFICATION DE VERSION AU RETOUR DANS L'APP (20/09/2026) ----------
     Sur iPhone, une PWA remise au premier plan n'est pas rechargée : elle garde l'ancien
     code en mémoire. Au retour, on relit index.html sur le serveur et on compare son
     DERNIERE_MAJ avec celle du code en cours. Version plus récente : rechargement
     automatique, sauf saisie en cours ou fenêtre ouverte (alors : bandeau « Actualiser »).
     Garde-fou : au plus 2 rechargements automatiques par session (réseau lent qui
     resservirait une copie ancienne), ensuite le bandeau. */
  var dernierControle = 0;
  function estVisible(el){ return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; }
  function utilisateurOccupe(){
    var a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable)) return true;
    return Array.prototype.some.call(document.querySelectorAll('.overlay-popup, .confirm-overlay, .modal-overlay, .login-overlay, .modal-fond'), estVisible);
  }
  function afficherBandeau(){ var t = document.getElementById('maj-toast'); if (t) t.style.display = 'flex'; }
  async function verifierVersion(force){
    var version = derniereMaj();
    if (!version || !('fetch' in window)) return;
    if (!force && Date.now() - dernierControle < 30000) return;
    dernierControle = Date.now();
    try {
      var rep = await fetch('index.html', { cache: 'no-store' });
      if (!rep.ok) return;
      var m = (await rep.text()).match(/DERNIERE_MAJ\s*=\s*'([^']+)'/);
      if (!m) return;
      if (m[1] === version) { try { sessionStorage.removeItem('majRechargements'); } catch (e) {} return; }
      var n = 0; try { n = parseInt(sessionStorage.getItem('majRechargements') || '0', 10) || 0; } catch (e) {}
      if (utilisateurOccupe() || n >= 2) {
        afficherBandeau();
      } else {
        try { sessionStorage.setItem('majRechargements', String(n + 1)); } catch (e) {}
        window.location.reload();
      }
    } catch (e) { /* hors ligne : on garde la version en cours */ }
  }
  window.__verifierVersion = verifierVersion;     /* nom historique, gardé pour compatibilité */
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') verifierVersion();
  });
  window.addEventListener('load', function(){ setTimeout(function(){ verifierVersion(true); }, 3000); });

  /* ---------- 4. SERVICE WORKER ----------
     sw.js de CHAQUE dossier (chemin et portée relatifs : fonctionne à la racine comme dans
     /Muscu/, /Budget/, /Course/). Une mise à jour du service worker ne veut pas dire que la
     page est périmée (index.html est servi en réseau d'abord) : c'est verifierVersion() qui
     décide. Bouton « Actualiser » du bandeau : recharge la page. */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js', { scope: './' }).then(function(reg){
        var verifierMaj = function(){ verifierVersion(true); };
        if (reg.waiting) verifierMaj();
        reg.addEventListener('updatefound', function(){
          var nv = reg.installing;
          if (!nv) return;
          nv.addEventListener('statechange', function(){
            if (nv.state === 'installed' && navigator.serviceWorker.controller) verifierMaj();
          });
        });
      }).catch(function(err){ console.warn('[sw] enregistrement échoué :', err); });
    });
  }
  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('maj-btn');
    if (btn) btn.addEventListener('click', function(){ window.location.reload(); });
  });

  /* ---------- 6. CONNEXION DU DUO — Course et Portail (29/09/2026) ----------
     Depuis le 29/09/2026, produits, rayons et portail sont réservés au compte e-mail du duo
     (firestore.rules) : plus de session anonyme. connexionDuo(auth) branche le formulaire
     #connexion-form (index.html de Course et du Portail, habillé par verre.css) sur l'auth
     Firebase « compat » de la page, et renvoie afficher(vrai|faux) pour l'écran #connexion.
     Même compte et même session que Budget et Muscu (application Firebase par défaut). */
  window.connexionDuo = function(auth){
    var ecran = document.getElementById('connexion');
    var form = document.getElementById('connexion-form');
    var champMail = document.getElementById('connexion-email');
    var champMdp = document.getElementById('connexion-mdp');
    var erreur = document.getElementById('connexion-erreur');
    var btn = document.getElementById('connexion-btn');
    var messages = {
      'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
      'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
      'auth/user-not-found': 'E-mail ou mot de passe incorrect.',
      'auth/invalid-email': 'Adresse e-mail invalide.',
      'auth/too-many-requests': 'Trop de tentatives. Réessaie plus tard.',
      'auth/network-request-failed': 'Pas de connexion réseau.'
    };
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var email = champMail.value.trim(), mdp = champMdp.value;
      if (!email || !mdp) { erreur.textContent = 'E-mail et mot de passe requis.'; return; }
      erreur.textContent = '';
      btn.disabled = true;
      auth.signInWithEmailAndPassword(email, mdp)
        .then(function(){ champMdp.value = ''; })
        .catch(function(err){ erreur.textContent = messages[err && err.code] || 'Connexion impossible.'; })
        .then(function(){ btn.disabled = false; });
    });
    return function(visible){ ecran.classList.toggle('open', !!visible); };
  };

  /* ---------- 7. NOTIFICATIONS DU DUO — envoi (30/09/2026) ----------
     window.notifierDuo({ titre, corps, url, tag }) : demande au relais (Google Apps Script
     « Notifications.gs », hors dépôt) d'envoyer une notification aux téléphones abonnés de
     L'AUTRE profil (Corentin ↔ Lisa). L'abonnement se fait dans le Portail (app.js, bloc
     « NOTIFICATIONS ») ; l'affichage dans sw.js (racine). Voir README, « Notifications ».
     - Le relais vérifie le jeton Firebase de la session : seul le compte du duo est servi.
       Aucune clé ici : l'URL du relais n'est pas un secret.
     - Hors ligne ou relais injoignable : la demande attend dans localStorage (duo-notif-file,
       12 h max, 10 max) et repart au retour du réseau ou à la prochaine ouverture d'une app.
     - Tolérant : une erreur n'empêche jamais l'app de fonctionner (console.warn seulement). */
  /* URL …/exec du relais Apps Script (déployé le 30/09/2026). Pas un secret : sans jeton du compte du duo,
     le relais refuse tout. Si le relais est redéployé en NOUVEAU déploiement, l'URL change : la remplacer ici. */
  var RELAIS_NOTIF = 'https://script.google.com/macros/s/AKfycbzAXlg12huM_bGd4YWuyln8DAWbjjDCyole8IwI3fSEqRuc7D98W_M8oTzcQdbdzl4sXg/exec';
  /* Même relais pour le bouton ❤️ de Muscu (import Strava, 30/09/2026) : une seule URL à tenir à jour. */
  window.RELAIS_DUO = RELAIS_NOTIF;
  var CLE_FILE_NOTIF = 'duo-notif-file';
  var FILE_NOTIF_MAX = 10, FILE_NOTIF_DUREE = 12 * 3600 * 1000;
  function lireFileNotif(){
    try { var f = JSON.parse(localStorage.getItem(CLE_FILE_NOTIF)); return Array.isArray(f) ? f : []; } catch (e) { return []; }
  }
  function ecrireFileNotif(f){
    try { if (f.length) localStorage.setItem(CLE_FILE_NOTIF, JSON.stringify(f)); else localStorage.removeItem(CLE_FILE_NOTIF); } catch (e) {}
  }
  function profilNotif(){
    try { return localStorage.getItem('duo_profile') === 'lisa' ? 'lisa' : 'corentin'; } catch (e) { return 'corentin'; }
  }
  /* Session du duo (application Firebase par défaut, SDK « compat » de la page). */
  function utilisateurDuo(){
    try {
      if (!window.firebase || !firebase.apps || !firebase.apps.length || !firebase.auth) return null;
      var u = firebase.auth().currentUser;
      return (u && !u.isAnonymous) ? u : null;
    } catch (e) { return null; }
  }
  /* Envoie UNE demande ; résout true si le relais l'a reçue (réponse lisible ou non). */
  function envoyerAuRelais(demande, keepalive){
    var u = utilisateurDuo();
    if (!RELAIS_NOTIF || !u || !navigator.onLine) return Promise.resolve(false);
    return u.getIdToken().then(function(jeton){
      var corps = JSON.stringify({
        idToken: jeton, profil: demande.profil, titre: demande.titre, corps: demande.corps,
        url: demande.url, tag: demande.tag
      });
      /* text/plain (défaut d'un corps texte) : requête « simple », pas de pré-vérification CORS,
         que les applications Web Apps Script ne savent pas traiter. mode 'no-cors' : la réponse
         (après redirection vers script.googleusercontent.com) n'a pas à être lisible — seule une
         vraie coupure réseau fait échouer fetch. Sans ça, une réponse illisible (en-tête CORS
         absent) ferait échouer une demande pourtant reçue, puis la renverrait : notification en double. */
      return fetch(RELAIS_NOTIF, { method: 'POST', body: corps, mode: 'no-cors', keepalive: !!keepalive, redirect: 'follow' });
    }).then(function(rep){
      if (rep && rep.type === 'opaque') return true;      /* reçue (réponse volontairement illisible) */
      if (!rep || !rep.ok) return false;
      return rep.json().then(function(r){
        if (r && r.ok === false) console.warn('[notif] refusée par le relais :', r.erreur);
        return true;                          /* reçue : un refus ne se réessaie pas */
      }, function(){ return true; });
    }).catch(function(err){ console.warn('[notif] relais injoignable, mise en attente :', err); return false; });
  }
  var videEnCours = false;
  function viderFileNotif(keepalive){
    if (videEnCours) return;
    var f = lireFileNotif().filter(function(d){ return Date.now() - d.cree < FILE_NOTIF_DUREE; });
    ecrireFileNotif(f);
    if (!f.length || !utilisateurDuo()) return;
    videEnCours = true;
    var tete = f[0];
    envoyerAuRelais(tete, keepalive).then(function(ok){
      videEnCours = false;
      if (!ok) return;
      ecrireFileNotif(lireFileNotif().filter(function(d){ return d.id !== tete.id; }));
      viderFileNotif(keepalive);
    });
  }
  window.notifierDuo = function(msg){
    try {
      if (!msg || !msg.titre || !RELAIS_NOTIF) return;   /* relais pas encore déployé : rien à faire */
      var f = lireFileNotif();
      f.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), cree: Date.now(),
        profil: profilNotif(), titre: String(msg.titre).slice(0, 60), corps: String(msg.corps || '').slice(0, 180),
        url: msg.url || './', tag: msg.tag || ''
      });
      ecrireFileNotif(f.slice(-FILE_NOTIF_MAX));
      viderFileNotif(!!msg.keepalive);
    } catch (e) { console.warn('[notif] non envoyée :', e); }
  };
  /* Reprise de la file : retour du réseau, retour au premier plan, et quelques secondes après
     l'ouverture (le temps que la session Firebase soit restaurée). */
  window.addEventListener('online', function(){ viderFileNotif(false); });
  document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') setTimeout(function(){ viderFileNotif(false); }, 3000); });
  window.addEventListener('load', function(){ setTimeout(function(){ viderFileNotif(false); }, 5000); });

  /* ---------- 8. GESTES (12/10/2026, audit skills Emil Kowalski / apple-design) ----------
     a) Safari iOS n'applique :active (l'appui qui « se tasse », scale .97) que si un écouteur
        touchstart existe sur l'élément ou un ancêtre. Écouteur vide et passif : ne gêne ni le
        défilement ni les gestes propres aux apps. Muscu en avait déjà un ; les autres non.
     b) fermerAnime(fond, fin) : la modale repart par le chemin d'arrivée (fond qui s'efface,
        feuille qui redescend, 0,2 s, styles .v-ferme dans verre.css), PUIS fin() la masque
        vraiment (display:none / retrait de .open / .hidden, selon l'app). Les effets de bord
        (résoudre une promesse, remettre l'état à zéro) restent synchrones chez l'appelant.
        Un 2e appel pendant la fermeture est ignoré. annulerFermeture(fond) : à appeler juste
        avant de (ré)ouvrir une modale — sinon une boîte rouverte dans les 0,2 s (deux dialogues
        enchaînés sur le même élément) serait masquée par la fin de la fermeture précédente. */
  document.addEventListener('touchstart', function(){}, { passive: true });
  window.fermerAnime = function(fond, fin){
    if (!fond) { if (fin) fin(); return; }
    if (fond._vFerme) return;
    fond.classList.add('v-ferme');
    fond._vFerme = setTimeout(function(){
      fond._vFerme = null;
      try { if (fin) fin(); } finally { fond.classList.remove('v-ferme'); }
    }, 200);
  };
  window.annulerFermeture = function(fond){
    if (fond && fond._vFerme) { clearTimeout(fond._vFerme); fond._vFerme = null; fond.classList.remove('v-ferme'); }
  };

  /* ---------- 9. ÉTATS COMMUNS (lot 3, 20/10/2026) ----------
     a) duoEchec(err, quoi) : un enregistrement refusé (droits, quota, session…) affichait au mieux
        une pastille rouge, au pire rien. Message en haut de l'écran, 6 s, même style dans les 5 apps.
        Hors ligne, Firestore met les écritures en file sans erreur : ce message ne concerne donc
        que les vrais échecs. Un message identique n'est pas répété dans les 4 s.
     b) lignesAttente(n) : HTML de n lignes grises (styles .duo-attente dans verre.css), à afficher
        tant que la 1re lecture de la base n'est pas arrivée, au lieu d'un « Rien à faire » trompeur. */
  var RAISONS = {
    'permission-denied': 'accès refusé — reconnecte-toi',
    'unauthenticated': 'session expirée — reconnecte-toi',
    'resource-exhausted': 'quota Firebase du jour atteint',
    'unavailable': 'serveur injoignable',
    'deadline-exceeded': 'serveur trop lent',
    'not-found': 'élément introuvable (supprimé ailleurs ?)',
    'invalid-argument': 'donnée refusée par la base'
  };
  var dernierEchec = { texte: '', le: 0 }, minuteurEchec = null;
  window.duoEchec = function(err, quoi){
    try {
      var code = err && err.code ? String(err.code).replace(/^firestore\//, '') : '';
      var raison = RAISONS[code] || (code || (err && err.message) || 'erreur inconnue');
      var texte = 'Pas enregistré (' + String(quoi || 'modification').toLowerCase() + ') : ' + raison + '.';
      if (texte === dernierEchec.texte && Date.now() - dernierEchec.le < 4000) return;
      dernierEchec = { texte: texte, le: Date.now() };
      var el = document.getElementById('duo-echec');
      if (!el) {
        el = document.createElement('div');
        el.id = 'duo-echec'; el.setAttribute('role', 'alert');
        el.addEventListener('click', function(){ el.classList.remove('visible'); });
        document.body.appendChild(el);
      }
      el.textContent = '⚠️ ' + texte;
      el.classList.add('visible');
      clearTimeout(minuteurEchec);
      minuteurEchec = setTimeout(function(){ el.classList.remove('visible'); }, 6000);
    } catch (e) { console.warn('[duoEchec]', e); }
  };
  window.lignesAttente = function(n){
    var h = '<div class="duo-attente" aria-busy="true" aria-label="Chargement">';
    for (var i = 0; i < (n || 4); i++) h += '<div class="duo-attente-ligne"><span></span><span></span></div>';
    return h + '</div>';
  };
})();
