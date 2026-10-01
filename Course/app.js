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
     → REMPLACÉE le 29/09/2026 par le compte e-mail du duo (voir demarrer()).
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

/* Écritures différées tant que Firestore n'a pas livré son 1er instantané (24/09/2026).
   L'interface s'affiche désormais AVANT Firebase, depuis un aperçu local (voir APERÇU
   plus bas) : un tap très rapide pourrait donc partir avant l'authentification. La valeur
   écrite est calculée AU MOMENT DU TAP (ce que l'utilisateur voit), seul l'envoi attend. */
let signalerFirestorePret;
const firestorePret = new Promise(r=> signalerFirestorePret = r);

function colRef(nom){ return db.collection(nom); }
function docRef(nom, id){ return db.collection(nom).doc(id); }
function dbUpdateDoc(nom, id, val){ return firestorePret.then(()=> docRef(nom, id).update(val)); }
function dbAddDoc(nom, val){ return firestorePret.then(()=> colRef(nom).add(val)); }
function dbDeleteDoc(nom, id){ return firestorePret.then(()=> docRef(nom, id).delete()); }
/* 24/09/2026 : `includeMetadataChanges: true`. Sans cette option, quand le serveur confirme
   que le cache local est déjà à jour (aucune modification depuis la dernière ouverture),
   Firestore n'envoie AUCUN nouvel événement : l'app restait sur `fromCache = true` pour
   toujours, et le résumé du Portail n'était jamais publié. On ne rappelle `cb` que si
   c'est la 1re fois, si des documents ont changé, ou au passage cache → serveur (pas à
   chaque petit changement de métadonnées, pour ne pas redessiner la liste pour rien). */
/* Pastille de connexion à côté du titre (28/09/2026, voir verre.css) : vert = données du serveur,
   or = encore sur le cache local (synchronisation en cours), rouge = hors ligne. */
function majStatutConnexion(depuisCache){
  document.documentElement.dataset.sync = !navigator.onLine ? 'hors-ligne' : (depuisCache ? 'envoi' : 'ok');
}
majStatutConnexion(true);
window.addEventListener('offline', ()=> majStatutConnexion(true));
window.addEventListener('online', ()=> majStatutConnexion(true));
function dbOnCollection(nom, cb){
  let premier = true, etaitCache = true;
  return colRef(nom).onSnapshot({ includeMetadataChanges: true }, snap=>{   /* renvoie la fonction d'arrêt (29/09/2026) */
    const cache = snap.metadata.fromCache;
    majStatutConnexion(cache);
    const passageServeur = etaitCache && !cache;
    etaitCache = cache;   /* toujours suivi, même quand on ne rappelle pas `cb` (coupure réseau puis retour) */
    if(!premier && !passageServeur && snap.docChanges().length === 0) return;
    premier = false;
    const obj = {};
    snap.forEach(doc=> obj[doc.id] = doc.data());
    cb(obj, cache);   /* 2e argument (22/09/26) : vrai = données du cache local, pas encore du serveur */
  }, err=> console.warn('onSnapshot', nom, err));
}
function authListen(cb){ auth.onAuthStateChanged(cb); }

/* ============================================================
   ÉTAT
   ============================================================ */
/* PROFIL COMMUN AUX 4 APPS (28/09/2026) : clé localStorage duo_profile ('corentin' | 'lisa'),
   partagée avec le Portail, Muscu et Budget. Ancienne clé propre à Course ('profil', 'Corentin' |
   'Lisa') reprise une fois puis effacée. En interne, Course garde 'Corentin' / 'Lisa'
   (attribut html[data-profil] et boutons du sélecteur). */
function lireProfilCommun(){
  try {
    let p = localStorage.getItem('duo_profile');
    if (p !== 'corentin' && p !== 'lisa') {
      p = localStorage.getItem('profil') === 'Lisa' ? 'lisa' : 'corentin';
      localStorage.setItem('duo_profile', p);
    }
    localStorage.removeItem('profil');
    return p === 'lisa' ? 'Lisa' : 'Corentin';
  } catch (e) { return 'Corentin'; }
}
function ecrireProfilCommun(nom){
  try { localStorage.setItem('duo_profile', nom === 'Lisa' ? 'lisa' : 'corentin'); } catch (e) {}
}

/* ============================================================
   LISTES DE COURSES (30/09/2026, demandes de Corentin) — v2 « catalogue commun »
   - UN SEUL CATALOGUE : tous les produits apparaissent dans toutes les listes.
   - UNE SEULE COCHE par produit (`aAcheter`) ; `listeId` = la liste qui l'a coché, dont la
     COULEUR habille la coche. Cocher dans la liste X un produit coché par Y le fait passer
     dans X (il reste à acheter) ; le cocher dans sa propre liste le décoche.
   - Onglet Course : TOUTES les listes ensemble (chaque produit à la couleur de sa liste),
     pastille « Toutes » par défaut, les autres pastilles filtrent une seule liste.
   - Collection `listes/{id}` = { nom, ordre, couleur } ; liste d'origine = id fixe `maison`,
     jamais supprimable. `listeId` absent = `maison`. Si `listes/maison` manque, Maison existe
     quand même dans l'interface (entrée virtuelle, jamais écrite par l'app sauf renommage).
   - Liste choisie (onglet Liste) mémorisée PAR TÉLÉPHONE (localStorage `courses_liste_active`).
   - Rayons communs à toutes les listes.
   ============================================================ */
const LISTE_DEFAUT = 'maison';
const CLE_LISTE_ACTIVE = 'courses_liste_active';
const TOUTES = '__toutes__';   /* filtre de l'onglet Course : toutes les listes */
/* Palette des listes : couleurs lisibles sur fond sombre, distinctes du bleu/rose des profils
   en tête de liste. Maison = vert « Frigo » (couleur d'identité de Course). */
