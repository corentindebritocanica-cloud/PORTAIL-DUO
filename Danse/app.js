/* app.js — Agenda Danse (21/10/2026) : agenda des entraînements de danse partagé entre Corentin et Lisa.
   Architecture reprise de Todo / Course (voir Todo/README.md) :
   - SDK Firebase « compat » + enablePersistence() : hors ligne (cache local, écritures en file).
   - Compte e-mail du duo uniquement (connexionDuo() de ../commun.js) : les règles refusent l'anonyme.
   - Aperçu local (localStorage) affiché avant Firebase, remplacé dès le 1er instantané (jamais réécrit en base).
   - Un entraînement = un document. 1 seule écoute onSnapshot (danseEvents).
   - NOTIFICATION à chaque ajout / modification / suppression, envoyée à TOUS les téléphones abonnés
     (notifierDuo({ …, tous:true }) de ../commun.js → relais Apps Script outils/Notifications.gs).
   DONNÉES (projet course-app-36e9d, déclarées dans /firestore.rules) :
     danseEvents/{id} = { titre, date:'AAAA-MM-JJ', debut:'HH:MM', fin:'HH:MM', lieu, note,
                          creePar, creeLe, majPar, majLe }   — heures « murales » (pas de fuseau)
     portail/danse    = résumé pour le Portail (voir « RÉSUMÉ POUR LE PORTAIL »)
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
const COL_EVTS = 'danseEvents';

const dbReady = (async () => {
  auth = firebase.auth();
  db = firebase.firestore();
  try { await db.enablePersistence({ synchronizeTabs: true }); }
  catch (err) { console.warn('Cache Firestore persistant indisponible, repli sur le cache mémoire :', err); }
  await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
})();

/* Écritures différées jusqu'au 1er instantané (l'interface, elle, est mise à jour tout de suite). */
let signalerFirestorePret;
const firestorePret = new Promise(r=> signalerFirestorePret = r);
const docRef = (id)=> db.collection(COL_EVTS).doc(id);
function nouvelId(){
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = ''; const a = new Uint8Array(20); crypto.getRandomValues(a);
  a.forEach(n=> s += c[n % 62]); return s;
}
function ecrire(action, quoi){
  firestorePret.then(action).catch(err=>{ console.warn('Écriture Firestore :', err); if(window.duoEchec) duoEchec(err, quoi || 'Modification'); });
}
let premierInstantane = false;
const creesAvantInstantane = {};
let charge = false;

function majStatutConnexion(depuisCache){
  document.documentElement.dataset.sync = !navigator.onLine ? 'hors-ligne' : (depuisCache ? 'envoi' : 'ok');
}
majStatutConnexion(true);
window.addEventListener('offline', ()=> majStatutConnexion(true));
window.addEventListener('online', ()=> majStatutConnexion(true));

/* ============================================================
   ÉTAT + PROFIL (clé commune aux apps : duo_profile)
   ============================================================ */
function lireProfil(){
  try { return localStorage.getItem('duo_profile') === 'lisa' ? 'lisa' : 'corentin'; } catch (e) { return 'corentin'; }
}
const PRENOM = { corentin:'Corentin', lisa:'Lisa' };
const state = {
  profil: lireProfil(),
  evts: {},
  passesOuvert: (()=>{ try { return localStorage.getItem('danse_passes_ouvert') === '1'; } catch (e) { return false; } })()
};
/* « Nouveau » : entraînements ajoutés / modifiés par l'autre depuis la dernière visite. */
const CLE_VU_LE = 'danse_vu_le';
let vuLe = (()=>{ try { return parseInt(localStorage.getItem(CLE_VU_LE) || '0', 10) || 0; } catch (e) { return 0; } })();
if(!vuLe) vuLe = Date.now();
function memoriserVisite(){ try { localStorage.setItem(CLE_VU_LE, String(Date.now())); } catch (e) {} }
window.addEventListener('pagehide', memoriserVisite);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden') memoriserVisite(); });

