/* app.js — Todo (11/10/2026) : listes de choses à faire partagées entre Corentin et Lisa.
   Architecture reprise de Course (voir Course/README.md, « Choix d'architecture ») :
   - SDK Firebase 100 % « compat » + enablePersistence() : fonctionne hors ligne (lecture du cache
     local, écritures mises en file et envoyées au retour du réseau).
   - Compte e-mail du duo (session partagée avec les autres apps, connexionDuo() de ../commun.js) :
     les règles Firestore refusent toute session anonyme.
   - Affichage immédiat depuis un aperçu local (localStorage), remplacé dès le 1er instantané Firestore.
   - Une tâche = un document : cocher à deux en même temps n'écrase jamais rien.
   DONNÉES (projet course-app-36e9d, déclarées dans /firestore.rules) :
     todoListes/{id} = { nom, couleur, ordre }      — liste par défaut : id fixe `general`
     todoTaches/{id} = { listeId, texte, fait, ordre, creePar, creeLe, faitPar, faitLe }
     portail/todo    = résumé pour le Portail (voir « RÉSUMÉ POUR LE PORTAIL »)
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
const COL_LISTES = 'todoListes', COL_TACHES = 'todoTaches';

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

/* Écritures différées jusqu'au 1er instantané Firestore (l'interface s'affiche avant, depuis l'aperçu).
   L'interface, elle, est mise à jour tout de suite (état local) : voir ecrire(). */
let signalerFirestorePret;
const firestorePret = new Promise(r=> signalerFirestorePret = r);
const colRef = (nom)=> db.collection(nom);
const docRef = (nom, id)=> db.collection(nom).doc(id);
/* Id créé côté téléphone (aucun aller-retour serveur, fonctionne hors ligne). */
function nouvelId(){
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = ''; const a = new Uint8Array(20); crypto.getRandomValues(a);
  a.forEach(n=> s += c[n % 62]); return s;
}
/* Envoi : n'attend jamais l'accusé du serveur (hors ligne, la promesse ne se résoudrait qu'au retour du réseau). */
function ecrire(action){
  firestorePret.then(action).catch(err=> console.warn('Écriture Firestore :', err));
}

/* Pastille de connexion à côté du titre (../verre.css) : vert = serveur, or = cache local, rouge = hors ligne. */
function majStatutConnexion(depuisCache){
  document.documentElement.dataset.sync = !navigator.onLine ? 'hors-ligne' : (depuisCache ? 'envoi' : 'ok');
}
majStatutConnexion(true);
window.addEventListener('offline', ()=> majStatutConnexion(true));
window.addEventListener('online', ()=> majStatutConnexion(true));
/* includeMetadataChanges (leçon Course du 24/09/2026) : sans lui, le passage cache → serveur n'est
   jamais signalé quand rien n'a changé, et le résumé du Portail ne partirait pas. */
function dbOnCollection(nom, cb){
  let premier = true, etaitCache = true;
  return colRef(nom).onSnapshot({ includeMetadataChanges: true }, snap=>{
    const cache = snap.metadata.fromCache;
    majStatutConnexion(cache);
    const passageServeur = etaitCache && !cache;
    etaitCache = cache;
    if(!premier && !passageServeur && snap.docChanges().length === 0) return;
    premier = false;
    const obj = {};
    snap.forEach(doc=> obj[doc.id] = doc.data());
    cb(obj, cache);
  }, err=> console.warn('onSnapshot', nom, err));
}

/* ============================================================
   ÉTAT + PROFIL (clé commune aux apps : duo_profile = 'corentin' | 'lisa')
   ============================================================ */