const PALETTE_LISTES = ['#12b981','#ff8a2b','#a855f7','#ffb800','#22c3e6','#ef4444','#ff3d7e','#1f8fff'];
const COULEUR_MAISON = PALETTE_LISTES[0];
let listesConnues = false;   /* vrai dès que les listes sont connues (aperçu local ou Firestore) */
function lireListeActive(){
  try { return localStorage.getItem(CLE_LISTE_ACTIVE) || LISTE_DEFAUT; } catch (e) { return LISTE_DEFAUT; }
}
function listeDe(p){ return (p && p.listeId) || LISTE_DEFAUT; }
function listesTriees(){
  const l = Object.assign({}, state.listes);
  if(!l[LISTE_DEFAUT]) l[LISTE_DEFAUT] = { nom:'Maison', ordre:0 };
  return Object.entries(l).sort((a,b)=> ((a[1].ordre||0) - (b[1].ordre||0)) || (a[1].nom||'').localeCompare(b[1].nom||''));
}
function infoListe(id){
  const e = listesTriees().find(([i])=> i === id);
  return e ? e[1] : (state.listes[LISTE_DEFAUT] || { nom:'Maison' });
}
/* Couleur d'une liste : celle choisie, sinon une couleur de la palette déduite de sa place
   (stable tant que l'ordre des listes ne change pas). Toujours un hex de la palette. */
function couleurListe(id){
  const l = state.listes[id];
  if(l && PALETTE_LISTES.includes(l.couleur)) return l.couleur;
  if(id === LISTE_DEFAUT) return COULEUR_MAISON;
  const i = listesTriees().findIndex(([x])=> x === id);
  return PALETTE_LISTES[(i < 0 ? 0 : i) % PALETTE_LISTES.length];
}
/* Liste choisie : la mémorisée, sauf si elle n'existe plus → Maison. */
function idListeAffichee(){
  if(!listesConnues) return state.listeActive;
  return listesTriees().some(([id])=> id === state.listeActive) ? state.listeActive : LISTE_DEFAUT;
}
/* Filtre de l'onglet Course (non mémorisé : « Toutes » à chaque ouverture). */
function filtreCourse(){
  if(state.filtreCourse === TOUTES) return TOUTES;
  return listesTriees().some(([id])=> id === state.filtreCourse) ? state.filtreCourse : TOUTES;
}
function choisirListe(id){
  if(state.ongletActif === 'course'){
    state.filtreCourse = id;
  } else {
    state.listeActive = id;
    try { localStorage.setItem(CLE_LISTE_ACTIVE, id); } catch (e) {}
  }
  render();
  window.scrollTo(0, 0);
  const actif = document.querySelector('.liste-chip.actif');
  if(actif && actif.scrollIntoView) actif.scrollIntoView({ inline:'nearest', block:'nearest' });
}
const state = {
  produits: {},
  rayons: {},
  listes: {},        // listes de courses (30/09/2026) : { id: { nom, ordre, couleur } } — voir « LISTES »
  listeActive: lireListeActive(),
  filtreCourse: TOUTES,
  profil: lireProfilCommun(),
  ongletActif: 'liste',
  recherche: '',
  editionId: null,   // id du produit en cours d'édition dans la modale (null = ajout)
};

/* ============================================================
   THÈME / PROFIL
   ============================================================ */
function appliquerProfil(){
  document.documentElement.setAttribute('data-profil', state.profil);
  document.getElementById('btn-profil-corentin').classList.toggle('selected', state.profil==='Corentin');
  document.getElementById('btn-profil-lisa').classList.toggle('selected', state.profil==='Lisa');
}
// Appliqué tout de suite (avant même Firebase) pour éviter un flash du mauvais thème.
appliquerProfil();

