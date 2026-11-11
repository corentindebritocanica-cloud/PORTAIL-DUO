/* app.js — Recettes (11/11/2026) : recettes partagées entre Corentin et Lisa.
   Architecture reprise de Todo/Course (voir Todo/README.md) :
   - SDK Firebase « compat » + enablePersistence() : lecture hors ligne, écritures mises en file.
   - Compte e-mail du duo (connexionDuo() de ../commun.js) : les règles Firestore refusent l'anonyme.
   - Affichage immédiat depuis un aperçu local (localStorage), remplacé par le 1er instantané Firestore.
   - Une recette = un document.
   DONNÉES (projet course-app-36e9d, déclarées dans /firestore.rules) :
     recettes/{id} = { titre, categorie, portions, prepa (min),
                       cuissons [{ mode, duree, temp, detail }] (anciens champs cuisson/temp/four convertis à la lecture), ingredients [string], etapes [string],
                       notes, favori, creePar, creeLe, maj }
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
const COL = 'recettes';
const CATEGORIES_DEFAUT = ['Petit-déj', 'Plat', 'Dessert', 'Snack', 'Boisson'];
/* Modes de cuisson (12/11/2026) : une recette a une LISTE de cuissons [{ mode, duree (min), temp (°C), detail }]. */
const MODES = {
  classique: ['🔥', 'Four classique'], tournante: ['🌀', 'Chaleur tournante'], cookeo: ['🍲', 'Cookeo'],
  poele: ['🍳', 'Poêle'], casserole: ['🥘', 'Casserole'], airfryer: ['💨', 'Air fryer'],
  gaufrier: ['🧇', 'Gaufrier'], micro: ['📡', 'Micro-ondes'], cru: ['🥗', 'Sans cuisson'], autre: ['♨️', 'Autre']
};
const CLE_APERCU = 'recettes-apercu';

let auth, db;
const dbReady = (async () => {
  auth = firebase.auth();
  db = firebase.firestore();
  try { await db.enablePersistence({ synchronizeTabs: true }); }
  catch (err) { console.warn('Cache Firestore persistant indisponible :', err); }
  await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
})();

/* ---------- Utilitaires ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function nouvelId(){
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = ''; const a = new Uint8Array(20); crypto.getRandomValues(a);
  a.forEach((n) => s += c[n % 62]); return s;
}
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const lignes = (txt) => String(txt || '').split('\n').map((l) => l.trim()).filter(Boolean);
const entier = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : null; };
function profil(){ try { return localStorage.getItem('duo_profile') === 'lisa' ? 'lisa' : 'corentin'; } catch (e) { return 'corentin'; } }
document.documentElement.setAttribute('data-profil', profil() === 'lisa' ? 'Lisa' : 'Corentin');

/* ---------- État ---------- */
const state = { recettes: {}, filtre: 'toutes', recherche: '', ouverte: null, edition: null, charge: false };
try {
  const ap = JSON.parse(localStorage.getItem(CLE_APERCU) || 'null');
  if (ap && typeof ap === 'object'){ state.recettes = ap; state.charge = true; }
} catch (e) {}
function memoriserApercu(){ try { localStorage.setItem(CLE_APERCU, JSON.stringify(state.recettes)); } catch (e) {} }

/* ---------- Écritures (jamais d'attente du serveur : fonctionne hors ligne) ---------- */
function ecrire(action, quoi){
  Promise.resolve().then(action).catch((err) => {
    console.warn('Écriture Firestore :', err);
    if (window.duoEchec) duoEchec(err, quoi || 'Modification');
  });
}