function lireProfil(){
  try { return localStorage.getItem('duo_profile') === 'lisa' ? 'lisa' : 'corentin'; } catch (e) { return 'corentin'; }
}
const LISTE_DEFAUT = 'general';
const CLE_LISTE_ACTIVE = 'todo_liste_active';
const CLE_TERMINE_OUVERT = 'todo_termine_ouvert';
const CLE_VU_LE = 'todo_vu_le';
const PALETTE_LISTES = ['#a855f7','#1f8fff','#12b981','#ff8a2b','#ffb800','#22c3e6','#ef4444','#ff3d7e'];
const state = {
  profil: lireProfil(),
  listes: {},
  taches: {},
  listeActive: (()=>{ try { return localStorage.getItem(CLE_LISTE_ACTIVE) || LISTE_DEFAUT; } catch (e) { return LISTE_DEFAUT; } })(),
  termineOuvert: (()=>{ try { return localStorage.getItem(CLE_TERMINE_OUVERT) === '1'; } catch (e) { return false; } })(),
  onglet: 'taches'
};
/* « Nouveau » : tâches ajoutées par l'autre depuis la dernière visite (mémorisée au départ de l'app). */
let vuLe = (()=>{ try { return parseInt(localStorage.getItem(CLE_VU_LE) || '0', 10) || 0; } catch (e) { return 0; } })();
if(!vuLe) vuLe = Date.now();
function memoriserVisite(){ try { localStorage.setItem(CLE_VU_LE, String(Date.now())); } catch (e) {} }
window.addEventListener('pagehide', memoriserVisite);
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'hidden') memoriserVisite();
  else { try { vuLe = parseInt(localStorage.getItem(CLE_VU_LE) || '0', 10) || vuLe; } catch (e) {} }
});

function appliquerProfil(){
  document.documentElement.setAttribute('data-profil', state.profil === 'lisa' ? 'Lisa' : 'Corentin');
  document.getElementById('btn-profil-corentin').classList.toggle('selected', state.profil === 'corentin');
  document.getElementById('btn-profil-lisa').classList.toggle('selected', state.profil === 'lisa');
}
appliquerProfil();   /* avant Firebase : pas de flash de la mauvaise couleur */
function choisirProfil(p){
  state.profil = p;
  try { localStorage.setItem('duo_profile', p); } catch (e) {}
  appliquerProfil(); render();
}
document.getElementById('btn-profil-corentin').addEventListener('click', ()=> choisirProfil('corentin'));
document.getElementById('btn-profil-lisa').addEventListener('click', ()=> choisirProfil('lisa'));

/* ============================================================
   LISTES — données
   La liste « Général » (id fixe `general`) existe toujours, même sans document (entrée virtuelle,
   écrite seulement si on la renomme) ; elle n'est pas supprimable.
   ============================================================ */
function infoListe(id){
  if(state.listes[id]) return state.listes[id];
  if(id === LISTE_DEFAUT) return { nom:'Général', couleur:PALETTE_LISTES[0], ordre:0 };
  return null;
}
function listesTriees(){
  const ids = Object.keys(state.listes);
  if(!ids.includes(LISTE_DEFAUT)) ids.push(LISTE_DEFAUT);
  return ids.map(id=> [id, infoListe(id)])
    .sort((a,b)=> (a[1].ordre||0) - (b[1].ordre||0) || (a[1].nom||'').localeCompare(b[1].nom||''));
}
function couleurListe(id){
  const l = infoListe(id); const c = l && l.couleur;
  return PALETTE_LISTES.includes(c) ? c : PALETTE_LISTES[0];   /* valeur de la base jamais injectée telle quelle dans le style */
}
function listeDe(t){ return (t && t.listeId && infoListe(t.listeId)) ? t.listeId : LISTE_DEFAUT; }
function idListeAffichee(){ return infoListe(state.listeActive) ? state.listeActive : LISTE_DEFAUT; }
function choisirListe(id){
  state.listeActive = id;
  try { localStorage.setItem(CLE_LISTE_ACTIVE, id); } catch (e) {}
  render();
  /* la pastille choisie reste visible dans la bande qui défile */
  const b = document.querySelector(`.liste-chip[data-liste="${CSS.escape(id)}"]`);
  if(b && b.scrollIntoView) b.scrollIntoView({ block:'nearest', inline:'nearest', behavior:'smooth' });
}
function restantes(id){ return Object.values(state.taches).filter(t=> !t.fait && listeDe(t) === id).length; }

/* ============================================================
   RENDU
   ============================================================ */