document.getElementById('btn-profil-corentin').addEventListener('click', ()=>{
  state.profil = 'Corentin'; ecrireProfilCommun('Corentin'); appliquerProfil();
});
document.getElementById('btn-profil-lisa').addEventListener('click', ()=>{
  state.profil = 'Lisa'; ecrireProfilCommun('Lisa'); appliquerProfil();
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
    renderSelecteurListes();   /* pastilles différentes selon l'onglet (« Toutes » dans Course) */
    window.scrollTo(0, 0);   /* 28/09/2026 : la page défile désormais (plus <main>) — chaque onglet s'ouvre en haut */
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

  /* Catalogue commun (30/09/2026, v2) : tous les produits, quelle que soit la liste choisie. */
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

/* Coche à la couleur de la liste qui a coché le produit (--c-liste). Coché par une AUTRE liste
   que celle choisie : le nom de cette liste s'affiche en couleur sous le produit. */
function carteProduitListe(id, p){
  const rayon = state.rayons[p.rayonId];
  const lid = listeDe(p), couleur = couleurListe(lid);
  const autre = p.aAcheter && lid !== idListeAffichee();
  const nomListe = escapeHtml(infoListe(lid).nom || '');
  return `
    <div class="carte-produit">
      <button class="case ${p.aAcheter?'checked':''}" style="--c-liste:${couleur}" onclick="toggleAAcheter('${id}')" aria-label="À acheter${p.aAcheter ? ' (' + nomListe + ')' : ''}">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <div class="infos-produit">
        <p class="nom-produit">${escapeHtml(p.nom||'')}</p>
        <p class="rayon-produit">${escapeHtml(rayon ? rayon.nom : 'Sans rayon')}${autre ? ` · <span class="nom-liste" style="--c-liste:${couleur}">${nomListe}</span>` : ''}</p>
      </div>
      <input class="qte-produit" value="${escapeHtml(p.quantite||'')}" placeholder="Qté/info"
        onchange="updateQuantite('${id}', this.value)">
      <button class="btn-crayon" onclick="ouvrirModale('${id}')" aria-label="Modifier">&#9998;</button>
    </div>`;
}

/* Une seule coche par produit (30/09/2026, v2) :
   - pas coché → coché pour la liste choisie ;
   - coché par la liste choisie → décoché ;
   - coché par une autre liste → passe dans la liste choisie (reste à acheter). */
function toggleAAcheter(id){
  const p = state.produits[id]; if(!p) return;
  const ici = idListeAffichee();
  if(!p.aAcheter){
    /* ajoutePar / ajouteLe (01/10/2026) : servent à la fenêtre « Ajouté à la liste » de l'autre téléphone. */
    dbUpdateDoc('produits', id, { aAcheter: true, listeId: ici, ajoutePar: lireProfilCommun().toLowerCase(), ajouteLe: Date.now() });
    planifierNotifListe();
  }
  else if(listeDe(p) === ici){ dbUpdateDoc('produits', id, { aAcheter: false }); planifierNotifListe(); }
  else dbUpdateDoc('produits', id, { listeId: ici });   /* simple changement de liste : le nombre à acheter ne bouge pas */
}
/* NOTIFICATIONS DU DUO — voir README, « Notifications » (Course).
   Demande de Corentin (30/09/2026, remplace la notification « seuil de 5 articles » du même jour) :
   1. « Lisa a modifié la liste de courses — Vous avez 12 articles à acheter. » à chaque mise à jour de
      la liste (coche ou décoche dans l'onglet Liste). Regroupé : envoyé NOTIF_LISTE_DELAI_MS après la
      DERNIÈRE coche (cocher 10 produits d'affilée = 1 notification, avec le total final), ou tout de suite
      si l'app passe en arrière-plan. tag courses-liste : sur le téléphone qui reçoit, la nouvelle remplace
      l'ancienne. Les coches « acheté » en magasin (onglet Course) ne notifient pas.
   2. « Les courses sont faites ! » au bouton Course terminée (annule une notification de liste en attente).
   Seulement une fois la liste reçue de Firestore (jamais sur le seul aperçu localStorage de l'ouverture).
   Envoi par notifierDuo() (../commun.js) à l'autre profil. */
const NOTIF_LISTE_DELAI_MS = 20000;
let notifListeMinuteur = null;
const pluriel = (n, mot)=> n + ' ' + mot + (n > 1 ? 's' : '');
function planifierNotifListe(){
  clearTimeout(notifListeMinuteur);
  notifListeMinuteur = setTimeout(()=> envoyerNotifListe(false), NOTIF_LISTE_DELAI_MS);
}
function envoyerNotifListe(keepalive){
  if(!notifListeMinuteur) return;
  clearTimeout(notifListeMinuteur); notifListeMinuteur = null;
  if(!firestoreRecu.produits || typeof window.notifierDuo !== 'function') return;
  const n = restantsDeListe(TOUTES);
  window.notifierDuo({
    titre: lireProfilCommun() + ' a modifié la liste de courses',
    corps: n === 0 ? 'Plus rien à acheter.' : 'Vous avez ' + pluriel(n, 'article') + ' à acheter.',
    url: './Course/', tag: 'courses-liste', keepalive
  });
}
function notifierCoursesFaites(nbAchetes){
  clearTimeout(notifListeMinuteur); notifListeMinuteur = null;   /* « courses faites » remplace une notification de liste en attente */
  if(!firestoreRecu.produits || typeof window.notifierDuo !== 'function') return;
  const reste = restantsDeListe(TOUTES);
  window.notifierDuo({
    titre: 'Les courses sont faites !',
    corps: lireProfilCommun() + ' a terminé les courses : ' + pluriel(nbAchetes, 'article') + ' acheté' + (nbAchetes > 1 ? 's' : '') + '.'
      + (reste > 0 ? ' Il reste ' + pluriel(reste, 'article') + ' à acheter.' : ''),
    url: './Course/', tag: 'courses-faites'
  });
}
window.addEventListener('pagehide', ()=> envoyerNotifListe(true));
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden') envoyerNotifListe(true); });

/* AJOUTÉ À LA LISTE — fenêtre à l'ouverture (01/10/2026, demande de Corentin) : quand l'autre a coché
   des produits « à acheter » (ce que la notification annonce), Course les liste en s'ouvrant.
   - Chaque coche « à acheter » enregistre qui l'a faite et quand (`ajoutePar`, `ajouteLe` : toggleAAcheter).
   - Ce téléphone retient jusqu'à quand il a vu la liste (localStorage `courses_vu`) : mis à jour à la
     fermeture de la fenêtre, et quand l'app passe en arrière-plan (ce qui était à l'écran a été vu).
   - Vérifié à l'ouverture de l'app ET au retour au premier plan (toucher une notification ramène souvent
     l'app déjà ouverte), dès que la liste arrive du serveur : FENETRE_OUVERTURE_MS. Pendant l'utilisation,
     les ajouts de l'autre apparaissent dans la liste sans fenêtre (marqués vus).
   - Seulement ce qui est encore à acheter, coché par l'AUTRE profil (pas ses propres coches, faites sur
     un autre téléphone). Première ouverture sur ce téléphone : rien (on ne liste pas tout l'historique). */
const CLE_VU = 'courses_vu';
const FENETRE_OUVERTURE_MS = 10000;
let finOuverture = Date.now() + FENETRE_OUVERTURE_MS;
function lireVu(){
  try { const v = parseInt(localStorage.getItem(CLE_VU), 10); return isNaN(v) ? null : v; } catch (e) { return null; }
}
function marquerVu(){ try { localStorage.setItem(CLE_VU, String(Date.now())); } catch (e) {} }
const fenetreNouveautes = ()=> document.getElementById('nouveautes');
const nouveautesOuverte = ()=> fenetreNouveautes().style.display !== 'none';
function nouveautesDeLautre(vu){
  const moi = lireProfilCommun().toLowerCase();
  return Object.values(state.produits)
    .filter(p=> p && p.aAcheter && !p.achete && p.ajoutePar && p.ajoutePar !== moi && (p.ajouteLe || 0) > vu)
    .sort((a, b)=> (a.ajouteLe || 0) - (b.ajouteLe || 0));
}
function verifierNouveautes(){
  if(document.visibilityState !== 'visible') return;
  const vu = lireVu();
  if(vu === null){ marquerVu(); finOuverture = 0; return; }
  const ajouts = nouveautesDeLautre(vu);
  if(ajouts.length === 0) return;   /* la fenêtre d'ouverture reste armée : la liste du serveur peut arriver après */
  finOuverture = 0;
  afficherNouveautes(ajouts);
}
function afficherNouveautes(ajouts){
  const autre = lireProfilCommun() === 'Lisa' ? 'Corentin' : 'Lisa';
  const plusieursListes = listesTriees().length > 1;
  document.getElementById('nouveautes-texte').textContent =
    autre + ' a ajouté ' + pluriel(ajouts.length, 'article') + ' depuis ta dernière visite :';
  const ul = document.getElementById('nouveautes-liste');
  ul.innerHTML = '';
  ajouts.forEach(p=>{
    const li = document.createElement('li');
    li.className = 'nouveaute';
    li.style.setProperty('--c-liste', couleurListe(listeDe(p)));
    const pastille = document.createElement('span');
    pastille.className = 'liste-pastille';
    const textes = document.createElement('span');
    textes.className = 'nouveaute-textes';
    const nom = document.createElement('span');
    nom.className = 'nouveaute-nom';
    nom.textContent = p.nom || '';
    const rayon = state.rayons[p.rayonId];
    const details = [p.quantite || '', rayon ? rayon.nom : '', plusieursListes ? (infoListe(listeDe(p)).nom || '') : '']
      .filter(Boolean).join(' · ');
    textes.appendChild(nom);
    if(details){
      const d = document.createElement('span');
      d.className = 'nouveaute-detail';
      d.textContent = details;
      textes.appendChild(d);
    }
    li.appendChild(pastille);
    li.appendChild(textes);
    ul.appendChild(li);
  });
  const fond = fenetreNouveautes();
  const fermer = ()=>{ fond.style.display = 'none'; marquerVu(); };
  document.getElementById('nouveautes-ok').onclick = fermer;
  fond.onclick = (e)=>{ if(e.target === fond) fermer(); };
  fond.style.display = 'flex';
}
/* Appelé à chaque liste reçue du SERVEUR (pas du cache local). */
function nouveautesAuServeur(){
  if(Date.now() < finOuverture) verifierNouveautes();
  else if(document.visibilityState === 'visible' && !nouveautesOuverte()) marquerVu();
}
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'visible'){
    finOuverture = Date.now() + FENETRE_OUVERTURE_MS;
    if(firestoreRecu.produits) verifierNouveautes();
  } else if(!nouveautesOuverte() && lireVu() !== null){
    marquerVu();
  }
});
window.addEventListener('pagehide', ()=>{ if(!nouveautesOuverte() && lireVu() !== null) marquerVu(); });
function updateQuantite(id, val){
  dbUpdateDoc('produits', id, { quantite: val });
}