function appliquerProfil(){
  document.documentElement.setAttribute('data-profil', state.profil === 'lisa' ? 'Lisa' : 'Corentin');
  document.getElementById('btn-profil-corentin').classList.toggle('selected', state.profil === 'corentin');
  document.getElementById('btn-profil-lisa').classList.toggle('selected', state.profil === 'lisa');
}
appliquerProfil();
function choisirProfil(p){
  state.profil = p;
  try { localStorage.setItem('duo_profile', p); } catch (e) {}
  appliquerProfil(); render();
}
document.getElementById('btn-profil-corentin').addEventListener('click', ()=> choisirProfil('corentin'));
document.getElementById('btn-profil-lisa').addEventListener('click', ()=> choisirProfil('lisa'));

/* ============================================================
   DATES — tout en heure locale « murale » (AAAA-MM-JJ + HH:MM), aucun fuseau stocké.
   ============================================================ */
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/, RE_HEURE = /^\d{2}:\d{2}$/;
function dateValide(d){ return typeof d === 'string' && RE_DATE.test(d); }
function heureValide(h){ return typeof h === 'string' && RE_HEURE.test(h); }
function versDate(d){ const [a,m,j] = d.split('-').map(Number); return new Date(a, m - 1, j); }
function aujourdhuiIso(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function heureCourte(h){ if(!heureValide(h)) return ''; const [hh, mm] = h.split(':'); return Number(hh) + 'h' + (mm === '00' ? '' : mm); }
function plageHoraire(e){
  const d = heureCourte(e.debut), f = heureCourte(e.fin);
  return d && f ? d + ' – ' + f : (d || '');
}
function dateLongue(d){ return versDate(d).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' }); }
function dateMoyenne(d){ return versDate(d).toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' }); }
/* Fin de l'entraînement (ms) : sert à savoir s'il est passé. Sans heure de fin : fin de journée. */
function finMs(e){
  const d = versDate(e.date);
  if(heureValide(e.fin)){ const [h,m] = e.fin.split(':').map(Number); d.setHours(h, m); }
  else d.setHours(23, 59);
  return d.getTime();
}
function cleTri(e){ return e.date + ' ' + (heureValide(e.debut) ? e.debut : '00:00'); }
function evtsValides(){ return Object.entries(state.evts).filter(([,e])=> e && dateValide(e.date)); }

/* ============================================================
   RENDU
   ============================================================ */
function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function ligneEvt(id, e, passe){
  const d = versDate(e.date);
  const jour = d.toLocaleDateString('fr-FR', { weekday:'short' }).replace('.', '');
  const auteur = (e.majPar || e.creePar) === 'lisa' ? 'lisa' : 'corentin';
  const nouveau = !passe && (e.majPar || e.creePar) && (e.majPar || e.creePar) !== state.profil && (e.majLe || e.creeLe || 0) > vuLe;
  const auj = e.date === aujourdhuiIso();
  const detail = [plageHoraire(e), e.lieu].filter(Boolean).map(escapeHtml).join(' · ');
  return `<div class="carte-produit evt${passe ? ' evt-passe' : ''}${auj ? ' evt-auj' : ''}" data-id="${escapeHtml(id)}">`
    + `<span class="evt-date" aria-hidden="true"><span class="evt-jour">${escapeHtml(jour)}</span><span class="evt-num">${d.getDate()}</span></span>`
    + `<button type="button" class="infos-produit" data-modifier>`
    + `<span class="nom-produit">${escapeHtml(e.titre || 'Entraînement')}${auj ? '<span class="evt-auj-tag">Aujourd\'hui</span>' : ''}${nouveau ? '<span class="nouvelle-pastille">Nouveau</span>' : ''}</span>`
    + `<span class="rayon-produit"><span class="auteur ${auteur}" aria-hidden="true"></span>${detail || escapeHtml(dateLongue(e.date))}</span>`
    + (e.note ? `<span class="evt-note">${escapeHtml(e.note)}</span>` : '')
    + `</button>`
    + (passe ? '' : `<button type="button" class="btn-ical" data-ical aria-label="Ajouter « ${escapeHtml(e.titre)} » à mon agenda Apple">${SVG_ICAL}</button>`)
    + `<button type="button" class="btn-crayon" data-modifier aria-label="Modifier « ${escapeHtml(e.titre)} »"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button></div>`;
}
const SVG_ICAL = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="13" x2="12" y2="19"/><line x1="9" y1="16" x2="15" y2="16"/></svg>';
function moisDe(d){ const t = versDate(d).toLocaleDateString('fr-FR', { month:'long', year:'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); }
function renderAgenda(){
  const conteneur = document.getElementById('liste-evenements');
  if(!charge){ conteneur.innerHTML = lignesAttente(4); return; }
  const maintenant = Date.now();
  const tous = evtsValides();
  const aVenir = tous.filter(([,e])=> finMs(e) >= maintenant).sort((a,b)=> cleTri(a[1]).localeCompare(cleTri(b[1])));
  const passes = tous.filter(([,e])=> finMs(e) < maintenant).sort((a,b)=> cleTri(b[1]).localeCompare(cleTri(a[1])));
  let html = '';
  if(aVenir.length){
    let mois = '';
    aVenir.forEach(([id,e])=>{
      const m = moisDe(e.date);
      if(m !== mois){ if(mois) html += '</div>'; mois = m; html += `<div class="section-rayon"><p class="titre-rayon">${escapeHtml(m)}</p>`; }
      html += ligneEvt(id, e, false);
    });
    html += '</div>';
  } else {
    html += `<div class="vide"><h2>Rien de prévu</h2><p>Touche + pour ajouter un entraînement.</p></div>`;
  }
  if(passes.length){
    html += `<div class="entete-termine"><button type="button" class="btn-replier" data-replier aria-expanded="${state.passesOuvert}"><svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg>Passés · ${passes.length}</button></div>`;
    if(state.passesOuvert) html += passes.map(([id,e])=> ligneEvt(id, e, true)).join('');
  }
  conteneur.innerHTML = html;
}
function render(){ renderAgenda(); }
/* Un entraînement en cours passe dans « Passés » à son heure de fin même sans rien toucher. */
setInterval(()=>{ if(document.visibilityState === 'visible') renderAgenda(); }, 60000);

/* ============================================================
   NAVIGATION ENTRE ONGLETS
   ============================================================ */
const titres = { agenda:'Agenda Danse', parametres:'Réglages' };
document.querySelectorAll('nav.tabbar button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.getElementById('app').dataset.onglet = btn.dataset.tab;
    document.querySelectorAll('nav.tabbar button').forEach(b=> b.classList.toggle('actif', b === btn));
    document.querySelectorAll('section.vue').forEach(s=> s.classList.toggle('actif', s.id === 'vue-' + btn.dataset.tab));
    document.getElementById('titre-onglet').textContent = titres[btn.dataset.tab];
    window.scrollTo(0, 0);
  });
});
document.getElementById('btn-ouvrir-ajout').addEventListener('click', ()=> ouvrirModale(null));
document.getElementById('liste-evenements').addEventListener('click', (e)=>{
  const b = e.target.closest('button'); if(!b) return;
  if(b.hasAttribute('data-replier')){
    state.passesOuvert = !state.passesOuvert;
    try { localStorage.setItem('danse_passes_ouvert', state.passesOuvert ? '1' : '0'); } catch (err) {}
    return renderAgenda();
  }
  const ligne = b.closest('.evt');
  if(ligne && b.hasAttribute('data-ical') && state.evts[ligne.dataset.id]) return ajouterAgendaApple(ligne.dataset.id);
  if(ligne && b.hasAttribute('data-modifier') && state.evts[ligne.dataset.id]) ouvrirModale(ligne.dataset.id);
});

/* ============================================================
   NOTIFICATIONS — à chaque changement, à TOUS les téléphones abonnés (Corentin et Lisa)
   ============================================================ */
function notifier(verbe, e, id){
  if(typeof window.notifierDuo !== 'function') return;
  const quand = dateMoyenne(e.date) + (plageHoraire(e) ? ', ' + plageHoraire(e) : '');
  window.notifierDuo({
    titre: 'Agenda Danse',
    corps: PRENOM[state.profil] + ' ' + verbe + ' : ' + (e.titre || 'Entraînement') + ' · ' + quand,
    url: './Danse/',
    tag: ('danse-' + id).slice(0, 40),
    tous: true
  });
}

/* Boîte de dialogue maison — dialogue({ titre, texte, ok, annuler, danger }) → Promise<boolean>. */
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
    const fermer = (res)=>{ fermerAnime(fond, ()=>{ fond.style.display = 'none'; }); bOk.onclick = bAnnuler.onclick = fond.onclick = null; resolve(res); };
    bOk.onclick = ()=> fermer(true);
    bAnnuler.onclick = ()=> fermer(false);
    fond.onclick = (ev)=>{ if(ev.target === fond) fermer(false); };
    annulerFermeture(fond);
    fond.style.display = 'flex';
  });
}