/* ---------- Affichage de la liste ---------- */
/* Cuissons d'une recette ; les recettes d'avant (cuisson / temp / four) sont converties à la volée. */
function cuissonsDe(r){
  if (Array.isArray(r.cuissons)) return r.cuissons;
  if (r.cuisson != null || r.temp != null || r.four) return [{ mode: r.four || 'autre', duree: r.cuisson != null ? r.cuisson : null, temp: r.temp != null ? r.temp : null, detail: '' }];
  return [];
}
function texteCuisson(c){
  const m = MODES[c.mode] || MODES.autre;
  return [m[1], c.temp != null ? c.temp + ' °C' : '', c.duree != null ? c.duree + ' min' : '', c.detail || ''].filter(Boolean).join(' · ');
}
function metasHtml(r, detail){
  const m = [];
  if (r.prepa != null) m.push(`<span class="meta">🥣 ${r.prepa} min</span>`);
  cuissonsDe(r).forEach((c) => m.push(`<span class="meta four">${(MODES[c.mode] || MODES.autre)[0]} ${esc(texteCuisson(c))}</span>`));
  if (detail && r.portions) m.push(`<span class="meta">🍽 ${r.portions} portion${r.portions > 1 ? 's' : ''}</span>`);
  return m.join('');
}
function listeFiltree(){
  const q = norm(state.recherche);
  return Object.keys(state.recettes).map((id) => Object.assign({ id }, state.recettes[id]))
    .filter((r) => {
      if (state.filtre === 'favoris' && !r.favori) return false;
      if (state.filtre !== 'toutes' && state.filtre !== 'favoris' && r.categorie !== state.filtre) return false;
      if (!q) return true;
      return norm([r.titre, r.categorie, (r.ingredients || []).join(' '), cuissonsDe(r).map(texteCuisson).join(' ')].join(' ')).includes(q);
    })
    .sort((a, b) => norm(a.titre).localeCompare(norm(b.titre), 'fr'));
}
function categoriesUtilisees(){
  const s = new Set();
  Object.values(state.recettes).forEach((r) => { if (r.categorie) s.add(r.categorie); });
  return [...s].sort((a, b) => a.localeCompare(b, 'fr'));
}
function renderChips(){
  const cats = categoriesUtilisees();
  const items = [['toutes', 'Toutes'], ['favoris', '★ Favoris']].concat(cats.map((c) => [c, c]));
  if (!items.some(([k]) => k === state.filtre)) state.filtre = 'toutes';
  $('chips').innerHTML = items.map(([k, l]) =>
    `<button type="button" class="chip${k === state.filtre ? ' actif' : ''}" data-f="${esc(k)}">${esc(l)}</button>`).join('');
  const toutes = [...new Set(CATEGORIES_DEFAUT.concat(cats))];
  $('categories').innerHTML = toutes.map((c) => `<option value="${esc(c)}">`).join('');
}
function render(){
  renderChips();
  const liste = $('liste'), vide = $('vide');
  if (!state.charge){
    liste.innerHTML = '<div class="squelette"></div><div class="squelette"></div><div class="squelette"></div>';
    vide.hidden = true; return;
  }
  const l = listeFiltree();
  liste.innerHTML = l.map((r) => `
    <button type="button" class="carte" data-id="${esc(r.id)}">
      <div class="carte-tete"><h3>${esc(r.titre || 'Sans titre')}</h3>${r.favori ? '<span class="etoile">★</span>' : ''}</div>
      ${r.categorie ? `<div class="cat">${esc(r.categorie)}</div>` : ''}
      <div class="metas">${metasHtml(r, false)}</div>
    </button>`).join('');
  vide.hidden = l.length > 0;
  if (!l.length) vide.textContent = Object.keys(state.recettes).length ? 'Aucune recette ne correspond.' : 'Aucune recette pour l\'instant. Touche + pour ajouter la première.';
}

