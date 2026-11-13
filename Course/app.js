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
/* Lot 3 (20/10/2026) : un refus de la base s'affiche (duoEchec, ../commun.js) puis l'erreur continue son chemin. */
const signalerEchec = (quoi)=> (e)=>{ if(window.duoEchec) duoEchec(e, quoi); throw e; };
let produitsCharges = false;   /* lot 3 : faux si ni aperçu ni 1er instantané → lignes grises au lieu de « Rien trouvé » */
function dbUpdateDoc(nom, id, val){ return firestorePret.then(()=> docRef(nom, id).update(val)).catch(signalerEchec('Modification')); }
function dbAddDoc(nom, val){ return firestorePret.then(()=> colRef(nom).add(val)).catch(signalerEchec('Ajout')).catch(()=>{}); }
function dbDeleteDoc(nom, id){ return firestorePret.then(()=> docRef(nom, id).delete()).catch(signalerEchec('Suppression')); }
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
const titres = { liste:'Liste', course:'Course', prix:'Prix', parametres:'Réglages' };
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
  /* Ordre choisi dans Réglages (champ `ordre` du rayon) ; sans ordre : alphabétique, après les rayons classés. */
  const o = r=> typeof r.ordre === 'number' ? r.ordre : Infinity;
  return Object.entries(state.rayons).sort((a,b)=> (o(a[1]) - o(b[1])) || (a[1].nom||'').localeCompare(b[1].nom||''));
}

/* Lot 2 (20/10/2026) : recherche sans accents ni majuscules (« creme » trouve « Crème »). */
const sansAccents = (s)=> String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