/* ============================================================
   FENÊTRE ÉVÉNEMENT — ajouter, modifier, supprimer
   ============================================================ */
const modal = document.getElementById('modal-evt');
const champ = (k)=> document.getElementById('evt-' + k);
const erreur = document.getElementById('modal-evt-erreur');
let editionId = null;
function ouvrirModale(id){
  const creation = !id;
  const e = creation ? { titre:'', date: aujourdhuiIso(), debut:'', fin:'', lieu:'', note:'' } : state.evts[id];
  if(!e) return;
  editionId = id || null;
  document.getElementById('modal-evt-titre').textContent = creation ? 'Nouvel entraînement' : 'Modifier l\'entraînement';
  document.getElementById('btn-evt-enregistrer').textContent = creation ? 'Ajouter' : 'Enregistrer';
  document.getElementById('btn-evt-supprimer').style.display = creation ? 'none' : 'block';
  document.getElementById('btn-evt-ical').style.display = creation ? 'none' : 'flex';
  ['titre','date','debut','fin','lieu','note'].forEach(k=> champ(k).value = e[k] || '');
  erreur.textContent = '';
  const qui = e.majPar || e.creePar;
  document.getElementById('modal-evt-info').textContent = creation || !qui ? '' :
    (e.majLe && e.majLe !== e.creeLe ? 'Modifié' : 'Ajouté') + ' par ' + PRENOM[qui === 'lisa' ? 'lisa' : 'corentin']
    + ((e.majLe || e.creeLe) ? ' le ' + new Date(e.majLe || e.creeLe).toLocaleDateString('fr-FR', { day:'numeric', month:'long' }) : '') + '.';
  annulerFermeture(modal);
  modal.style.display = 'flex';
  if(creation) champ('titre').focus();   /* synchrone dans le geste : iOS ouvre le clavier */
}
function fermerModale(){ fermerAnime(modal, ()=>{ modal.style.display = 'none'; }); editionId = null; }
document.getElementById('btn-evt-annuler').addEventListener('click', fermerModale);
modal.addEventListener('click', (e)=>{ if(e.target === modal) fermerModale(); });
['titre','lieu'].forEach(k=> champ(k).addEventListener('keydown', (e)=>{ if(e.key === 'Enter' && !e.isComposing){ e.preventDefault(); champ(k).blur(); } }));
['titre','date','debut','fin'].forEach(k=> champ(k).addEventListener('input', ()=>{ erreur.textContent = ''; }));
const nettoyer = (v, max)=> String(v || '').trim().replace(/\s+/g, ' ').slice(0, max);
document.getElementById('btn-evt-enregistrer').addEventListener('click', ()=>{
  const val = {
    titre: nettoyer(champ('titre').value, 80),
    date: champ('date').value,
    debut: heureValide(champ('debut').value) ? champ('debut').value : '',
    fin: heureValide(champ('fin').value) ? champ('fin').value : '',
    lieu: nettoyer(champ('lieu').value, 60),
    note: String(champ('note').value || '').trim().slice(0, 300)
  };
  if(!val.titre){ erreur.textContent = 'Donne un titre (ex : Entraînement Angelina).'; champ('titre').focus(); return; }
  if(!dateValide(val.date)){ erreur.textContent = 'Choisis une date.'; return; }
  if(val.debut && val.fin && val.fin <= val.debut){ erreur.textContent = 'L\'heure de fin doit être après le début.'; return; }
  const maintenant = Date.now();
  if(!editionId){
    const id = nouvelId();
    const ne = Object.assign(val, { creePar: state.profil, creeLe: maintenant, majPar: state.profil, majLe: maintenant });
    state.evts[id] = ne; render();
    if(!premierInstantane) creesAvantInstantane[id] = ne;
    fermerModale();
    ecrire(()=> docRef(id).set(ne), 'Ajout');
    notifier('a ajouté', ne, id);
    return;
  }
  const id = editionId, e = state.evts[id]; if(!e) return fermerModale();
  const maj = {};
  Object.keys(val).forEach(k=>{ if((e[k] || '') !== val[k]) maj[k] = val[k]; });
  fermerModale();
  if(!Object.keys(maj).length) return;
  Object.assign(maj, { majPar: state.profil, majLe: maintenant });
  Object.assign(e, maj); render();
  ecrire(()=> docRef(id).update(maj));
  notifier('a modifié', e, id);
});
document.getElementById('btn-evt-supprimer').addEventListener('click', async ()=>{
  const id = editionId, e = state.evts[id]; if(!e) return;
  const oui = await dialogue({ titre:'Supprimer « ' + (e.titre || 'cet entraînement') + ' » ?', texte:'Il disparaît pour vous deux.', ok:'Supprimer' });
  if(!oui) return;
  fermerModale();
  delete state.evts[id]; render();
  ecrire(()=> docRef(id).delete(), 'Suppression');
  notifier('a supprimé', e, id);
});