/* ---------- Fiche ---------- */
function ouvrirFiche(id){
  const r = state.recettes[id]; if (!r) return;
  state.ouverte = id;
  $('fiche-titre').textContent = r.titre || 'Sans titre';
  $('fiche-metas').innerHTML = (r.categorie ? `<span class="meta">${esc(r.categorie)}</span>` : '') + metasHtml(r, true);
  const ing = (r.ingredients || []).map((t) => `<li data-coche>${esc(t)}</li>`).join('');
  const eta = (r.etapes || []).map((t) => `<li>${esc(t)}</li>`).join('');
  $('fiche-corps').innerHTML =
    (ing ? `<div class="bloc"><h4>Ingrédients</h4><ul>${ing}</ul></div>` : '') +
    (eta ? `<div class="bloc"><h4>Préparation</h4><ol>${eta}</ol></div>` : '') +
    (r.notes ? `<div class="bloc"><h4>Notes</h4><p>${esc(r.notes)}</p></div>` : '');
  const fav = $('fiche-fav'); fav.textContent = r.favori ? '★' : '☆'; fav.classList.toggle('actif', !!r.favori);
  $('fiche').hidden = false;
}
function fermerFiche(){ $('fiche').hidden = true; state.ouverte = null; }
$('fiche-corps').addEventListener('click', (e) => {   /* toucher un ingrédient le barre (pendant la cuisine) */
  const li = e.target.closest('li[data-coche]'); if (li) li.classList.toggle('coche');
});
$('fiche-fermer').addEventListener('click', fermerFiche);
$('fiche').addEventListener('click', (e) => { if (e.target === $('fiche')) fermerFiche(); });
$('fiche-fav').addEventListener('click', () => {
  const id = state.ouverte, r = state.recettes[id]; if (!r) return;
  r.favori = !r.favori; memoriserApercu(); ouvrirFiche(id); render();
  ecrire(() => db.collection(COL).doc(id).update({ favori: r.favori, maj: Date.now() }), 'Favori');
});
$('fiche-modifier').addEventListener('click', () => { const id = state.ouverte; fermerFiche(); ouvrirEdition(id); });
$('fiche-supprimer').addEventListener('click', () => {
  const id = state.ouverte, r = state.recettes[id]; if (!r) return;
  $('dialogue-texte').textContent = '« ' + (r.titre || 'Sans titre') + ' » sera supprimée pour vous deux.';
  $('dialogue').hidden = false;
  $('dialogue-ok').onclick = () => {
    $('dialogue').hidden = true; fermerFiche();
    delete state.recettes[id]; memoriserApercu(); render();
    ecrire(() => db.collection(COL).doc(id).delete(), 'Suppression');
  };
});
$('dialogue-annuler').addEventListener('click', () => { $('dialogue').hidden = true; });

/* ---------- Édition ---------- */
function ouvrirEdition(id){
  const r = id ? state.recettes[id] : null;
  state.edition = id || null;
  $('edition-titre').textContent = r ? 'Modifier la recette' : 'Nouvelle recette';
  $('f-titre').value = r ? r.titre || '' : '';
  $('f-categorie').value = r ? r.categorie || '' : '';
  $('f-portions').value = r && r.portions != null ? r.portions : '';
  $('f-prepa').value = r && r.prepa != null ? r.prepa : '';
  $('cuissons').innerHTML = '';
  (r ? cuissonsDe(r) : []).forEach(ajouterLigneCuisson);
  $('f-ingredients').value = r ? (r.ingredients || []).join('\n') : '';
  $('f-etapes').value = r ? (r.etapes || []).join('\n') : '';
  $('f-notes').value = r ? r.notes || '' : '';
  $('edition').hidden = false;
}
/* Lignes de cuisson du formulaire (mode, durée, température, détail) */
function ajouterLigneCuisson(c){
  c = c || { mode: 'classique' };
  const d = document.createElement('div'); d.className = 'cuisson';
  d.innerHTML = `
    <div class="ligne">
      <label class="champ">Mode<select class="c-mode">${Object.keys(MODES).map((k) => `<option value="${k}"${k === c.mode ? ' selected' : ''}>${MODES[k][0]} ${MODES[k][1]}</option>`).join('')}</select></label>
      <button type="button" class="btn-icone c-suppr" aria-label="Retirer cette cuisson">✕</button>
    </div>
    <div class="ligne">
      <label class="champ">Durée (min)<input type="number" class="c-duree" inputmode="numeric" min="0" max="9999" value="${c.duree != null ? c.duree : ''}"></label>
      <label class="champ">Température (°C)<input type="number" class="c-temp" inputmode="numeric" min="0" max="500" value="${c.temp != null ? c.temp : ''}"></label>
    </div>
    <label class="champ">Détail<input type="text" class="c-detail" maxlength="60" autocomplete="off" placeholder="Sous pression, feu moyen, th. 6…" value="${esc(c.detail || '')}"></label>`;
  $('cuissons').appendChild(d);
}
$('btn-cuisson').addEventListener('click', () => ajouterLigneCuisson(null));
$('cuissons').addEventListener('click', (e) => { const b = e.target.closest('.c-suppr'); if (b) b.closest('.cuisson').remove(); });
function lireCuissons(){
  return [...document.querySelectorAll('#cuissons .cuisson')].map((d) => ({
    mode: d.querySelector('.c-mode').value,
    duree: entier(d.querySelector('.c-duree').value),
    temp: entier(d.querySelector('.c-temp').value),
    detail: d.querySelector('.c-detail').value.trim()
  }));
}
function fermerEdition(){ $('edition').hidden = true; state.edition = null; }
$('btn-ajouter').addEventListener('click', () => ouvrirEdition(null));
$('edition-fermer').addEventListener('click', fermerEdition);
$('form-recette').addEventListener('submit', (e) => {
  e.preventDefault();
  const titre = $('f-titre').value.trim();
  if (!titre){ $('f-titre').focus(); return; }
  const data = {
    titre,
    categorie: $('f-categorie').value.trim(),
    portions: entier($('f-portions').value),
    prepa: entier($('f-prepa').value),
    cuissons: lireCuissons(),
    ingredients: lignes($('f-ingredients').value),
    etapes: lignes($('f-etapes').value),
    notes: $('f-notes').value.trim(),
    maj: Date.now()
  };
  const id = state.edition || nouvelId();
  const ancien = state.recettes[id];
  const complet = Object.assign({}, ancien || { favori: false, creePar: profil(), creeLe: Date.now() }, data);
  delete complet.cuisson; delete complet.temp; delete complet.four;   /* anciens champs, remplacés par cuissons */
  state.recettes[id] = complet; state.charge = true; memoriserApercu();
  fermerEdition(); render();
  ecrire(() => db.collection(COL).doc(id).set(complet), 'Enregistrement');
});