/* ============================================================
   RENDU — Course
   ============================================================ */
function renderCourse(){
  const conteneur = document.getElementById('liste-course');
  const filtre = filtreCourse();   /* toutes les listes, ou une seule (pastilles) */
  const items = Object.entries(state.produits).filter(([id,p])=> p.aAcheter && (filtre === TOUTES || listeDe(p) === filtre));
  if(items.length===0){
    conteneur.innerHTML = `<div class="vide"><h2>Rien à acheter</h2><p>Coche des produits dans l'onglet Liste pour les voir apparaître ici.</p></div>`;
    document.getElementById('btn-course-terminee').classList.remove('visible');
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

/* Onglet Course : coche (et contour de la case) à la couleur de la liste du produit ; nom de la
   liste en couleur sous le produit quand plusieurs listes sont affichées ensemble. */
function carteProduitCourse(id, p){
  const lid = listeDe(p), couleur = couleurListe(lid);
  const details = [];
  if(filtreCourse() === TOUTES && listesTriees().length > 1)
    details.push(`<span class="nom-liste" style="--c-liste:${couleur}">${escapeHtml(infoListe(lid).nom || '')}</span>`);
  if(p.quantite) details.push(escapeHtml(p.quantite));
  return `
    <div class="carte-produit ${p.achete?'achete-carte':''}">
      <button class="case case-liste ${p.achete?'checked':''}" style="--c-liste:${couleur}" onclick="toggleAchete('${id}')" aria-label="Acheté">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <div class="infos-produit">
        <p class="nom-produit ${p.achete?'achete':''}">${escapeHtml(p.nom||'')}</p>
        ${details.length ? `<p class="rayon-produit">${details.join(' · ')}</p>` : ''}
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
  const filtre = filtreCourse();   /* ce qui est affiché : toutes les listes, ou la liste filtrée */
  const aEffacer = Object.entries(state.produits).filter(([id,p])=> p.aAcheter && p.achete && (filtre === TOUTES || listeDe(p) === filtre));
  if(aEffacer.length===0) return;
  firestorePret.then(()=>{
    const batch = db.batch();
    aEffacer.forEach(([id])=> batch.update(docRef('produits', id), {
      aAcheter:false, achete:false,
      compteur: firebase.firestore.FieldValue.increment(1)
    }));
    batch.commit();
  });
  notifierCoursesFaites(aEffacer.length);   /* NOTIFICATIONS : « Les courses sont faites ! » à l'autre */
});

/* ============================================================
   RECHERCHE
   ============================================================ */
/* BARRE DE RECHERCHE COLLÉE (29/09/2026, demande de Corentin) : .barre-recherche est en position:sticky
   (../verre.css), donc toujours à portée de pouce pendant le défilement. La classe .colle (fond opaque +
   voile sur l'encoche) n'est posée que lorsqu'elle est réellement collée en haut : au repos, elle garde
   l'aspect de la plaque de verre. Au plus un calcul par image. */
(function(){
  const barre = document.querySelector('.barre-recherche');
  if(!barre) return;
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
/* CLAVIER ET BARRE COLLÉE (29/09/2026, retour de Corentin sur iPhone) : toucher la barre alors qu'elle
   était collée ouvrait le clavier, et iOS faisait défiler la page pour « montrer » le champ… en poussant
   la barre hors de l'écran. À l'entrée dans le champ, on remonte en haut de la liste : la barre y est à sa
   place normale, bien au-dessus du clavier, et les résultats s'affichent juste dessous. Refait pendant
   l'ouverture du clavier (visualViewport `resize`, 1,5 s au plus après l'entrée : iOS peut redéfiler après
   le focus) — jamais ensuite, pour laisser parcourir les résultats clavier ouvert. */
let entreeRecherche = 0;
champRecherche.addEventListener('focus', ()=>{ entreeRecherche = Date.now(); window.scrollTo(0, 0); });
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', ()=>{
    if(document.activeElement === champRecherche && Date.now() - entreeRecherche < 1500) window.scrollTo(0, 0);
  });
}

/* ============================================================
   MODALE AJOUT / ÉDITION (le même formulaire pour les deux)
   ============================================================ */
const modal = document.getElementById('modal-produit');

/* Boite de dialogue maison (bottom-sheet, charte UX/UI §5.9) — remplace window.confirm().
   dialogue({ titre, texte, ok, annuler, danger }) → Promise<boolean>. Tap sur le fond = annuler.
   Classe .modal-fond : la mise a jour auto au retour dans l'app (utilisateurOccupe) la
   voit comme une fenetre ouverte et n'interrompt rien. */
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
    fond.onclick = (e)=>{ if(e.target===fond) fermer(false); };
    fond.style.display = 'flex';
  });
}
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
    // Anti-doublon : si un rayon du même nom existe déjà (sans tenir compte des accents ni de la casse), on le réutilise
    const sansAccents = (s)=> (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const existant = Object.entries(state.rayons).find(([,r])=> sansAccents(r.nom)===sansAccents(nomRayon));
    if(existant){
      rayonId = existant[0];
    } else {
      const ref = await dbAddDoc('rayons', { nom: nomRayon });
      rayonId = ref.id;
    }
  }

  /* Catalogue commun (30/09/2026, v2) : un produit n'appartient à aucune liste ; `listeId` n'est
     posé qu'au moment où on le coche (toggleAAcheter). */
  if(state.editionId){
    await dbUpdateDoc('produits', state.editionId, { nom, rayonId });
  } else {
    await dbAddDoc('produits', { nom, rayonId, quantite:'', aAcheter:false, achete:false, compteur:0 });
  }
  fermerModale();
});

document.getElementById('btn-modal-supprimer').addEventListener('click', async ()=>{
  if(!state.editionId) return;
  const id = state.editionId; // fige avant l'attente (la modale pourrait changer d'etat)
  const nom = (state.produits[id] && state.produits[id].nom) || 'ce produit';
  const oui = await dialogue({ titre:'Supprimer « ' + nom + ' » ?', texte:'Le produit sera retiré définitivement de la liste.', ok:'Supprimer' });
  if(!oui) return;
  await dbDeleteDoc('produits', id);
  fermerModale();
});

/* ============================================================
   LISTES — sélecteur (pastilles), Réglages, fenêtre de création / renommage / couleur /
   suppression (30/09/2026). Données : voir « LISTES DE COURSES » en haut du fichier.
   ============================================================ */
const sansAccentsListe = (s)=> (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
function restantsDeListe(id){
  return Object.values(state.produits).filter(p=> p.aAcheter && !p.achete && (id === TOUTES || listeDe(p)===id)).length;
}
function chipListe(id, nom, couleur, actif){
  const n = restantsDeListe(id);
  const style = couleur ? ` style="--c-liste:${couleur}"` : '';
  return `<button type="button" class="liste-chip ${actif?'actif':''}" data-liste="${id}" aria-pressed="${actif}"${style}>`
    + (couleur ? `<span class="liste-pastille" aria-hidden="true"></span>` : '')
    + `${escapeHtml(nom)}${n ? `<span class="liste-badge" aria-label="${n} à acheter">${n}</span>` : ''}</button>`;
}
/* Onglet Liste : la liste pour laquelle on coche (+ pour en créer une).
   Onglet Course : « Toutes » (par défaut) puis un filtre par liste. */
function renderSelecteurListes(){
  const conteneur = document.getElementById('selecteur-listes');
  const enCourse = state.ongletActif === 'course';
  const active = enCourse ? filtreCourse() : idListeAffichee();
  let html = enCourse ? chipListe(TOUTES, 'Toutes', '', active === TOUTES) : '';
  html += listesTriees().map(([id,l])=> chipListe(id, l.nom||'', couleurListe(id), id === active)).join('');
  if(!enCourse) html += `<button type="button" class="liste-chip liste-chip-ajout" data-liste-ajout aria-label="Nouvelle liste">+</button>`;
  conteneur.innerHTML = html;
}
document.getElementById('selecteur-listes').addEventListener('click', (e)=>{
  const b = e.target.closest('button'); if(!b) return;
  if(b.hasAttribute('data-liste-ajout')) return ouvrirModaleListe(null);
  if(b.dataset.liste && !b.classList.contains('actif')) choisirListe(b.dataset.liste);
});

function renderReglagesListes(){
  const conteneur = document.getElementById('reglages-listes');
  conteneur.innerHTML = listesTriees().map(([id,l])=>{
    const n = restantsDeListe(id);
    return `<button type="button" class="ligne-liste" data-liste="${id}" style="--c-liste:${couleurListe(id)}">`
      + `<span class="liste-pastille liste-pastille-grande" aria-hidden="true"></span>`
      + `<span class="infos-produit"><span class="nom-produit">${escapeHtml(l.nom||'')}</span>`
      + `<span class="rayon-produit">${n ? `${n} à acheter` : 'Rien à acheter'}</span></span>`
      + `<span class="btn-crayon" aria-hidden="true">&#9998;</span></button>`;
  }).join('');
}
document.getElementById('reglages-listes').addEventListener('click', (e)=>{
  const b = e.target.closest('.ligne-liste'); if(b) ouvrirModaleListe(b.dataset.liste);
});
document.getElementById('btn-nouvelle-liste').addEventListener('click', ()=> ouvrirModaleListe(null));