function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
const PRENOM = { corentin:'Corentin', lisa:'Lisa' };
function dateCourte(ms){
  if(!ms) return '';
  const d = new Date(ms), aujourd = new Date();
  const hier = new Date(); hier.setDate(hier.getDate() - 1);
  if(d.toDateString() === aujourd.toDateString()) return "aujourd'hui";
  if(d.toDateString() === hier.toDateString()) return 'hier';
  return d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
}
const SVG_COCHE = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
function ligneTache(id, t, couleur){
  const auteur = t.creePar === 'lisa' ? 'lisa' : 'corentin';
  const nouvelle = !t.fait && t.creePar && t.creePar !== state.profil && (t.creeLe || 0) > vuLe;
  const detail = t.fait
    ? `Fait${t.faitPar ? ' par ' + PRENOM[t.faitPar === 'lisa' ? 'lisa' : 'corentin'] : ''}${t.faitLe ? ' · ' + dateCourte(t.faitLe) : ''}`
    : `${PRENOM[auteur]} · ${dateCourte(t.creeLe)}`;
  return `<div class="carte-produit tache${t.fait ? ' achete-carte' : ''}" data-id="${escapeHtml(id)}" style="--c-liste:${couleur}">`
    + `<button type="button" class="case case-liste${t.fait ? ' checked' : ''}" data-cocher aria-pressed="${!!t.fait}" aria-label="${t.fait ? 'Décocher' : 'Cocher'} « ${escapeHtml(t.texte)} »">${SVG_COCHE}</button>`
    + `<button type="button" class="infos-produit" data-modifier>`
    + `<span class="nom-produit${t.fait ? ' achete' : ''}">${escapeHtml(t.texte)}${nouvelle ? '<span class="nouvelle-pastille">Nouveau</span>' : ''}</span>`
    + `<span class="rayon-produit"><span class="auteur ${t.fait ? (t.faitPar === 'lisa' ? 'lisa' : 'corentin') : auteur}" aria-hidden="true"></span>${escapeHtml(detail)}</span>`
    + `</button></div>`;
}
function renderTaches(){
  const conteneur = document.getElementById('liste-taches');
  const id = idListeAffichee(), couleur = couleurListe(id);
  document.getElementById('form-ajout').style.setProperty('--c-liste', couleur);
  const taches = Object.entries(state.taches).filter(([,t])=> listeDe(t) === id);
  const aFaire = taches.filter(([,t])=> !t.fait).sort((a,b)=> (a[1].ordre||0) - (b[1].ordre||0));
  const faites = taches.filter(([,t])=> t.fait).sort((a,b)=> (b[1].faitLe||0) - (a[1].faitLe||0));
  let html = '';
  if(aFaire.length){
    html += `<div class="section-rayon"><p class="titre-rayon">À faire · ${aFaire.length}</p>`
      + aFaire.map(([tid,t])=> ligneTache(tid, t, couleur)).join('') + '</div>';
  } else {
    html += faites.length
      ? `<div class="vide"><h2>Tout est fait 🎉</h2><p>Ajoute une tâche avec le champ du haut.</p></div>`
      : `<div class="vide"><h2>Rien à faire</h2><p>Écris une tâche dans le champ du haut, puis Entrée pour enchaîner la suivante.</p></div>`;
  }
  if(faites.length){
    html += `<div class="entete-termine">`
      + `<button type="button" class="btn-replier" data-replier aria-expanded="${state.termineOuvert}"><svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg>Terminé · ${faites.length}</button>`
      + `<button type="button" class="btn-effacer-terminees" data-effacer>Effacer</button></div>`;
    if(state.termineOuvert) html += faites.map(([tid,t])=> ligneTache(tid, t, couleur)).join('');
  }
  conteneur.innerHTML = html;
}
function chipListe(id, l, actif){
  const n = restantes(id), c = couleurListe(id);
  return `<button type="button" class="liste-chip ${actif ? 'actif' : ''}" data-liste="${escapeHtml(id)}" aria-pressed="${actif}" style="--c-liste:${c}">`
    + `<span class="liste-pastille" aria-hidden="true"></span>${escapeHtml(l.nom || '')}`
    + (n ? `<span class="liste-badge" aria-label="${n} à faire">${n}</span>` : '') + `</button>`;
}
function renderSelecteurListes(){
  const active = idListeAffichee();
  document.getElementById('selecteur-listes').innerHTML =
    listesTriees().map(([id,l])=> chipListe(id, l, id === active)).join('')
    + `<button type="button" class="liste-chip liste-chip-ajout" data-liste-ajout aria-label="Nouvelle liste">+</button>`;
}
function renderReglagesListes(){
  document.getElementById('reglages-listes').innerHTML = listesTriees().map(([id,l])=>{
    const n = restantes(id);
    return `<button type="button" class="ligne-liste" data-liste="${escapeHtml(id)}" style="--c-liste:${couleurListe(id)}">`
      + `<span class="liste-pastille liste-pastille-grande" aria-hidden="true"></span>`
      + `<span class="infos-produit"><span class="nom-produit">${escapeHtml(l.nom || '')}</span>`
      + `<span class="rayon-produit">${n ? `${n} à faire` : 'Rien à faire'}</span></span></button>`;
  }).join('');
}
function render(){
  renderSelecteurListes();
  renderTaches();
  renderReglagesListes();
}