/* ============================================================
   AGENDA APPLE (21/10/2026) — fichier .ics (iCalendar) généré sur le téléphone, ouvert par iOS qui
   propose « Ajouter au calendrier ». Titre dans l'agenda : « <Prénom du profil> à <titre> »
   (ex. « Corentin à Entraînement Angelina »). Heures « flottantes » (sans fuseau) = heure locale du
   téléphone, comme dans l'app. UID stable par entraînement. Rien n'est écrit dans la base.
   ============================================================ */
function icsEchapper(t){ return String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function icsDate(d, h){ return d.replace(/-/g, '') + (h ? 'T' + h.replace(':', '') + '00' : ''); }
function lendemain(d){ const x = versDate(d); x.setDate(x.getDate() + 1); return x.getFullYear() + String(x.getMonth()+1).padStart(2,'0') + String(x.getDate()).padStart(2,'0'); }
function fabriquerIcs(id, e){
  const resume = PRENOM[state.profil] + ' à ' + (e.titre || 'Entraînement');
  const tampon = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const debut = heureValide(e.debut) ? 'DTSTART:' + icsDate(e.date, e.debut) : 'DTSTART;VALUE=DATE:' + icsDate(e.date);
  const fin = heureValide(e.debut)
    ? (heureValide(e.fin) ? 'DTEND:' + icsDate(e.date, e.fin) : 'DURATION:PT1H')
    : 'DTEND;VALUE=DATE:' + lendemain(e.date);
  const l = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PORTAIL-DUO//Agenda Danse//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', 'UID:' + id + '@portail-duo-danse', 'DTSTAMP:' + tampon, debut, fin, 'SUMMARY:' + icsEchapper(resume)];
  if(e.lieu) l.push('LOCATION:' + icsEchapper(e.lieu));
  if(e.note) l.push('DESCRIPTION:' + icsEchapper(e.note));
  l.push('END:VEVENT', 'END:VCALENDAR');
  return l.join('\r\n') + '\r\n';
}
function ajouterAgendaApple(id){
  const e = state.evts[id]; if(!e || !dateValide(e.date)) return;
  const blob = new Blob([fabriquerIcs(id, e)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  /* iOS (Safari et app écran d'accueil) : ouvrir le fichier affiche l'aperçu « Ajouter au calendrier ».
     Ailleurs (ordinateur) : téléchargement du fichier .ics. */
  const a = document.createElement('a');
  a.href = url;
  if(!/iPhone|iPad|iPod/.test(navigator.userAgent)) a.download = 'danse-' + e.date + '.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 60000);
}
document.getElementById('btn-evt-ical').addEventListener('click', ()=>{ if(editionId) ajouterAgendaApple(editionId); });

/* ============================================================
   RÉGLAGES › Recharger l'application : SW de Danse désinscrit, SES caches (danse-*) vidés.
   ============================================================ */
document.getElementById('btn-vider-cache').addEventListener('click', async ()=>{
  const oui = await dialogue({ titre:"Recharger l'application ?", texte:'Le code est retéléchargé. L\'agenda reste dans la base.', ok:'Recharger', danger:false });
  if(!oui) return;
  try {
    if('serviceWorker' in navigator){ const reg = await navigator.serviceWorker.getRegistration('./'); if(reg) await reg.unregister(); }
    if(window.caches){ const cles = await caches.keys(); await Promise.all(cles.filter(k=> k.startsWith('danse-')).map(k=> caches.delete(k))); }
  } catch (e) { console.warn('Nettoyage du cache :', e); }
  window.location.reload();
});

/* ============================================================
   RÉSUMÉ POUR LE PORTAIL — portail/danse = { maj, aVenir, prochains:[{ titre, date, debut, fin }] (3 max) }
   Publié seulement après un instantané venu du SERVEUR (même mécanique que Todo).
   ============================================================ */
let portailRecu = false, portailMinuteur = null;
function calculerResumePortail(){
  const maintenant = Date.now();
  const aVenir = evtsValides().map(([,e])=> e).filter(e=> finMs(e) >= maintenant).sort((a,b)=> cleTri(a).localeCompare(cleTri(b)));
  return { aVenir: aVenir.length, prochains: aVenir.slice(0, 3).map(e=> ({ titre: (e.titre || '').slice(0, 40), date: e.date, debut: e.debut || '', fin: e.fin || '' })) };
}
function planifierPublicationPortail(){
  if(!portailRecu) return;
  clearTimeout(portailMinuteur);
  portailMinuteur = setTimeout(()=>{
    portailMinuteur = null;
    db.collection('portail').doc('danse').set(Object.assign({ maj: Date.now() }, calculerResumePortail()))
      .catch(err=> console.warn('Résumé Portail non publié :', err));
  }, 300);
}

/* ============================================================
   APERÇU LOCAL — affichage immédiat (jamais écrit en base)
   ============================================================ */
const CLE_APERCU = 'danse_apercu_v1';
(function afficherApercu(){
  try {
    const a = JSON.parse(localStorage.getItem(CLE_APERCU) || 'null');
    if(a && typeof a === 'object'){ state.evts = a; charge = true; }
  } catch (e) {}
  render();
})();

/* ============================================================
   DÉMARRAGE — compte du duo uniquement
   ============================================================ */
function demarrer(){
  const afficherConnexion = connexionDuo(auth);
  let arret = null;
  auth.onAuthStateChanged(user=>{
    const compte = !!(user && !user.isAnonymous);
    afficherConnexion(!compte);
    if(compte){
      if(arret) return;
      let premier = true, etaitCache = true;
      arret = db.collection(COL_EVTS).onSnapshot({ includeMetadataChanges: true }, snap=>{
        const cache = snap.metadata.fromCache;
        majStatutConnexion(cache);
        const passageServeur = etaitCache && !cache; etaitCache = cache;
        if(!premier && !passageServeur && snap.docChanges().length === 0) return;
        premier = false;
        const obj = {};
        snap.forEach(doc=> obj[doc.id] = doc.data());
        if(!premierInstantane){ premierInstantane = true; Object.keys(creesAvantInstantane).forEach(k=>{ if(!obj[k]) obj[k] = creesAvantInstantane[k]; delete creesAvantInstantane[k]; }); signalerFirestorePret(); }
        state.evts = obj; charge = true; render();
        try { localStorage.setItem(CLE_APERCU, JSON.stringify(obj)); } catch (e) {}
        if(!cache) portailRecu = true;
        planifierPublicationPortail();
      }, err=> console.warn('onSnapshot danseEvents', err));
    } else if(arret){ arret(); arret = null; }
  });
}
dbReady.then(demarrer);

/* « + » de la vitre Danse du Portail → ?saisie=evt : fenêtre « Nouvel entraînement » ouverte d'office. */
(function saisieDepuisPortail(){
  if(new URLSearchParams(location.search).get('saisie') !== 'evt') return;
  try { history.replaceState(null, '', location.pathname); } catch(e){}
  ouvrirModale(null);
})();