const modalListe = document.getElementById('modal-liste');
const champNomListe = document.getElementById('modal-liste-nom');
const erreurListe = document.getElementById('modal-liste-erreur');
const choixCouleur = document.getElementById('modal-liste-couleurs');
let listeEditionId = null;   /* null = création */
let couleurChoisie = COULEUR_MAISON;
function dessinerCouleurs(){
  choixCouleur.innerHTML = PALETTE_LISTES.map(c=>
    `<button type="button" class="couleur-choix ${c===couleurChoisie?'choisie':''}" data-couleur="${c}" style="--c-liste:${c}" role="radio" aria-checked="${c===couleurChoisie}" aria-label="Couleur ${c}"></button>`
  ).join('');
}
choixCouleur.addEventListener('click', (e)=>{
  const b = e.target.closest('[data-couleur]'); if(!b) return;
  couleurChoisie = b.dataset.couleur; dessinerCouleurs();
});
/* Nouvelle liste : 1re couleur de la palette pas encore prise (sinon la suivante dans l'ordre). */
function couleurLibre(){
  const prises = listesTriees().map(([id])=> couleurListe(id));
  return PALETTE_LISTES.find(c=> !prises.includes(c)) || PALETTE_LISTES[listesTriees().length % PALETTE_LISTES.length];
}
function ouvrirModaleListe(id){
  listeEditionId = id || null;
  const l = id ? infoListe(id) : null;
  document.getElementById('modal-liste-titre').textContent = id ? 'Modifier la liste' : 'Nouvelle liste';
  champNomListe.value = l ? (l.nom||'') : '';
  couleurChoisie = id ? couleurListe(id) : couleurLibre();
  dessinerCouleurs();
  erreurListe.textContent = '';
  document.getElementById('btn-liste-supprimer').style.display = (id && id !== LISTE_DEFAUT) ? 'block' : 'none';
  modalListe.style.display = 'flex';
  if(!id) setTimeout(()=> champNomListe.focus(), 50);   /* en modification : pas de clavier d'office (souvent pour la couleur) */
}
function fermerModaleListe(){ modalListe.style.display = 'none'; listeEditionId = null; }
document.getElementById('btn-liste-annuler').addEventListener('click', fermerModaleListe);
modalListe.addEventListener('click', (e)=>{ if(e.target===modalListe) fermerModaleListe(); });
champNomListe.addEventListener('input', ()=>{ erreurListe.textContent = ''; });
champNomListe.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); enregistrerListe(); } });
document.getElementById('btn-liste-enregistrer').addEventListener('click', enregistrerListe);