/* ============================================================
   NAVIGATION ENTRE ONGLETS
   ============================================================ */
const titres = { taches:'Tâches', parametres:'Réglages' };
document.querySelectorAll('nav.tabbar button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    state.onglet = btn.dataset.tab;
    document.getElementById('app').dataset.onglet = btn.dataset.tab;
    document.querySelectorAll('nav.tabbar button').forEach(b=> b.classList.toggle('actif', b === btn));
    document.querySelectorAll('section.vue').forEach(s=> s.classList.toggle('actif', s.id === 'vue-' + btn.dataset.tab));
    document.getElementById('titre-onglet').textContent = titres[btn.dataset.tab];
    window.scrollTo(0, 0);
  });
});

/* ============================================================
   AJOUT RAPIDE
   Entrée (ou flèche) = ajoute et vide le champ, clavier toujours ouvert pour la tâche suivante.
   Nouvelle tâche en BAS de « À faire » (ordre = horodatage), comme dans Rappels.
   ============================================================ */
const formAjout = document.getElementById('form-ajout');
const champAjout = document.getElementById('champ-ajout');
champAjout.addEventListener('input', ()=> formAjout.classList.toggle('rempli', !!champAjout.value.trim()));
formAjout.addEventListener('submit', (e)=>{
  e.preventDefault();
  const texte = champAjout.value.trim().replace(/\s+/g, ' ').slice(0, 200);
  if(!texte) return;
  const id = nouvelId(), maintenant = Date.now();
  const tache = { listeId: idListeAffichee(), texte, fait:false, ordre: maintenant, creePar: state.profil, creeLe: maintenant, faitPar: null, faitLe: null };
  state.taches[id] = tache; render();
  champAjout.value = ''; formAjout.classList.remove('rempli');
  champAjout.focus();
  ecrire(()=> docRef(COL_TACHES, id).set(tache));
});
/* Barre collée en haut (mécanique de Course, 29/09/2026) : classe .colle seulement quand elle colle. */
(function(){
  const barre = document.querySelector('.barre-recherche');
  let prevu = false;
  function majColle(){
    prevu = false;
    const haut = parseFloat(getComputedStyle(barre).top);
    barre.classList.toggle('colle', window.scrollY > 0 && barre.getBoundingClientRect().top <= (isNaN(haut) ? 0 : haut) + 1);
  }
  window.addEventListener('scroll', ()=>{ if(!prevu){ prevu = true; requestAnimationFrame(majColle); } }, { passive:true });
  window.addEventListener('resize', majColle);
  majColle();
})();
/* Clavier iOS (leçon Course du 29/09/2026) : à l'entrée dans le champ, on remonte en haut, sinon iOS
   fait défiler la page et pousse la barre collée hors de l'écran. Refait pendant l'ouverture du clavier. */
let entreeAjout = 0;
champAjout.addEventListener('focus', ()=>{ entreeAjout = Date.now(); window.scrollTo(0, 0); });
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', ()=>{
    if(document.activeElement === champAjout && Date.now() - entreeAjout < 1500) window.scrollTo(0, 0);
  });
}
/* Bouton + : focus SYNCHRONE dans le geste (sinon iOS n'ouvre pas le clavier). */
document.getElementById('btn-ouvrir-ajout').addEventListener('click', ()=>{ champAjout.focus(); window.scrollTo(0, 0); });

/* ============================================================
   COCHER / MODIFIER / TERMINÉ
   ============================================================ */