/* ---------- Import depuis un texte collé (IA, site…) ---------- */
function nettoyerLigne(l){
  return l.replace(/\*\*/g, '').replace(/^\s*(?:[-•◦○▪*]|\d+\s*[.)])\s*/, '').trim();
}
function analyserTexte(txt){
  const out = { titre: '', portions: null, ingredients: [], etapes: [], notes: [] };
  let zone = 'titre';
  lignes(txt).forEach((brut) => {
    const l = nettoyerLigne(brut);
    const n = norm(l).replace(/[:\s]+$/, '');
    if (/^ingredients?$/.test(n)){ zone = 'ing'; return; }
    if (/^(preparation|etapes?|instructions?|recette|realisation)$/.test(n)){ zone = 'eta'; return; }
    if (/^(notes?|astuces?|conseils?)$/.test(n)){ zone = 'notes'; return; }
    if (zone === 'titre'){
      if (!out.titre){
        out.titre = l.replace(/^recette\s+(pour|de|d')\s*/i, '').replace(/^\d+\s+/, (m) => { out.portions = parseInt(m, 10); return ''; });
        const p = l.match(/pour\s+(\d+)/i); if (p) out.portions = parseInt(p[1], 10);
        out.titre = out.titre.charAt(0).toUpperCase() + out.titre.slice(1);
      }
      return;
    }
    if (zone === 'ing') out.ingredients.push(l);
    else if (zone === 'eta') out.etapes.push(l);
    else out.notes.push(l);
  });
  return out;
}
$('btn-coller').addEventListener('click', () => { $('coller-texte').value = ''; $('coller').hidden = false; $('coller-texte').focus(); });
$('coller-annuler').addEventListener('click', () => { $('coller').hidden = true; });
$('coller-ok').addEventListener('click', () => {
  const r = analyserTexte($('coller-texte').value);
  if (r.titre) $('f-titre').value = r.titre;
  if (r.portions) $('f-portions').value = r.portions;
  if (r.ingredients.length) $('f-ingredients').value = r.ingredients.join('\n');
  if (r.etapes.length) $('f-etapes').value = r.etapes.join('\n');
  if (r.notes.length) $('f-notes').value = r.notes.join('\n');
  /* Cuisson repérée dans les étapes (mode, température, durée), ajoutée seulement s'il n'y a encore aucune cuisson */
  const tout = r.etapes.join(' ');
  if (!document.querySelector('#cuissons .cuisson')){
    const nt = norm(tout);
    const mode = /cookeo/.test(nt) ? 'cookeo' : /gaufrier/.test(nt) ? 'gaufrier' : /air ?fryer|friteuse/.test(nt) ? 'airfryer'
      : /chaleur tournante|ventil/.test(nt) ? 'tournante' : /poele/.test(nt) ? 'poele' : /casserole/.test(nt) ? 'casserole'
      : /\bfour\b|enfourn/.test(nt) ? 'classique' : /micro-?onde/.test(nt) ? 'micro' : null;
    if (mode){
      const t = tout.match(/(\d{2,3})\s*°/), dm = [...tout.matchAll(/(\d+)(?:\s*(?:à|a|-)\s*(\d+))?\s*min/gi)].pop();
      ajouterLigneCuisson({ mode, temp: t ? parseInt(t[1], 10) : null, duree: dm ? parseInt(dm[2] || dm[1], 10) : null });
    }
  }
  $('coller').hidden = true;
});

/* ---------- Recherche, filtres ---------- */
$('recherche').addEventListener('input', (e) => { state.recherche = e.target.value; render(); });
$('chips').addEventListener('click', (e) => {
  const b = e.target.closest('.chip'); if (!b) return;
  state.filtre = b.dataset.f; render();
});
$('liste').addEventListener('click', (e) => {
  const c = e.target.closest('.carte'); if (c) ouvrirFiche(c.dataset.id);
});

/* ---------- Résumé pour le Portail : portail/recettes (écrit seulement s'il change) ---------- */
function publierPortail(){
  const toutes = Object.values(state.recettes), cats = {};
  toutes.forEach((r) => { if (r.categorie) cats[r.categorie] = (cats[r.categorie] || 0) + 1; });
  const resume = {
    total: toutes.length,
    favoris: toutes.filter((r) => r.favori).length,
    categories: Object.keys(cats).map((nom) => ({ nom, n: cats[nom] })).sort((a, b) => b.n - a.n).slice(0, 3)
  };
  const sig = JSON.stringify(resume);
  let avant = null; try { avant = localStorage.getItem('recettes-portail-sig'); } catch (e) {}
  if (avant === sig) return;
  ecrire(() => db.collection('portail').doc('recettes').set(Object.assign({ maj: Date.now() }, resume)).then(() => {
    try { localStorage.setItem('recettes-portail-sig', sig); } catch (e) {}
  }), 'Résumé du Portail');
}

/* Bouton « + » de la vitre du Portail : ?saisie=recette ouvre d'office la fenêtre « Nouvelle recette » */
(function saisieDepuisPortail(){
  if (new URLSearchParams(location.search).get('saisie') !== 'recette') return;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  ouvrirEdition(null);
})();

/* ---------- Connexion Firestore ---------- */
function statut(cache, hors){
  const s = $('statut');
  s.className = 'statut ' + (hors ? 'hors' : cache ? 'cache' : 'serveur');
}
window.addEventListener('offline', () => statut(false, true));
window.addEventListener('online', () => statut(true, false));

function demarrer(){
  const afficherConnexion = connexionDuo(auth);
  let arret = null;
  auth.onAuthStateChanged((user) => {
    const compte = !!(user && !user.isAnonymous);
    afficherConnexion(!compte);
    if (compte){
      if (arret) return;
      arret = db.collection(COL).onSnapshot({ includeMetadataChanges: true }, (snap) => {
        statut(snap.metadata.fromCache, !navigator.onLine);
        const obj = {};
        snap.forEach((d) => obj[d.id] = d.data());
        state.recettes = obj; state.charge = true; memoriserApercu(); render();
        if (!snap.metadata.fromCache) publierPortail();
      }, (err) => console.warn('onSnapshot', COL, err));
    } else if (arret){ arret(); arret = null; }
  });
}
dbReady.then(demarrer);
render();
