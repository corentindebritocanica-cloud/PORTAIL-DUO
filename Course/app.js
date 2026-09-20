/* app.js — code de l'app.
   Extrait des anciens <script> inline de index.html le 20/09/2026 (contenu inchangé,
   sauf la constante DERNIERE_MAJ, qui reste dans index.html : voir README). */
/* ============================================================
   FIREBASE — init + persistance
   Choix délibérés suite aux incidents du 18/09/2026 :
   - SDK 100% "compat" (pas de import() dynamique cross-origin, qui avait
     échoué silencieusement à se mettre en cache) : firebase.firestore()
     et son enablePersistence() classique suffisent, moins de pièces
     mobiles = moins de risques.
   - Authentification ANONYME (signInAnonymously) : pas d'écran de
     connexion, le choix "Corentin/Lisa" dans Réglages n'est qu'une
     préférence d'affichage/thème locale (localStorage), pas un compte.
   - AUCUNE logique de "réinjection si vide" : le catalogue de départ est
     importé une seule fois côté serveur (script d'import), jamais par
     l'app elle-même.
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyCc12HZotF_AmmPHvSr0eXBYWOLSnBOONw",
  authDomain: "course-app-36e9d.firebaseapp.com",
  projectId: "course-app-36e9d",
  storageBucket: "course-app-36e9d.firebasestorage.app",
  messagingSenderId: "55041357024",
  appId: "1:55041357024:web:48ee2d71b97dc15c55cc85"
};
firebase.initializeApp(firebaseConfig);
let auth, db;

const dbReady = (async () => {
  auth = firebase.auth();
  db = firebase.firestore();
  try {
    await db.enablePersistence({ synchronizeTabs: true });
  } catch (err) {
    console.warn('Cache Firestore persistant indisponible, repli sur le cache mémoire :', err);
  }
  await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
})();

function colRef(nom){ return db.collection(nom); }
function docRef(nom, id){ return db.collection(nom).doc(id); }
function dbUpdateDoc(nom, id, val){ return docRef(nom, id).update(val); }
function dbSetDoc(nom, id, val){ return docRef(nom, id).set(val); }
function dbAddDoc(nom, val){ return colRef(nom).add(val); }
function dbDeleteDoc(nom, id){ return docRef(nom, id).delete(); }
function dbOnCollection(nom, cb){
  colRef(nom).onSnapshot(snap=>{
    const obj = {};
    snap.forEach(doc=> obj[doc.id] = doc.data());
    cb(obj);
  }, err=> console.warn('onSnapshot', nom, err));
}
function authListen(cb){ auth.onAuthStateChanged(cb); }

/* ============================================================
   ÉTAT
   ============================================================ */
const state = {
  produits: {},
  rayons: {},
  profil: localStorage.getItem('profil') || 'Corentin',
  ongletActif: 'liste',
  recherche: '',
  editionId: null,   // id du produit en cours d'édition dans la modale (null = ajout)
};

/* ============================================================
   THÈME / PROFIL
   ============================================================ */
function appliquerProfil(){
  document.documentElement.setAttribute('data-profil', state.profil);
  document.getElementById('btn-profil-corentin').classList.toggle('actif', state.profil==='Corentin');
  document.getElementById('btn-profil-lisa').classList.toggle('actif', state.profil==='Lisa');
}
// Appliqué tout de suite (avant même Firebase) pour éviter un flash du mauvais thème.
appliquerProfil();

document.getElementById('btn-profil-corentin').addEventListener('click', ()=>{
  state.profil = 'Corentin'; localStorage.setItem('profil','Corentin'); appliquerProfil();
});
document.getElementById('btn-profil-lisa').addEventListener('click', ()=>{
  state.profil = 'Lisa'; localStorage.setItem('profil','Lisa'); appliquerProfil();
});

/* ============================================================
   NAVIGATION ENTRE ONGLETS
   ============================================================ */
const titres = { liste:'Liste', course:'Course', parametres:'Réglages' };
document.querySelectorAll('nav.tabbar button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    state.ongletActif = btn.dataset.tab;
    document.getElementById('app').dataset.onglet = btn.dataset.tab;
    document.querySelectorAll('nav.tabbar button').forEach(b=> b.classList.toggle('actif', b===btn));
    document.querySelectorAll('section.vue').forEach(s=> s.classList.toggle('actif', s.id==='vue-'+btn.dataset.tab));
    document.getElementById('titre-onglet').textContent = titres[btn.dataset.tab];
  });
});