function renderListe(){
  const conteneur = document.getElementById('liste-produits');
  const recherche = sansAccents(state.recherche);
  if(!produitsCharges){ conteneur.innerHTML = lignesAttente(6); return; }

  /* Catalogue commun (30/09/2026, v2) : tous les produits, quelle que soit la liste choisie. */
  const items = Object.entries(state.produits).filter(([id,p])=>
    !recherche || sansAccents(p.nom).includes(recherche)
  );

  if(items.length===0){
    /* Lot 2 : rien trouvé → « Créer "mot tapé" » ouvre la fenêtre d'ajout avec le nom prérempli. */
    const mot = state.recherche.trim();
    conteneur.innerHTML = mot
      ? `<div class="vide"><h2>Rien trouvé</h2><button type="button" class="btn-creer-recherche" onclick="creerDepuisRecherche()">Créer « ${escapeHtml(mot)} »</button></div>`
      : `<div class="vide"><h2>Rien trouvé</h2><p>Ajoute un produit avec le bouton +.</p></div>`;
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

  /* Lot 3 (20/10/2026) : sans recherche — bandeau « Habituels », puis « À acheter (N) » (ce que la liste
     affichée a coché, par ordre alphabétique), puis tous les autres produits (popularité). Avec une
     recherche : les résultats seuls, comme avant. */
  if(recherche){ conteneur.innerHTML = items.map(([id,p])=> carteProduitListe(id,p)).join(''); return; }
  const ici = idListeAffichee();
  const aAcheter = items.filter(([,p])=> p.aAcheter && listeDe(p) === ici)
    .sort((a,b)=> (a[1].nom||'').localeCompare(b[1].nom||''));
  const autres = items.filter(([,p])=> !(p.aAcheter && listeDe(p) === ici));
  let html = bandeauHabituels();
  if(aAcheter.length) html += `<div class="section-rayon section-a-acheter"><p class="titre-rayon">À acheter (${aAcheter.length})</p>`
    + aAcheter.map(([id,p])=> carteProduitListe(id,p)).join('') + '</div>';
  if(autres.length) html += `<div class="section-rayon"><p class="titre-rayon">${aAcheter.length ? 'Tous les produits' : 'Produits'}</p>`
    + autres.map(([id,p])=> carteProduitListe(id,p)).join('') + '</div>';
  conteneur.innerHTML = html;
}

/* Lot 3 : « Habituels » = produits achetés au moins 2 fois (compteur de « Course terminée »), pas encore
   cochés, les 10 plus fréquents. Un toucher les coche pour la liste affichée. */
function bandeauHabituels(){
  const h = Object.entries(state.produits).filter(([,p])=> !p.aAcheter && (p.compteur||0) >= 2)
    .sort((a,b)=> (b[1].compteur||0) - (a[1].compteur||0) || (a[1].nom||'').localeCompare(b[1].nom||'')).slice(0, 10);
  if(!h.length) return '';
  return `<div class="habituels"><p class="titre-rayon">Habituels</p><div class="habituels-rail">`
    + h.map(([id,p])=> `<button type="button" class="chip-habituel" data-habituel="${escapeHtml(id)}">+ ${escapeHtml(p.nom||'')}</button>`).join('')
    + '</div></div>';
}
document.getElementById('liste-produits').addEventListener('click', (e)=>{
  const b = e.target.closest('[data-habituel]');
  if(b) toggleAAcheter(b.dataset.habituel);
});

/* Coche à la couleur de la liste qui a coché le produit (--c-liste). Coché par une AUTRE liste
   que celle choisie : le nom de cette liste s'affiche en couleur sous le produit. */
function carteProduitListe(id, p){
  const rayon = state.rayons[p.rayonId];
  const lid = listeDe(p), couleur = couleurListe(lid);
  const autre = p.aAcheter && lid !== idListeAffichee();
  const nomListe = escapeHtml(infoListe(lid).nom || '');
  return `
    <div class="carte-produit" data-coche="liste" data-id="${id}">
      <button class="case ${p.aAcheter?'checked':''}" style="--c-liste:${couleur}" onclick="toggleAAcheter('${id}')" aria-label="À acheter${p.aAcheter ? ' (' + nomListe + ')' : ''}">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <div class="infos-produit">
        <p class="nom-produit">${escapeHtml(p.nom||'')}</p>
        <p class="rayon-produit">${escapeHtml(rayon ? rayon.nom : 'Sans rayon')}${autre ? ` · <span class="nom-liste" style="--c-liste:${couleur}">${nomListe}</span>` : ''}${typeof p.prix === 'number' ? ` · <span class="prix-liste">${textePrix(p)}</span>` : ''}</p>
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
  /* Lot 3 : Annuler pendant 4 s — on remet les champs tels qu'ils étaient avant la coche. */
  const avant = { aAcheter: !!p.aAcheter, listeId: p.listeId || ici, achete: !!p.achete, pasTrouve: !!p.pasTrouve };
  if('ajoutePar' in p) avant.ajoutePar = p.ajoutePar;
  if('ajouteLe' in p) avant.ajouteLe = p.ajouteLe;
  const nom = p.nom || 'Produit';
  const message = !p.aAcheter ? '« ' + nom + ' » ajouté' : (listeDe(p) === ici ? '« ' + nom + ' » retiré' : '« ' + nom + ' » déplacé');
  toastAnnuler(message, ()=>{ dbUpdateDoc('produits', id, avant); planifierNotifListe(); });
  if(!p.aAcheter){
    /* ajoutePar / ajouteLe (01/10/2026) : servent à la fenêtre « Ajouté à la liste » de l'autre téléphone. */
    /* Audit 11-01 : achete / pasTrouve remis à false (sinon re-coché → directement dans le caddie / « Pas trouvé ») */
    dbUpdateDoc('produits', id, { aAcheter: true, listeId: ici, achete: false, pasTrouve: false, ajoutePar: lireProfilCommun().toLowerCase(), ajouteLe: Date.now() });
    planifierNotifListe();
  }
  else if(listeDe(p) === ici){ dbUpdateDoc('produits', id, { aAcheter: false, achete: false, pasTrouve: false }); planifierNotifListe(); }
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
  const fermer = ()=>{ fermerAnime(fond, ()=>{ fond.style.display = 'none'; }); marquerVu(); };   /* sortie animée (commun.js, 12/10/2026) */
  document.getElementById('nouveautes-ok').onclick = fermer;
  fond.onclick = (e)=>{ if(e.target === fond) fermer(); };
  annulerFermeture(fond);
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
   PRIX EN MAGASIN (13/11/2026) — un seul magasin, historique daté par produit.
   Champs produit : historiquePrix [{p, d, u?}] (ancien → récent, 40 max ; u = 'kg' pour le vrac),
   prix / prixLe / prixUnite (copie du dernier relevé, pour l'affichage), libellesTicket (libellés de
   ticket de caisse associés au produit). Une seule entrée par jour : ressaisir le même jour corrige.
   ============================================================ */
const MAX_HISTORIQUE_PRIX = 40;
function jourDe(ms){ const d = new Date(ms); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
function formatPrix(n, u){ return (typeof n === 'number' && isFinite(n)) ? n.toFixed(2).replace('.', ',') + (u === 'kg' ? ' €/kg' : ' €') : ''; }
function lirePrix(txt){
  const n = parseFloat(String(txt || '').replace(/[€\s]|\/kg/gi, '').replace(',', '.'));
  return (isFinite(n) && n >= 0 && n < 100000) ? Math.round(n * 100) / 100 : null;
}
function historiquePrix(p){ return Array.isArray(p && p.historiquePrix) ? p.historiquePrix.filter(e=> e && typeof e.p === 'number' && typeof e.d === 'number') : []; }
/* Ajoute (ou remplace, même jour) un relevé et renvoie les champs à écrire. prix = null → retire le relevé de ce jour. */
function champsReleve(p, prix, d, u){
  let h = historiquePrix(p).filter(e=> jourDe(e.d) !== jourDe(d));
  if(prix !== null){ const e = { p: prix, d }; if(u) e.u = u; h.push(e); }
  h.sort((x, y)=> x.d - y.d);
  h = h.slice(-MAX_HISTORIQUE_PRIX);
  const der = h[h.length - 1], del = firebase.firestore.FieldValue.delete();
  return { historiquePrix: h, prix: der ? der.p : del, prixLe: der ? der.d : del, prixUnite: der ? (der.u || '') : del };
}
function prixDuJour(p){
  const e = historiquePrix(p).find(e=> jourDe(e.d) === jourDe(Date.now()));
  return e ? e.p : null;
}
/* Tendance : dernier relevé comparé au précédent (↑ plus cher, ↓ moins cher). */
function tendancePrix(p){
  const h = historiquePrix(p);
  if(h.length < 2) return '';
  const a = h[h.length - 2].p, b = h[h.length - 1].p;
  return b > a ? ' <span class="prix-hausse">↑</span>' : b < a ? ' <span class="prix-baisse">↓</span>' : '';
}
function textePrix(p){ return typeof p.prix === 'number' ? formatPrix(p.prix, p.prixUnite) + tendancePrix(p) : ''; }
/* Saisie à la main (onglet Course) : même unité que le dernier relevé (prix au kg pour le vrac). */
function enregistrerPrix(id, txt, champ){
  const p = state.produits[id]; if(!p) return;
  const vide = String(txt).trim() === '';
  const n = vide ? null : lirePrix(txt);
  if(!vide && n === null){ champ.value = ''; return; }
  if(n !== null) champ.value = n.toFixed(2).replace('.', ',');
  dbUpdateDoc('produits', id, champsReleve(p, n, Date.now(), p.prixUnite || ''));
}
function champPrix(id, p){
  const duJour = prixDuJour(p);
  const indice = typeof p.prix === 'number' ? formatPrix(p.prix, p.prixUnite) : 'Prix €';
  return `<input class="qte-produit prix-produit" inputmode="decimal" enterkeyhint="done" aria-label="Prix en magasin"
    value="${duJour !== null ? duJour.toFixed(2).replace('.', ',') : ''}" placeholder="${escapeHtml(indice)}"
    onchange="enregistrerPrix('${id}', this.value, this)">`;
}
function dessinerHistoriquePrix(p){
  const bloc = document.getElementById('modal-historique-prix');
  const h = historiquePrix(p).slice().reverse();
  if(!h.length){ bloc.style.display = 'none'; bloc.innerHTML = ''; return; }
  const lignes = h.map((e, i)=>{
    const avant = h[i + 1];
    let ecart = '';
    if(avant && avant.p > 0 && e.p !== avant.p && (avant.u || '') === (e.u || '')){
      const pc = Math.round((e.p - avant.p) / avant.p * 100);
      ecart = `<span class="${e.p > avant.p ? 'prix-hausse' : 'prix-baisse'}">${pc > 0 ? '+' : ''}${pc} %</span>`;
    }
    const date = new Date(e.d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit' });
    return `<li><span class="hp-date">${date}</span><span class="hp-prix">${formatPrix(e.p, e.u)}</span>${ecart}</li>`;
  }).join('');
  const prixs = h.map(e=> e.p);
  const resume = h.length > 1 ? `<p class="hp-resume">Min ${formatPrix(Math.min(...prixs), h[0].u)} · Max ${formatPrix(Math.max(...prixs), h[0].u)} · ${h.length} relevés</p>` : '';
  const libs = (p.libellesTicket || []).length ? `<p class="hp-libelles">Ticket : ${p.libellesTicket.map(escapeHtml).join(' · ')}</p>` : '';
  bloc.innerHTML = `<label>Historique des prix</label>${resume}<ul class="hp-liste">${lignes}</ul>${libs}`;
  bloc.style.display = 'block';
}

/* ============================================================
   IMPORT D'UN TICKET DE CAISSE (13/11/2026) — PDF (testé sur un ticket Intermarché).
   pdf.js chargé à la demande (jamais au démarrage, pas de cache hors ligne : l'import se fait en ligne).
   Libellé connu (libellesTicket d'un produit) → prix enregistré directement ; libellé ignoré
   (listes/maison.libellesIgnores, commun aux deux téléphones) → passé ; sinon on demande une fois.
   ============================================================ */
const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let promessePdfjs = null;
function chargerPdfjs(){
  if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return promessePdfjs ||= new Promise((ok, ko)=>{
    const s = document.createElement('script');
    s.src = PDFJS_URL;
    s.onload = ()=>{ window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; ok(window.pdfjsLib); };
    s.onerror = ()=>{ promessePdfjs = null; ko(new Error('Lecteur PDF injoignable (connexion ?)')); };
    document.head.appendChild(s);
  });
}
/* Texte du PDF reconstruit ligne par ligne (morceaux regroupés par hauteur, puis de gauche à droite). */
async function lignesDuPdf(fichier){
  const pdfjsLib = await chargerPdfjs();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await fichier.arrayBuffer()) }).promise;
  const lignes = [];
  for(let i = 1; i <= doc.numPages; i++){
    const tc = await (await doc.getPage(i)).getTextContent();
    const parY = [];
    tc.items.forEach(it=>{
      if(!it.str || !it.str.trim()) return;
      const y = it.transform[5];
      let l = parY.find(l=> Math.abs(l.y - y) < 2);
      if(!l){ l = { y, it: [] }; parY.push(l); }
      l.it.push(it);
    });
    parY.sort((a, b)=> b.y - a.y).forEach(l=> lignes.push(l.it.sort((a, b)=> a.transform[4] - b.transform[4]).map(x=> x.str).join(' ')));
  }
  return lignes;
}
function lireLignesTicket(lignes){
  const num = (s)=> parseFloat(String(s).replace(',', '.'));
  const articles = [];
  let date = null, enAttente = null, fini = false, remises = 0;
  for(const brute of lignes){
    const l = brute.replace(/\s+/g, ' ').replace(/\/ /g, '/').trim();   /* pdf.js ajoute un espace après « / » */
    if(!l) continue;
    const md = l.match(/(\d{1,2}):(\d{2}):(\d{2}) (\d{1,2})\/(\d{1,2})\/(\d{4})/) || l.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
    if(md && !date){
      date = md.length === 7 ? new Date(+md[6], +md[5] - 1, +md[4], +md[1], +md[2]).getTime()
                             : new Date(+md[3], +md[2] - 1, +md[1], 12, 0).getTime();
    }
    if(fini) continue;   /* après le total : on ne cherche plus que la date */
    if(/^(MONTANT DU|TOTAL\b|SOUS[ -]TOTAL)/i.test(l)){ enAttente = null; if(/^MONTANT DU/i.test(l)) fini = true; continue; }
    let m;
    /* « 0,815 kg X 3,30EURO/kg 2,69 EUR A » → prix au kg */
    if(enAttente && (m = l.match(/^(\d+,\d+) ?kg X (\d+,\d{2}) ?EURO?\/ ?kg (\d+,\d{2}) ?EUR\b/i))){
      articles.push({ libelle: enAttente, prix: num(m[2]), unite: 'kg', quantite: num(m[1]), total: num(m[3]) });
      enAttente = null; continue;
    }
    /* « 4 X 1,47 EUR 5,88 EUR A » → prix unitaire */
    if(enAttente && (m = l.match(/^(\d+) X (\d+,\d{2}) ?EUR (\d+,\d{2}) ?EUR\b/i))){
      articles.push({ libelle: enAttente, prix: num(m[2]), quantite: +m[1], total: num(m[3]) });
      enAttente = null; continue;
    }
    /* Remise immédiate « 2EME A -50% NUTEL.PA -3,23 » : comptée à part (le prix noté reste le prix en rayon). */
    if((m = l.match(/^(.*[A-Za-z].*?) (-\d+,\d{2})$/))){ remises += num(m[2]); enAttente = null; continue; }
    /* « LIBELLE 4,79 EUR B » */
    if((m = l.match(/^(.*[A-Za-z].*?) (-?\d+,\d{2}) ?EUR( [A-Z0-9])?$/))){
      enAttente = null;
      const prix = num(m[2]);
      if(prix > 0) articles.push({ libelle: m[1].trim(), prix, quantite: 1, total: prix });
      continue;
    }
    /* Libellé seul : la ligne suivante porte la quantité et le prix. */
    enAttente = (/[A-Za-z]{2}/.test(l) && !/EUR/i.test(l)) ? l : null;
  }
  return { date, articles, remises: Math.round(remises * 100) / 100 };
}

const modalTicket = document.getElementById('modal-ticket');
let ticketEnCours = null;   /* { date, parLibelle: { libelle: dernier article } } */
function libellesIgnores(){ const m = state.listes && state.listes[LISTE_DEFAUT]; return (m && Array.isArray(m.libellesIgnores)) ? m.libellesIgnores : []; }
function produitDuLibelle(lib){
  return Object.keys(state.produits).find(id=> (state.produits[id].libellesTicket || []).includes(lib)) || null;
}
document.getElementById('btn-importer-ticket').addEventListener('click', ()=> document.getElementById('fichier-ticket').click());
document.getElementById('fichier-ticket').addEventListener('change', async (e)=>{
  const fichier = e.target.files && e.target.files[0];
  e.target.value = '';
  if(!fichier) return;
  const btn = document.getElementById('btn-importer-ticket');
  btn.disabled = true; btn.textContent = 'Lecture du ticket…';
  try{
    const { date, articles } = lireLignesTicket(await lignesDuPdf(fichier));
    if(!articles.length) throw new Error('Aucun article trouvé dans ce PDF.');
    const parLibelle = {};
    articles.forEach(a=> parLibelle[a.libelle] = a);   /* même libellé plusieurs fois : la dernière ligne gagne */
    ticketEnCours = { date: date || Date.now(), dateLue: !!date, parLibelle };
    ouvrirTicket();
  }catch(err){
    dialogue({ titre:'Ticket illisible', texte: err.message || String(err), ok:'OK', annuler:'', danger:false });
  }finally{
    btn.disabled = false; btn.textContent = '🧾 Importer un ticket de caisse';
  }
});
function ouvrirTicket(){
  const t = ticketEnCours, ignores = libellesIgnores();
  const connus = [], inconnus = [];
  let nbIgnores = 0;
  Object.values(t.parLibelle).forEach(a=>{
    const id = produitDuLibelle(a.libelle);
    if(id) connus.push([a, id]);
    else if(ignores.includes(a.libelle)) nbIgnores++;
    else inconnus.push(a);
  });
  const date = new Date(t.date).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  document.getElementById('ticket-texte').textContent =
    `Ticket du ${date}${t.dateLue ? '' : ' (date non trouvée : aujourd’hui)'} — ${connus.length} prix reconnus`
    + (inconnus.length ? `, ${inconnus.length} à associer` : '') + (nbIgnores ? `, ${nbIgnores} ignorés` : '') + '.';
  const options = Object.entries(state.produits).sort((a, b)=> (a[1].nom || '').localeCompare(b[1].nom || ''))
    .map(([id, p])=> `<option value="${id}">${escapeHtml(p.nom || '')}</option>`).join('');
  document.getElementById('ticket-inconnus').innerHTML = inconnus.map(a=> `
    <li class="ticket-ligne">
      <div class="ticket-lib"><span>${escapeHtml(a.libelle)}</span><span class="ticket-prix">${formatPrix(a.prix, a.unite)}</span></div>
      <select class="ticket-choix" data-lib="${escapeHtml(a.libelle)}" aria-label="Produit pour ${escapeHtml(a.libelle)}">
        <option value="">Plus tard (redemander)</option><option value="__ignorer__">Ignorer toujours</option>${options}
      </select>
    </li>`).join('');
  document.getElementById('ticket-inconnus-titre').style.display = inconnus.length ? 'block' : 'none';
  document.getElementById('ticket-connus').innerHTML = connus
    .sort((x, y)=> (state.produits[x[1]].nom || '').localeCompare(state.produits[y[1]].nom || ''))
    .map(([a, id])=>{
      const p = state.produits[id], avant = historiquePrix(p).filter(e=> jourDe(e.d) !== jourDe(t.date)).pop();
      let ecart = '';
      if(avant && (avant.u || '') === (a.unite || '') && avant.p !== a.prix)
        ecart = ` <span class="${a.prix > avant.p ? 'prix-hausse' : 'prix-baisse'}">${a.prix > avant.p ? '↑' : '↓'} ${formatPrix(avant.p, avant.u)}</span>`;
      return `<li class="ticket-ligne ticket-connu"><span>${escapeHtml(p.nom || '')}</span><span class="ticket-prix">${formatPrix(a.prix, a.unite)}${ecart}</span></li>`;
    }).join('');
  document.getElementById('ticket-connus-titre').style.display = connus.length ? 'block' : 'none';
  annulerFermeture(modalTicket);
  modalTicket.style.display = 'flex';
}
function fermerTicket(){ fermerAnime(modalTicket, ()=>{ modalTicket.style.display = 'none'; }); ticketEnCours = null; }
document.getElementById('btn-ticket-annuler').addEventListener('click', fermerTicket);
modalTicket.addEventListener('click', (e)=>{ if(e.target === modalTicket) fermerTicket(); });
document.getElementById('btn-ticket-enregistrer').addEventListener('click', ()=>{
  const t = ticketEnCours; if(!t) return;
  const nouveauxIgnores = [], ajoutsLibelles = {};
  document.querySelectorAll('#ticket-inconnus .ticket-choix').forEach(sel=>{
    if(sel.value === '__ignorer__') nouveauxIgnores.push(sel.dataset.lib);
    else if(sel.value) (ajoutsLibelles[sel.value] ||= []).push(sel.dataset.lib);
  });
  /* Prix par produit : libellés déjà associés + nouvelles associations (dernier article du ticket gagne). */
  const parProduit = {};
  Object.values(t.parLibelle).forEach(a=>{
    const id = produitDuLibelle(a.libelle) || Object.keys(ajoutsLibelles).find(k=> ajoutsLibelles[k].includes(a.libelle));
    if(id) parProduit[id] = a;
  });
  let n = 0;
  Object.entries(parProduit).forEach(([id, a])=>{
    const p = state.produits[id]; if(!p) return;
    const champs = champsReleve(p, a.prix, t.date, a.unite || '');
    if(ajoutsLibelles[id]) champs.libellesTicket = firebase.firestore.FieldValue.arrayUnion(...ajoutsLibelles[id]);
    dbUpdateDoc('produits', id, champs); n++;
  });
  if(nouveauxIgnores.length)
    firestorePret.then(()=> docRef('listes', LISTE_DEFAUT).set({ libellesIgnores: firebase.firestore.FieldValue.arrayUnion(...nouveauxIgnores) }, { merge:true }))
      .catch(signalerEchec('Modification')).catch(()=>{});
  fermerTicket();
  toastAnnuler(n + ' prix enregistrés', null);
});

/* ============================================================
   RENDU — Course
   ============================================================ */
function renderCourse(){
  const conteneur = document.getElementById('liste-course');
  if(!produitsCharges){ conteneur.innerHTML = lignesAttente(5); return; }
  const filtre = filtreCourse();   /* toutes les listes, ou une seule (pastilles) */
  const items = Object.entries(state.produits).filter(([id,p])=> p.aAcheter && (filtre === TOUTES || listeDe(p) === filtre));
  if(items.length===0){
    conteneur.innerHTML = `<div class="vide"><h2>Rien à acheter</h2><p>Coche des produits dans l'onglet Liste pour les voir apparaître ici.</p></div>`;
    document.getElementById('btn-course-terminee').classList.remove('visible');
    return;
  }
  /* 02/10/2026 (demande de Corentin) : un article coché « acheté » quitte son rayon et descend dans la
     section « Dans le caddie », tout en bas — en haut ne reste que ce qu'il reste à acheter. */
  const parRayon = {};
  const caddie = items.filter(([id,p])=> p.achete).sort((a,b)=> (a[1].nom||'').localeCompare(b[1].nom||''));
  const pasTrouves = items.filter(([id,p])=> !p.achete && p.pasTrouve).sort((a,b)=> (a[1].nom||'').localeCompare(b[1].nom||''));
  items.filter(([id,p])=> !p.achete && !p.pasTrouve).forEach(([id,p])=> (parRayon[p.rayonId||''] ||= []).push([id,p]));

  let html = '';
  nomsRayonsTries().forEach(([rayonId, rayon])=>{
    const arr = parRayon[rayonId];
    if(!arr || arr.length===0) return;
    arr.sort((a,b)=> (a[1].nom||'').localeCompare(b[1].nom||''));
    html += debutRayon(rayonId, rayon.nom, arr.length);
    arr.forEach(([id,p])=> html += carteProduitCourse(id,p));
    html += `</div>`;
  });
  if(parRayon['']){
    html += debutRayon('_sans', 'Sans rayon', parRayon[''].length);
    parRayon[''].forEach(([id,p])=> html += carteProduitCourse(id,p));
    html += `</div>`;
  }
  if(pasTrouves.length){
    html += `<div class="section-rayon section-pas-trouve"><p class="titre-rayon">🚫 Pas trouvé (${pasTrouves.length})</p>`;
    pasTrouves.forEach(([id,p])=> html += carteProduitCourse(id,p));
    html += `</div>`;
  }
  if(caddie.length){
    html += `<div class="section-rayon section-caddie"><p class="titre-rayon">🛒 Dans le caddie (${caddie.length})</p>`;
    caddie.forEach(([id,p])=> html += carteProduitCourse(id,p));
    html += `</div>`;
  }
  conteneur.innerHTML = html;
  document.getElementById('btn-course-terminee').classList.toggle('visible', items.some(([id,p])=> p.achete));
}

