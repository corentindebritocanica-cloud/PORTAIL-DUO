/* app.js — code de l'app.
   Extrait des anciens <script> inline de index.html le 20/09/2026 (contenu inchangé,
   sauf la constante DERNIERE_MAJ, qui reste dans index.html : voir README). */
  /* ============================================================
     THEME CLAIR / SOMBRE (charte UX/UI)
     ============================================================ */
  (function(){
    const root = document.documentElement;
    const btn = document.getElementById('theme-toggle');
    const stocke = localStorage.getItem('portail-theme');
    function appliquer(theme){
      root.classList.toggle('light-mode', theme === 'light');
      btn.textContent = theme === 'light' ? '☀️' : '🌙';
    }
    appliquer(stocke === 'light' ? 'light' : 'dark');
    btn.addEventListener('click', ()=>{
      const nouveauTheme = root.classList.contains('light-mode') ? 'dark' : 'light';
      localStorage.setItem('portail-theme', nouveauTheme);
      appliquer(nouveauTheme);
    });
  })();

  /* ============================================================
     TABLEAU DE BORD (22/09/2026)
     Chaque carte est un simple lien vers son app. Les chiffres viennent de
     `portail/muscu`, `portail/budget` et `portail/courses`, écrits par les 3 apps dans la
     base de Courses (connexion anonyme : aucun mot de passe). Voir README.
     - Affichage instantané depuis le dernier état connu (localStorage), puis mise à jour en
       direct : le Portail reste utilisable hors ligne et ne dépend jamais du SDK pour s'ouvrir.
     - ⚠️ Ces documents ne sont PAS de confiance (la base accepte n'importe quelle connexion
       anonyme, et le dépôt est public) : tout est validé (types, bornes, longueurs) et écrit avec
       textContent — jamais innerHTML. Ce Portail partage son origine avec les 3 apps.
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

    /* ---- validation : rien de ce qui vient de la base n'est utilisé tel quel ---- */
    const nombre = (x, min, max) => (typeof x === 'number' && isFinite(x) && x >= min && x <= max) ? x : null;
    const entier = (x, min, max) => { const n = nombre(x, min, max); return n === null ? null : Math.round(n); };
    const texte = (x, max) => (typeof x === 'string') ? x.slice(0, max) : '';
    const eur0 = (n) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';

    function depuis(ms){
      const m = Math.floor(Math.max(0, Date.now() - ms) / 60000);
      if (m < 1) return "à l'instant";
      if (m < 60) return 'il y a ' + m + ' min';
      const h = Math.floor(m / 60);
      if (h < 24) return 'il y a ' + h + ' h';
      return 'il y a ' + Math.floor(h / 24) + ' j';
    }
    function pied(id, d){
      const maj = nombre(d && d.maj, 1e12, 4e12);
      el(id).textContent = maj ? 'Mis à jour ' + depuis(maj) : "En attente des premières données — ouvre l'app une fois";
    }
    /* Profil actif de Muscu (même origine que le Portail) : sert à choisir « la prochaine séance ». */
    function profilActif(){
      try { return localStorage.getItem('duo_profile') === 'lisa' ? 'lisa' : 'corentin'; } catch (e) { return 'corentin'; }
    }

    function afficherMuscu(d){
      const p = profilActif();
      el('mu-next-label').textContent = 'Prochaine séance · ' + (p === 'lisa' ? 'Lisa' : 'Corentin');
      const pr = d && d.prochaine && d.prochaine[p];
      if (pr && typeof pr === 'object') {
        const titre = texte(pr.title, 70), label = texte(pr.label, 30), nb = entier(pr.nbExos, 0, 99);
        el('mu-next').textContent = titre || label || '—';
        el('mu-next-sub').textContent = [label, nb === null ? '' : nb + ' exercice' + (nb > 1 ? 's' : '')].filter(Boolean).join(' · ')
          + (pr.cardio === true ? ' + cardio' : '');
      } else {
        el('mu-next').textContent = '—';
        el('mu-next-sub').textContent = '';
      }
      const obj = entier(d && d.objectif, 1, 7) || 4;
      ['corentin', 'lisa'].forEach((q) => {
        const n = entier(d && d.semaine && d.semaine[q], 0, 99);
        const box = el('mu-segs-' + q);
        box.classList.add(q);
        box.style.setProperty('--n', obj);
        box.textContent = '';
        for (let i = 0; i < obj; i++) {
          const seg = document.createElement('i');
          if (n !== null && i < n) seg.className = 'on';
          box.appendChild(seg);
        }
        el('mu-count-' + q).textContent = n === null ? '' : n + '/' + obj;
      });
      const serie = entier(d && d.serie, 0, 999);
      el('mu-serie').hidden = !(serie > 0);
      if (serie > 0) el('mu-serie-txt').textContent = 'Série · ' + serie + ' sem.';
      pied('mu-maj', d);
    }

    function afficherBudget(d){
      const reste = nombre(d && d.reste, -1e7, 1e7);
      const budget = nombre(d && d.budget, -1e7, 1e7);
      const depense = nombre(d && d.depense, -1e7, 1e7);
      const big = el('bu-big'), fill = el('bu-fill');
      if (reste === null) {
        el('bu-int').textContent = '—';
        el('bu-dec').textContent = '';
        big.classList.remove('neg');
        fill.style.width = '0%'; fill.classList.remove('over');
        el('bu-spent').textContent = d ? 'Mois pas encore démarré' : '';
        el('bu-days').textContent = '';
      } else {
        const neg = reste < 0;
        const parts = Math.abs(reste).toFixed(2).split('.');
        el('bu-int').textContent = (neg ? '−' : '') + Number(parts[0]).toLocaleString('fr-FR');
        el('bu-dec').textContent = ',' + parts[1] + ' €';
        big.classList.toggle('neg', neg);
        const pct = (budget !== null && budget > 0 && depense !== null) ? Math.min(100, Math.max(0, depense / budget * 100)) : (neg ? 100 : 0);
        fill.style.width = pct.toFixed(1) + '%';
        fill.classList.toggle('over', neg);
        el('bu-spent').textContent = (depense !== null && budget !== null) ? eur0(depense) + ' dépensés sur ' + eur0(budget) : '';
        /* Jours restants recalculés ici (le document date de la dernière ouverture de Budget) si c'est bien le mois en cours. */
        const now = new Date();
        const courant = NOMS_MOIS[now.getMonth()] + ' ' + now.getFullYear();
        const mois = texte(d.mois, 30);
        let jours = null;
        if (mois === courant) jours = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
        else if (mois) { el('bu-days').textContent = mois; jours = undefined; }
        if (jours !== undefined) {
          el('bu-days').textContent = jours === null ? '' :
            (jours === 0 ? 'Dernier jour' : jours + ' j restants') + (reste > 0 && jours > 0 && reste / jours >= 1 ? ' · ≈ ' + Math.round(reste / jours) + ' €/j' : '');
        }
      }
      pied('bu-maj', d);
    }

    function afficherCourses(d){
      const n = entier(d && d.restants, 0, 9999);
      const chips = el('co-chips');
      chips.textContent = '';
      if (n === null) {
        el('co-int').textContent = '—';
        el('co-label').textContent = '';
      } else {
        el('co-int').textContent = String(n);
        el('co-label').textContent = n === 0 ? 'rien à acheter' : (n > 1 ? 'produits à acheter' : 'produit à acheter');
        (Array.isArray(d.rayons) ? d.rayons.slice(0, 3) : []).forEach((r) => {
          const nom = texte(r && r.nom, 26), k = entier(r && r.n, 0, 9999);
          if (!nom || k === null) return;
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = nom + ' · ' + k;
          chips.appendChild(chip);
        });
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
        const app = firebase.apps.find((a) => a.name === 'portail') || firebase.initializeApp(CONFIG_BASE_PORTAIL, 'portail');
        const auth = app.auth(), db = app.firestore();
        try { await db.enablePersistence({ synchronizeTabs: true }); } catch (e) { /* repli silencieux sur le cache mémoire */ }
        auth.onAuthStateChanged((user) => {
          if (user) {
            db.collection('portail').onSnapshot((snap) => {
              const obj = {};
              snap.forEach((doc) => { obj[doc.id] = doc.data(); });
              resume = obj;
              try { localStorage.setItem(CLE_CACHE, JSON.stringify(obj)); } catch (e) {}
              afficher();
            }, (err) => console.warn('[portail] lecture impossible :', err));
          } else {
            auth.signInAnonymously().catch((err) => console.warn('[portail] connexion anonyme impossible :', err));
          }
        });
      } catch (err) {
        console.warn('[portail] base indisponible, affichage du dernier état connu :', err);
      }
    }

    try { resume = JSON.parse(localStorage.getItem(CLE_CACHE)) || {}; } catch (e) { resume = {}; }
    if (typeof resume !== 'object' || resume === null) resume = {};
    afficher();
    window.addEventListener('load', () => setTimeout(demarrerBase, 0));
    setInterval(afficher, 60000);                       /* « il y a 3 min » reste juste */
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') afficher(); });
  })();

  document.getElementById('hardReload').addEventListener('click', async (e) => {
    // Confirmation ajoutée le 18/09/2026 : ce bouton est destructif pour le
    // hors-ligne du Portail (il faudra le recharger en ligne une fois pour
    // qu'il redevienne disponible sans réseau) — mieux vaut valider le clic.
    const ok = window.confirm('Vider le cache du Portail et recharger ?\n\nLe Portail ne sera plus disponible hors-ligne tant qu\'il n\'aura pas été rouvert au moins une fois avec une connexion.');
    if (!ok) return;

    const btn = e.currentTarget;
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

  /* Service worker (18/09/26) : le fichier sw.js existait déjà à la racine
     du dépôt mais n'avait jamais été enregistré depuis cette page — corrigé
     ici. Chemin ET scope volontairement relatifs ('sw.js', './') plutôt
     qu'absolus, comme dans /Muscu/, /Course/ et désormais /Budget/. */
  /* Horodatage du dernier deploiement de code (pas des donnees) : mise a jour automatiquement (workflow auto-version) a chaque commit sur cette app. Complement du
     bandeau "Nouvelle version disponible". */
/* DERNIERE_MAJ est définie dans index.html (mise à jour automatiquement par le workflow auto-version). */
  function formaterDerniereMaj(iso){
    const d = new Date(iso);
    const jour = String(d.getDate()).padStart(2,'0');
    const mois = String(d.getMonth()+1).padStart(2,'0');
    const h = String(d.getHours()).padStart(2,'0');
    const m = String(d.getMinutes()).padStart(2,'0');
    return `${jour}/${mois}/${d.getFullYear()} à ${h}h${m}`;
  }
  document.getElementById('derniere-maj').textContent = 'Dernière mise à jour du code : ' + formaterDerniereMaj(DERNIERE_MAJ);

  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { scope: './' }).then((reg) => {
        // Une mise à jour du service worker ne signifie pas que la page est périmée (index.html est servi en
        // réseau d'abord) : c'est la vérification de version qui décide (rechargement auto, ou bandeau si saisie).
        const verifierMaj = () => { if (window.__verifierVersion) window.__verifierVersion(true); };
        if (reg.waiting) verifierMaj();
        reg.addEventListener('updatefound', () => {
          const nv = reg.installing;
          if (!nv) return;
          nv.addEventListener('statechange', () => {
            if (nv.state === 'installed' && navigator.serviceWorker.controller) {
              verifierMaj();
            }
          });
        });
      }).catch((err) => console.warn('[sw] enregistrement échoué :', err));
    });
    const btnMaj = document.getElementById('maj-btn');
    if (btnMaj) btnMaj.addEventListener('click', () => window.location.reload());
  }