/* ============================================================
   RENDU — Liste
   ============================================================ */
function nomsRayonsTries(){
  return Object.entries(state.rayons).sort((a,b)=> (a[1].nom||'').localeCompare(b[1].nom||''));
}

function renderListe(){
  const conteneur = document.getElementById('liste-produits');
  const recherche = state.recherche.trim().toLowerCase();

  const items = Object.entries(state.produits).filter(([id,p])=>
    !recherche || (p.nom||'').toLowerCase().includes(recherche)
  );

  if(items.length===0){
    conteneur.innerHTML = `<div class="vide"><h2>Rien trouvé</h2><p>Essaie un autre mot, ou ajoute le produit avec le bouton +.</p></div>`;
    return;
  }

  // Tri par popularité : le compteur (nombre de fois acheté via "Course
  // terminée") d'abord, ordre alphabétique en cas d'égalité (ou pour les
  // produits jamais encore achetés, compteur 0).
  items.sort((a,b)=>{
    const diff = (b[1].compteur||0) - (a[1].compteur||0);
    if(diff !== 0) return diff;
    return (a[1].nom||'').localeCompare(b[1].nom||'');
  });

  conteneur.innerHTML = items.map(([id,p])=> carteProduitListe(id,p)).join('');
}

function carteProduitListe(id, p){
  const rayon = state.rayons[p.rayonId];
  return `
    <div class="carte-produit">
      <button class="case ${p.aAcheter?'checked':''}" onclick="toggleAAcheter('${id}')" aria-label="À acheter">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <div class="infos-produit">
        <p class="nom-produit">${escapeHtml(p.nom||'')}</p>
        <p class="rayon-produit">${escapeHtml(rayon ? rayon.nom : 'Sans rayon')}</p>
      </div>
      <input class="qte-produit" value="${escapeHtml(p.quantite||'')}" placeholder="Qté/info"
        onchange="updateQuantite('${id}', this.value)">
      <button class="btn-crayon" onclick="ouvrirModale('${id}')" aria-label="Modifier">&#9998;</button>
    </div>`;
}

function toggleAAcheter(id){
  const p = state.produits[id]; if(!p) return;
  dbUpdateDoc('produits', id, { aAcheter: !p.aAcheter });
}
function updateQuantite(id, val){
  dbUpdateDoc('produits', id, { quantite: val });
}

/* ============================================================
   RENDU — Course
   ============================================================ */
function renderCourse(){
  const conteneur = document.getElementById('liste-course');
  const items = Object.entries(state.produits).filter(([id,p])=> p.aAcheter);
  if(items.length===0){
    conteneur.innerHTML = `<div class="vide"><h2>Rien à acheter</h2><p>Coche des produits dans l'onglet Liste pour les voir apparaître ici.</p></div>`;
    document.getElementById('btn-course-terminee').disabled = true;
    return;
  }
  const parRayon = {};
  items.forEach(([id,p])=> (parRayon[p.rayonId||''] ||= []).push([id,p]));

  let html = '';
  nomsRayonsTries().forEach(([rayonId, rayon])=>{
    const arr = parRayon[rayonId];
    if(!arr || arr.length===0) return;
    arr.sort((a,b)=> (a[1].nom||'').localeCompare(b[1].nom||''));
    html += `<div class="section-rayon"><p class="titre-rayon">${escapeHtml(rayon.nom)}</p>`;
    arr.forEach(([id,p])=> html += carteProduitCourse(id,p));
    html += `</div>`;
  });
  if(parRayon['']){
    html += `<div class="section-rayon"><p class="titre-rayon">Sans rayon</p>`;
    parRayon[''].forEach(([id,p])=> html += carteProduitCourse(id,p));
    html += `</div>`;
  }
  conteneur.innerHTML = html;
  document.getElementById('btn-course-terminee').classList.toggle('visible', items.some(([id,p])=> p.achete));
}