async function enregistrerListe(){
  const nom = champNomListe.value.trim().replace(/\s+/g,' ');
  if(!nom){ erreurListe.textContent = 'Donne un nom à la liste.'; return; }
  const id = listeEditionId, couleur = couleurChoisie;
  const doublon = listesTriees().find(([i,l])=> i!==id && sansAccentsListe(l.nom)===sansAccentsListe(nom));
  if(doublon){
    if(!id){ fermerModaleListe(); choisirListe(doublon[0]); return; }   /* création d'un nom existant : on ouvre simplement celle-ci */
    erreurListe.textContent = 'Une liste porte déjà ce nom.'; return;
  }
  fermerModaleListe();
  await firestorePret;
  if(id){
    /* set + merge : crée aussi le document `maison` s'il manquait (entrée virtuelle) */
    const val = { nom, couleur };
    if(!state.listes[id]) val.ordre = id===LISTE_DEFAUT ? 0 : Date.now();
    docRef('listes', id).set(val, { merge:true }).catch(err=> console.warn('Liste non modifiée :', err));
  } else {
    /* id créé localement : la nouvelle liste s'affiche tout de suite, même hors ligne
       (l'écriture part au serveur dès que possible, on ne l'attend pas). */
    const ref = colRef('listes').doc();
    ref.set({ nom, couleur, ordre: Date.now() }).catch(err=> console.warn('Liste non créée :', err));
    state.ongletActif === 'course' ? render() : choisirListe(ref.id);
  }
}