/* Vérification de version au retour dans l'app (20/09/2026).
   Sur iPhone, une PWA remise au premier plan n'est pas rechargée : elle garde
   l'ancien code en mémoire. Au retour, on relit index.html sur le serveur et on
   compare son horodatage de déploiement avec celui du code en cours. Si une
   version plus récente existe : rechargement automatique, sauf si l'utilisateur
   saisit du texte ou a une fenêtre ouverte (alors : bandeau « Actualiser »). */
(function(){
  if (typeof DERNIERE_MAJ === 'undefined' || !('fetch' in window)) return;
  let dernierControle = 0;
  const estVisible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const utilisateurOccupe = () => {
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable)) return true;
    return Array.from(document.querySelectorAll('.overlay-popup, .confirm-overlay, .modal-overlay, .login-overlay, .modal-fond')).some(estVisible);
  };
  const verifierVersion = async (force) => {
    if (!force && Date.now() - dernierControle < 30000) return;
    dernierControle = Date.now();
    try {
      const rep = await fetch('index.html', { cache: 'no-store' });
      if (!rep.ok) return;
      const m = (await rep.text()).match(/DERNIERE_MAJ\s*=\s*'([^']+)'/);
      if (!m) return;
      if (m[1] === DERNIERE_MAJ) { try { sessionStorage.removeItem('majRechargements'); } catch (e) {} return; }
      // Garde-fou : au plus 2 rechargements automatiques par session (réseau très lent : repli sur une
      // copie ancienne) ; au-delà, on affiche le bandeau au lieu de recharger en boucle.
      let n = 0; try { n = parseInt(sessionStorage.getItem('majRechargements') || '0', 10) || 0; } catch (e) {}
      if (utilisateurOccupe() || n >= 2) {
        const t = document.getElementById('maj-toast');
        if (t) t.style.display = 'flex';
      } else {
        try { sessionStorage.setItem('majRechargements', String(n + 1)); } catch (e) {}
        window.location.reload();
      }
    } catch (e) { /* hors ligne : on garde la version en cours */ }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') verifierVersion();
  });
  // Exposé pour le bloc service worker, et contrôle au lancement (si un réseau lent a fait servir
  // une copie ancienne de la page, on le détecte ici).
  window.__verifierVersion = verifierVersion;
  window.addEventListener('load', () => setTimeout(() => verifierVersion(true), 3000));
})();