function carteProduitCourse(id, p){
  return `
    <div class="carte-produit ${p.achete?'achete-carte':''}">
      <button class="case ${p.achete?'checked':''}" onclick="toggleAchete('${id}')" aria-label="Acheté">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <div class="infos-produit">
        <p class="nom-produit ${p.achete?'achete':''}">${escapeHtml(p.nom||'')}</p>
        ${p.quantite ? `<p class="rayon-produit">${escapeHtml(p.quantite)}</p>` : ''}
      </div>
    </div>`;
}

function toggleAchete(id){
  const p = state.produits[id]; if(!p) return;
  dbUpdateDoc('produits', id, { achete: !p.achete });
  // Pas de mise a jour optimiste ici : le listener temps reel sur 'produits'
  // rappelle render()/renderCourse() a chaque ecriture, qui recalcule
  // correctement la visibilite du bouton (evite un etat incorrect si on
  // decoche le dernier produit coche).
}

document.getElementById('btn-course-terminee').addEventListener('click', ()=>{
  const aEffacer = Object.entries(state.produits).filter(([id,p])=> p.aAcheter && p.achete);
  if(aEffacer.length===0) return;
  const batch = db.batch();
  aEffacer.forEach(([id])=> batch.update(docRef('produits', id), {
    aAcheter:false, achete:false,
    compteur: firebase.firestore.FieldValue.increment(1)
  }));
  batch.commit();
});

/* ============================================================
   RECHERCHE
   ============================================================ */
const champRecherche = document.getElementById('champ-recherche');
const btnEffacerRecherche = document.getElementById('btn-effacer-recherche');
champRecherche.addEventListener('input', ()=>{
  state.recherche = champRecherche.value;
  btnEffacerRecherche.style.display = state.recherche ? 'flex' : 'none';
  renderListe();
});
btnEffacerRecherche.addEventListener('click', ()=>{
  champRecherche.value=''; state.recherche=''; btnEffacerRecherche.style.display='none';
  renderListe(); champRecherche.focus();
});

/* ============================================================
   MODALE AJOUT / ÉDITION (le même formulaire pour les deux)
   ============================================================ */
const modal = document.getElementById('modal-produit');
const selectRayon = document.getElementById('modal-rayon');
const champNouveauRayon = document.getElementById('champ-nouveau-rayon');

function peuplerSelectRayons(rayonIdSelectionne){
  const options = nomsRayonsTries().map(([id,r])=>
    `<option value="${id}" ${id===rayonIdSelectionne?'selected':''}>${escapeHtml(r.nom)}</option>`
  ).join('');
  selectRayon.innerHTML = options + `<option value="__nouveau__">+ Nouveau rayon…</option>`;
}

selectRayon.addEventListener('change', ()=>{
  champNouveauRayon.style.display = selectRayon.value==='__nouveau__' ? 'block' : 'none';
});

function ouvrirModale(id){
  state.editionId = id || null;
  const p = id ? state.produits[id] : null;
  document.getElementById('modal-titre').textContent = id ? 'Modifier le produit' : 'Ajouter un produit';
  document.getElementById('modal-nom').value = p ? (p.nom||'') : '';
  peuplerSelectRayons(p ? p.rayonId : '');
  champNouveauRayon.style.display = 'none';
  document.getElementById('modal-nouveau-rayon').value = '';
  document.getElementById('btn-modal-supprimer').style.display = id ? 'block' : 'none';
  modal.style.display = 'flex';
  setTimeout(()=> document.getElementById('modal-nom').focus(), 50);
}
function fermerModale(){ modal.style.display = 'none'; state.editionId = null; }

document.getElementById('btn-ouvrir-ajout').addEventListener('click', ()=> ouvrirModale(null));
document.getElementById('btn-modal-annuler').addEventListener('click', fermerModale);
modal.addEventListener('click', (e)=>{ if(e.target===modal) fermerModale(); });