/* Suppression d'une liste (jamais Maison). Catalogue commun : AUCUN produit n'est supprimé ;
   ceux qu'elle avait cochés passent dans Maison (toujours à acheter). */
document.getElementById('btn-liste-supprimer').addEventListener('click', async ()=>{
  const id = listeEditionId;
  if(!id || id === LISTE_DEFAUT) return;
  const l = state.listes[id] || {};
  const coches = Object.entries(state.produits).filter(([,p])=> p.aAcheter && listeDe(p)===id);
  const n = coches.length;
  const oui = await dialogue({
    titre: 'Supprimer « ' + (l.nom || 'cette liste') + ' » ?',
    texte: 'Aucun produit n’est supprimé.' + (n ? (n>1 ? ` Ses ${n} produits cochés passent dans Maison.` : ' Son produit coché passe dans Maison.') : ''),
    ok: 'Supprimer'
  });
  if(!oui) return;
  fermerModaleListe();
  if(state.listeActive === id) choisirListe(LISTE_DEFAUT);
  if(state.filtreCourse === id) state.filtreCourse = TOUTES;
  await firestorePret;
  const refs = coches.map(([pid])=> docRef('produits', pid));
  for(let i = 0; i < refs.length; i += 400){
    const lot = db.batch();
    refs.slice(i, i+400).forEach(r=> lot.update(r, { listeId: LISTE_DEFAUT }));
    lot.commit().catch(err=> console.warn('Produits non déplacés :', err));
  }
  docRef('listes', id).delete().catch(err=> console.warn('Liste non supprimée :', err));
});

/* ============================================================
   RÉSUMÉ POUR LE PORTAIL (22/09/2026)
   Le Portail (tableau de bord) affiche un aperçu de chaque app. Chaque app écrit
   un petit document `portail/<app>` ; celui-ci, `portail/courses`, vit dans la base
   de CETTE app, qui sert aussi de « boîte aux lettres » pour Muscu et Budget. Depuis le
   29/09/2026 : réservée au compte e-mail du duo, comme tout le reste. Voir README.
   - Publié seulement après un premier snapshot venu du SERVEUR (pas du cache local),
     pour ne pas écraser un résumé récent avec des données périmées.
   - Regroupé (0,3 s), republié à chaque ouverture, secours `keepalive` au départ (voir plus bas).
   ============================================================ */
const portailRecu = { produits:false, rayons:false };
let portailDernier = '', portailMinuteur = null;
function calculerResumePortail(produits, rayons){
  const aAcheter = Object.values(produits).filter(p=> p && p.aAcheter);
  const restants = aAcheter.filter(p=> !p.achete);       /* dans la liste et pas encore coché en magasin */
  const parRayon = {};
  restants.forEach(p=>{
    const nom = (rayons[p.rayonId] && rayons[p.rayonId].nom) || 'Autres';
    parRayon[nom] = (parRayon[nom] || 0) + 1;
  });
  const rayonsTop = Object.entries(parRayon)
    .sort((a,b)=> b[1]-a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3).map(([nom, n])=> ({ nom, n }));
  return { aAcheter: aAcheter.length, restants: restants.length, rayons: rayonsTop };
}
/* 23/09/2026 (v2) — PUBLICATION FIABLE. Trois changements, après constat que le résumé
   n'arrivait pas toujours au Portail lors d'un aller-retour rapide :
   1) Regroupement ramené de 2,5 s à 0,3 s : le résumé part dès que les données du serveur
      sont là, donc en général AVANT que Corentin ne ressorte de l'app.
   2) `portailOk` = le serveur a CONFIRMÉ la dernière écriture (la promesse de `set()` ne
      se résout qu'à l'accusé de réception du serveur).
   3) Filet de secours au départ (`pagehide` / page cachée) : si la dernière écriture n'est
      pas confirmée, envoi par l'API REST de Firestore avec `fetch(..., { keepalive: true })`,
      la seule requête qu'un navigateur laisse finir APRÈS la destruction de la page (une
      écriture du SDK, elle, serait coupée — ou gardée sur le téléphone jusqu'à la prochaine
      ouverture de Courses). Jeton = celui de la session (e-mail du duo depuis le 29/09/2026), gardé à l'avance
      (`portailJeton`) car on ne peut plus attendre de promesse au moment du départ. */
let portailOk = false, portailJeton = null;
function rafraichirJetonPortail(){
  const u = auth && auth.currentUser;
  if(u) u.getIdToken().then(t=>{ portailJeton = t; }).catch(()=>{});
}
function publierResumePortail(){
  const resume = calculerResumePortail(state.produits, state.rayons);
  portailDernier = JSON.stringify(resume);
  db.collection('portail').doc('courses').set(Object.assign({ maj: Date.now() }, resume))
    .then(()=>{ portailOk = true; })
    .catch(err=>{ portailDernier = ''; console.warn('Résumé Portail non publié :', err); });
}
function planifierPublicationPortail(){
  if(!portailRecu.produits || !portailRecu.rayons) return;
  portailOk = false;
  rafraichirJetonPortail();
  clearTimeout(portailMinuteur);
  portailMinuteur = setTimeout(()=>{ portailMinuteur = null; publierResumePortail(); }, 300);
}
/* Valeur JS → format « valeur » de l'API REST Firestore. */
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
  if(!portailRecu.produits || !portailRecu.rayons || portailOk || !portailJeton) return;
  clearTimeout(portailMinuteur); portailMinuteur = null;
  const data = Object.assign({ maj: Date.now() }, calculerResumePortail(state.produits, state.rayons));
  try{
    fetch('https://firestore.googleapis.com/v1/projects/course-app-36e9d/databases/(default)/documents/portail/courses', {
      method: 'PATCH', keepalive: true,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + portailJeton },
      body: JSON.stringify({ fields: versValeurFirestore(data).mapValue.fields })
    }).then(r=>{ if(r.ok) portailOk = true; }).catch(()=>{});
  }catch(e){}
}
window.addEventListener('pagehide', secoursPublicationPortail);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden') secoursPublicationPortail(); });

