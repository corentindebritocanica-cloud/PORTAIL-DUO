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

  document.querySelectorAll('.big-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      btn.style.transform = 'scale(0.96)';
      setTimeout(() => { window.location.href = url; }, 120);
    });
  });

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