document.getElementById('btn-modal-enregistrer').addEventListener('click', async ()=>{
  const nom = document.getElementById('modal-nom').value.trim();
  if(!nom) return;
  let rayonId = selectRayon.value;

  if(rayonId==='__nouveau__'){
    const nomRayon = document.getElementById('modal-nouveau-rayon').value.trim();
    if(!nomRayon) return;
    const ref = await dbAddDoc('rayons', { nom: nomRayon });
    rayonId = ref.id;
  }

  if(state.editionId){
    await dbUpdateDoc('produits', state.editionId, { nom, rayonId });
  } else {
    await dbAddDoc('produits', { nom, rayonId, quantite:'', aAcheter:false, achete:false, compteur:0 });
  }
  fermerModale();
});

document.getElementById('btn-modal-supprimer').addEventListener('click', async ()=>{
  if(!state.editionId) return;
  if(!window.confirm('Supprimer définitivement ce produit ?')) return;
  await dbDeleteDoc('produits', state.editionId);
  fermerModale();
});

/* ============================================================
   VIDER LE CACHE (Réglages) — scope strictement limité à Course,
   avec confirmation (mêmes précautions que le bouton du Portail
   corrigé le 18/09/2026 : jamais toucher aux caches/SW des autres apps).
   ============================================================ */
document.getElementById('btn-vider-cache').addEventListener('click', async ()=>{
  const ok = window.confirm("Vider le cache de Courses et recharger ?\n\nL'app ne sera plus disponible hors-ligne tant qu'elle n'aura pas été rouverte au moins une fois avec une connexion.");
  if(!ok) return;
  try{
    if('caches' in window){
      const CACHE_PREFIX = 'courses-lc-shell-';
      const names = await caches.keys();
      await Promise.all(names.filter(n=> n.startsWith(CACHE_PREFIX)).map(n=> caches.delete(n)));
    }
    if('serviceWorker' in navigator){
      const scopeCourse = new URL('./', window.location.href).href;
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.filter(r=> r.scope===scopeCourse).map(r=> r.unregister()));
    }
  } catch(err){ /* silencieux : on recharge quand même */ }
  window.location.href = window.location.pathname + '?_r=' + Date.now();
});

/* ============================================================
   RENDU GLOBAL + DÉMARRAGE
   ============================================================ */
function render(){
  renderListe();
  renderCourse();
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function demarrer(){
  authListen(user=>{
    if(user){
      dbOnCollection('produits', obj=>{ state.produits = obj; render(); });
      dbOnCollection('rayons', obj=>{ state.rayons = obj; render(); });
      document.getElementById('app').style.display = 'flex';
    } else {
      auth.signInAnonymously().catch(err=> console.error('Connexion anonyme impossible :', err));
    }
  });
}
dbReady.then(demarrer);

/* ============================================================
   THEME CLAIR / SOMBRE (charte UX/UI)
   ============================================================ */
(function(){
  const root = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  const stocke = localStorage.getItem('course-theme');
  function appliquer(theme){
    root.classList.toggle('light-mode', theme === 'light');
    btn.textContent = theme === 'light' ? '☀️' : '🌙';
  }
  appliquer(stocke === 'light' ? 'light' : 'dark');
  btn.addEventListener('click', ()=>{
    const nouveauTheme = root.classList.contains('light-mode') ? 'dark' : 'light';
    localStorage.setItem('course-theme', nouveauTheme);
    appliquer(nouveauTheme);
  });
})();

/* Horodatage du dernier deploiement de code (pas des donnees) : mise a jour automatiquement (workflow auto-version) a chaque commit sur cette app. Complement du bandeau
   "Nouvelle version disponible". */
/* DERNIERE_MAJ est définie dans index.html (mise à jour automatiquement par le workflow auto-version). */
function formaterDerniereMaj(iso){
  const d = new Date(iso);
  const jour = String(d.getDate()).padStart(2,'0');
  const mois = String(d.getMonth()+1).padStart(2,'0');
  const h = String(d.getHours()).padStart(2,'0');
  const m = String(d.getMinutes()).padStart(2,'0');
  return `${jour}/${mois}/${d.getFullYear()} à ${h}h${m}`;
}
const elDerniereMaj = document.getElementById('derniere-maj');
if (elDerniereMaj) elDerniereMaj.textContent = 'Dernière mise à jour du code : ' + formaterDerniereMaj(DERNIERE_MAJ);

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
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
    }).catch(err=>{
      console.warn('Service worker non enregistré :', err);
    });
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
