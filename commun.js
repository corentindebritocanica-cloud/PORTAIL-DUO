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
   1. Halos du fond calés sur l'horloge (continuité d'une app à l'autre)
   2. Transition « la vitre s'ouvre en app » : annulée pour retours/rechargements
   3. Date de dernière mise à jour du code (formaterDerniereMaj, #derniere-maj)
   4. Service worker : enregistrement + détection d'une nouvelle version
   5. Vérification de version au retour dans l'app (rechargement auto ou bandeau)
   6. Connexion du duo pour Course et le Portail (connexionDuo, #connexion)

   CE QUI RESTE DANS CHAQUE APP : la constante DERNIERE_MAJ (index.html, mise à
   jour par le workflow), le bandeau #maj-toast (index.html : sa position dépend
   de la barre du bas de chaque app), sw.js (propre à chaque dossier).
   Tout ce qui est ici est volontairement tolérant : une erreur dans le noyau ne
   doit jamais empêcher une app de s'ouvrir.
   ========================================================================== */
(function(){
  'use strict';
  var racine = document.documentElement;

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
})();