/* Rayons repliables (20/10/2026) : l'état replié est mémorisé sur l'appareil (localStorage), par rayon. */
const CLE_RAYONS_REPLIES = 'course_rayons_replies';
function rayonsReplies(){ try{ return JSON.parse(localStorage.getItem(CLE_RAYONS_REPLIES)) || []; }catch(e){ return []; } }
function debutRayon(id, nom, n){
  const replie = rayonsReplies().includes(id);
  return `<div class="section-rayon ${replie?'replie':''}" data-rayon="${escapeHtml(id)}">`
    + `<button type="button" class="titre-rayon titre-rayon-btn" aria-expanded="${!replie}" onclick="basculerRayon(this)">`
    + `<svg class="chevron-rayon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`
    + `<span class="nom-rayon">${escapeHtml(nom)}</span><span class="n-rayon">${n}</span></button>`;
}
function basculerRayon(btn){
  const sec = btn.closest('.section-rayon'), id = sec.dataset.rayon;
  const replie = sec.classList.toggle('replie');
  btn.setAttribute('aria-expanded', String(!replie));
  const liste = rayonsReplies().filter(x=> x !== id);
  if(replie) liste.push(id);
  try{ localStorage.setItem(CLE_RAYONS_REPLIES, JSON.stringify(liste)); }catch(e){}
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
    <div class="carte-produit ${p.achete?'achete-carte':''}" data-coche="course" data-id="${id}">
      <button class="case case-liste ${p.achete?'checked':''}" style="--c-liste:${couleur}" onclick="toggleAchete('${id}')" aria-label="Acheté">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <div class="infos-produit">
        <p class="nom-produit ${p.achete?'achete':''}">${escapeHtml(p.nom||'')}</p>
        ${details.length ? `<p class="rayon-produit">${details.join(' · ')}</p>` : ''}
      </div>
      ${champPrix(id, p)}
      ${p.achete ? '' : `<button type="button" class="btn-pas-trouve ${p.pasTrouve ? 'actif' : ''}" onclick="togglePasTrouve('${id}')">${p.pasTrouve ? 'Trouvé' : 'Pas trouvé'}</button>`}
    </div>`;
}

/* Lot 2 (20/10/2026) : toute la ligne coche (sauf le champ quantité et le crayon, qui gardent leur rôle). */
document.addEventListener('click', (e)=>{
  const carte = e.target.closest('.carte-produit[data-coche]');
  if(!carte || e.target.closest('button, input, select, textarea, a')) return;
  if(carte.dataset.coche === 'liste') toggleAAcheter(carte.dataset.id);
  else toggleAchete(carte.dataset.id);
});

function toggleAchete(id){
  const p = state.produits[id]; if(!p) return;
  const avant = { achete: !!p.achete, pasTrouve: !!p.pasTrouve };
  dbUpdateDoc('produits', id, p.achete ? { achete:false } : { achete:true, pasTrouve:false });   /* lot 3 : acheté → plus « pas trouvé » */
  toastAnnuler('« ' + (p.nom || 'Produit') + ' » ' + (p.achete ? 'remis à acheter' : 'dans le caddie'), ()=> dbUpdateDoc('produits', id, avant));
  // Pas de mise a jour optimiste ici : le listener temps reel sur 'produits'
  // rappelle render()/renderCourse() a chaque ecriture, qui recalcule
  // correctement la visibilite du bouton (evite un etat incorrect si on
  // decoche le dernier produit coche).
}

/* Lot 3 (20/10/2026) : « Pas trouvé » en magasin — le produit quitte son rayon pour la section « Pas trouvé »,
   reste sur la liste à « Course terminée » (seul le marqueur est effacé), et repart avec la prochaine course. */
function togglePasTrouve(id){
  const p = state.produits[id]; if(!p) return;
  const avant = !!p.pasTrouve;
  dbUpdateDoc('produits', id, { pasTrouve: !avant });
  toastAnnuler('« ' + (p.nom || 'Produit') + ' » ' + (avant ? 'remis dans son rayon' : 'pas trouvé'), ()=> dbUpdateDoc('produits', id, { pasTrouve: avant }));
}

/* Lot 3 : toast « Annuler » (4 s) après une coche — un seul à la fois, le dernier geste gagne. */
let minuteurToastAnnuler = null, actionAnnuler = null;
function toastAnnuler(texte, annuler){
  let t = document.getElementById('toast-annuler');
  if(!t){
    t = document.createElement('div');
    t.id = 'toast-annuler'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite');
    t.innerHTML = '<span class="toast-annuler-txt"></span><button type="button" class="toast-annuler-btn">Annuler</button>';
    t.querySelector('button').addEventListener('click', ()=>{
      const f = actionAnnuler; actionAnnuler = null;
      clearTimeout(minuteurToastAnnuler); t.classList.remove('visible');
      if(f) f();
    });
    document.body.appendChild(t);
  }
  t.querySelector('.toast-annuler-txt').textContent = texte;
  t.querySelector('.toast-annuler-btn').style.display = annuler ? '' : 'none';   /* simple message (import de ticket) */
  actionAnnuler = annuler;
  t.classList.add('visible');
  clearTimeout(minuteurToastAnnuler);
  minuteurToastAnnuler = setTimeout(()=>{ t.classList.remove('visible'); actionAnnuler = null; }, 4000);
}

document.getElementById('btn-course-terminee').addEventListener('click', ()=>{
  const filtre = filtreCourse();   /* ce qui est affiché : toutes les listes, ou la liste filtrée */
  const aEffacer = Object.entries(state.produits).filter(([id,p])=> p.aAcheter && p.achete && (filtre === TOUTES || listeDe(p) === filtre));
  if(aEffacer.length===0) return;
  /* 02/10/2026 (retour de Corentin : articles achetés restés cochés après « Course terminée »).
     Avant : un seul lot (batch) sans gestion d'erreur — si UNE écriture du lot était refusée (produit
     supprimé entre-temps depuis l'autre téléphone, session expirée…), TOUT le lot échouait en silence
     et les articles revenaient cochés. Désormais : produits relus au moment d'écrire (seuls ceux qui
     existent encore), et en cas d'échec du lot, une écriture par produit pour décocher tout ce qui
     peut l'être, avec un message si certains restent. */
  const maj = ()=> ({ aAcheter:false, achete:false, compteur: firebase.firestore.FieldValue.increment(1) });
  firestorePret.then(()=>{
    const ids = aEffacer.map(([id])=> id).filter(id=> state.produits[id]);
    const batch = db.batch();
    ids.forEach(id=> batch.update(docRef('produits', id), maj()));
    return batch.commit().catch(err=>{
      console.warn('Course terminée : lot refusé, écriture produit par produit', err);
      return Promise.all(ids.map(id=> docRef('produits', id).update(maj()).then(()=> null, e=> e)))
        .then(erreurs=>{
          const ko = erreurs.filter(Boolean);
          if(ko.length) dialogue({ titre:'Course terminée incomplète',
            texte: ko.length + ' article' + (ko.length > 1 ? 's' : '') + ' n\'' + (ko.length > 1 ? 'ont' : 'a') + ' pas pu être décoché' + (ko.length > 1 ? 's' : '') + ' (' + (ko[0].code || ko[0].message || 'erreur') + '). Réessaie dans un instant.',
            ok:'OK', annuler:'', danger:false });
        });
    });
  });
  /* Lot 3 : les « pas trouvé » restent à acheter, sans leur marqueur (prochaine course). */
  Object.entries(state.produits).filter(([id,p])=> p.pasTrouve && (filtre === TOUTES || listeDe(p) === filtre))
    .forEach(([id])=> dbUpdateDoc('produits', id, { pasTrouve:false }).catch(()=>{}));
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
let resoudreDialogue = null;   /* audit 12-04 : un 2e dialogue résout le 1er (false) au lieu de le laisser en attente */
function dialogue({ titre = '', texte = '', ok = 'OK', annuler = 'Annuler', danger = true } = {}){
  if(resoudreDialogue){ const r = resoudreDialogue; resoudreDialogue = null; r(false); }
  return new Promise((resolve)=>{
    resoudreDialogue = resolve;
    const fond = document.getElementById('dialogue');
    const bOk = document.getElementById('dialogue-ok');
    const bAnnuler = document.getElementById('dialogue-annuler');
    const t = document.getElementById('dialogue-texte');
    document.getElementById('dialogue-titre').textContent = titre;
    t.textContent = texte; t.style.display = texte ? '' : 'none';
    bOk.textContent = ok; bOk.className = danger ? 'btn-danger' : 'btn-enregistrer';
    bAnnuler.textContent = annuler || ''; bAnnuler.style.display = annuler ? '' : 'none';
    const fermer = (res)=>{ fermerAnime(fond, ()=>{ fond.style.display = 'none'; }); bOk.onclick = bAnnuler.onclick = fond.onclick = null; if(resoudreDialogue === resolve) resoudreDialogue = null; resolve(res); };
    bOk.onclick = ()=> fermer(true);
    bAnnuler.onclick = ()=> fermer(false);
    fond.onclick = (e)=>{ if(e.target===fond) fermer(false); };
    annulerFermeture(fond);
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

function ouvrirModale(id, nomPropose){
  state.editionId = id || null;
  const p = id ? state.produits[id] : null;
  document.getElementById('modal-titre').textContent = id ? 'Modifier le produit' : 'Ajouter un produit';
  document.getElementById('modal-nom').value = p ? (p.nom||'') : (nomPropose || '');
  peuplerSelectRayons(p ? p.rayonId : '');
  champNouveauRayon.style.display = 'none';
  document.getElementById('modal-nouveau-rayon').value = '';
  document.getElementById('btn-modal-supprimer').style.display = id ? 'block' : 'none';
  dessinerHistoriquePrix(p || {});
  annulerFermeture(modal);
  modal.style.display = 'flex';
  setTimeout(()=> document.getElementById('modal-nom').focus(), 50);
}
/* Lot 2 : nom tapé dans la recherche, première lettre en majuscule. */
function creerDepuisRecherche(){
  const mot = state.recherche.trim();
  ouvrirModale(null, mot.charAt(0).toUpperCase() + mot.slice(1));
}
function fermerModale(){ fermerAnime(modal, ()=>{ modal.style.display = 'none'; }); state.editionId = null; }

document.getElementById('btn-ouvrir-ajout').addEventListener('click', ()=> ouvrirModale(null));
document.getElementById('btn-modal-annuler').addEventListener('click', fermerModale);
modal.addEventListener('click', (e)=>{ if(e.target===modal) fermerModale(); });

/* Audit 12-01 / 12-02 : ids créés localement, écritures non attendues, modale fermée tout de suite.
   Avant : `await` de l'accusé serveur → modale bloquée hors ligne, 2e tap = doublon, et une fermeture
   pendant l'attente transformait l'édition en création. */
document.getElementById('btn-modal-enregistrer').addEventListener('click', async ()=>{
  const nom = document.getElementById('modal-nom').value.trim();
  if(!nom) return;
  const idEdition = state.editionId;
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
      await firestorePret;
      const ref = colRef('rayons').doc();
      ref.set({ nom: nomRayon }).catch(signalerEchec('Ajout')).catch(()=>{});
      rayonId = ref.id;
    }
  }
  fermerModale();

  /* Catalogue commun (30/09/2026, v2) : un produit n'appartient à aucune liste ; `listeId` n'est
     posé qu'au moment où on le coche (toggleAAcheter). */
  if(idEdition){
    dbUpdateDoc('produits', idEdition, { nom, rayonId });
  } else {
    await firestorePret;
    colRef('produits').doc().set({ nom, rayonId, quantite:'', aAcheter:false, achete:false, compteur:0 }).catch(signalerEchec('Ajout')).catch(()=>{});
  }
});

document.getElementById('btn-modal-supprimer').addEventListener('click', async ()=>{
  if(!state.editionId) return;
  const id = state.editionId; // fige avant l'attente (la modale pourrait changer d'etat)
  const nom = (state.produits[id] && state.produits[id].nom) || 'ce produit';
  const oui = await dialogue({ titre:'Supprimer « ' + nom + ' » ?', texte:'Le produit sera retiré définitivement de la liste.', ok:'Supprimer' });
  if(!oui) return;
  fermerModale();
  dbDeleteDoc('produits', id);   /* audit 12-01 : pas d'attente de l'accusé serveur */
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
/* Ordre des rayons (20/10/2026) : feuille du bas avec liste triable (poignée à glisser), enregistré dans
   Firestore (rayons/{id}.ordre). Réglages n'affiche qu'une ligne qui ouvre la feuille. */
const modalRayons = document.getElementById('modal-rayons');
const listeOrdreRayons = document.getElementById('liste-ordre-rayons');
function renderReglagesRayons(){
  const n = Object.keys(state.rayons).length;
  const l = document.getElementById('reglages-rayons-info'); if(l) l.textContent = n ? `${n} rayon${n>1?'s':''}` : 'Aucun rayon';
  if(modalRayons.style.display === 'flex' && !glisseRayon) remplirOrdreRayons();
}
function remplirOrdreRayons(){
  listeOrdreRayons.innerHTML = nomsRayonsTries().map(([id,x],i)=>
    `<li class="ligne-ordre" data-rayon="${id}"><span class="num-ordre">${i+1}</span>`
    + `<span class="nom-produit">${escapeHtml(x.nom||'')}</span>`
    + `<button type="button" class="poignee-ordre" aria-label="Déplacer ${escapeHtml(x.nom||'')}"><svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></button></li>`
  ).join('') || '<li class="param-desc">Aucun rayon pour le moment.</li>';
}
function ouvrirOrdreRayons(){ remplirOrdreRayons(); modalRayons.style.display = 'flex'; }
function fermerOrdreRayons(){ fermerAnime(modalRayons, ()=>{ modalRayons.style.display = 'none'; }); }
document.getElementById('btn-ordre-rayons').addEventListener('click', ouvrirOrdreRayons);
document.getElementById('btn-ordre-fermer').addEventListener('click', fermerOrdreRayons);
modalRayons.addEventListener('click', (e)=>{ if(e.target===modalRayons) fermerOrdreRayons(); });

let glisseRayon = null;
listeOrdreRayons.addEventListener('pointerdown', (e)=>{
  const poignee = e.target.closest('.poignee-ordre'); if(!poignee) return;
  const li = poignee.closest('.ligne-ordre');
  e.preventDefault();
  poignee.setPointerCapture(e.pointerId);
  glisseRayon = { li, poignee, y0:e.clientY, top0:li.offsetTop, id:e.pointerId };
  li.classList.add('souleve');
});
listeOrdreRayons.addEventListener('pointermove', (e)=>{
  const g = glisseRayon; if(!g || e.pointerId !== g.id) return;
  g.li.style.transform = `translateY(${(e.clientY - g.y0) - (g.li.offsetTop - g.top0)}px) scale(1.02)`;
  const r = g.li.getBoundingClientRect(), centre = r.top + r.height/2;
  const prec = g.li.previousElementSibling, suiv = g.li.nextElementSibling;
  if(prec && centre < prec.getBoundingClientRect().top + prec.offsetHeight/2) listeOrdreRayons.insertBefore(g.li, prec);
  else if(suiv && centre > suiv.getBoundingClientRect().top + suiv.offsetHeight/2) listeOrdreRayons.insertBefore(suiv, g.li);
  else return;
  listeOrdreRayons.querySelectorAll('.num-ordre').forEach((n,k)=> n.textContent = k+1);
  g.li.style.transform = `translateY(${(e.clientY - g.y0) - (g.li.offsetTop - g.top0)}px) scale(1.02)`;
});
function finGlisseRayon(e){
  const g = glisseRayon; if(!g || e.pointerId !== g.id) return;
  glisseRayon = null;
  g.li.classList.remove('souleve'); g.li.style.transform = '';
  const ids = [...listeOrdreRayons.querySelectorAll('.ligne-ordre')].map(x=> x.dataset.rayon);
  ids.forEach((id,k)=>{
    if(!state.rayons[id] || state.rayons[id].ordre === k) return;
    state.rayons[id].ordre = k;                       /* effet immédiat ; Firestore confirme ensuite */
    dbUpdateDoc('rayons', id, { ordre: k }).catch(()=>{});
  });
  render(); remplirOrdreRayons();
}
listeOrdreRayons.addEventListener('pointerup', finGlisseRayon);
listeOrdreRayons.addEventListener('pointercancel', finGlisseRayon);
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
  annulerFermeture(modalListe);
  modalListe.style.display = 'flex';
  if(!id) setTimeout(()=> champNomListe.focus(), 50);   /* en modification : pas de clavier d'office (souvent pour la couleur) */
}
function fermerModaleListe(){ fermerAnime(modalListe, ()=>{ modalListe.style.display = 'none'; }); listeEditionId = null; }
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
  /* Audit 12-03 : lot refusé (produit supprimé entre-temps) → écriture produit par produit, et la liste
     n'est supprimée qu'ensuite (avant : produits restés sur une liste supprimée). Hors ligne, rien n'est attendu. */
  const refs = coches.map(([pid])=> docRef('produits', pid)).filter(r=> state.produits[r.id]);
  const lots = [];
  for(let i = 0; i < refs.length; i += 400){
    const lot = db.batch();
    const part = refs.slice(i, i+400);
    part.forEach(r=> lot.update(r, { listeId: LISTE_DEFAUT }));
    lots.push(lot.commit().catch(err=>{
      console.warn('Produits non déplacés en lot, un par un :', err);
      return Promise.all(part.map(r=> r.update({ listeId: LISTE_DEFAUT }).catch(e=> console.warn('Produit non déplacé :', r.id, e))));
    }));
  }
  const supprimerListe = ()=> docRef('listes', id).delete().catch(err=> console.warn('Liste non supprimée :', err));
  if(navigator.onLine && lots.length) Promise.all(lots).then(supprimerListe); else supprimerListe();
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
/* ============================================================
   ONGLET PRIX (13/11/2026) — évolution du prix de chaque produit relevé (tickets ou saisie).
   Variation = dernier relevé / premier relevé de la même unité (pièce ou kg).
   ============================================================ */
const etatPrix = { tri: 'hausse', recherche: '', ouvert: null };
function relevesComparables(p){
  const h = historiquePrix(p); if(!h.length) return [];
  const u = h[h.length - 1].u || '';
  return h.filter(e=> (e.u || '') === u);   /* bananes à la pièce puis au kg : seule la dernière unité est tracée */
}
function variationPrix(h){ return h.length > 1 && h[0].p > 0 ? (h[h.length - 1].p - h[0].p) / h[0].p * 100 : 0; }
function texteVariation(v){
  if(Math.abs(v) < 0.5) return '<span class="var-stable">=</span>';
  return `<span class="${v > 0 ? 'prix-hausse' : 'prix-baisse'}">${v > 0 ? '+' : ''}${Math.round(v)} %</span>`;
}
const dateCourte = (ms)=> new Date(ms).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' });
/* Courbe SVG : abscisse proportionnelle au temps, ordonnée au prix. mini = petite courbe de la ligne. */
function courbePrix(h, mini){
  const W = mini ? 76 : 340, Hh = mini ? 28 : 170;
  const m = mini ? { g:2, d:2, h:3, b:3 } : { g:62, d:14, h:14, b:26 };
  const t0 = h[0].d, t1 = h[h.length - 1].d, ps = h.map(e=> e.p);
  let pMin = Math.min(...ps), pMax = Math.max(...ps);
  if(pMax - pMin < 0.01){ pMin -= 0.5; pMax += 0.5; }
  const x = (d)=> m.g + (t1 > t0 ? (d - t0) / (t1 - t0) : 0.5) * (W - m.g - m.d);
  const y = (p)=> m.h + (1 - (p - pMin) / (pMax - pMin)) * (Hh - m.h - m.b);
  const pts = h.map(e=> x(e.d).toFixed(1) + ',' + y(e.p).toFixed(1)).join(' ');
  const coul = variationPrix(h) > 0.5 ? 'var(--danger)' : variationPrix(h) < -0.5 ? 'var(--done)' : 'var(--accent)';
  if(mini) return `<svg class="courbe-mini" viewBox="0 0 ${W} ${Hh}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${coul}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  const u = h[0].u, lab = (p)=> p.toFixed(2).replace('.', ',') + (u === 'kg' ? '/kg' : '');
  const grille = [pMax, (pMin + pMax) / 2, pMin].map(p=> `<line x1="${m.g}" x2="${W - m.d}" y1="${y(p)}" y2="${y(p)}" class="cg"/><text x="${m.g - 6}" y="${y(p) + 4}" text-anchor="end" class="ct">${lab(p)}</text>`).join('');
  const points = h.map(e=> `<circle cx="${x(e.d)}" cy="${y(e.p)}" r="4" fill="${coul}"/>`).join('');
  const dates = (h.length > 1 ? [h[0], h[h.length - 1]] : [h[0]]).map((e, i)=> `<text x="${x(e.d)}" y="${Hh - 6}" text-anchor="${h.length > 1 ? (i ? 'end' : 'start') : 'middle'}" class="ct">${dateCourte(e.d)}</text>`).join('');
  return `<svg class="courbe-grande" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Évolution du prix">${grille}<polyline points="${pts}" fill="none" stroke="${coul}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${points}${dates}</svg>`;
}
function renderPrix(){
  const conteneur = document.getElementById('liste-prix');
  if(!conteneur) return;
  if(!produitsCharges){ conteneur.innerHTML = lignesAttente(5); return; }
  const q = sansAccents(etatPrix.recherche);
  let items = Object.entries(state.produits).map(([id, p])=> [id, p, relevesComparables(p)])
    .filter(([id, p, h])=> h.length && (!q || sansAccents(p.nom).includes(q)));
  if(!items.length){
    conteneur.innerHTML = `<div class="vide"><h2>${q ? 'Rien trouvé' : 'Aucun prix'}</h2><p>Importe un ticket de caisse (onglet Course) ou note un prix en magasin.</p></div>`;
    return;
  }
  /* Résumé : moyenne des variations des produits relevés au moins 2 fois. */
  const suivis = items.filter(([, , h])=> h.length > 1);
  const moy = suivis.length ? suivis.reduce((s, [, , h])=> s + variationPrix(h), 0) / suivis.length : 0;
  const premier = Math.min(...items.map(([, , h])=> h[0].d));
  const tri = { hausse:(a, b)=> variationPrix(b[2]) - variationPrix(a[2]), baisse:(a, b)=> variationPrix(a[2]) - variationPrix(b[2]), nom:(a, b)=> (a[1].nom || '').localeCompare(b[1].nom || '') }[etatPrix.tri];
  items.sort((a, b)=> tri(a, b) || (a[1].nom || '').localeCompare(b[1].nom || ''));
  let html = q ? '' : `<div class="prix-resume"><p class="prix-resume-val">${texteVariation(moy)}</p><p>Variation moyenne depuis le ${new Date(premier).toLocaleDateString('fr-FR', { day:'numeric', month:'long' })} · ${suivis.length} produits suivis, ${items.length} avec un prix</p></div>`;
  items.forEach(([id, p, h])=>{
    const der = h[h.length - 1], ouvert = etatPrix.ouvert === id;
    html += `<div class="carte-prix ${ouvert ? 'ouvert' : ''}" data-prix="${id}">
      <button type="button" class="carte-prix-tete" aria-expanded="${ouvert}">
        <span class="carte-prix-nom">${escapeHtml(p.nom || '')}<small>${h.length} relevé${h.length > 1 ? 's' : ''} · ${dateCourte(der.d)}</small></span>
        ${h.length > 1 ? courbePrix(h, true) : '<span class="courbe-mini"></span>'}
        <span class="carte-prix-val">${formatPrix(der.p, der.u)}<small>${h.length > 1 ? texteVariation(variationPrix(h)) : ''}</small></span>
      </button>
      ${ouvert ? `<div class="carte-prix-detail">${courbePrix(h, false)}
        <ul class="hp-liste">${h.slice().reverse().map((e, i, t)=>{
          const av = t[i + 1];
          return `<li><span class="hp-date">${new Date(e.d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit' })}</span><span class="hp-prix">${formatPrix(e.p, e.u)}</span>${av && av.p !== e.p ? texteVariation((e.p - av.p) / av.p * 100) : ''}</li>`;
        }).join('')}</ul></div>` : ''}
    </div>`;
  });
  conteneur.innerHTML = html;
}
document.getElementById('liste-prix').addEventListener('click', (e)=>{
  const b = e.target.closest('.carte-prix-tete'); if(!b) return;
  const id = b.closest('.carte-prix').dataset.prix;
  etatPrix.ouvert = etatPrix.ouvert === id ? null : id;
  renderPrix();
});
document.getElementById('prix-recherche').addEventListener('input', (e)=>{ etatPrix.recherche = e.target.value; renderPrix(); });
document.querySelectorAll('.prix-tri').forEach(b=> b.addEventListener('click', ()=>{
  etatPrix.tri = b.dataset.tri;
  document.querySelectorAll('.prix-tri').forEach(x=> x.classList.toggle('actif', x === b));
  renderPrix();
}));