document.getElementById('liste-taches').addEventListener('click', async (e)=>{
  const b = e.target.closest('button'); if(!b) return;
  if(b.hasAttribute('data-replier')){
    state.termineOuvert = !state.termineOuvert;
    try { localStorage.setItem(CLE_TERMINE_OUVERT, state.termineOuvert ? '1' : '0'); } catch (err) {}
    return renderTaches();
  }
  if(b.hasAttribute('data-effacer')) return effacerTerminees();
  const ligne = b.closest('.tache'); if(!ligne) return;
  const id = ligne.dataset.id, t = state.taches[id]; if(!t) return;
  if(b.hasAttribute('data-cocher')){
    const fait = !t.fait;
    const maj = fait ? { fait:true, faitPar: state.profil, faitLe: Date.now() } : { fait:false, faitPar:null, faitLe:null };
    Object.assign(t, maj); render();
    ecrire(()=> docRef(COL_TACHES, id).update(maj));
  } else if(b.hasAttribute('data-modifier')){
    ouvrirModaleTache(id);
  }
});
async function effacerTerminees(){
  const id = idListeAffichee();
  const faites = Object.entries(state.taches).filter(([,t])=> t.fait && listeDe(t) === id).map(([tid])=> tid);
  if(!faites.length) return;
  const oui = await dialogue({ titre: faites.length > 1 ? `Effacer les ${faites.length} tâches terminées ?` : 'Effacer la tâche terminée ?', texte:'Elles disparaissent pour vous deux.', ok:'Effacer' });
  if(!oui) return;
  faites.forEach(tid=> delete state.taches[tid]); render();
  ecrire(()=> supprimerParLots(faites.map(tid=> docRef(COL_TACHES, tid))));
}
function supprimerParLots(refs){
  const envois = [];
  for(let i = 0; i < refs.length; i += 400){
    const lot = db.batch();
    refs.slice(i, i + 400).forEach(r=> lot.delete(r));
    envois.push(lot.commit());
  }
  return Promise.all(envois);
}

/* Boîte de dialogue maison (charte §5.9) — dialogue({ titre, texte, ok, annuler, danger }) → Promise<boolean>. */
function dialogue({ titre = '', texte = '', ok = 'OK', annuler = 'Annuler', danger = true } = {}){
  return new Promise((resolve)=>{
    const fond = document.getElementById('dialogue');
    const bOk = document.getElementById('dialogue-ok');
    const bAnnuler = document.getElementById('dialogue-annuler');
    const t = document.getElementById('dialogue-texte');
    document.getElementById('dialogue-titre').textContent = titre;
    t.textContent = texte; t.style.display = texte ? '' : 'none';
    bOk.textContent = ok; bOk.className = danger ? 'btn-danger' : 'btn-enregistrer';
    bAnnuler.textContent = annuler || ''; bAnnuler.style.display = annuler ? '' : 'none';
    const fermer = (res)=>{ fond.style.display = 'none'; bOk.onclick = bAnnuler.onclick = fond.onclick = null; resolve(res); };
    bOk.onclick = ()=> fermer(true);
    bAnnuler.onclick = ()=> fermer(false);
    fond.onclick = (ev)=>{ if(ev.target === fond) fermer(false); };
    fond.style.display = 'flex';
  });
}

/* ============================================================
   FENÊTRE TÂCHE — modifier le texte, changer de liste, supprimer
   ============================================================ */
const modalTache = document.getElementById('modal-tache');
const champTexte = document.getElementById('modal-tache-texte');
const selectListe = document.getElementById('modal-tache-liste');
let tacheEditionId = null;
function ouvrirModaleTache(id){
  const t = state.taches[id]; if(!t) return;
  tacheEditionId = id;
  champTexte.value = t.texte || '';
  selectListe.innerHTML = listesTriees().map(([lid,l])=>
    `<option value="${escapeHtml(lid)}" ${lid === listeDe(t) ? 'selected' : ''}>${escapeHtml(l.nom || '')}</option>`).join('');
  document.getElementById('modal-tache-info').textContent =
    `Ajoutée par ${PRENOM[t.creePar === 'lisa' ? 'lisa' : 'corentin']}${t.creeLe ? ' le ' + new Date(t.creeLe).toLocaleDateString('fr-FR', { day:'numeric', month:'long' }) : ''}.`;
  modalTache.style.display = 'flex';
}
function fermerModaleTache(){ modalTache.style.display = 'none'; tacheEditionId = null; }
document.getElementById('btn-tache-annuler').addEventListener('click', fermerModaleTache);
modalTache.addEventListener('click', (e)=>{ if(e.target === modalTache) fermerModaleTache(); });
document.getElementById('btn-tache-enregistrer').addEventListener('click', ()=>{
  const id = tacheEditionId, t = state.taches[id]; if(!t) return fermerModaleTache();
  const texte = champTexte.value.trim().replace(/\s+/g, ' ').slice(0, 200);
  if(!texte){ champTexte.focus(); return; }
  const maj = {};
  if(texte !== t.texte) maj.texte = texte;
  if(selectListe.value !== listeDe(t) && infoListe(selectListe.value)){ maj.listeId = selectListe.value; maj.ordre = Date.now(); }
  fermerModaleTache();
  if(!Object.keys(maj).length) return;
  Object.assign(t, maj); render();
  ecrire(()=> docRef(COL_TACHES, id).update(maj));
});
document.getElementById('btn-tache-supprimer').addEventListener('click', async ()=>{
  const id = tacheEditionId, t = state.taches[id]; if(!t) return;
  const oui = await dialogue({ titre:'Supprimer « ' + (t.texte || 'cette tâche') + ' » ?', texte:'Elle disparaît pour vous deux.', ok:'Supprimer' });
  if(!oui) return;
  fermerModaleTache();
  delete state.taches[id]; render();
  ecrire(()=> docRef(COL_TACHES, id).delete());
});