/* ============================================================
   RENDU GLOBAL + DÉMARRAGE
   ============================================================ */
function render(){
  renderSelecteurListes();
  renderListe();
  renderCourse();
  renderReglagesListes();
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ============================================================
   APERÇU LOCAL — affichage immédiat (24/09/2026)
   Avant : #app restait masqué jusqu'à l'authentification Firebase (≈ 1 s d'écran vide à
   chaque ouverture). Désormais l'interface est visible tout de suite et la liste est
   dessinée depuis la dernière copie connue, gardée dans localStorage.
   ⚠️ RÈGLE ABSOLUE (incidents de duplication du 18/09/2026) : cet aperçu sert UNIQUEMENT
   À L'AFFICHAGE. Il n'est JAMAIS écrit dans Firestore, et il est remplacé intégralement
   dès le 1er instantané Firestore (cache local ou serveur), qui seul fait foi.
   ============================================================ */
const CLE_APERCU = 'courses_apercu_v1';
let firestoreRecu = { produits:false, rayons:false };
(function afficherApercu(){
  try {
    const a = JSON.parse(localStorage.getItem(CLE_APERCU) || 'null');
    if(a && a.produits && typeof a.produits === 'object' && a.rayons && typeof a.rayons === 'object'){
      state.produits = a.produits; state.rayons = a.rayons;
      if(a.listes && typeof a.listes === 'object'){ state.listes = a.listes; listesConnues = true; }   /* 30/09/2026 */
      render();
    }
  } catch(e){ /* aperçu illisible : on attend simplement Firestore */ }
})();
function memoriserApercu(){
  if(!firestoreRecu.produits || !firestoreRecu.rayons) return;   /* jamais un état à moitié chargé */
  const apercu = { produits: state.produits, rayons: state.rayons };
  if(listesConnues) apercu.listes = state.listes;
  try { localStorage.setItem(CLE_APERCU, JSON.stringify(apercu)); } catch(e){}
}
function recuDeFirestore(nom){
  firestoreRecu[nom] = true;
  if(firestoreRecu.produits && firestoreRecu.rayons) signalerFirestorePret();
  memoriserApercu();
}

function demarrer(){
  /* 29/09/2026 (projet Firebase unique) : la session est partagée avec Budget, Muscu et le Portail.
     Depuis le 29/09/2026 (soir), Course est RÉSERVÉE au compte e-mail du duo (firestore.rules) :
     plus de connexion anonyme. Pas de session e-mail (ou une ancienne session anonyme) → écran de
     connexion (#connexion, commun.js). `ecoutes` : l'état d'auth peut être re-signalé, jamais deux
     écoutes en double. Déconnexion (depuis Muscu ou Budget) : écoutes arrêtées, écran de connexion. */
  const afficherConnexion = connexionDuo(auth);
  let ecoutes = null;
  authListen(user=>{
    const compte = !!(user && !user.isAnonymous);
    afficherConnexion(!compte);
    if(compte){
      if(ecoutes) return;
      ecoutes = [
        dbOnCollection('produits', (obj, cache)=>{ state.produits = obj; if(!cache) portailRecu.produits = true; render(); recuDeFirestore('produits'); planifierPublicationPortail(); if(!cache) nouveautesAuServeur(); }),
        dbOnCollection('rayons', (obj, cache)=>{ state.rayons = obj; if(!cache) portailRecu.rayons = true; render(); recuDeFirestore('rayons'); planifierPublicationPortail(); }),
        /* Listes de courses (30/09/2026) : petite collection, une écoute de plus. Si elle échoue
           (règles pas encore publiées), l'app reste utilisable avec la seule liste Maison. */
        dbOnCollection('listes', (obj, cache)=>{
          state.listes = obj;
          if(!cache || Object.keys(obj).length) listesConnues = true;   /* un 1er cache vide ne fait pas foi */
          render(); memoriserApercu();
        })
      ];
    } else if(ecoutes){
      ecoutes.forEach(arret=> arret()); ecoutes = null;
    }
  });
}
dbReady.then(demarrer);

/* THÈME : sombre uniquement depuis le 28/09/2026 (décision de Corentin, valable pour les 4 apps) —
   bouton lune/soleil et mode clair retirés. Nettoyage de l'ancien réglage. */
try { localStorage.removeItem('course-theme'); } catch (e) {}

/* Design « Verre » définitif depuis le 28/09/2026 (classe html.verre en dur dans index.html, feuille
   ../verre.css). Retour au Portail : geste retour d'iOS. Nettoyage des réglages de l'essai (interrupteur
   et curseur d'intensité retirés), partagés par les 4 apps : sans effet sur Muscu et Budget. */
try { localStorage.removeItem('duo-verre'); localStorage.removeItem('duo-verre-intensite'); } catch (e) {}

/* Date de MAJ, service worker et vérification de version : dans ../commun.js (noyau commun aux 4 apps,
   28/09/2026), chargé par index.html. */
