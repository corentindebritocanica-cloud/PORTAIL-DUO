/* app.js — Recettes (11/11/2026) : recettes partagées entre Corentin et Lisa.
   Architecture reprise de Todo/Course (voir Todo/README.md) :
   - SDK Firebase « compat » + enablePersistence() : lecture hors ligne, écritures mises en file.
   - Compte e-mail du duo (connexionDuo() de ../commun.js) : les règles Firestore refusent l'anonyme.
   - Affichage immédiat depuis un aperçu local (localStorage), remplacé par le 1er instantané Firestore.
   - Une recette = un document.
   DONNÉES (projet course-app-36e9d, déclarées dans /firestore.rules) :
     recettes/{id} = { titre, categorie, portions, prepa (min), cuisson (min), temp (°C),
                       four ('' | 'classique' | 'tournante'), ingredients [string], etapes [string],
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
const FOURS = { classique: 'Four classique', tournante: 'Chaleur tournante' };
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
function tempsTotal(r){ return (r.prepa || 0) + (r.cuisson || 0); }
function metasHtml(r, detail){
  const m = [];
  if (r.prepa != null) m.push(`<span class="meta">🥣 ${r.prepa} min</span>`);
  if (r.cuisson != null) m.push(`<span class="meta">⏱ ${r.cuisson} min cuisson</span>`);
  if (r.temp != null || r.four){
    const t = [r.temp != null ? r.temp + ' °C' : '', r.four ? FOURS[r.four] : ''].filter(Boolean).join(' · ');
    m.push(`<span class="meta four">🔥 ${esc(t)}</span>`);
  }
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
      return norm([r.titre, r.categorie, (r.ingredients || []).join(' ')].join(' ')).includes(q);
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
  $('f-cuisson').value = r && r.cuisson != null ? r.cuisson : '';
  $('f-temp').value = r && r.temp != null ? r.temp : '';
  $('f-four').value = r ? r.four || '' : '';
  $('f-ingredients').value = r ? (r.ingredients || []).join('\n') : '';
  $('f-etapes').value = r ? (r.etapes || []).join('\n') : '';
  $('f-notes').value = r ? r.notes || '' : '';
  $('edition').hidden = false;
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
    cuisson: entier($('f-cuisson').value),
    temp: entier($('f-temp').value),
    four: $('f-four').value,
    ingredients: lignes($('f-ingredients').value),
    etapes: lignes($('f-etapes').value),
    notes: $('f-notes').value.trim(),
    maj: Date.now()
  };
  const id = state.edition || nouvelId();
  const ancien = state.recettes[id];
  const complet = Object.assign({}, ancien || { favori: false, creePar: profil(), creeLe: Date.now() }, data);
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
  /* Durée de cuisson et température repérées dans les étapes (ex. « 3 à 5 minutes », « 180 °C »), proposées seulement si les champs sont vides */
  const tout = r.etapes.join(' ');
  const t = tout.match(/(\d{2,3})\s*°\s*C?/i); if (t && !$('f-temp').value) $('f-temp').value = t[1];
  if (/chaleur tournante|ventil/i.test(tout) && !$('f-four').value) $('f-four').value = 'tournante';
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
      }, (err) => console.warn('onSnapshot', COL, err));
    } else if (arret){ arret(); arret = null; }
  });
}
dbReady.then(demarrer);
render();