/* ============================================================
   LISTES — pastilles, Réglages, fenêtre de création / renommage / couleur / suppression
   ============================================================ */
document.getElementById('selecteur-listes').addEventListener('click', (e)=>{
  const b = e.target.closest('button'); if(!b) return;
  if(b.hasAttribute('data-liste-ajout')) return ouvrirModaleListe(null);
  if(b.dataset.liste && !b.classList.contains('actif')) choisirListe(b.dataset.liste);
});
document.getElementById('reglages-listes').addEventListener('click', (e)=>{
  const b = e.target.closest('.ligne-liste'); if(b) ouvrirModaleListe(b.dataset.liste);
});
document.getElementById('btn-nouvelle-liste').addEventListener('click', ()=> ouvrirModaleListe(null));

const sansAccents = (s)=> (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const modalListe = document.getElementById('modal-liste');
const champNomListe = document.getElementById('modal-liste-nom');
const erreurListe = document.getElementById('modal-liste-erreur');
const choixCouleur = document.getElementById('modal-liste-couleurs');
let listeEditionId = null, couleurChoisie = PALETTE_LISTES[0];
function dessinerCouleurs(){
  choixCouleur.innerHTML = PALETTE_LISTES.map(c=>
    `<button type="button" class="couleur-choix ${c === couleurChoisie ? 'choisie' : ''}" data-couleur="${c}" style="--c-liste:${c}" role="radio" aria-checked="${c === couleurChoisie}" aria-label="Couleur ${c}"></button>`).join('');
}
choixCouleur.addEventListener('click', (e)=>{
  const b = e.target.closest('[data-couleur]'); if(!b) return;
  couleurChoisie = b.dataset.couleur; dessinerCouleurs();
});
function couleurLibre(){
  const prises = listesTriees().map(([id])=> couleurListe(id));
  return PALETTE_LISTES.find(c=> !prises.includes(c)) || PALETTE_LISTES[listesTriees().length % PALETTE_LISTES.length];
}
function ouvrirModaleListe(id){
  listeEditionId = id || null;
  const l = id ? infoListe(id) : null;
  document.getElementById('modal-liste-titre').textContent = id ? 'Modifier la liste' : 'Nouvelle liste';
  champNomListe.value = l ? (l.nom || '') : '';
  couleurChoisie = id ? couleurListe(id) : couleurLibre();
  dessinerCouleurs();
  erreurListe.textContent = '';
  document.getElementById('btn-liste-supprimer').style.display = (id && id !== LISTE_DEFAUT) ? 'block' : 'none';
  modalListe.style.display = 'flex';
  if(!id) setTimeout(()=> champNomListe.focus(), 50);
}
function fermerModaleListe(){ modalListe.style.display = 'none'; listeEditionId = null; }
document.getElementById('btn-liste-annuler').addEventListener('click', fermerModaleListe);
modalListe.addEventListener('click', (e)=>{ if(e.target === modalListe) fermerModaleListe(); });
champNomListe.addEventListener('input', ()=>{ erreurListe.textContent = ''; });
champNomListe.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); enregistrerListe(); } });
document.getElementById('btn-liste-enregistrer').addEventListener('click', enregistrerListe);
function enregistrerListe(){
  const nom = champNomListe.value.trim().replace(/\s+/g, ' ').slice(0, 30);
  if(!nom){ erreurListe.textContent = 'Donne un nom à la liste.'; return; }
  const id = listeEditionId, couleur = couleurChoisie;
  const doublon = listesTriees().find(([i,l])=> i !== id && sansAccents(l.nom) === sansAccents(nom));
  if(doublon){
    if(!id){ fermerModaleListe(); choisirListe(doublon[0]); return; }
    erreurListe.textContent = 'Une liste porte déjà ce nom.'; return;
  }
  fermerModaleListe();
  if(id){
    /* set + merge : crée aussi le document `general` s'il n'existait pas encore (entrée virtuelle) */
    const val = { nom, couleur };
    if(!state.listes[id]) val.ordre = id === LISTE_DEFAUT ? 0 : Date.now();
    state.listes[id] = Object.assign({}, infoListe(id), val); render();
    ecrire(()=> docRef(COL_LISTES, id).set(val, { merge:true }));
  } else {
    const nid = nouvelId(), val = { nom, couleur, ordre: Date.now() };
    state.listes[nid] = val;
    choisirListe(nid);
    ecrire(()=> docRef(COL_LISTES, nid).set(val));
  }
}
/* Supprimer une liste (jamais Général) : ses tâches sont supprimées avec elle, après confirmation. */
document.getElementById('btn-liste-supprimer').addEventListener('click', async ()=>{
  const id = listeEditionId;
  if(!id || id === LISTE_DEFAUT) return;
  const l = infoListe(id) || {};
  const siennes = Object.entries(state.taches).filter(([,t])=> listeDe(t) === id).map(([tid])=> tid);
  const n = siennes.length;
  const oui = await dialogue({
    titre: 'Supprimer « ' + (l.nom || 'cette liste') + ' » ?',
    texte: n ? (n > 1 ? `Ses ${n} tâches sont supprimées aussi, pour vous deux.` : 'Sa tâche est supprimée aussi, pour vous deux.') : 'La liste est vide.',
    ok: 'Supprimer'
  });
  if(!oui) return;
  fermerModaleListe();
  siennes.forEach(tid=> delete state.taches[tid]);
  delete state.listes[id];
  if(state.listeActive === id) choisirListe(LISTE_DEFAUT); else render();
  ecrire(()=> supprimerParLots([...siennes.map(tid=> docRef(COL_TACHES, tid)), docRef(COL_LISTES, id)]));
});