/* Audit 11-03 : pas de re-rendu pendant la saisie d'une Qté/info (innerHTML détruisait le champ et la frappe) ;
   il est rejoué à la sortie du champ. Règle déjà notée dans PROBLEMES_RESOLUS.md (incident Budget). */
let renduEnAttente = false;
function render(){
  const actif = document.activeElement;
  if(actif && actif.classList && actif.classList.contains('qte-produit')){
    if(!renduEnAttente){
      renduEnAttente = true;
      actif.addEventListener('blur', ()=>{ renduEnAttente = false; setTimeout(render, 0); }, { once:true });
    }
    return;
  }
  renderSelecteurListes();
  renderListe();
  renderCourse();
  renderPrix();
  renderReglagesListes();
  renderReglagesRayons();
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
      state.produits = a.produits; state.rayons = a.rayons; produitsCharges = true;
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
      finOuverture = Date.now() + FENETRE_OUVERTURE_MS;   /* audit 11-02 : fenêtre « Ajouté à la liste » armée à la connexion, pas au chargement */
      ecoutes = [
        dbOnCollection('produits', (obj, cache)=>{ state.produits = obj; produitsCharges = true; if(!cache) portailRecu.produits = true; render(); recuDeFirestore('produits'); planifierPublicationPortail(); if(!cache) nouveautesAuServeur(); }),
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

/* RÉGLAGES › « Recharger l'application (vider le cache) » (11/10/2026) : le bouton existait sans aucun
   gestionnaire (il ne faisait rien). Désinscrit le service worker de Course et vide SES seuls caches
   (préfixe courses-lc-, jamais ceux des autres apps), puis recharge depuis le réseau. Les données
   (produits, listes) ne sont pas touchées : elles restent dans Firestore. */
document.getElementById('btn-vider-cache').addEventListener('click', async ()=>{
  const oui = await dialogue({ titre:"Recharger l'application ?", texte:'Le code est retéléchargé. Tes listes restent dans la base.', ok:'Recharger', danger:false });
  if(!oui) return;
  try {
    if('serviceWorker' in navigator){
      const reg = await navigator.serviceWorker.getRegistration('./');
      if(reg) await reg.unregister();
    }
    if(window.caches){
      const cles = await caches.keys();
      await Promise.all(cles.filter(k=> k.startsWith('courses-lc-')).map(k=> caches.delete(k)));
    }
  } catch (e) { console.warn('Nettoyage du cache :', e); }
  window.location.reload();
});

/* Lot 3 (20/10/2026) : « + » de la vitre Courses du Portail → ?saisie=liste. Onglet Liste, reflet sur la
   recherche (point d'entrée pour cocher ou créer un produit) ; le focus est tenté, mais sur iPhone le clavier
   ne s'ouvre qu'au toucher. */
(function saisieDepuisPortail(){
  if(new URLSearchParams(location.search).get('saisie') !== 'liste') return;
  try { history.replaceState(null, '', location.pathname); } catch(e){}
  const bouton = document.querySelector('nav.tabbar button[data-tab="liste"]');
  if(bouton && state.ongletActif !== 'liste') bouton.click();
  const barre = document.querySelector('.barre-recherche .searchbar') || champRecherche.parentElement;
  barre.classList.add('reflet');
  champRecherche.addEventListener('focus', ()=> barre.classList.remove('reflet'), { once:true });
  try { champRecherche.focus({ preventScroll:true }); } catch(e){}
})();