/* ============================================================
   RÉGLAGES › Recharger l'application : désinscrit le service worker de Todo, vide SES caches
   (préfixes todo-*, jamais ceux des autres apps), puis recharge depuis le réseau.
   ============================================================ */
document.getElementById('btn-vider-cache').addEventListener('click', async ()=>{
  const oui = await dialogue({ titre:"Recharger l'application ?", texte:'Le code est retéléchargé. Tes tâches restent dans la base.', ok:'Recharger', danger:false });
  if(!oui) return;
  try {
    if('serviceWorker' in navigator){
      const reg = await navigator.serviceWorker.getRegistration('./');
      if(reg) await reg.unregister();
    }
    if(window.caches){
      const cles = await caches.keys();
      await Promise.all(cles.filter(k=> k.startsWith('todo-')).map(k=> caches.delete(k)));
    }
  } catch (e) { console.warn('Nettoyage du cache :', e); }
  window.location.reload();
});

/* ============================================================
   RÉSUMÉ POUR LE PORTAIL — portail/todo (même mécanique que Course, 22-23/09/2026)
   { maj, aFaire, listes:[{ nom, n, couleur }] (3 max, les plus chargées) }
   Publié seulement après un 1er instantané venu du SERVEUR (jamais un résumé périmé du cache),
   regroupé (0,3 s), avec un secours REST `keepalive` au départ si l'écriture n'est pas confirmée.
   ============================================================ */
const portailRecu = { listes:false, taches:false };
let portailMinuteur = null, portailOk = false, portailJeton = null;
function calculerResumePortail(){
  const parListe = listesTriees().map(([id,l])=> ({ nom: (l.nom || '').slice(0, 30), n: restantes(id), couleur: couleurListe(id) }))
    .filter(x=> x.n > 0).sort((a,b)=> b.n - a.n || a.nom.localeCompare(b.nom));
  return { aFaire: parListe.reduce((s,x)=> s + x.n, 0), listes: parListe.slice(0, 3) };
}
function rafraichirJetonPortail(){
  const u = auth && auth.currentUser;
  if(u) u.getIdToken().then(t=>{ portailJeton = t; }).catch(()=>{});
}
function planifierPublicationPortail(){
  if(!portailRecu.listes || !portailRecu.taches) return;
  portailOk = false;
  rafraichirJetonPortail();
  clearTimeout(portailMinuteur);
  portailMinuteur = setTimeout(()=>{
    portailMinuteur = null;
    docRef('portail', 'todo').set(Object.assign({ maj: Date.now() }, calculerResumePortail()))
      .then(()=>{ portailOk = true; })
      .catch(err=> console.warn('Résumé Portail non publié :', err));
  }, 300);
}
function versValeurFirestore(v){
  if(v === null || v === undefined) return { nullValue: null };
  if(typeof v === 'boolean') return { booleanValue: v };
  if(typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if(typeof v === 'string') return { stringValue: v };
  if(Array.isArray(v)) return { arrayValue: { values: v.map(versValeurFirestore) } };
  const f = {}; Object.keys(v).forEach(k=>{ f[k] = versValeurFirestore(v[k]); });
  return { mapValue: { fields: f } };
}
function secoursPublicationPortail(){
  if(!portailRecu.listes || !portailRecu.taches || portailOk || !portailJeton) return;
  clearTimeout(portailMinuteur); portailMinuteur = null;
  const data = Object.assign({ maj: Date.now() }, calculerResumePortail());
  try {
    fetch('https://firestore.googleapis.com/v1/projects/course-app-36e9d/databases/(default)/documents/portail/todo', {
      method: 'PATCH', keepalive: true,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + portailJeton },
      body: JSON.stringify({ fields: versValeurFirestore(data).mapValue.fields })
    }).then(r=>{ if(r.ok) portailOk = true; }).catch(()=>{});
  } catch (e) {}
}
window.addEventListener('pagehide', secoursPublicationPortail);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden') secoursPublicationPortail(); });

/* ============================================================
   APERÇU LOCAL — affichage immédiat
   ⚠️ Sert UNIQUEMENT à l'affichage (leçon Course du 18/09/2026) : jamais écrit dans Firestore,
   remplacé intégralement dès le 1er instantané (cache local ou serveur), qui seul fait foi.
   ============================================================ */
const CLE_APERCU = 'todo_apercu_v1';
const firestoreRecu = { listes:false, taches:false };
(function afficherApercu(){
  try {
    const a = JSON.parse(localStorage.getItem(CLE_APERCU) || 'null');
    if(a && a.taches && typeof a.taches === 'object' && a.listes && typeof a.listes === 'object'){
      state.taches = a.taches; state.listes = a.listes;
    }
  } catch (e) {}
  render();
})();
function memoriserApercu(){
  if(!firestoreRecu.listes || !firestoreRecu.taches) return;   /* jamais un état à moitié chargé */
  try { localStorage.setItem(CLE_APERCU, JSON.stringify({ listes: state.listes, taches: state.taches })); } catch (e) {}
}
function recuDeFirestore(nom){
  firestoreRecu[nom] = true;
  if(firestoreRecu.listes && firestoreRecu.taches) signalerFirestorePret();
  memoriserApercu();
}

/* ============================================================
   DÉMARRAGE — compte du duo uniquement (session partagée avec les autres apps)
   ============================================================ */
function demarrer(){
  const afficherConnexion = connexionDuo(auth);
  let ecoutes = null;
  auth.onAuthStateChanged(user=>{
    const compte = !!(user && !user.isAnonymous);
    afficherConnexion(!compte);
    if(compte){
      if(ecoutes) return;
      ecoutes = [
        dbOnCollection(COL_LISTES, (obj, cache)=>{ state.listes = obj; if(!cache) portailRecu.listes = true; render(); recuDeFirestore('listes'); planifierPublicationPortail(); }),
        dbOnCollection(COL_TACHES, (obj, cache)=>{ state.taches = obj; if(!cache) portailRecu.taches = true; render(); recuDeFirestore('taches'); planifierPublicationPortail(); })
      ];
    } else if(ecoutes){
      ecoutes.forEach(arret=> arret()); ecoutes = null;
    }
  });
}
dbReady.then(demarrer);

/* Date de MAJ, service worker et vérification de version : ../commun.js. */
