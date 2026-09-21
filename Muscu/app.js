/* app.js — code de l'app.
   Extrait des anciens <script> inline de index.html le 20/09/2026 (contenu inchangé,
   sauf la constante DERNIERE_MAJ, qui reste dans index.html : voir README). */
/* valeur par défaut le temps que Firebase se connecte, pour éviter toute erreur */
if(!window.archivesCache) window.archivesCache = { corentin: [], lisa: [] };
if(!window.archivesTrashCache) window.archivesTrashCache = { corentin: [], lisa: [] };
if(!window.customSessionsCache) window.customSessionsCache = [];

;

/* ---------- STOCKAGE ROBUSTE (LocalStorage + fallback mémoire) ---------- */
const memoryStore = {};
/* Clés dont l'écriture LocalStorage a échoué (quota plein, navigation privée...).
   Pour celles-ci, la mémoire fait autorité : sans ce marqueur, `get` renverrait
   l'ancienne valeur LocalStorage et écraserait la saisie en cours. */
const memoryOnlyKeys = {};
const storage = {
  get(key){
    if(memoryOnlyKeys[key]) return key in memoryStore ? memoryStore[key] : null;
    try{
      const v = localStorage.getItem(key);
      return v !== null ? v : (key in memoryStore ? memoryStore[key] : null);
    }catch(e){
      return key in memoryStore ? memoryStore[key] : null;
    }
  },
  set(key, value){
    memoryStore[key] = value;
    try{
      localStorage.setItem(key, value);
      delete memoryOnlyKeys[key];
    }catch(e){
      memoryOnlyKeys[key] = true; /* fallback mémoire silencieux */
    }
  }
};

/* ---------- HELPERS ---------- */
/* Échappe le texte saisi avant toute injection via innerHTML (noms d'exercices,
   de séances... saisis librement et partagés entre les deux profils). */
function escapeHtml(value){
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Les champs numériques sont en type="text" (voir plus bas) : on filtre donc les
   caractères parasites au fil de la frappe, virgule et point restant autorisés. */
function sanitizeField(input, mode){
  const cleaned = mode === 'integer'
    ? input.value.replace(/[^0-9]/g, '')
    : input.value.replace(/[^0-9.,]/g, '');
  if(cleaned !== input.value) input.value = cleaned;
}

/* Nombre à la française : espace milliers, virgule décimale, pas de zéro inutile. */
function formatNumberFr(value){
  if(value === null || value === undefined || isNaN(value)) return '—';
  return (Math.round(value * 100) / 100).toLocaleString('fr-FR');
}

/* Affichage d'un poids : virgule française, pas de décimale inutile. */
function formatKg(value){
  if(value === null || value === undefined || isNaN(value)) return '—';
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString('fr-FR') + ' kg';
}

/* Le clavier français produit "22,5" : parseFloat s'arrêterait à 22. */
function parseNum(value){
  if(value === null || value === undefined) return NaN;
  const normalized = String(value).trim().replace(',', '.');
  if(normalized === '') return NaN;
  return parseFloat(normalized);
}

/* ---------- BADGE DE SYNCHRONISATION ---------- */
function updateSyncBadge(){
  const badge = document.getElementById('sync-badge');
  if(!badge) return;
  if(!navigator.onLine){
    badge.textContent = '🔴';
    badge.title = 'Hors ligne — sera synchronisé au retour du réseau';
  } else if(window.__syncPending){
    badge.textContent = '🟡';
    badge.title = 'Synchronisation en cours...';
  } else {
    badge.textContent = '🟢';
    badge.title = 'Synchronisé';
  }
}
window.addEventListener('sync-status-updated', updateSyncBadge);
window.addEventListener('online', updateSyncBadge);
window.addEventListener('offline', updateSyncBadge);
updateSyncBadge();

/* ---------- THÈME CLAIR / SOMBRE ---------- */
function applyTheme(theme){
  document.documentElement.classList.toggle('light-mode', theme === 'light');
  const btn = document.getElementById('theme-toggle');
  if(btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
}
function toggleTheme(){
  const current = storage.get('duo_theme') || 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  storage.set('duo_theme', next);
  applyTheme(next);
}
applyTheme(storage.get('duo_theme') || 'dark');

/* ---------- MESSAGE D'ERREUR FIRESTORE LISIBLE ---------- */
function firestoreErrorMessage(err, action){
  if(err && err.code === 'permission-denied'){
    return `Accès refusé par Firestore — vérifie les règles de sécurité (${action})`;
  }
  return `Échec ${action} — vérifie ta connexion`;
}

/* ---------- VIBRATION (retour haptique à la validation) ---------- */
function vibrate(){
  try{
    if(navigator.vibrate) navigator.vibrate(15);
  }catch(e){ /* API non supportée, ignoré silencieusement */ }
}

/* ---------- DONNEES DU PROGRAMME ---------- */
/* Icônes de groupe musculaire (SVG inline, dessinées pour l'app) */
const ICON_UPPER = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="4.5" cy="12" r="2.2" stroke="currentColor" stroke-width="1.6"/><circle cx="19.5" cy="12" r="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M6.7 12h10.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 12v0M15 12v0" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>`;
/* Barbell vertical (17/09/26) : remplace l'ancienne icône "jambes de
   pantalon", jugée peu lisible face à la maquette ("les logos ne sont pas
   les bons"). Repris du même dessin que ICON_UPPER, tourné à 90° — même
   barre, mais à la verticale pour évoquer un mouvement de squat plutôt que
   de développé couché. Cohérent avec le langage graphique déjà utilisé
   ailleurs (menu, réglages) plutôt qu'une nouvelle icône inédite. */
const ICON_LEGS = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><g transform="rotate(90 12 12)"><circle cx="4.5" cy="12" r="2.2" stroke="currentColor" stroke-width="1.6"/><circle cx="19.5" cy="12" r="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M6.7 12h10.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 12v0M15 12v0" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></g></svg>`;
const ICON_CUSTOM = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M14.5 3.5a3 3 0 0 0-4.2 3.6L4 13.4V17h3.6l6.3-6.3a3 3 0 0 0 3.6-4.2l-2.1 2.1-1.8-1.8 2.1-2.1z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

/* Les types de série (travail / dégressive / échec) ont été retirés : jugés
   inutiles à l'usage. Seules les séries d'échauffement, qui s'AJOUTENT en amont
   sans consommer l'une des séries prévues, sont conservées ci-dessous. */

/* ---------- SÉRIES D'ÉCHAUFFEMENT ----------
   Rangées sous des clés distinctes `ex<i>_warm<n>`, jamais `ex<i>_set<n>`.
   Conséquence voulue : le tonnage, les records et la progression, qui ne lisent
   que les clés `_set`, les ignorent sans qu'aucun filtre soit nécessaire. Et le
   format des archives existantes reste intact. */
function warmupKey(exIdx, n){ return 'ex' + exIdx + '_warm' + n; }
function warmupCount(data, ex, exIdx){
  const store = data.warmups || {};
  const n = store[exerciseKey(ex, exIdx)];
  return typeof n === 'number' ? n : 0;
}
function setWarmupCount(ex, exIdx, n){
  const d = loadDayData(currentSessionId, currentProfile);
  d.warmups = d.warmups || {};
  const key = exerciseKey(ex, exIdx);
  if(n <= 0){
    delete d.warmups[key];
    /* on efface aussi les valeurs de la série retirée */
    Object.keys(d.sets).forEach(k => { if(k.indexOf('ex' + exIdx + '_warm') === 0) delete d.sets[k]; });
  } else {
    d.warmups[key] = Math.min(n, 4);
    for(let i = d.warmups[key] + 1; i <= 4; i++) delete d.sets[warmupKey(exIdx, i)];
  }
  saveDayData(currentSessionId, currentProfile, d);
  render();
}

/* Toujours actif : au pire une case reste vide, ça ne coûte rien. Une bascule
   dans les réglages n'apportait rien de plus qu'une case qu'on oublie d'activer. */
function rpeEnabled(){ return true; }

/* Menu déroulant plutôt qu'un champ libre : le RPE n'a que 10 valeurs
   possibles, un `<select>` évite toute saisie hors plage et s'ouvre en molette
   plein écran sur iPhone. Partagé entre séries de travail et échauffements. */
function buildRpeSelect(currentValue, onPick){
  const sel = document.createElement('select');
  sel.className = 'rpe-input';
  sel.title = 'Difficulté ressentie de 1 à 10';
  const blank = document.createElement('option');
  blank.value = ''; blank.textContent = 'RPE';
  sel.appendChild(blank);
  for(let v = 1; v <= 10; v++){
    const opt = document.createElement('option');
    opt.value = String(v); opt.textContent = String(v);
    sel.appendChild(opt);
  }
  sel.value = currentValue || '';
  sel.onchange = () => onPick(sel.value);
  return sel;
}

/* ---------- ÉQUIPEMENT (Ardoise & craie — refonte 14/09/26) ----------
   Deux listes séparées, volontairement indépendantes :

   LISTE A — mécanique de calcul, fermée à deux valeurs. Le seul critère qui
   compte : y a-t-il une charge dans chaque main (facteur ×2), ou une seule
   charge déjà totale (facteur ×1) ?
     Deux haltères de 22,5 kg × 10 → chaque répétition déplace 45 kg → 450 kg.
     Une poulie à 22,5 kg, 10 à droite puis 10 à gauche → 20 répétitions à
     22,5 kg → 450 kg. Simultané ou alterné, le total est le même : ce qui
     double, c'est la présence de deux charges, pas l'ordre d'exécution.

   LISTE B — vocabulaire équipement, ouverte. Chaque entrée pointe vers l'une
   des deux valeurs de Liste A et porte sa PROPRE phrase d'aide, même quand le
   facteur est identique à une autre entrée : « la charge totale (barre +
   disques) » et « la charge totale affichée sur la poulie » ne se confondent
   pas, même si toutes deux valent ×1. Ajouter un équipement = ajouter une
   entrée ici avec son facteur — zéro risque de casser le calcul ailleurs. */
const EQUIPMENT_METHODS = {
  barre:   { id:'barre',   label:'Barre',              factor:1,
    hint:'Poids : la charge totale (barre + disques). Reps : le nombre de répétitions.' },
  haltere: { id:'haltere', label:'Haltères',           factor:2,
    hint:"Poids : celui d'UN SEUL haltère. Reps : le nombre de répétitions (les deux bras travaillent ensemble). Exemple : 22,5 kg × 10 reps → 450 kg comptés, les deux haltères étant additionnés." },
  machine: { id:'machine', label:'Machine',            factor:1,
    hint:'Poids : la charge totale affichée sur la machine.' },
  poulie2: { id:'poulie2', label:'Poulie 2 mains',     factor:1,
    hint:'Poids : la charge totale affichée sur la poulie.' },
  poulie1: { id:'poulie1', label:'Poulie unilatérale', factor:2,
    hint:'Poids : la charge affichée, faite par UN SEUL bras. Reps : le nombre de répétitions par bras. Exemple : 22,5 kg × 10 reps de chaque côté → 450 kg comptés.' }
};
/* Petites icônes de mode de charge (17/09/26) : purement décoratives, en
   `currentColor` pour suivre la couleur du bouton (gris au repos, couleur du
   profil actif — --accent — une fois sélectionné, 18/09/26) — aucun impact
   sur le calcul. */
const EQUIPMENT_ICONS = {
  barre:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="10.5" width="18" height="3" rx="1.5" fill="currentColor"/></svg>',
  haltere: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="7" cy="12" r="5" fill="currentColor"/><circle cx="17" cy="12" r="5" fill="currentColor"/></svg>',
  machine: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" opacity="0.85"/></svg>',
  poulie2: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7" fill="currentColor"/></svg>',
  poulie1: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="12" r="6" fill="currentColor"/><circle cx="18" cy="12" r="3" fill="currentColor" opacity="0.4"/></svg>'
};
/* Ordre d'affichage stable (menu Build Training, etc.) */
const EQUIPMENT_METHOD_IDS = ['barre', 'haltere', 'machine', 'poulie2', 'poulie1'];
function equipmentInfo(id){ return EQUIPMENT_METHODS[id] || null; }

/* Identifiant de méthode actif pour CET exercice, dans CETTE séance en cours :
   - `ex.equipment` absent/vide → aucune méthode déclarée, ×1 par défaut (cas
     des exercices à machine/barre fixe, qui n'ont pas besoin de sélecteur).
   - une seule entrée → méthode fixe, pas de sélecteur affiché non plus.
   - plusieurs entrées → sélecteur affiché ; sans choix explicite de
     l'utilisateur, la PREMIÈRE entrée fait foi (c'est la méthode réellement
     pratiquée par défaut). Contrairement à l'ancien modèle « aucune
     présélection », qui a fait sous-compter en silence le tonnage d'un
     exercice toujours fait aux haltères mais jamais explicitement sélectionné
     (incident du 14/09/26 sur le Développé militaire assis) : quand une seule
     méthode est plausible en pratique, le calcul ne doit pas dépendre d'un tap
     que personne ne pense à faire. */
function getExerciseEquipmentId(ex, exIdx, data){
  const list = (ex && ex.equipment) || [];
  if(list.length === 0) return null;
  if(list.length === 1) return list[0];
  const stored = readByExercise(data.variants, ex, exIdx);
  return list.includes(stored) ? stored : list[0];
}
function equipmentFactor(ex, exIdx, data){
  const id = getExerciseEquipmentId(ex, exIdx, data);
  const info = id ? equipmentInfo(id) : null;
  return info ? info.factor : 1;
}

/* Même logique que ci-dessus, mais pour un exercice déjà archivé : on ne
   dispose plus de l'objet `ex` d'origine, seulement de son nom. On retrouve
   sa liste de méthodes plausibles via le catalogue courant (séances fixes
   puis personnalisées) — si l'exercice n'y figure plus, on retombe sur ×1,
   comme le faisait déjà l'ancien modèle pour un cas inconnu. */
function equipmentListForExerciseName(name){
  for(const s of SESSIONS){
    const found = (s.exercises || []).find(e => e.name === name);
    if(found && found.equipment && found.equipment.length) return found.equipment;
  }
  for(const s of (window.customSessionsCache || [])){
    const found = (s.exercises || []).find(e => e.name === name);
    if(found && found.equipment && found.equipment.length) return found.equipment;
  }
  return null;
}

/* Séances numérotées (indépendantes du jour de la semaine, pour s'adapter à un emploi du temps mobile) */
const SESSIONS = [
  {
    id: "s1", muscleIcon: ICON_LEGS,
    label: "Séance 1",
    title: "Bas du Corps (Quads & Fessiers)",
    cardio: { name: "Tapis incliné Zone 2", targetMinutes: 30 },
    exercises: [
      { name:"Squat", sets:4, target:{corentin:"8-10 reps (Lourd)", lisa:"10-12 reps (Contrôlé)"}, equipment:['barre'] },
      { name:"Fentes arrière", sets:3, target:{corentin:"10 reps/jambe", lisa:"12 reps/jambe"}, equipment:['barre'] },
      { name:"Leg Extension", sets:3, target:{corentin:"10-12 reps", lisa:"12-15 reps"}, equipment:['machine'] },
      { name:"Leg Curl", sets:3, target:{corentin:"10-12 reps", lisa:"12-15 reps"}, equipment:['machine'] }
    ]
  },
  {
    id: "s2", muscleIcon: ICON_UPPER,
    label: "Séance 2",
    title: "Haut du Corps & Abdos",
    cardio: { name: "Tapis incliné Zone 2", targetMinutes: 30 },
    exercises: [
      { name:"Tirage vertical", sets:4, target:{corentin:"8-10 reps", lisa:"10-12 reps"}, equipment:['poulie2','poulie1'] },
      { name:"Développé incliné", sets:4, target:{corentin:"8-10 reps", lisa:"10-12 reps"}, equipment:['haltere','barre','machine'] },
      { name:"Élévations latérales", sets:4, target:{corentin:"12-15 reps", lisa:"12-15 reps"}, equipment:['haltere','poulie1','machine'] },
      { name:"Circuit Abdos (Relevés de jambes 12-15r + Gainage 45s)", sets:3, target:{corentin:"3 tours", lisa:"3 tours"}, logType:"circuit" }
    ]
  },
  {
    id: "s3", muscleIcon: ICON_LEGS,
    label: "Séance 3",
    title: "Bas du Corps (Fessiers & Ischios)",
    cardio: { name: "Tapis incliné Zone 2", targetMinutes: 30 },
    exercises: [
      { name:"Hip Thrust", sets:4, target:{corentin:"8-10 reps (Lourd)", lisa:"10-12 reps (Pause 1-2s haut)"}, equipment:['barre','machine'] },
      { name:"Soulevé de terre / RDL", sets:4, target:{corentin:"8-10 reps", lisa:"10-12 reps"}, equipment:['barre'] },
      { name:"Presse à cuisses (Pieds hauts & écartés)", sets:3, target:{corentin:"10-12 reps", lisa:"12-15 reps"}, equipment:['machine'] },
      { name:"Abducteurs", sets:3, target:{corentin:"15 reps", lisa:"15-20 reps (Pause 1s)"}, equipment:['machine'] }
    ]
  },
  {
    id: "s4", muscleIcon: ICON_UPPER,
    label: "Séance 4",
    title: "Haut du Corps & Abdos",
    cardio: null,
    exercises: [
      { name:"Tirage horizontal", sets:4, target:{corentin:"8-10 reps", lisa:"10-12 reps"}, equipment:['poulie2','poulie1'] },
      { name:"Développé militaire assis", sets:4, target:{corentin:"8-10 reps", lisa:"10-12 reps"}, equipment:['haltere','machine'] },
      { name:"Face Pulls", sets:3, target:{corentin:"12-15 reps", lisa:"12-15 reps"}, equipment:['poulie2'] },
      { name:"Circuit Abdos (Crunchs 15-20r + Portefeuille 12-15r)", sets:3, target:{corentin:"3 tours", lisa:"3 tours"}, logType:"circuit" }
    ]
  }
];

/* Les 4 séances du programme sont modifiables : éditer l'une d'elles enregistre
   une SURCHARGE dans `customSessions`, sous le même id (`s1`…). Elle prend alors
   le pas sur la version codée en dur, et la supprimer restaure l'original.
   Aucune collection ni règle Firestore supplémentaire, et les archives — qui
   référencent `sessionId` — continuent de pointer au bon endroit. */
function isFixedSessionId(id){
  return SESSIONS.some(s => s.id === id);
}
function getSessionOverride(id){
  return (window.customSessionsCache || []).find(s => s.id === id) || null;
}
function getSession(id){
  const override = getSessionOverride(id);
  if(override) return decorateSession(override);
  const fixed = SESSIONS.find(s => s.id === id);
  if(fixed) return fixed;
  return SESSIONS[0];
}
/* L'icône de groupe musculaire n'est pas stockée en base (SVG volumineux) :
   une surcharge de séance fixe récupère celle de l'originale. */
function decorateSession(session){
  if(session.muscleIcon) return session;
  const fixed = SESSIONS.find(s => s.id === session.id);
  return Object.assign({}, session, { muscleIcon: fixed ? fixed.muscleIcon : ICON_CUSTOM });
}
/* Séances personnalisées à part entière, hors surcharges des séances fixes. */
function getPureCustomSessions(){
  return (window.customSessionsCache || []).filter(s => !isFixedSessionId(s.id));
}

/* ---------- ETAT ---------- */
let currentProfile = storage.get("duo_profile") || "corentin";
let currentSessionId = storage.get("duo_session") || SESSIONS[0].id;
/* Les séances personnalisées arrivent de Firestore APRÈS ce code : on ne peut pas
   encore les valider. On accepte donc tout id `custom_*`, sinon la dernière séance
   perso ouverte serait systématiquement remplacée par la Séance 1 au rechargement. */
if(!SESSIONS.some(s => s.id === currentSessionId) && String(currentSessionId).indexOf('custom_') !== 0){
  currentSessionId = SESSIONS[0].id;
}

function dataKey(sessionId, profile){
  return `duo_data_${sessionId}_${profile}`;
}
function blankDayData(){
  return { sets:{}, variants:{}, notes:{}, warmups:{}, sessionNote:'', cardioDone:false, cardioMinutes:'', cardioIncline:'', cardioSpeed:'', cardioNote:'' };
}
function loadDayData(sessionId, profile){
  const raw = storage.get(dataKey(sessionId, profile));
  if(!raw) return blankDayData();
  let parsed;
  try{ parsed = JSON.parse(raw); }catch(e){ return blankDayData(); }
  if(!parsed || typeof parsed !== 'object') return blankDayData();
  /* Normalisation : une donnée écrite par une ancienne version peut ne pas avoir
     toutes les clés, et `data.sets[...]` planterait. */
  return Object.assign(blankDayData(), parsed, {
    sets: parsed.sets || {},
    variants: parsed.variants || {},
    notes: parsed.notes || {},
    warmups: parsed.warmups || {}
  });
}
function saveDayData(day, profile, data){
  storage.set(dataKey(day, profile), JSON.stringify(data));
}

/* ---------- CLÉS NOTES / VARIANTES ----------
   Historiquement indexées par la position de l'exercice : réordonner une séance
   personnalisée décalait notes et variantes d'un cran. On les rattache désormais
   au nom de l'exercice, avec repli sur l'ancienne clé pour les données existantes. */
function exerciseKey(ex, exIdx){
  return (ex && ex.name) ? 'name:' + ex.name : 'idx:' + exIdx;
}
function readByExercise(store, ex, exIdx){
  if(!store) return '';
  const key = exerciseKey(ex, exIdx);
  if(key in store) return store[key] || '';
  if(exIdx in store) return store[exIdx] || '';   /* ancien format */
  return '';
}

/* ---------- ANNULER LA DERNIÈRE ACTION ---------- */
const undoStacks = {}; // { "sessionId_profile": [snapshot1, snapshot2, ...] }
function pushUndoSnapshot(){
  const key = dataKey(currentSessionId, currentProfile);
  if(!undoStacks[key]) undoStacks[key] = [];
  const snapshot = JSON.stringify(loadDayData(currentSessionId, currentProfile));
  /* Inutile d'empiler deux fois le même état : la pile se remplirait de doublons
     et le bouton ↩️ semblerait ne rien faire. */
  if(undoStacks[key][undoStacks[key].length - 1] === snapshot) return;
  undoStacks[key].push(snapshot);
  if(undoStacks[key].length > 25) undoStacks[key].shift();
}

/* Un focus seul ne modifie rien : on "arme" le snapshot au focus et on ne
   l'empile qu'à la première frappe effective dans le champ. */
let undoArmed = false;
function armUndoSnapshot(){ undoArmed = true; }
function snapshotBeforeEdit(){
  if(!undoArmed) return;
  undoArmed = false;
  pushUndoSnapshot();
}
function undoLastAction(){
  const key = dataKey(currentSessionId, currentProfile);
  const stack = undoStacks[key];
  if(!stack || stack.length === 0){
    showToast('Rien à annuler');
    return;
  }
  const previous = stack.pop();
  try{
    storage.set(key, previous);
  }catch(e){ /* ignore */ }
  render();
  showToast('Dernière action annulée ↩️');
}

/* ---------- RENDU ---------- */
function applyThemeColor(){
  const isLisa = currentProfile === 'lisa';
  document.documentElement.style.setProperty('--accent', isLisa ? 'var(--lisa)' : 'var(--corentin)');
  document.documentElement.style.setProperty('--accent-rgb', isLisa ? 'var(--lisa-rgb)' : 'var(--corentin-rgb)');
  document.documentElement.style.setProperty('--accent-dark', isLisa ? 'var(--lisa-dark)' : 'var(--corentin-dark)');
}

function setProfile(profile){
  currentProfile = profile;
  storage.set("duo_profile", profile);
}

function selectProfile(profile){
  setProfile(profile);
  applyThemeColor();
  renderSessionList();
  showView('view-session', 'fwd');
}

function setSession(sessionId){
  currentSessionId = sessionId;
  storage.set("duo_session", sessionId);
}

function selectSession(sessionId){
  setSession(sessionId);
  const profileLabel = document.getElementById('exercises-profile-label');
  profileLabel.textContent = (currentProfile === 'corentin' ? 'Corentin' : 'Lisa');
  showView('view-exercises', 'fwd');
  render();
  adjustBottomSpacing();
  setTimeout(adjustBottomSpacing, 300);
}

function goToMenuView(){
  renderMenuHero();
  showView('view-menu', 'back');
}

/* Carte "hero" du menu (17/09/26, compteur du haut remplacé le 18/09/26) :
   réutilise getLifetimeStats(), déjà utilisée par Suivi Progression, pour les
   deux profils à la fois. Le compteur du haut affichait une "série en cours"
   (jours consécutifs) ; il affiche désormais le nombre total de séances
   faites, en moyenne par personne — (séances Corentin + séances Lisa) / 2 —
   et les deux puces du bas restent le tonnage total depuis le début (déjà le
   cas via getLifetimeStats().tonnage, qui somme toutes les archives actives
   sans filtre de date, corbeille exclue). */
function renderMenuHero(){
  const elC = document.getElementById('menu-hero-corentin');
  const elL = document.getElementById('menu-hero-lisa');
  if(!elC || !elL) return;
  const statsC = getLifetimeStats('corentin');
  const statsL = getLifetimeStats('lisa');
  elC.textContent = statsC.tonnage.toLocaleString('fr-FR') + ' kg';
  elL.textContent = statsL.tonnage.toLocaleString('fr-FR') + ' kg';

  const avgSessions = Math.round((statsC.sessions + statsL.sessions) / 2);
  const sessionsEl = document.getElementById('menu-hero-sessions');
  if(sessionsEl) sessionsEl.innerHTML = avgSessions + ' <small>séance' + (avgSessions > 1 ? 's' : '') + '</small>';
}

function goToProfileView(direction){
  showView('view-profile', direction || 'back');
}

function goToSessionView(){
  renderSessionList();
  showView('view-session', 'back');
}

function goToArchivesView(direction){
  archivesMode = 'active';
  renderArchivesList();
  showView('view-archives', direction || 'fwd');
}

/* Profil consulté dans l'écran Progression. Volontairement distinct de
   `currentProfile` : regarder les courbes de l'autre ne doit pas changer le
   profil avec lequel on s'entraîne. */
let progressProfile = currentProfile;

let progressTab = 'training'; // 'training' | 'body'

function setProgressProfile(profile){
  progressProfile = profile;
  progressSelection = null; /* les exercices diffèrent d'un profil à l'autre */
  bodyProgressSelection = null; /* les mesures d'un profil ne concernent pas l'autre */
  bodyVisibleFields = null; /* retombe sur "toutes" pour les mesures du nouveau profil */
  cancelEditBodyEntry(); /* une édition en cours concerne l'ancien profil, pas le nouveau */
  renderProgressView();
}

function setProgressTab(tab){
  progressTab = tab;
  document.querySelectorAll('#progress-tabs .segmented-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', (tab === 'training' && i === 0) || (tab === 'body' && i === 1));
  });
  document.getElementById('progress-training-panel').style.display = tab === 'training' ? 'block' : 'none';
  document.getElementById('progress-body-panel').style.display = tab === 'body' ? 'block' : 'none';
}

/* Toujours reconstruire les deux volets, même celui masqué : sans ça, changer
   de profil pendant qu'on est sur "Entraînement" laisserait l'onglet "Corps"
   afficher la liste et le graphique de l'ancien profil au prochain aller-retour. */
function renderProgressView(){
  document.querySelectorAll('#progress-profile-switch .profile-switch-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.classList.contains(progressProfile));
  });
  /* Le graphique reprend la couleur du profil consulté (override local de
     --accent/--accent-rgb/--accent-dark, indépendant du profil actif
     `currentProfile` piloté par applyThemeColor()). */
  const view = document.getElementById('view-progress');
  if(view){
    const isLisaProg = progressProfile === 'lisa';
    view.style.setProperty('--accent', isLisaProg ? 'var(--lisa)' : 'var(--corentin)');
    view.style.setProperty('--accent-rgb', isLisaProg ? 'var(--lisa-rgb)' : 'var(--corentin-rgb)');
    view.style.setProperty('--accent-dark', isLisaProg ? 'var(--lisa-dark)' : 'var(--corentin-dark)');
  }

  renderLifetimeCard();
  renderProgressExerciseList();
  renderProgressControls();
  document.getElementById('progress-chart-wrap').innerHTML = '';

  renderBodyPanel();
}

/* 063 : tout ce qui a été soulevé depuis le début, corbeille exclue. */
function renderLifetimeCard(){
  const card = document.getElementById('lifetime-card');
  if(!card) return;
  const stats = getLifetimeStats(progressProfile);
  if(stats.sessions === 0){ card.style.display = 'none'; card.innerHTML = ''; return; }
  card.style.display = 'flex';
  card.innerHTML = `
    <div class="lifetime-block">
      <span class="lifetime-value">${escapeHtml(stats.tonnage.toLocaleString('fr-FR'))}</span>
      <span class="lifetime-label">kg soulevés au total</span>
    </div>
    <div class="lifetime-sep"></div>
    <div class="lifetime-block">
      <span class="lifetime-value">${stats.sessions}</span>
      <span class="lifetime-label">séance${stats.sessions > 1 ? 's' : ''} archivée${stats.sessions > 1 ? 's' : ''}</span>
    </div>
  `;
}

function goToProgressView(){
  progressProfile = currentProfile;
  progressSelection = null;
  bodyProgressSelection = null;
  bodyVisibleFields = null;
  cancelEditBodyEntry();
  setProgressTab('training');
  renderProgressView();
  showView('view-progress', 'fwd');
}

/* D'où le builder a été ouvert : depuis le menu principal (création) ou depuis la
   liste des séances (édition via ✏️). Le retour doit ramener au bon endroit. */

/* Build Training s'ouvre désormais sur un HUB : créer une nouvelle séance, ou
   choisir une séance existante à modifier. La modification n'est plus
   accessible depuis l'écran Entraînement (retiré des pencils sur la liste des
   séances) — elle se passe uniquement ici. */
let builderScreen = 'hub'; // 'hub' | 'form'

function goToBuilderView(){
  showBuilderHub();
  showView('view-builder', 'fwd');
}

function showBuilderHub(){
  builderScreen = 'hub';
  document.getElementById('builder-title').textContent = 'Build Training';
  document.getElementById('builder-back-btn').textContent = '← Menu';
  document.getElementById('builder-hub').style.display = 'block';
  document.getElementById('builder-form-wrap').style.display = 'none';
  renderBuilderHub();
}

function showBuilderForm(){
  builderScreen = 'form';
  document.getElementById('builder-hub').style.display = 'none';
  document.getElementById('builder-form-wrap').style.display = 'block';
  renderBuilderForm();
}

function startNewSessionInBuilder(){
  resetBuilderDraft();
  showBuilderForm();
}

/* Le formulaire est un sous-écran du hub : son retour ramène au hub, jamais
   directement au menu — sinon on saute une étape sans prévenir. */
function exitBuilder(){
  if(builderScreen === 'form') showBuilderHub();
  else goToMenuView();
}

function renderBuilderHub(){
  const list = document.getElementById('builder-hub-list');
  list.innerHTML = '';

  function addRow(id, name, sub, isFixed, modified){
    const row = document.createElement('div');
    row.className = 'builder-hub-row';
    row.innerHTML = `
      <span class="builder-hub-text">
        <span class="builder-hub-name">${escapeHtml(name)}${modified ? ' <span class="s-tag">modifiée</span>' : ''}</span>
        <span class="builder-hub-sub">${escapeHtml(sub)}</span>
      </span>
    `;
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.title = 'Modifier cette séance';
    editBtn.onclick = () => editCustomSession(id);
    row.appendChild(editBtn);
    if(!isFixed){
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️';
      delBtn.title = 'Supprimer cette séance';
      delBtn.onclick = () => askDeleteCustomSession(id);
      row.appendChild(delBtn);
    }
    list.appendChild(row);
  }

  SESSIONS.forEach(fixed => {
    const session = getSession(fixed.id);
    addRow(fixed.id, session.label, session.title, true, !!getSessionOverride(fixed.id));
  });
  getPureCustomSessions().forEach(session => {
    addRow(session.id, session.label, session.title || 'Séance personnalisée', false, false);
  });
}

function showView(viewId, direction){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active', 'slide-fwd', 'slide-back'));
  const target = document.getElementById(viewId);
  if(target){
    target.classList.add('active');
    if(direction === 'fwd') target.classList.add('slide-fwd');
    if(direction === 'back') target.classList.add('slide-back');
  }
  window.scrollTo(0,0);
  if(typeof adjustBottomSpacing === 'function') adjustBottomSpacing();
}

function renderSessionList(){
  const title = document.getElementById('session-view-title');
  title.textContent = `Choisis ta séance — ${currentProfile === 'corentin' ? 'Corentin' : 'Lisa'}`;

  const list = document.getElementById('session-list');
  list.innerHTML = '';
  SESSIONS.forEach(fixed => {
    const session = getSession(fixed.id);
    const modified = !!getSessionOverride(fixed.id);
    const row = document.createElement('div');
    row.className = 'session-btn custom-session-row' + (session.id === currentSessionId ? ' selected' : '');
    row.innerHTML = `
      <span class="session-icon">${session.muscleIcon}</span>
      <span class="session-text">
        <span class="s-label">${escapeHtml(session.label)}${modified ? ' <span class="s-tag">modifiée</span>' : ''}</span>
        <span class="s-subtitle">${escapeHtml(session.title)}</span>
      </span>
    `;
    row.onclick = () => selectSession(fixed.id);

    /* La corbeille n'apparaît que si la séance a été modifiée : elle ne supprime
       pas la séance, elle rend sa version d'origine. */
    if(modified){
      const resetBtn = document.createElement('button');
      resetBtn.className = 'custom-session-delete';
      resetBtn.textContent = '↺';
      resetBtn.title = "Restaurer la séance d'origine";
      resetBtn.onclick = (e) => { e.stopPropagation(); askRestoreFixedSession(fixed.id); };
      row.appendChild(resetBtn);
    }

    list.appendChild(row);
  });

  /* 130 : les séances personnalisées arrivent de Firestore. Tant que le premier
     snapshot n'est pas là, on réserve leur place plutôt que de faire sauter la
     liste quand elles apparaissent. */
  if(!window.__customSessionsLoaded && (window.customSessionsCache || []).length === 0){
    for(let i = 0; i < 2; i++){
      const sk = document.createElement('div');
      sk.className = 'session-btn skeleton-item';
      sk.innerHTML = `
        <span class="session-icon"><span class="sk-line sk-icon"></span></span>
        <span class="session-text"><span class="sk-line sk-sm"></span><span class="sk-line sk-lg"></span></span>
      `;
      list.appendChild(sk);
    }
  }

  const customSessions = getPureCustomSessions();
  customSessions.forEach(session => {
    const row = document.createElement('div');
    row.className = 'session-btn custom-session-row' + (session.id === currentSessionId ? ' selected' : '');
    row.innerHTML = `
      <span class="session-icon">${ICON_CUSTOM}</span>
      <span class="session-text">
        <span class="s-label">${escapeHtml(session.label)}</span>
        <span class="s-subtitle">${escapeHtml(session.title || 'Séance personnalisée')}</span>
      </span>
    `;
    row.onclick = () => selectSession(session.id);

    const delBtn = document.createElement('button');
    delBtn.className = 'custom-session-delete';
    delBtn.textContent = '🗑️';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      askDeleteCustomSession(session.id);
    };
    row.appendChild(delBtn);

    list.appendChild(row);
  });

  const archiveCount = getArchivesList(currentProfile).length;
  const trashCount = getTrashList(currentProfile).length;
  const archBtn = document.createElement('button');
  archBtn.className = 'session-btn archive-entry';
  archBtn.innerHTML = `
    <span class="session-icon">📦</span>
    <span class="session-text">
      <span class="s-label">Archives</span>
      <span class="s-subtitle">${archiveCount} séance${archiveCount > 1 ? 's' : ''} enregistrée${archiveCount > 1 ? 's' : ''}${trashCount > 0 ? ` · ${trashCount} en corbeille` : ''}</span>
    </span>
  `;
  archBtn.onclick = () => goToArchivesView();
  list.appendChild(archBtn);
}

function computeSessionTonnage(dayProgram, data){
  let tonnage = 0;
  dayProgram.exercises.forEach((ex, exIdx) => {
    const factor = equipmentFactor(ex, exIdx, data);
    for(let s = 1; s <= ex.sets; s++){
      const setData = data.sets[`ex${exIdx}_set${s}`];
      if(ex.logType !== 'circuit' && setData){
        const w = parseNum(setData.weight);
        const r = parseNum(setData.reps);
        if(!isNaN(w) && !isNaN(r)) tonnage += w * r * factor;
      }
    }
  });
  return tonnage;
}

function updateSessionProgress(){
  const dayProgram = getSession(currentSessionId);
  const data = loadDayData(currentSessionId, currentProfile);
  let total = 0, done = 0;
  const tonnage = computeSessionTonnage(dayProgram, data);

  dayProgram.exercises.forEach((ex, exIdx) => {
    for(let s = 1; s <= ex.sets; s++){
      total++;
      const setData = data.sets[`ex${exIdx}_set${s}`];
      if(setData && setData.done) done++;
    }
  });
  /* Le cardio ne compte dans la progression que s'il est prévu par la séance :
     une case optionnelle non cochée ne doit pas empêcher d'atteindre 100 %. */
  if(dayProgram.cardio){
    total++;
    if(data.cardioDone) done++;
  }

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = total > 0 && done === total;
  const track = document.querySelector('.session-progress-track');
  /* 129 : franchir les 100 % se remarque, mais une seule fois — on ne rejoue pas
     l'animation à chaque re-render une fois la séance complète. */
  if(track){
    const was = track.classList.contains('complete');
    track.classList.toggle('complete', complete);
    if(complete && !was){
      track.classList.remove('celebrate'); void track.offsetWidth; track.classList.add('celebrate');
    }
    if(!complete) track.classList.remove('celebrate');
  }
  const fill = document.getElementById('session-progress-fill');
  const label = document.getElementById('session-progress-label');
  const tonnageLabel = document.getElementById('session-tonnage-label');
  if(fill) fill.style.width = pct + '%';
  if(label) label.textContent = complete ? `Séance complète — ${total} / ${total} validés` : `${done} / ${total} validés`;
  if(tonnageLabel){
    const formatted = Math.round(tonnage).toLocaleString('fr-FR');
    tonnageLabel.textContent = tonnage > 0 ? `💪 ${formatted} kg soulevés cette séance` : '';
  }
}

function render(){
  applyThemeColor();

  const main = document.getElementById('main-content');
  main.innerHTML = '';
  const dayProgram = getSession(currentSessionId);

  const data = loadDayData(currentSessionId, currentProfile);

  const titleEl = document.createElement('div');
  titleEl.className = 'session-title';
  titleEl.textContent = `${dayProgram.label} — ${dayProgram.title}`;
  main.appendChild(titleEl);

  const subtitleEl = document.createElement('div');
  subtitleEl.className = 'session-subtitle';
  subtitleEl.textContent = currentProfile === 'corentin' ? 'Profil : Corentin' : 'Profil : Lisa';
  main.appendChild(subtitleEl);

  data.variants = data.variants || {};
  data.notes = data.notes || {};

  /* Note de séance : contexte global du jour (fatigue, douleur, matériel,
     changement de programme). Distincte des notes d'exercice, qui répondent à
     « comment s'est passé CET exercice ». */
  const sessionNoteWrap = document.createElement('div');
  sessionNoteWrap.className = 'session-note-card';
  const sessionNoteLabel = document.createElement('span');
  sessionNoteLabel.className = 'mini-label';
  sessionNoteLabel.textContent = '📝 Note de séance';
  sessionNoteWrap.appendChild(sessionNoteLabel);
  const sessionNoteInput = document.createElement('textarea');
  sessionNoteInput.className = 'note-input session-note-input';
  sessionNoteInput.rows = 2;
  sessionNoteInput.placeholder = "Comment tu te sens, ce qui a changé aujourd'hui…";
  sessionNoteInput.value = data.sessionNote || '';
  sessionNoteInput.onfocus = armUndoSnapshot;
  sessionNoteInput.oninput = () => {
    snapshotBeforeEdit();
    const d = loadDayData(currentSessionId, currentProfile);
    d.sessionNote = sessionNoteInput.value;
    saveDayData(currentSessionId, currentProfile, d);
  };
  sessionNoteWrap.appendChild(sessionNoteInput);
  main.appendChild(sessionNoteWrap);

  dayProgram.exercises.forEach((ex, exIdx) => {
    const card = document.createElement('div');
    card.className = 'exercise-card';

    /* 109 : la carte se lit en deux temps — l'identité de l'exercice (ce que
       c'est, ce qu'on vise, ce qu'on avait fait), puis la zone de saisie. Les
       deux blocs ont des fonds distincts séparés par un filet. */
    const headWrap = document.createElement('div');
    headWrap.className = 'exercise-headwrap';
    card.appendChild(headWrap);

    const body = document.createElement('div');
    body.className = 'exercise-body';
    card.appendChild(body);

    const head = document.createElement('div');
    head.className = 'exercise-head';
    head.innerHTML = `
      <div class="exercise-name">${escapeHtml(ex.name)}</div>
      <div class="exercise-target">${escapeHtml((ex.target && ex.target[currentProfile]) || '')}</div>
    `;
    headWrap.appendChild(head);

    /* 005 / 006 : contexte historique de l'exercice, lu une seule fois par carte. */
    const isCircuitEx = ex.logType === 'circuit';
    const lastPerf = isCircuitEx ? null : getLastPerformance(currentProfile, ex.name);
    const record = isCircuitEx ? null : getPersonalRecord(currentProfile, ex.name);

    if(lastPerf || record){
      const histRow = document.createElement('div');
      histRow.className = 'exercise-history';
      if(lastPerf){
        const best = lastPerf.sets.reduce(function(a, b){ return b.weight > a.weight ? b : a; });
        const span = document.createElement('span');
        span.className = 'hist-last';
        span.textContent = 'Dernière fois : ' + formatKg(best.weight)
          + (isNaN(best.reps) ? '' : ' × ' + best.reps) + '  ·  ' + lastPerf.dateLabel;
        histRow.appendChild(span);
      }
      if(record){
        /* Le record affiche la série réellement faite (poids × reps), pas un
           chiffre de volume abstrait : c'est ce qui reste lisible et vérifiable
           d'un coup d'œil en salle. Le volume ne sert qu'en coulisse à décider
           QUELLE série est le record. */
        const rec = document.createElement('span');
        rec.className = 'hist-record';
        rec.textContent = 'Record ' + formatKg(record.weight) + ' × ' + record.reps;
        histRow.appendChild(rec);
      }
      headWrap.appendChild(histRow);
    }

    /* Badge affiché dès qu'une série saisie dépasse le record archivé. */
    const prBadge = document.createElement('div');
    prBadge.className = 'pr-badge';
    prBadge.style.display = 'none';
    prBadge.textContent = '';
    body.appendChild(prBadge);

    /* Un exercice dont toutes les séries sont validées se signale discrètement :
       en salle, ça évite de recompter les coches pour savoir où on en est. */
    function refreshCardState(){
      const d = loadDayData(currentSessionId, currentProfile);
      let done = 0;
      for(let n = 1; n <= ex.sets; n++){
        const cur = d.sets['ex' + exIdx + '_set' + n];
        if(cur && cur.done) done++;
      }
      card.classList.toggle('complete', done === ex.sets && ex.sets > 0);
    }

    function refreshRecordBadge(){
      if(isCircuitEx || !record){ prBadge.style.display = 'none'; return; }
      const d = loadDayData(currentSessionId, currentProfile);
      /* La méthode en cours de saisie compte aussi dans la comparaison :
         un exercice passé aux haltères aujourd'hui double son volume, comme le
         reste de l'app. */
      const liveFactor = equipmentFactor(ex, exIdx, d);
      let bestVol = 0, bestWeight = 0, bestReps = 0;
      for(let n = 1; n <= ex.sets; n++){
        const cur = d.sets['ex' + exIdx + '_set' + n];
        if(!cur) continue;
        const w = parseNum(cur.weight), r = parseNum(cur.reps);
        const vol = setVolume(w, r, liveFactor);
        if(!isNaN(vol) && vol > bestVol){ bestVol = vol; bestWeight = w; bestReps = r; }
      }
      if(bestVol > record.volume){
        const wasHidden = prBadge.style.display === 'none';
        prBadge.textContent = 'Nouveau record : ' + formatKg(bestWeight) + ' × ' + bestReps
          + '  (précédent : ' + formatKg(record.weight) + ' × ' + record.reps + ')';
        prBadge.style.display = 'flex';
        if(wasHidden){
          prBadge.classList.remove('pop'); void prBadge.offsetWidth; prBadge.classList.add('pop');
        }
        recordFireSet(card, true);
      } else {
        prBadge.style.display = 'none';
        recordFireSet(card, false);
      }
    }
    refreshRecordBadge();
    refreshCardState();

    /* Le sélecteur de méthode ne s'affiche QUE si l'exercice a plusieurs
       méthodes plausibles (Liste B, voir plus haut) : un Squat ou une Leg
       Extension n'ont qu'une méthode, pas de bouton à leur imposer. Quand il y
       en a plusieurs, la première de la liste fait foi tant que rien n'a été
       tapé explicitement (voir getExerciseEquipmentId) — elle apparaît donc
       déjà « selected » à l'ouverture. */
    const equipmentList = (ex.equipment || []);
    if(!isCircuitEx && equipmentList.length > 1){
      const variantKey = exerciseKey(ex, exIdx);
      const currentEquip = getExerciseEquipmentId(ex, exIdx, data);

      const variantRow = document.createElement('div');
      variantRow.className = 'variant-row';
      equipmentList.forEach(id => {
        const info = equipmentInfo(id);
        if(!info) return;
        const optBtn = document.createElement('button');
        optBtn.className = 'variant-btn' + (currentEquip === id ? ' selected' : '');
        optBtn.innerHTML = `<span class="variant-icon">${EQUIPMENT_ICONS[id] || ''}</span>`
          + `<span class="variant-name">${escapeHtml(info.label)}</span>`
          + `<span class="variant-sub">${info.factor === 2 ? 'poids par main' : 'charge totale'}</span>`;
        optBtn.onclick = () => {
          pushUndoSnapshot();
          const d = loadDayData(currentSessionId, currentProfile);
          d.variants = d.variants || {};
          if(exIdx in d.variants) delete d.variants[exIdx]; /* migration ancienne clé */
          d.variants[variantKey] = id;
          saveDayData(currentSessionId, currentProfile, d);
          render();
        };
        variantRow.appendChild(optBtn);
      });
      body.appendChild(variantRow);

      const info = equipmentInfo(currentEquip);
      if(info){
        const variantHint = document.createElement('div');
        variantHint.className = 'variant-hint' + (info.factor === 2 ? ' doubled' : '');
        variantHint.textContent = info.hint;
        body.appendChild(variantHint);
      }
    }

    const isCircuit = ex.logType === 'circuit';

    const gridHeader = document.createElement('div');
    gridHeader.className = isCircuit ? 'set-grid-header circuit' : 'set-grid-header';
    const perHand = !isCircuit && equipmentFactor(ex, exIdx, data) === 2;
    const showRpe = !isCircuit && rpeEnabled();
    gridHeader.className = 'set-grid-header' + (isCircuit ? ' circuit' : '') + (showRpe ? ' with-rpe' : '');
    gridHeader.innerHTML = isCircuit
      ? `<span>Tour</span><span>Résultat</span><span>✓</span>`
      : `<span>#</span><span>${perHand ? 'Poids / main' : 'Poids (kg)'}</span><span>${perHand ? 'Reps / bras' : 'Reps'}</span>${showRpe ? '<span>RPE</span>' : ''}<span></span><span>✓</span>`;
    body.appendChild(gridHeader);

    /* Séries d'échauffement : rendues AVANT les séries de travail, avec leurs
       propres clés `_warm`. Elles ne consomment aucune des N séries prévues —
       c'est tout le sens de les avoir séparées du reste (voir plus haut). */
    if(!isCircuit){
      const nWarm = warmupCount(data, ex, exIdx);
      for(let n = 1; n <= nWarm; n++){
        const wKey = warmupKey(exIdx, n);
        const wSet = data.sets[wKey] || { weight:'', reps:'', rpe:'', done:false };

        const wRow = document.createElement('div');
        wRow.className = 'set-row warmup-row' + (rpeEnabled() ? ' with-rpe' : '');

        const wNum = document.createElement('div');
        wNum.className = 'set-num kind-warmup';
        wNum.textContent = 'É';
        wRow.appendChild(wNum);

        const wWeight = document.createElement('input');
        wWeight.type = 'text'; wWeight.inputMode = 'decimal'; wWeight.autocomplete = 'off';
        wWeight.placeholder = 'kg';
        wWeight.value = wSet.weight;
        wWeight.onfocus = armUndoSnapshot;
        wWeight.oninput = () => {
          sanitizeField(wWeight, 'decimal');
          snapshotBeforeEdit();
          const d = loadDayData(currentSessionId, currentProfile);
          d.sets[wKey] = d.sets[wKey] || { weight:'', reps:'', rpe:'', done:false };
          d.sets[wKey].weight = wWeight.value;
          saveDayData(currentSessionId, currentProfile, d);
        };
        wRow.appendChild(wWeight);

        const wReps = document.createElement('input');
        wReps.type = 'text'; wReps.inputMode = 'numeric'; wReps.autocomplete = 'off';
        wReps.placeholder = 'reps';
        wReps.value = wSet.reps;
        wReps.onfocus = armUndoSnapshot;
        wReps.oninput = () => {
          sanitizeField(wReps, 'integer');
          snapshotBeforeEdit();
          const d = loadDayData(currentSessionId, currentProfile);
          d.sets[wKey] = d.sets[wKey] || { weight:'', reps:'', rpe:'', done:false };
          d.sets[wKey].reps = wReps.value;
          saveDayData(currentSessionId, currentProfile, d);
        };
        wRow.appendChild(wReps);

        if(rpeEnabled()){
          wRow.appendChild(buildRpeSelect(wSet.rpe, (value) => {
            pushUndoSnapshot();
            const d = loadDayData(currentSessionId, currentProfile);
            d.sets[wKey] = d.sets[wKey] || { weight:'', reps:'', rpe:'', done:false };
            d.sets[wKey].rpe = value;
            saveDayData(currentSessionId, currentProfile, d);
          }));
        }

        /* Retirer ne s'affiche que sur la DERNIÈRE ligne : la donnée sous-jacente
           est un compteur, pas une liste adressable une par une. Si le bouton
           apparaissait sur chaque ligne, retirer la première effacerait aussi
           les suivantes — sans le dire. Un seul bouton, sans ambiguïté. */
        if(n === nWarm){
          const wDel = document.createElement('button');
          wDel.className = 'dup-btn';
          wDel.textContent = '×';
          wDel.title = 'Retirer cet échauffement';
          wDel.onclick = () => { pushUndoSnapshot(); setWarmupCount(ex, exIdx, nWarm - 1); };
          wRow.appendChild(wDel);
        } else {
          const spacer = document.createElement('div');
          wRow.appendChild(spacer);
        }

        const wCheck = document.createElement('button');
        wCheck.className = 'check-btn' + (wSet.done ? ' checked' : '');
        wCheck.textContent = '✓';
        wCheck.onclick = () => {
          pushUndoSnapshot();
          const d = loadDayData(currentSessionId, currentProfile);
          d.sets[wKey] = d.sets[wKey] || { weight:'', reps:'', rpe:'', done:false };
          d.sets[wKey].done = !d.sets[wKey].done;
          saveDayData(currentSessionId, currentProfile, d);
          wCheck.classList.toggle('checked', d.sets[wKey].done);
          if(d.sets[wKey].done) vibrate();
        };
        wRow.appendChild(wCheck);

        body.appendChild(wRow);
      }

      if(nWarm < 4){
        const addWarm = document.createElement('button');
        addWarm.className = 'add-warmup-btn';
        addWarm.textContent = '+ Ajouter un échauffement';
        addWarm.onclick = () => { pushUndoSnapshot(); setWarmupCount(ex, exIdx, nWarm + 1); };
        body.appendChild(addWarm);
      }
    }

    for(let s = 1; s <= ex.sets; s++){
      const setKey = `ex${exIdx}_set${s}`;
      const savedSet = data.sets[setKey] || { weight:'', reps:'', duration:'', info:'', rpe:'', done:false };

      const row = document.createElement('div');
      row.className = (isCircuit ? 'set-row circuit' : 'set-row') + (!isCircuit && rpeEnabled() ? ' with-rpe' : '');

      const num = document.createElement('div');
      num.className = 'set-num';
      num.textContent = isCircuit ? `Tour ${s}` : s;
      row.appendChild(num);

      if(isCircuit){
        /* Un circuit enchaîne plusieurs mouvements de natures différentes —
           des répétitions pour l'un, des secondes pour l'autre. Deux cases
           chiffrées ne peuvent pas représenter ça : une seule case libre laisse
           noter ce qui a réellement été fait, dans les mots de l'exercice.
           Ces valeurs n'entrent pas dans le tonnage, qui n'a pas de sens sans charge. */
        const circuitInfo = document.createElement('input');
        circuitInfo.type = 'text';
        circuitInfo.autocomplete = 'off';
        circuitInfo.placeholder = 'ex : 12 relevés + 45 s';
        /* Reprise des anciennes saisies chiffrées, pour ne rien perdre. */
        circuitInfo.value = savedSet.info != null && savedSet.info !== ''
          ? savedSet.info
          : [savedSet.reps ? savedSet.reps + ' reps' : '', savedSet.duration ? savedSet.duration + ' s' : '']
              .filter(Boolean).join(' + ');
        circuitInfo.onfocus = armUndoSnapshot;
        circuitInfo.oninput = () => {
          snapshotBeforeEdit();
          const d = loadDayData(currentSessionId, currentProfile);
          d.sets[setKey] = d.sets[setKey] || { weight:'', reps:'', duration:'', info:'', done:false };
          d.sets[setKey].info = circuitInfo.value;
          saveDayData(currentSessionId, currentProfile, d);
        };
        row.appendChild(circuitInfo);
      }

      if(!isCircuit){
        const weightInput = document.createElement('input');
        /* type="text" et non "number" : avec un clavier français, "22,5" est jugé
           invalide par Safari et `input.value` renvoie une chaîne vide — la saisie
           disparaissait silencieusement. parseNum() gère la virgule au calcul. */
        weightInput.type = 'text';
        weightInput.inputMode = 'decimal';
        weightInput.autocomplete = 'off';
        /* 005 : la valeur de la dernière fois sert d'indication grisée. Ce n'est
           jamais une valeur saisie : si l'utilisateur ne tape rien, la série
           reste vide dans l'export et dans le tonnage. */
        const lastSet = lastPerf ? lastPerf.sets.find(function(x){ return x.set === s; }) : null;
        weightInput.placeholder = (lastSet && !isNaN(lastSet.weight)) ? formatKg(lastSet.weight) : 'kg';
        weightInput.value = savedSet.weight;
        weightInput.onfocus = armUndoSnapshot;
        weightInput.oninput = () => {
          sanitizeField(weightInput, 'decimal');
          snapshotBeforeEdit();
          const d = loadDayData(currentSessionId, currentProfile);
          d.sets[setKey] = d.sets[setKey] || { weight:'', reps:'', done:false };
          d.sets[setKey].weight = weightInput.value;
          saveDayData(currentSessionId, currentProfile, d);
          updateSessionProgress(); /* tonnage recalculé en direct */
          refreshRecordBadge();
        };
        row.appendChild(weightInput);

        const repsInput = document.createElement('input');
        repsInput.type = 'text';
        repsInput.inputMode = 'numeric';
        repsInput.autocomplete = 'off';
        repsInput.placeholder = (lastSet && !isNaN(lastSet.reps)) ? String(lastSet.reps) : 'reps';
        repsInput.value = savedSet.reps;
        repsInput.onfocus = armUndoSnapshot;
        repsInput.oninput = () => {
          sanitizeField(repsInput, 'integer');
          snapshotBeforeEdit();
          const d = loadDayData(currentSessionId, currentProfile);
          d.sets[setKey] = d.sets[setKey] || { weight:'', reps:'', done:false };
          d.sets[setKey].reps = repsInput.value;
          saveDayData(currentSessionId, currentProfile, d);
          updateSessionProgress(); /* tonnage recalculé en direct */
          refreshRecordBadge(); /* le volume dépend des reps, pas que du poids */
        };
        row.appendChild(repsInput);

        if(rpeEnabled()){
          row.appendChild(buildRpeSelect(savedSet.rpe, (value) => {
            pushUndoSnapshot();
            const d = loadDayData(currentSessionId, currentProfile);
            d.sets[setKey] = d.sets[setKey] || { weight:'', reps:'', duration:'', info:'', rpe:'', done:false };
            d.sets[setKey].rpe = value;
            saveDayData(currentSessionId, currentProfile, d);
          }));
        }

        if(s > 1){
          const dupBtn = document.createElement('button');
          dupBtn.className = 'dup-btn';
          dupBtn.textContent = '⇊';
          dupBtn.title = 'Recopier la série précédente';
          dupBtn.onclick = () => {
            pushUndoSnapshot();
            const prevKey = `ex${exIdx}_set${s-1}`;
            const d = loadDayData(currentSessionId, currentProfile);
            const prev = d.sets[prevKey];
            if(prev){
              d.sets[setKey] = d.sets[setKey] || { weight:'', reps:'', done:false };
              d.sets[setKey].weight = prev.weight;
              d.sets[setKey].reps = prev.reps;
              saveDayData(currentSessionId, currentProfile, d);
              weightInput.value = prev.weight;
              repsInput.value = prev.reps;
              refreshRecordBadge();
              dupBtn.classList.remove('done'); void dupBtn.offsetWidth; dupBtn.classList.add('done');
              showToast('Série recopiée');
            } else {
              showToast('Rien à recopier');
            }
          };
          row.appendChild(dupBtn);
        } else {
          const spacer = document.createElement('div');
          row.appendChild(spacer);
        }
      }

      const checkBtn = document.createElement('button');
      checkBtn.className = 'check-btn' + (savedSet.done ? ' checked' : '');
      checkBtn.textContent = '✓';
      checkBtn.onclick = () => {
        pushUndoSnapshot();
        const d = loadDayData(currentSessionId, currentProfile);
        d.sets[setKey] = d.sets[setKey] || { weight:'', reps:'', done:false };
        d.sets[setKey].done = !d.sets[setKey].done;
        saveDayData(currentSessionId, currentProfile, d);
        checkBtn.classList.toggle('checked', d.sets[setKey].done);
        if(d.sets[setKey].done){
          checkBtn.classList.remove('pulse'); void checkBtn.offsetWidth; checkBtn.classList.add('pulse');
          vibrate();
        }
        refreshCardState();
        updateSessionProgress();
      };
      row.appendChild(checkBtn);

      body.appendChild(row);
    }

    const noteWrap = document.createElement('div');
    noteWrap.className = 'note-wrap';
    const noteLabel = document.createElement('span');
    noteLabel.className = 'note-label';
    noteLabel.textContent = '🗒️ Info';
    noteWrap.appendChild(noteLabel);

    const noteInput = document.createElement('textarea');
    noteInput.className = 'note-input';
    noteInput.rows = 1;
    noteInput.placeholder = "Pourquoi pas fait / charge réduite... (optionnel)";
    noteInput.value = readByExercise(data.notes, ex, exIdx);
    noteInput.onfocus = armUndoSnapshot;
    noteInput.oninput = () => {
      snapshotBeforeEdit();
      const d = loadDayData(currentSessionId, currentProfile);
      d.notes = d.notes || {};
      if(exIdx in d.notes) delete d.notes[exIdx]; /* migration ancienne clé */
      d.notes[exerciseKey(ex, exIdx)] = noteInput.value;
      saveDayData(currentSessionId, currentProfile, d);
    };
    noteWrap.appendChild(noteInput);
    body.appendChild(noteWrap);

    main.appendChild(card);
  });

  /* Le cardio est proposé à la fin de CHAQUE séance, même celles qui n'en
     prévoient pas : la case à cocher décide, et les champs n'apparaissent que
     si elle est cochée. Une séance sans cardio reste donc une simple ligne. */
  {
    const cardioPlan = dayProgram.cardio;
    const cardioCard = document.createElement('div');
    cardioCard.className = 'cardio-card' + (data.cardioDone ? '' : ' collapsed');

    const topRow = document.createElement('div');
    topRow.className = 'cardio-top-row';
    topRow.innerHTML = `
      <div class="label">
        <span class="icon">🏃</span>
        <div class="cardio-text">
          <span class="name">${escapeHtml(cardioPlan ? cardioPlan.name : 'Cardio')}</span>
          <span class="cardio-suggestion">${cardioPlan
            ? 'Suggestion : ' + escapeHtml(cardioPlan.targetMinutes) + ' min'
            : 'Optionnel — coche si tu en as fait'}</span>
        </div>
      </div>
    `;
    const cardioBtn = document.createElement('button');
    cardioBtn.className = 'check-btn' + (data.cardioDone ? ' checked' : '');
    cardioBtn.textContent = '✓';
    cardioBtn.title = data.cardioDone ? 'Cardio fait' : 'Cocher si tu as fait du cardio';
    cardioBtn.onclick = () => {
      pushUndoSnapshot();
      const d = loadDayData(currentSessionId, currentProfile);
      d.cardioDone = !d.cardioDone;
      saveDayData(currentSessionId, currentProfile, d);
      if(d.cardioDone) vibrate();
      /* re-render complet : les champs apparaissent ou disparaissent */
      render();
    };
    topRow.appendChild(cardioBtn);
    cardioCard.appendChild(topRow);

    const fieldsRow = document.createElement('div');
    fieldsRow.className = 'cardio-fields-row';

    const minutesField = document.createElement('div');
    minutesField.className = 'cardio-field';
    const minutesFieldLabel = document.createElement('span');
    minutesFieldLabel.className = 'cardio-field-label';
    minutesFieldLabel.textContent = 'Minutes';
    minutesField.appendChild(minutesFieldLabel);

    const minutesInput = document.createElement('input');
    minutesInput.type = 'text';
    minutesInput.inputMode = 'numeric';
    minutesInput.className = 'cardio-minutes-input';
    minutesInput.placeholder = 'min';
    minutesInput.value = data.cardioMinutes || '';
    minutesInput.onfocus = armUndoSnapshot;
    minutesInput.oninput = () => {
      sanitizeField(minutesInput, 'integer');
      snapshotBeforeEdit();
      const d = loadDayData(currentSessionId, currentProfile);
      d.cardioMinutes = minutesInput.value;
      saveDayData(currentSessionId, currentProfile, d);
    };
    minutesField.appendChild(minutesInput);
    fieldsRow.appendChild(minutesField);

    const inclineField = document.createElement('div');
    inclineField.className = 'cardio-field';
    const inclineFieldLabel = document.createElement('span');
    inclineFieldLabel.className = 'cardio-field-label';
    inclineFieldLabel.textContent = '% Inclinaison';
    inclineField.appendChild(inclineFieldLabel);

    const inclineInput = document.createElement('input');
    inclineInput.type = 'text';
    inclineInput.inputMode = 'decimal';
    inclineInput.className = 'cardio-minutes-input';
    inclineInput.placeholder = '%';
    inclineInput.value = data.cardioIncline || '';
    inclineInput.onfocus = armUndoSnapshot;
    inclineInput.oninput = () => {
      sanitizeField(inclineInput, 'decimal');
      snapshotBeforeEdit();
      const d = loadDayData(currentSessionId, currentProfile);
      d.cardioIncline = inclineInput.value;
      saveDayData(currentSessionId, currentProfile, d);
    };
    inclineField.appendChild(inclineInput);
    fieldsRow.appendChild(inclineField);

    const speedField = document.createElement('div');
    speedField.className = 'cardio-field';
    const speedFieldLabel = document.createElement('span');
    speedFieldLabel.className = 'cardio-field-label';
    speedFieldLabel.textContent = 'Vitesse';
    speedField.appendChild(speedFieldLabel);

    const speedInput = document.createElement('input');
    speedInput.type = 'text';
    speedInput.inputMode = 'decimal';
    speedInput.className = 'cardio-minutes-input';
    speedInput.placeholder = 'ex: 5';
    speedInput.value = data.cardioSpeed || '';
    speedInput.onfocus = armUndoSnapshot;
    speedInput.oninput = () => {
      snapshotBeforeEdit();
      const d = loadDayData(currentSessionId, currentProfile);
      d.cardioSpeed = speedInput.value;
      saveDayData(currentSessionId, currentProfile, d);
    };
    speedField.appendChild(speedInput);
    fieldsRow.appendChild(speedField);

    cardioCard.appendChild(fieldsRow);

    const cardioNoteWrap = document.createElement('div');
    cardioNoteWrap.className = 'note-wrap';
    const cardioNoteLabel = document.createElement('span');
    cardioNoteLabel.className = 'note-label';
    cardioNoteLabel.textContent = '🗒️ Info';
    cardioNoteWrap.appendChild(cardioNoteLabel);

    const cardioNoteInput = document.createElement('textarea');
    cardioNoteInput.className = 'note-input';
    cardioNoteInput.rows = 1;
    cardioNoteInput.placeholder = "Sensation, essoufflement, raison d'un cardio écourté... (optionnel)";
    cardioNoteInput.value = data.cardioNote || '';
    cardioNoteInput.onfocus = armUndoSnapshot;
    cardioNoteInput.oninput = () => {
      snapshotBeforeEdit();
      const d = loadDayData(currentSessionId, currentProfile);
      d.cardioNote = cardioNoteInput.value;
      saveDayData(currentSessionId, currentProfile, d);
    };
    cardioNoteWrap.appendChild(cardioNoteInput);
    cardioCard.appendChild(cardioNoteWrap);

    /* Non coché : la carte se réduit à sa ligne du haut. Les champs restent dans
       le DOM avec leurs valeurs — décocher par erreur n'efface donc rien. */
    if(!data.cardioDone){
      fieldsRow.style.display = 'none';
      cardioNoteWrap.style.display = 'none';
    }

    main.appendChild(cardioCard);
  }

  updateSessionProgress();
}

/* ---------- CONFIRMATION GÉNÉRIQUE ---------- */
let pendingConfirmCallback = null;
function showConfirm(message, onConfirm){
  document.getElementById('confirm-message').textContent = message;
  pendingConfirmCallback = onConfirm;
  document.getElementById('confirm-modal').classList.add('open');
}
function closeConfirm(){
  document.getElementById('confirm-modal').classList.remove('open');
  pendingConfirmCallback = null;
}
function confirmAction(){
  const cb = pendingConfirmCallback;
  closeConfirm();
  if(cb) cb();
}

/* ---------- RESET ---------- */
function askReset(){
  showConfirm('Réinitialiser les données de cette séance pour ce profil ?', doReset);
}
function doReset(){
  pushUndoSnapshot();
  delete leaveReminderDismissed[dataKey(currentSessionId, currentProfile)];
  saveDayData(currentSessionId, currentProfile, blankDayData());
  render();
  showToast('Séance réinitialisée');
}

/* ---------- EXPORT ---------- */
function buildExportText(){
  const dayProgram = getSession(currentSessionId);
  const profileName = currentProfile === 'corentin' ? 'Corentin' : 'Lisa';
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });

  const data = loadDayData(currentSessionId, currentProfile);
  data.variants = data.variants || {};
  data.notes = data.notes || {};
  let txt = `🏋️ BILAN DE SÉANCE\n`;
  txt += `Nom : ${profileName}\n`;
  if(data.sessionNote && data.sessionNote.trim() !== ''){
    txt += `📝 Note de séance : ${data.sessionNote.trim()}\n`;
  }
  txt += `Date : ${dateStr}\n`;
  txt += `Séance : ${dayProgram.label} — ${dayProgram.title}\n`;
  txt += `------------------------------\n`;

  dayProgram.exercises.forEach((ex, exIdx) => {
    txt += `\n${ex.name}\n`;
    if(ex.logType !== 'circuit' && (ex.equipment || []).length > 1){
      const equipId = getExerciseEquipmentId(ex, exIdx, data);
      const info = equipmentInfo(equipId);
      if(info) txt += `Charge : ${info.label} (${info.factor === 2 ? 'poids par main' : 'charge totale'})\n`;
    }
    txt += `Cible : ${ex.target[currentProfile]}\n`;
    if(ex.logType !== 'circuit'){
      const nWarm = warmupCount(data, ex, exIdx);
      for(let n = 1; n <= nWarm; n++){
        const wSet = data.sets[warmupKey(exIdx, n)] || { weight:'', reps:'', done:false };
        const w = wSet.weight !== '' ? wSet.weight : '-';
        const r = wSet.reps !== '' ? wSet.reps : '-';
        txt += `  Échauffement ${n} : ${w} kg x ${r} reps ${wSet.done ? '✅' : '❌'}\n`;
      }
    }
    for(let s = 1; s <= ex.sets; s++){
      const setKey = `ex${exIdx}_set${s}`;
      const setData = data.sets[setKey] || { weight:'', reps:'', done:false };
      const status = setData.done ? '✅' : '❌';
      if(ex.logType === 'circuit'){
        const info = (setData.info != null && setData.info !== '')
          ? setData.info
          : [setData.reps ? setData.reps + ' reps' : '', setData.duration ? setData.duration + ' s' : '']
              .filter(Boolean).join(' + ');
        txt += `  Tour ${s} : ${info || '-'} ${status}\n`;
      } else {
        const weight = setData.weight !== '' ? setData.weight : '-';
        const reps = setData.reps !== '' ? setData.reps : '-';
        const rpeStr = setData.rpe ? ` RPE ${setData.rpe}` : '';
        txt += `  Série ${s} : ${weight} kg x ${reps} reps${rpeStr} ${status}\n`;
      }
    }
    const note = readByExercise(data.notes, ex, exIdx);
    if(note && note.trim() !== ''){
      txt += `  🗒️ Info : ${note.trim()}\n`;
    }
  });

  if(dayProgram.cardio || data.cardioDone){
    const minutesStr = data.cardioMinutes !== '' && data.cardioMinutes != null ? `${data.cardioMinutes} min` : 'non renseigné';
    const inclineStr = data.cardioIncline !== '' && data.cardioIncline != null ? `${data.cardioIncline}% inclinaison` : 'inclinaison non renseignée';
    const speedStr = data.cardioSpeed !== '' && data.cardioSpeed != null ? `vitesse ${data.cardioSpeed}` : 'vitesse non renseignée';
    const cardioName = dayProgram.cardio ? dayProgram.cardio.name : 'Cardio (hors programme)';
    txt += `\nCardio : ${cardioName} — ${minutesStr}, ${inclineStr}, ${speedStr} ${data.cardioDone ? '✅' : '❌'}\n`;
    if(data.cardioNote && data.cardioNote.trim() !== ''){
      txt += `  🗒️ Info : ${data.cardioNote.trim()}\n`;
    }
  }

  return txt;
}

function closeExportModal(){
  document.getElementById('export-modal').classList.remove('open');
}
function copyExport(){
  const textarea = document.getElementById('export-text');
  copyTextToClipboard(textarea.value, textarea);
}

/* ---------- COPIE PRESSE-PAPIER (partagée) ---------- */
function copyTextToClipboard(text, sourceTextarea){
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copié dans le presse-papier ✅');
      }).catch(() => {
        fallbackCopy(text, sourceTextarea);
      });
    } else {
      fallbackCopy(text, sourceTextarea);
    }
  }catch(e){
    fallbackCopy(text, sourceTextarea);
  }
}
function fallbackCopy(text, sourceTextarea){
  try{
    let ta = sourceTextarea;
    let temp = false;
    if(!ta){
      ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      temp = true;
    }
    ta.select();
    ta.setSelectionRange(0, 999999);
    document.execCommand('copy');
    if(temp) document.body.removeChild(ta);
    showToast('Copié dans le presse-papier ✅');
  }catch(e){
    showToast('Copie impossible — sélectionne le texte manuellement');
  }
}

/* ---------- RAPPEL D'ARCHIVAGE (094) ----------
   Rien n'est jamais perdu : les données de séance sont écrites en LocalStorage à
   chaque frappe. Le vrai risque est d'oublier d'archiver, et de ne pas voir la
   séance apparaître dans la progression. Le message dit donc cela, et pas
   "vous allez perdre vos données", qui serait faux. */

/* Un "Plus tard" met le rappel en sourdine, mais seulement tant que la séance ne
   bouge plus : on mémorise l'état des données au moment du refus. Si de nouvelles
   séries sont saisies ensuite, le rappel se réarme — sinon dire "plus tard" en
   début de séance suffirait à ne plus jamais être averti. */
const leaveReminderDismissed = {};

function sessionHasData(sessionId, profile){
  const program = getSession(sessionId);
  const d = loadDayData(sessionId, profile);
  const sets = d.sets || {};
  const filled = Object.keys(sets).some(k => {
    const v = sets[k] || {};
    return v.done || (v.weight !== '' && v.weight != null) || (v.reps !== '' && v.reps != null);
  });
  if(filled) return true;
  if((d.sessionNote || '').trim() !== '') return true;
  const notes = d.notes || {};
  if(Object.keys(notes).some(k => (notes[k] || '').trim() !== '')) return true;
  if(program && program.cardio){
    if(d.cardioDone) return true;
    if([d.cardioMinutes, d.cardioIncline, d.cardioSpeed, d.cardioNote]
       .some(v => v != null && String(v).trim() !== '')) return true;
  }
  return false;
}

function leaveExercisesView(){
  const key = dataKey(currentSessionId, currentProfile);
  const snapshot = JSON.stringify(loadDayData(currentSessionId, currentProfile));
  const muted = leaveReminderDismissed[key] === snapshot;
  if(muted || !sessionHasData(currentSessionId, currentProfile)){
    goToSessionView();
    return;
  }
  document.getElementById('leave-modal').classList.add('open');
}
function closeLeaveModal(){
  document.getElementById('leave-modal').classList.remove('open');
}
function leaveAnyway(){
  leaveReminderDismissed[dataKey(currentSessionId, currentProfile)] =
    JSON.stringify(loadDayData(currentSessionId, currentProfile));
  closeLeaveModal();
  goToSessionView();
}
function leaveAndArchive(){
  closeLeaveModal();
  finishArchive();
}

/* ---------- SÉANCE TERMINÉE (copier / archiver) ---------- */
function openFinishModal(){
  document.getElementById('finish-modal').classList.add('open');
}
function closeFinishModal(){
  document.getElementById('finish-modal').classList.remove('open');
}
function finishCopy(){
  const text = buildExportText();
  copyTextToClipboard(text);
  closeFinishModal();
}
function finishArchive(){
  if(!window.__fb){
    showToast('Connexion au cloud en cours, réessaie dans un instant');
    return;
  }
  const dayProgram = getSession(currentSessionId);
  const data = loadDayData(currentSessionId, currentProfile);
  const now = new Date();
  const archive = {
    id: 'arc_' + now.getTime() + '_' + Math.random().toString(36).slice(2,7),
    dateLabel: now.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' }),
    timeLabel: now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }),
    createdAt: now.getTime(),
    profile: currentProfile,
    sessionId: currentSessionId,
    sessionLabel: dayProgram.label,
    sessionTitle: dayProgram.title,
    exportText: buildExportText(),
    sessionNote: (data.sessionNote || '').trim(),
    /* Sans ça, un poids archivé ne dit pas s'il était par main : le tonnage
       resterait invérifiable et non recalculable. */
    variants: data.variants || {},
    tonnage: Math.round(computeSessionTonnage(dayProgram, data)),
    exerciseNames: dayProgram.exercises.map(ex => ex.name),
    rawSets: data.sets || {}
  };

  /* Firestore ne résout la promesse de `setDoc` qu'après confirmation du serveur.
     Hors ligne, elle reste donc en attente indéfiniment alors que l'écriture est
     bien enregistrée dans le cache local. On agit immédiatement (offline-first)
     et on ne traite la promesse que pour rattraper une éventuelle erreur. */
  const { db, doc, setDoc } = window.__fb;
  const backup = JSON.stringify(loadDayData(currentSessionId, currentProfile));
  const archivedSessionId = currentSessionId;
  const archivedProfile = currentProfile;

  setDoc(doc(db, 'archives', archive.id), archive)
    .catch((err) => {
      console.error('Erreur archivage Firestore', err);
      /* L'archive n'est pas passée : on rend sa séance à l'utilisateur. */
      try{ storage.set(dataKey(archivedSessionId, archivedProfile), backup); }catch(e){ /* ignore */ }
      showToast(firestoreErrorMessage(err, "de l'archivage"));
      if(currentSessionId === archivedSessionId && currentProfile === archivedProfile) render();
    });

  delete leaveReminderDismissed[dataKey(archivedSessionId, archivedProfile)];
  saveDayData(currentSessionId, currentProfile, blankDayData());
  closeFinishModal();
  closeLeaveModal();
  showToast(navigator.onLine ? 'Séance archivée 📦' : 'Archivée hors ligne — synchro au retour du réseau 📦');
  goToSessionView();
}

/* ---------- ARCHIVES (synchronisées via Firestore, partagées entre profils) ---------- */
function getArchivesList(profile){
  return (window.archivesCache && window.archivesCache[profile]) || [];
}
function getTrashList(profile){
  return (window.archivesTrashCache && window.archivesTrashCache[profile]) || [];
}
/* Archives du plus ancien au plus récent (le cache est trié à l'envers). */
function getArchivesChrono(profile){
  return getArchivesList(profile).slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

/* ---------- SOCLE : lecture des séries d'un exercice dans une archive ----------
   Les séries sont stockées sous la clé `ex<index>_set<n>`, l'index venant de la
   position du nom dans `exerciseNames`. Cette fonction est le seul endroit qui
   connaît ce détail : tout le reste (records, dernier poids, métriques du
   graphique) passe par elle. */
function getSetsForExercise(archive, exerciseName){
  if(!archive) return [];
  const names = archive.exerciseNames || [];
  const exIdx = names.indexOf(exerciseName);
  if(exIdx === -1) return [];
  const rawSets = archive.rawSets || {};
  const out = [];
  Object.keys(rawSets).forEach(key => {
    const match = key.match(/^ex(\d+)_set(\d+)$/);
    if(!match || parseInt(match[1], 10) !== exIdx) return;
    const raw = rawSets[key] || {};
    /* Les clés `_warm` ne correspondent pas à ce motif et sont donc déjà
       exclues des records et de la progression : rien de plus à filtrer ici. */
    out.push({
      set: parseInt(match[2], 10),
      weight: parseNum(raw.weight),
      reps: parseNum(raw.reps),
      rpe: parseNum(raw.rpe),
      done: !!raw.done
    });
  });
  return out.sort((a, b) => a.set - b.set);
}

/* Dernière séance où l'exercice a été fait, avec au moins un poids saisi. */
function getLastPerformance(profile, exerciseName){
  const archives = getArchivesChrono(profile);
  for(let i = archives.length - 1; i >= 0; i--){
    const sets = getSetsForExercise(archives[i], exerciseName).filter(x => !isNaN(x.weight));
    if(sets.length > 0) return { dateLabel: archives[i].dateLabel, sets: sets };
  }
  return null;
}

/* ---------- VOLUME D'UNE SÉRIE ----------
   Le seul poids ne dit pas si une série était plus difficile qu'une autre :
   45 kg × 8 reps n'est pas forcément « mieux » que 40 kg × 12, qui déplace en
   réalité plus de charge au total (480 vs 360). Le volume (poids × reps) sert
   donc de mesure de performance à la place du poids seul, partout où on compare
   des séries entre elles (record, badge en direct, courbe de progression, bilan
   du coach). Le facteur de charge (haltères / un bras = ×2) s'applique comme
   pour le tonnage de séance, pour rester cohérent avec lui. */
function setVolume(weight, reps, factor){
  if(isNaN(weight) || isNaN(reps)) return NaN;
  return weight * reps * (factor || 1);
}

/* Facteur de charge d'un exercice donné dans une archive donnée (la méthode a
   pu changer d'une séance à l'autre, on ne suppose donc rien de global). On ne
   dispose plus de l'objet exercice d'origine, seulement de son nom : sa liste
   de méthodes plausibles est retrouvée via le catalogue courant. Un nom
   absent du catalogue (exercice supprimé depuis) retombe sur ×1, comme le
   faisait déjà l'ancien modèle pour un cas inconnu. */
function archiveLoadFactor(archive, exerciseName){
  const exIdx = (archive.exerciseNames || []).indexOf(exerciseName);
  if(exIdx === -1) return 1;
  const stored = readByExercise(archive.variants, { name: exerciseName }, exIdx);
  const list = equipmentListForExerciseName(exerciseName);
  if(!list || list.length === 0){
    const info = equipmentInfo(stored);
    return info ? info.factor : 1;
  }
  const id = list.includes(stored) ? stored : list[0];
  const info = equipmentInfo(id);
  return info ? info.factor : 1;
}

/* Meilleure série d'un exercice dans une archive, au sens du volume — pas du
   seul poids. Retourne { weight, reps, volume } ou null si rien d'exploitable. */
function bestSetByVolume(archive, exerciseName){
  const factor = archiveLoadFactor(archive, exerciseName);
  let best = null;
  getSetsForExercise(archive, exerciseName).forEach(s => {
    const vol = setVolume(s.weight, s.reps, factor);
    if(!isNaN(vol) && (!best || vol > best.volume)) best = { weight: s.weight, reps: s.reps, volume: vol };
  });
  return best;
}

/* Meilleure série jamais faite sur cet exercice, au sens du volume (archives
   uniquement : la séance en cours ne doit pas faire bouger le record pendant
   qu'on la saisit). Retourne { weight, reps, volume } ou null. */
/* ---------- FLAMMES DE RECORD : système de particules sur canvas (21/09/26) ----------
   Remplace les tuiles SVG de la première version, qui donnaient des flammes « emoji ».
   Ici, des centaines de petites bulles de lumière naissent le long du bord de la carte,
   montent en accélérant, ondulent, rétrécissent et passent du blanc-jaune au orange, puis
   au rouge sombre avant de s'éteindre. Le mélange additif (`lighter`) fait le reste : là
   où elles se superposent, ça chauffe vers le blanc, comme une vraie flamme. Quelques
   étincelles montent plus haut. La zone de la carte est ensuite « gommée » : le feu
   sort de derrière la carte, il ne la recouvre pas.
   - Une seule boucle requestAnimationFrame pour toutes les cartes enflammées ; elle
     s'arrête quand plus aucune ne l'est. Carte hors écran ou détachée du DOM : plus de calcul.
   - `prefers-reduced-motion: reduce` : une seule image figée, aucune boucle.
   - Les valeurs PAD doivent rester égales à `inset` de `.pr-fire-fx` dans style.css. */
var _recordFireEngine = null;
function recordFireSet(card, on){
  if(!_recordFireEngine) _recordFireEngine = createRecordFireEngine();
  _recordFireEngine.set(card, on);
}

function createRecordFireEngine(){
  const PAD = { l:17, t:44, r:17, b:14 };
  const R_CARD = 18;                 /* = --r-lg */
  const MAX_PARTICLES = 520;
  const STEPS = 24;
  const STOPS = [                    /* t, r, g, b, alpha */
    [0.00, 255, 246, 200, 1.00],
    [0.16, 255, 212,  80, 0.95],
    [0.40, 255, 140,  24, 0.82],
    [0.68, 226,  58,  12, 0.58],
    [1.00,  96,  20,  10, 0.00]
  ];
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dprMax = 1.5;                 /* flou volontaire : inutile de payer le plein Retina */

  /* Sprites : une bulle lumineuse par étape de couleur, dessinée une fois. */
  const sprites = [];
  function stopColor(t){
    for(let i = 1; i < STOPS.length; i++){
      if(t <= STOPS[i][0]){
        const a = STOPS[i-1], b = STOPS[i], k = (t - a[0]) / (b[0] - a[0]);
        return [a[1]+(b[1]-a[1])*k, a[2]+(b[2]-a[2])*k, a[3]+(b[3]-a[3])*k, a[4]+(b[4]-a[4])*k];
      }
    }
    const l = STOPS[STOPS.length-1]; return [l[1], l[2], l[3], l[4]];
  }
  (function buildSprites(){
    for(let i = 0; i < STEPS; i++){
      const c = stopColor(i / (STEPS - 1));
      const cv = document.createElement('canvas'); cv.width = cv.height = 48;
      const g = cv.getContext('2d');
      const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      const rgb = Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]);
      gr.addColorStop(0,    'rgba(' + rgb + ',' + c[3].toFixed(3) + ')');
      gr.addColorStop(0.42, 'rgba(' + rgb + ',' + (c[3] * 0.55).toFixed(3) + ')');
      gr.addColorStop(1,    'rgba(' + rgb + ',0)');
      g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
      sprites.push(cv);
    }
  })();

  const fires = new Set();
  let raf = 0, last = 0;

  /* Hauteur de flamme le long d'un bord : somme de sinus qui glissent dans le temps →
     des langues qui naissent, montent et retombent au lieu d'un mur uniforme. */
  function heat(pos, time){
    const v = 0.56 + 0.30 * Math.sin(pos * 0.040 + time * 2.3)
                   + 0.22 * Math.sin(pos * 0.093 - time * 3.1 + 1.7)
                   + 0.13 * Math.sin(pos * 0.210 + time * 5.3);
    return v < 0.18 ? 0.18 : (v > 1 ? 1 : v);
  }
  /* Descente du bord au niveau des coins arrondis (la flamme épouse l'arrondi). */
  function cornerDrop(x, w){
    const d = x < R_CARD ? R_CARD - x : (x > w - R_CARD ? x - (w - R_CARD) : 0);
    return d > 0 ? R_CARD - Math.sqrt(Math.max(0, R_CARD * R_CARD - d * d)) : 0;
  }

  function create(card){
    const box = document.createElement('div');
    box.className = 'pr-fire-fx';
    box.setAttribute('aria-hidden', 'true');
    const cv = document.createElement('canvas');
    box.appendChild(cv);
    card.appendChild(box);
    const ctx = cv.getContext('2d');
    const f = {
      card: card, box: box, cv: cv, ctx: ctx,
      w: 0, h: 0, dpr: 1, cssW: 0, cssH: 0,
      p: [], time: 0, acc: [0, 0, 0, 0], ramp: 0,
      emitting: false, visible: true, ro: null, io: null, still: false
    };
    function measure(){
      const w = card.offsetWidth, h = card.offsetHeight;
      if(!w || !h) return;
      if(w === f.w && h === f.h && f.cv.width) return;
      f.w = w; f.h = h;
      f.dpr = Math.min(dprMax, window.devicePixelRatio || 1);
      f.cssW = w + PAD.l + PAD.r; f.cssH = h + PAD.t + PAD.b;
      cv.width = Math.round(f.cssW * f.dpr); cv.height = Math.round(f.cssH * f.dpr);
      if(f.still) draw(f);
    }
    f.measure = measure;
    measure();
    if(window.ResizeObserver){ f.ro = new ResizeObserver(measure); f.ro.observe(card); }
    if(window.IntersectionObserver){
      f.io = new IntersectionObserver(function(en){ f.visible = en[en.length - 1].isIntersecting; }, { rootMargin: '60px' });
      f.io.observe(card);
    }
    return f;
  }

  function spawn(f, kind){
    if(f.p.length >= MAX_PARTICLES) return;
    const w = f.w, h = f.h;
    let x, y, vx, vy, life, r0, type = 0;               /* type : 0 flamme, 1 étincelle, 2 lit de braises */
    if(kind === 0){                                     /* haut */
      const px = Math.random() * w, k = heat(px, f.time);
      x = PAD.l + px; y = PAD.t + cornerDrop(px, w) + 3;
      vx = (Math.random() - 0.5) * 14; vy = -(34 + Math.random() * 24) * k;
      life = (0.55 + Math.random() * 0.30) * (0.6 + 0.6 * k); r0 = 8 + Math.random() * 6;
      if(Math.random() < 0.35){ type = 2; vy *= 0.25; life = 0.4 + Math.random() * 0.25; r0 = 11 + Math.random() * 5; }
    } else if(kind === 1 || kind === 2){                /* côtés */
      const py = R_CARD * 0.5 + Math.random() * (h - R_CARD * 0.5 - 4), k = heat(py + (kind === 1 ? 0 : 300), f.time);
      const dir = kind === 1 ? -1 : 1;
      x = PAD.l + (kind === 1 ? 0 : w) + dir * 2; y = PAD.t + py;
      vx = dir * (5 + Math.random() * 12); vy = -(26 + Math.random() * 24) * k;
      life = (0.36 + Math.random() * 0.26) * (0.6 + 0.55 * k); r0 = 6 + Math.random() * 4;
      if(Math.random() < 0.3){ type = 2; vy *= 0.3; life = 0.32 + Math.random() * 0.2; r0 = 8 + Math.random() * 3; }
    } else {                                            /* étincelles */
      const px = Math.random() * w;
      x = PAD.l + px; y = PAD.t + 3;
      vx = (Math.random() - 0.5) * 36; vy = -(62 + Math.random() * 64);
      life = 0.9 + Math.random() * 0.9; r0 = 1.1 + Math.random() * 1.3; type = 1;
    }
    f.p.push({ x: x, y: y, vx: vx, vy: vy, age: 0, life: life, r0: r0, seed: Math.random() * 6.283, type: type });
  }

  function step(f, dt){
    f.time += dt;
    if(f.emitting) f.ramp = Math.min(1, f.ramp + dt / 0.45); else f.ramp = Math.max(0, f.ramp - dt / 0.3);
    if(f.emitting || f.ramp > 0){
      const w = f.w, h = f.h, I = f.ramp;
      const rates = [ w * 1.6, h * 0.5, h * 0.5, 7 ];    /* particules / seconde */
      for(let k = 0; k < 4; k++){
        f.acc[k] += rates[k] * I * dt;
        while(f.acc[k] >= 1){ f.acc[k] -= 1; spawn(f, k); }
      }
    }
    const p = f.p;
    for(let i = p.length - 1; i >= 0; i--){
      const q = p[i];
      q.age += dt;
      if(q.age >= q.life){ p[i] = p[p.length - 1]; p.pop(); continue; }
      const t = q.age / q.life;
      q.vy -= (q.type === 1 ? 8 : (q.type === 2 ? 16 : 50)) * dt;                        /* la chaleur accélère la montée */
      q.x += (q.vx + Math.sin(q.age * 9 + q.seed) * (q.type === 1 ? 10 : 16) * (0.25 + t)) * dt;
      q.y += q.vy * dt;
    }
  }

  function draw(f){
    const ctx = f.ctx, d = f.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, f.cssW, f.cssH);
    ctx.globalCompositeOperation = 'lighter';
    const I = f.ramp;
    /* Particules */
    const p = f.p;
    for(let i = 0; i < p.length; i++){
      const q = p[i], t = q.age / q.life, ty = q.type;
      const rise = t < 0.1 ? t / 0.1 : 1;
      if(ty === 1){                                    /* étincelle */
        const s = sprites[1], sz = q.r0 * (1 - 0.5 * t) * 3;
        ctx.globalAlpha = rise * Math.pow(1 - t, 0.7);
        ctx.drawImage(s, q.x - sz / 2, q.y - sz / 2, sz, sz);
        continue;
      }
      const r = q.r0 * (1 - 0.7 * t);
      const a = rise * Math.pow(1 - t, ty === 2 ? 0.8 : 1.05) * (ty === 2 ? 0.38 : 0.56);
      const s = sprites[Math.min(STEPS - 1, ((ty === 2 ? t * 0.6 : t) * (STEPS - 1)) | 0)];
      const sw = r * 2.3, sh = ty === 2 ? sw * 1.1 : sw * 1.9;    /* la flamme s'étire vers le haut */
      ctx.globalAlpha = a;
      ctx.drawImage(s, q.x - sw / 2, q.y - sh * 0.62, sw, sh);
    }
    /* Fondu dans les 16 px du haut : une flamme n'est jamais coupée net par le bord du canvas. */
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out';
    const fade = ctx.createLinearGradient(0, 0, 0, 16);
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fade; ctx.fillRect(0, 0, f.cssW, 16);
    /* On gomme la carte : le feu sort de derrière elle. */
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out';
    const x0 = PAD.l, y0 = PAD.t, x1 = PAD.l + f.w, y1 = PAD.t + f.h, R = R_CARD;
    ctx.beginPath();
    ctx.moveTo(x0 + R, y0); ctx.lineTo(x1 - R, y0); ctx.arcTo(x1, y0, x1, y0 + R, R);
    ctx.lineTo(x1, y1 - R); ctx.arcTo(x1, y1, x1 - R, y1, R);
    ctx.lineTo(x0 + R, y1); ctx.arcTo(x0, y1, x0, y1 - R, R);
    ctx.lineTo(x0, y0 + R); ctx.arcTo(x0, y0, x0 + R, y0, R); ctx.closePath();
    ctx.fillStyle = '#000'; ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  function finish(f){
    fires.delete(f);
    if(f.ro) f.ro.disconnect();
    if(f.io) f.io.disconnect();
    f.card.classList.remove('pr-fire');
    f.card._recFire = null;
    if(f.box.parentNode) f.box.parentNode.removeChild(f.box);
  }

  function frame(ts){
    raf = 0;
    const dt = Math.min(0.05, Math.max(0.001, (ts - last) / 1000)); last = ts;
    fires.forEach(function(f){
      if(!f.card.isConnected){ finish(f); return; }
      if(!f.visible) return;
      step(f, dt); draw(f);
      if(!f.emitting && f.ramp === 0 && f.p.length === 0) finish(f);
    });
    if(fires.size) raf = requestAnimationFrame(frame);
  }
  function kick(){ if(!raf && fires.size){ last = performance.now(); raf = requestAnimationFrame(frame); } }

  return {
    set: function(card, on){
      let f = card._recFire;
      if(on){
        if(!f) f = card._recFire = create(card);
        card.classList.add('pr-fire');
        f.measure();
        if(f.emitting) return;
        f.emitting = true;
        if(reduced){                     /* image figée : on « pré-cuit » 1 s de feu puis on dessine une fois */
          f.still = true; f.ramp = 1;
          for(let i = 0; i < 40; i++) step(f, 0.025);
          draw(f);
        } else { fires.add(f); kick(); }
      } else if(f && f.emitting){
        f.emitting = false;
        if(reduced || !f.card.isConnected){ finish(f); }
        else { fires.add(f); kick(); }   /* s'éteint en douceur : les dernières particules finissent leur vie */
      }
    }
  };
}

function getPersonalRecord(profile, exerciseName){
  let best = null;
  getArchivesList(profile).forEach(arc => {
    const b = bestSetByVolume(arc, exerciseName);
    if(b && (!best || b.volume > best.volume)) best = b;
  });
  return best;
}

/* Cumul de tout ce qui a été soulevé, corbeille exclue. */
function getLifetimeStats(profile){
  const archives = getArchivesList(profile);
  let tonnage = 0;
  archives.forEach(a => { tonnage += (a.tonnage || 0); });
  return { sessions: archives.length, tonnage: Math.round(tonnage) };
}
let archivesMode = 'active'; /* 'active' | 'trash' */

function setArchivesMode(mode){
  archivesMode = mode;
  renderArchivesList();
}

/* Placeholders affichés tant que le premier snapshot Firestore n'est pas arrivé,
   plutôt qu'un "Connexion en cours..." qui laisse croire à une erreur. */
function renderArchiveSkeletons(list, count){
  for(let i = 0; i < count; i++){
    const sk = document.createElement('div');
    sk.className = 'archive-item skeleton-item';
    sk.innerHTML = `
      <div class="archive-info">
        <span class="sk-line sk-sm"></span>
        <span class="sk-line sk-lg"></span>
      </div>
      <div class="archive-actions"><span class="sk-line sk-btn"></span></div>
    `;
    list.appendChild(sk);
  }
}

function renderArchivesList(){
  const profileName = currentProfile === 'corentin' ? 'Corentin' : 'Lisa';
  const trash = getTrashList(currentProfile);
  const inTrash = archivesMode === 'trash';
  document.getElementById('archives-view-title').textContent =
    inTrash ? `Corbeille — ${profileName}` : `Archives — ${profileName}`;

  const list = document.getElementById('archive-list');
  list.innerHTML = '';
  const archives = inTrash ? trash : getArchivesList(currentProfile);

  const toolbar = document.getElementById('archive-toolbar');
  if(toolbar){
    toolbar.innerHTML = '';
    toolbar.style.display = 'flex';
    if(inTrash){
      const back = document.createElement('button');
      back.className = 'archive-tool-btn';
      back.textContent = '← Archives';
      back.onclick = () => setArchivesMode('active');
      toolbar.appendChild(back);
      if(trash.length > 0){
        const purge = document.createElement('button');
        purge.className = 'archive-tool-btn danger';
        purge.textContent = '🧹 Vider la corbeille';
        purge.onclick = askEmptyTrash;
        toolbar.appendChild(purge);
      }
    } else {
      const exp = document.createElement('button');
      exp.className = 'archive-tool-btn';
      exp.textContent = '📤 Exporter tout';
      exp.onclick = exportAllArchives;
      toolbar.appendChild(exp);
      const bin = document.createElement('button');
      bin.className = 'archive-tool-btn';
      bin.textContent = `🗑️ Corbeille (${trash.length})`;
      bin.onclick = () => setArchivesMode('trash');
      toolbar.appendChild(bin);
      if(archives.length === 0 && trash.length === 0) toolbar.style.display = 'none';
    }
  }

  if(archives.length === 0){
    if(!inTrash && !window.__archivesLoaded){
      renderArchiveSkeletons(list, 3);
      return;
    }
    const empty = document.createElement('p');
    empty.className = 'archive-empty';
    empty.textContent = inTrash
      ? 'La corbeille est vide.'
      : 'Aucune séance archivée pour le moment.';
    list.appendChild(empty);
    return;
  }

  archives.forEach(arc => {
    const item = document.createElement('div');
    item.className = 'archive-item';
    const tonnageStr = arc.tonnage ? `· 💪 ${arc.tonnage.toLocaleString('fr-FR')} kg` : '';
    item.innerHTML = `
      <div class="archive-info">
        <span class="archive-date">${escapeHtml(arc.dateLabel)} · ${escapeHtml(arc.timeLabel)} ${tonnageStr}</span>
        <span class="archive-title">${escapeHtml(arc.sessionLabel)} — ${escapeHtml(arc.sessionTitle)}</span>
      </div>
      <div class="archive-actions">
        <button class="archive-view-btn">Voir</button>
        <button class="archive-delete-btn">${inTrash ? '♻️' : '🗑️'}</button>
      </div>
    `;
    item.querySelector('.archive-view-btn').onclick = () => viewArchive(arc.id);
    item.querySelector('.archive-delete-btn').onclick = () =>
      inTrash ? restoreArchive(arc.id) : askDeleteArchive(arc.id);
    list.appendChild(item);
  });
}
let coachViewedDate = null;

function viewArchive(id){
  const archives = getArchivesList(currentProfile).concat(getTrashList(currentProfile));
  const arc = archives.find(a => a.id === id);
  if(!arc) return;
  document.getElementById('export-text').value = arc.exportText;
  document.getElementById('motivation-line').textContent = `Archivée le ${arc.dateLabel} à ${arc.timeLabel}`;
  coachViewedDate = arc.dateLabel;
  renderCoachBlock();
  document.getElementById('export-modal').classList.add('open');
}

/* ---------- RETOUR PAR GLISSEMENT ----------
   Plutôt que de dupliquer la logique de chaque écran, le geste déclenche le
   bouton retour de l'écran actif : le comportement est donc rigoureusement
   identique au tap, y compris le rappel d'archivage sur l'écran de saisie. */

const SWIPE_MIN_X = 70;   /* distance horizontale minimale */
const SWIPE_MAX_Y = 55;   /* au-delà, c'est un défilement vertical */
const SWIPE_MAX_MS = 600; /* au-delà, c'est un glissement lent, pas un geste */

let swipeStartX = 0, swipeStartY = 0, swipeStartAt = 0, swipeValid = false;

/* Le geste doit rester sans effet sur ce qui défile horizontalement ou se
   sélectionne : listes déroulantes, champs de saisie, barres segmentées. */
function swipeBlocked(target){
  if(!target || !target.closest) return true;
  if(target.closest('input, textarea, select, button')) return true;
  if(target.closest('.segmented, .profile-switch, .suggest-panel, .chat-composer')) return true;
  if(document.querySelector('.modal-overlay.open, .confirm-overlay.open')) return true;
  if(document.querySelector('.login-overlay.open')) return true;
  return false;
}

document.addEventListener('touchstart', (e) => {
  if(e.touches.length !== 1 || swipeBlocked(e.target)){ swipeValid = false; return; }
  swipeValid = true;
  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;
  swipeStartAt = Date.now();
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if(!swipeValid) return;
  swipeValid = false;
  const touch = e.changedTouches && e.changedTouches[0];
  if(!touch) return;
  const dx = touch.clientX - swipeStartX;
  const dy = Math.abs(touch.clientY - swipeStartY);
  if(dx < SWIPE_MIN_X || dy > SWIPE_MAX_Y) return;
  if(Date.now() - swipeStartAt > SWIPE_MAX_MS) return;
  goBackFromActiveView();
}, { passive: true });

function goBackFromActiveView(){
  const active = document.querySelector('.view.active');
  if(!active) return;
  const btn = active.querySelector('.back-btn');
  if(btn) btn.click(); /* le menu principal n'en a pas : le geste y est sans effet */
}

/* ---------- CONNEXION ----------
   Un seul compte, utilisé sur les deux téléphones : les règles Firestore
   exigent `request.auth != null`, ce qui referme la base sans compliquer
   l'usage. Firebase garde la session, donc on ne se reconnecte pas chaque jour. */
function showLogin(show){
  const overlay = document.getElementById('login-overlay');
  if(overlay) overlay.classList.toggle('open', show);
}

async function doSignIn(){
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  errEl.textContent = '';

  if(!email || !password){ errEl.textContent = 'Renseigne ton e-mail et ton mot de passe.'; return; }
  if(!window.__auth){ errEl.textContent = 'Connexion au cloud en cours, réessaie dans un instant.'; return; }

  btn.disabled = true;
  btn.textContent = 'Connexion…';
  try{
    await window.__auth.signIn(email, password);
    document.getElementById('login-password').value = '';
  }catch(err){
    console.error('Connexion', err);
    errEl.textContent = signInErrorMessage(err);
  }finally{
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
}

function signInErrorMessage(err){
  const code = (err && err.code) || '';
  if(code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')){
    return 'E-mail ou mot de passe incorrect.';
  }
  if(code.includes('invalid-email')) return "Cette adresse e-mail n'est pas valide.";
  if(code.includes('too-many-requests')) return 'Trop de tentatives, réessaie dans quelques minutes.';
  if(code.includes('network')) return 'Pas de réseau — la connexion initiale en demande une.';
  return 'Connexion impossible : ' + (code || 'erreur inconnue');
}

function doSignOut(){
  if(!window.__auth) return;
  showConfirm('Se déconnecter de ce téléphone ?', () => {
    window.__auth.signOut();
    showToast('Déconnecté');
  });
}

window.addEventListener('auth-changed', () => {
  showLogin(!window.__authUser);
  if(window.__authUser) render();
});

/* ---------- FIL DE DISCUSSION DU COACH ----------
   Les messages vivent dans Firestore : les deux téléphones voient la même
   conversation, en temps réel. La mémoire (chiffres, profil, bilans) est
   réinjectée à chaque envoi, et seuls les derniers échanges sont transmis —
   sans plafond, le coût grimperait à mesure que la discussion s'allonge. */

const CHAT_HISTORY_LIMIT = 20;

/* Deux fils distincts.
   - `suivi` : la conversation historique. Les messages écrits avant l'ajout des
     onglets n'ont pas de champ `thread` : ils y sont rattachés par défaut, donc
     rien n'est perdu ni à migrer.
   - `questions` : les questions libres. Ce fil reçoit en contexte les derniers
     échanges du suivi, pour ne pas repartir de zéro. */
/* Conversations, définies en base dans le champ `threads` du document
   `settings/coach` — le même que la clé API et les poids — plutôt qu'en
   dur : on peut donc en créer et en supprimer sans toucher au code, et les deux
   téléphones voient les mêmes. Pas de nouvelle collection Firestore, donc aucune
   règle de sécurité à modifier.

   Chaque conversation porte un `prompt` : le rôle que tient le coach à cet
   endroit. C'est ce qui permet d'avoir un diététicien dans un fil et un coach
   de musculation dans un autre, sans le répéter à chaque message. */
const DEFAULT_THREADS = [
  { id:'suivi',     label:'Suivi',      prompt:'' },
  { id:'questions', label:'Question ?', prompt:'' }
];

function getChatThreads(){
  const stored = (coachSettings().threads) || [];
  /* Les deux fils d'origine sont toujours présents : les messages écrits avant
     cette fonctionnalité y sont rattachés, on ne peut pas les faire disparaître. */
  const list = DEFAULT_THREADS.map(def => {
    const found = stored.find(t => t.id === def.id);
    return found ? Object.assign({}, def, found) : def;
  });
  stored.forEach(t => { if(!list.some(x => x.id === t.id)) list.push(t); });
  return list;
}
function getThreadById(id){
  return getChatThreads().find(t => t.id === id) || DEFAULT_THREADS[0];
}
function saveChatThreads(list){
  const next = Object.assign({}, coachSettings(), { threads: list });
  return saveCoachSettingsRemote(next);
}

let currentChatThread = 'suivi';

function messageThread(m){ return m.thread || 'suivi'; }
function getChatMessages(thread){
  const all = window.coachChatCache || [];
  return all.filter(m => messageThread(m) === (thread || currentChatThread));
}

function setChatThread(thread){
  currentChatThread = thread;
  renderChatSelector();
  renderChatThread();
  const input = document.getElementById('chat-input');
  if(input) input.placeholder = 'Écris au coach…';
  setTimeout(scrollChatToBottom, 40);
}

function renderChatSelector(){
  const select = document.getElementById('chat-select');
  const hint = document.getElementById('chat-prompt-hint');
  if(!select) return;
  const threads = getChatThreads();
  if(!threads.some(t => t.id === currentChatThread)) currentChatThread = threads[0].id;

  select.innerHTML = '';
  threads.forEach(t => {
    const count = getChatMessages(t.id).length;
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.label + (count ? ' (' + count + ')' : '');
    select.appendChild(opt);
  });
  select.value = currentChatThread;

  /* Le rôle donné au coach reste visible : sinon on oublie pourquoi il répond
     comme un diététicien. */
  if(hint){
    const prompt = getThreadById(currentChatThread).prompt || '';
    hint.textContent = prompt ? 'Rôle : ' + prompt : '';
  }
}

/* ---- Gestion des conversations ---- */

function openThreadManager(){
  document.getElementById('thread-name').value = '';
  document.getElementById('thread-prompt').value = '';
  renderThreadList();
  document.getElementById('thread-modal').classList.add('open');
}
function closeThreadManager(){
  document.getElementById('thread-modal').classList.remove('open');
}

function renderThreadList(){
  const list = document.getElementById('thread-list');
  if(!list) return;
  list.innerHTML = '';
  getChatThreads().forEach(t => {
    const row = document.createElement('div');
    row.className = 'thread-row';

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = t.label;
    row.appendChild(name);

    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = getChatMessages(t.id).length + ' msg';
    row.appendChild(count);

    const edit = document.createElement('button');
    edit.textContent = '✏️';
    edit.title = 'Modifier le rôle du coach';
    edit.onclick = () => {
      document.getElementById('thread-name').value = t.label;
      document.getElementById('thread-prompt').value = t.prompt || '';
      showToast('Modifie puis appuie sur Créer pour enregistrer');
    };
    row.appendChild(edit);

    /* Les deux conversations d'origine ne se suppriment pas : d'anciens
       messages y sont rattachés et se retrouveraient orphelins. */
    if(t.id !== 'suivi' && t.id !== 'questions'){
      const del = document.createElement('button');
      del.textContent = '🗑️';
      del.title = 'Supprimer';
      del.onclick = () => askDeleteChatThread(t.id, t.label);
      row.appendChild(del);
    }
    list.appendChild(row);
  });
}

function createChatThread(){
  const label = document.getElementById('thread-name').value.trim();
  const prompt = document.getElementById('thread-prompt').value.trim();
  if(!label){ showToast('Donne un nom à la conversation'); return; }

  const list = getChatThreads();
  /* Même nom = mise à jour, ce qui permet aussi de corriger un rôle. */
  const existing = list.find(t => t.label.toLowerCase() === label.toLowerCase());
  if(existing){
    existing.prompt = prompt;
    saveChatThreads(list).catch(err => showToast(firestoreErrorMessage(err, "de l'enregistrement")));
    showToast('Conversation mise à jour');
  }else{
    list.push({ id: 'th_' + Date.now(), label: label, prompt: prompt });
    saveChatThreads(list).catch(err => showToast(firestoreErrorMessage(err, "de la création")));
    currentChatThread = list[list.length - 1].id;
    showToast('Conversation créée');
  }
  closeThreadManager();
  renderChatSelector();
  renderChatThread();
}

function askDeleteChatThread(id, label){
  const count = getChatMessages(id).length;
  showConfirm(`Supprimer « ${label} »${count ? ' et ses ' + count + ' messages' : ''} ? Cette action est définitive.`,
    () => deleteChatThread(id));
}

function deleteChatThread(id){
  const list = getChatThreads().filter(t => t.id !== id);
  saveChatThreads(list).catch(err => showToast(firestoreErrorMessage(err, "de la suppression")));

  /* Les messages partent avec la conversation : les garder sans fil visible
     reviendrait à alourdir la base sans que rien ne les affiche jamais. */
  if(window.__fb){
    const { db, doc, deleteDoc } = window.__fb;
    getChatMessages(id).forEach(m => {
      deleteDoc(doc(db, 'coachChat', m.id)).catch(err => console.error('Suppression du message', err));
    });
    window.coachChatCache = (window.coachChatCache || []).filter(m => messageThread(m) !== id);
  }

  if(currentChatThread === id) currentChatThread = 'suivi';
  showToast('Conversation supprimée');
  renderChatSelector();
  renderChatThread();
}

/* Répare la liste des conversations après une perte.
   Deux sources, dans cet ordre :
     1. le miroir local — il rend le NOM et le RÔLE d'origine ;
     2. les messages orphelins — il ne reste que l'identifiant, le nom est
        reconstruit depuis le premier message et le rôle est définitivement perdu.
   Opération purement additive : rien n'est supprimé ni écrasé. */
function repairChatThreads(){
  const list = getChatThreads().slice();
  const byId = new Map(list.map(t => [t.id, t]));
  let restored = 0, rebuilt = 0;

  readChatThreadsBackup().forEach(saved => {
    const current = byId.get(saved.id);
    if(!current){
      list.push(Object.assign({}, saved));
      byId.set(saved.id, saved);
      restored++;
      return;
    }
    /* Conversation présente mais amputée : on rend ce qui manque. */
    if(!current.prompt && saved.prompt){ current.prompt = saved.prompt; restored++; }
    if(saved.label && /^Récupérée\s*:/.test(current.label || '')){ current.label = saved.label; }
  });

  const messages = window.coachChatCache || [];
  const seen = [];
  messages.forEach(m => {
    const id = messageThread(m);
    if(!byId.has(id) && seen.indexOf(id) === -1) seen.push(id);
  });
  seen.forEach((id, i) => {
    const first = messages.find(m => messageThread(m) === id && m.role === 'user');
    const extrait = first ? first.text.trim().replace(/\s+/g, ' ').slice(0, 28) : '';
    list.push({
      id: id,
      label: extrait ? 'Récupérée : ' + extrait + (first.text.length > 28 ? '…' : '') : 'Conversation récupérée ' + (i + 1),
      prompt: '',
      createdAt: (first && first.createdAt) || Date.now()
    });
    rebuilt++;
  });

  if(restored + rebuilt === 0) return 0;
  saveChatThreads(list);
  const msg = [];
  if(restored) msg.push(restored + ' restaurée' + (restored > 1 ? 's' : '') + ' avec son rôle');
  if(rebuilt) msg.push(rebuilt + ' récupérée' + (rebuilt > 1 ? 's' : '') + ' sans son rôle');
  showToast('Conversations : ' + msg.join(', '));
  return restored + rebuilt;
}

/* ---------- RÉGLAGES ET MENSURATIONS ----------
   Les mesures vivent dans `settings/body`, donc partagées par les deux
   téléphones et sans nouvelle collection Firestore. */
/* L'écran Réglages ne gère plus que le compte : poids et mensurations vivent
   désormais dans Suivi Progression, à côté de tout le reste de ce qu'on suit. */
/* Horodatage du dernier deploiement de code (pas des donnees) : mise a jour automatiquement (workflow auto-version) a chaque commit sur cette app, au format ISO avec
   decalage horaire. Complement du bandeau "Nouvelle version disponible". */
/* DERNIERE_MAJ est définie dans index.html (mise à jour automatiquement par le workflow auto-version). */
function formaterDerniereMaj(iso){
  const d = new Date(iso);
  const jour = String(d.getDate()).padStart(2,'0');
  const mois = String(d.getMonth()+1).padStart(2,'0');
  const h = String(d.getHours()).padStart(2,'0');
  const m = String(d.getMinutes()).padStart(2,'0');
  return `${jour}/${mois}/${d.getFullYear()} à ${h}h${m}`;
}
function goToSettingsView(){
  const account = document.getElementById('settings-account');
  if(account) account.textContent = window.__authUser
    ? 'Connecté avec ' + window.__authUser.email
    : 'Non connecté';
  const derniereMaj = document.getElementById('settings-derniere-maj');
  if(derniereMaj) derniereMaj.textContent = 'Dernière mise à jour du code : ' + formaterDerniereMaj(DERNIERE_MAJ);
  renderSettingsProfileToggle();
  showView('view-settings', 'fwd');
}

/* Identité explicite du téléphone, réglable sans passer par "Entraînement".
   `currentProfile` vit en local (storage), donc ce choix est propre à CET
   appareil : c'est justement ce qui permet de fixer, une fois pour toutes,
   quel téléphone est Corentin et lequel est Lisa — y compris pour les
   messages envoyés au coach, qui utilisent currentProfile comme auteur. */
function renderSettingsProfileToggle(){
  const wrap = document.getElementById('settings-profile-toggle');
  if(!wrap) return;
  wrap.innerHTML = '';
  [['corentin', 'Corentin'], ['lisa', 'Lisa']].forEach(([id, label]) => {
    const b = document.createElement('button');
    /* Classe de profil ajoutée (17/09/26) : ce toggle-là identifie
       explicitement Corentin/Lisa sur ce téléphone — les deux boutons
       gardent chacun leur couleur fixe (bleu/rose) quel que soit
       `currentProfile`, contrairement aux autres usages génériques de
       .segmented-btn (onglets, période), qui suivent --accent et n'affichent
       donc qu'une seule couleur à la fois (celle du profil actif). */
    b.className = 'segmented-btn ' + id + (currentProfile === id ? ' selected' : '');
    b.textContent = label;
    b.onclick = () => {
      if(currentProfile === id) return;
      setProfile(id);
      applyThemeColor();
      renderSettingsProfileToggle();
      showToast('Tu es identifié comme ' + label + ' sur ce téléphone');
    };
    wrap.appendChild(b);
  });
}

function bodyEntries(profile){
  const all = (coachSettings().body) || {};
  return (all[profile || progressProfile] || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0));
}
function latestBodyWeight(profile){
  const e = bodyEntries(profile)[0];
  return e && e.weight ? e.weight : '';
}

/* Sept mensurations, en plus du poids. Le libellé de "pec" varie selon le
   profil consulté — Lisa parle de poitrine, Corentin de pecs — mais c'est le
   même champ, la même courbe. Les anciennes clés (arm/waist/thigh) restent
   lisibles via BODY_LEGACY_KEYS : aucune mesure déjà enregistrée n'est perdue. */
const BODY_FIELDS = [
  { id:'weight',  key:'weight',  unit:'kg', label:() => 'Poids de corps' },
  { id:'pec',     key:'pec',     unit:'cm', label:(p) => p === 'lisa' ? 'Poitrine' : 'Pec' },
  { id:'cuisse',  key:'cuisse',  unit:'cm', label:() => 'Cuisse' },
  { id:'fessier', key:'fessier', unit:'cm', label:() => 'Tour de fesse' },
  { id:'hanche',  key:'hanche',  unit:'cm', label:() => 'Tour de hanche' },
  { id:'taille',  key:'taille',  unit:'cm', label:() => 'Tour de taille' },
  { id:'bras',    key:'bras',    unit:'cm', label:() => 'Bras' },
  { id:'epaule',  key:'epaule',  unit:'cm', label:() => "Tour d'épaule" }
];
const BODY_LEGACY_KEYS = { taille:'waist', bras:'arm', cuisse:'thigh' };
/* Une couleur fixe par type de mesure, pour le graphique d'ensemble et les
   puces d'historique — la même partout, pour qu'un coup d'œil à une puce dans
   l'historique suffise à retrouver sa courbe dans le graphique au-dessus. */
const BODY_FIELD_COLORS = {
  weight:'#1f8fff', pec:'#ff3d7e', cuisse:'#f5a623', fessier:'#12b981',
  hanche:'#a855f7', taille:'#eab308', bras:'#22d3ee', epaule:'#fb7185'
};
function bodyFieldColor(id){ return BODY_FIELD_COLORS[id] || 'var(--accent)'; }
function bodyFieldInfo(id){ return BODY_FIELDS.find(f => f.id === id) || BODY_FIELDS[0]; }
function bodyFieldLabel(id, profile){ return bodyFieldInfo(id).label(profile); }
function bodyEntryValue(entry, id){
  if(!entry) return '';
  if(entry[id]) return entry[id];
  const legacy = BODY_LEGACY_KEYS[id];
  return (legacy && entry[legacy]) || '';
}

/* Sélection et période du volet "Corps", indépendantes de celles du volet
   "Entraînement" : choisir 3 mois sur une courbe de tonnage ne doit pas filtrer
   la courbe de poids qu'on regardait juste avant. */
let bodyProgressSelection = null;
let bodyProgressPeriod = 'all';
/* Mesures affichées dans le graphique d'ensemble. `null` = pas encore choisi
   explicitement -> toutes les mesures disponibles sont affichées par défaut
   (calculé dynamiquement dans renderBodyOverviewChart, pas figé ici : si une
   nouvelle mesure est ajoutée, elle apparaît directement, sans configuration
   à revoir). Devient un Set concret dès qu'on touche une puce de légende. */
let bodyVisibleFields = null;

function setBodyProgressPeriod(id){
  bodyProgressPeriod = id;
  renderBodyControls();
  renderBodyOverviewChart();
  if(bodyProgressSelection) renderBodyProgressChart(bodyProgressSelection);
}

/* Reconstruit tout ce qui ne dépend PAS d'une sélection : formulaire, historique.
   Appelé au changement de profil comme à l'ouverture de l'onglet. */
/* Mesure en cours d'édition (timestamp `at`), ou null en mode "nouvelle mesure".
   Remis à zéro à chaque changement de profil pour ne pas laisser le formulaire
   d'un profil pré-rempli avec la mesure de l'autre. */
let editingBodyAt = null;

function renderBodyPanel(){
  const pecLabel = document.getElementById('body-label-pec');
  if(pecLabel) pecLabel.textContent = bodyFieldLabel('pec', progressProfile);
  const dateInput = document.getElementById('body-date');
  /* Toujours proposer aujourd'hui par défaut, mais la date reste modifiable :
     c'est ce qui permet d'ajouter une mesure prise un autre jour. */
  if(dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);

  renderBodyList();
  renderBodyOverviewChart();
  renderBodySelect();
  renderBodyControls();
  const chartWrap = document.getElementById('body-chart-wrap');
  if(chartWrap) chartWrap.innerHTML = '';
}

/* Menu déroulant du volet Corps : uniquement les mesures déjà renseignées pour
   le profil consulté, sinon on proposerait sept champs vides à choisir. */
function renderBodySelect(){
  const wrap = document.getElementById('body-select-wrap');
  if(!wrap) return;
  wrap.innerHTML = '';

  const entries = bodyEntries(progressProfile);
  const available = BODY_FIELDS.filter(f => entries.some(e => bodyEntryValue(e, f.id)));

  if(available.length === 0){
    const empty = document.createElement('p');
    empty.className = 'archive-empty';
    empty.textContent = `Aucune mesure enregistrée pour ${progressProfile === 'corentin' ? 'Corentin' : 'Lisa'} — ajoute-en une ci-dessus.`;
    wrap.appendChild(empty);
    return;
  }

  const select = document.createElement('select');
  select.className = 'progress-select';
  select.id = 'body-select';

  if(bodyProgressSelection === null){
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choisis une mesure…';
    placeholder.selected = true;
    select.appendChild(placeholder);
  }
  available.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = bodyFieldLabel(f.id, progressProfile);
    select.appendChild(opt);
  });

  if(bodyProgressSelection !== null){
    select.value = bodyProgressSelection;
    select.classList.add('chosen');
  }

  select.onchange = () => {
    if(select.value === '') return;
    bodyProgressSelection = select.value;
    renderBodySelect();
    renderBodyControls();
    renderBodyProgressChart(bodyProgressSelection);
  };

  wrap.appendChild(select);
}

function renderBodyControls(){
  const wrap = document.getElementById('body-controls');
  if(!wrap) return;
  wrap.innerHTML = '';
  if(bodyProgressSelection === null){ wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';

  const label = document.createElement('span');
  label.className = 'section-label';
  label.textContent = 'Période';
  wrap.appendChild(label);

  const periodRow = document.createElement('div');
  periodRow.className = 'segmented';
  PROGRESS_PERIODS.forEach(pd => {
    const b = document.createElement('button');
    b.className = 'segmented-btn' + (bodyProgressPeriod === pd.id ? ' selected' : '');
    b.textContent = pd.label;
    b.onclick = () => setBodyProgressPeriod(pd.id);
    periodRow.appendChild(b);
  });
  wrap.appendChild(periodRow);
}

/* Même tracé, mêmes calculs d'écart que l'écran Entraînement : buildChartSvg et
   buildDeltaHtml ne savent rien de la nature des points qu'on leur donne. */
function renderBodyProgressChart(fieldId){
  const wrap = document.getElementById('body-chart-wrap');
  if(!wrap) return;
  const key = bodyProgressKey(fieldId);
  const info = progressMetricInfo(key);
  const points = getProgressPoints(progressProfile, key);
  const periodLabel = (PROGRESS_PERIODS.find(p => p.id === bodyProgressPeriod) || {}).label;

  if(points.length === 0){
    wrap.innerHTML = `
      <div class="progress-chart-card">
        <div class="progress-chart-title">${escapeHtml(info.label)}</div>
        <div class="progress-chart-empty">Rien d'enregistré sur cette période${bodyProgressPeriod === 'all' ? '' : ' (' + escapeHtml(periodLabel) + ')'}.</div>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div class="progress-chart-card">
      <div class="progress-chart-title">${escapeHtml(info.label)}</div>
      ${buildChartSvg(points)}
      <div class="progress-chart-foot">${points.length} mesure${points.length > 1 ? 's' : ''} sur la période</div>
      ${buildDeltaHtml(points, info.unit, bodyProgressPeriod === 'all' ? '' : periodLabel)}
    </div>
  `;
}

function saveBodyEntry(){
  const get = id => document.getElementById(id).value.trim().replace(',', '.');
  const dateStr = document.getElementById('body-date').value;
  if(!dateStr){ showToast('Choisis une date'); return; }
  const at = new Date(dateStr + 'T12:00:00').getTime();

  const all = Object.assign({}, (coachSettings().body) || {});
  const list = all[progressProfile] || [];
  /* Une mesure ajoutée pour une date déjà enregistrée FUSIONNE avec l'existante
     plutôt que de la remplacer : sans ça, ajouter le tour de taille un jour où
     le poids avait déjà été noté effaçait ce poids, puisque son champ, laissé
     vide cette fois-ci, aurait écrasé la valeur précédente. */
  const existingEntry = list.find(e => e.at === at);
  const entry = Object.assign({ at, dateLabel: new Date(at).toLocaleDateString('fr-FR') }, existingEntry || {});
  let hasValue = false;
  BODY_FIELDS.forEach(f => {
    const v = get('body-' + f.id);
    if(v){ entry[f.id] = v; hasValue = true; }
    else if(!(f.id in entry)){ entry[f.id] = ''; }
  });
  if(existingEntry && BODY_FIELDS.some(f => bodyEntryValue(existingEntry, f.id))) hasValue = true;

  if(!hasValue){ showToast('Renseigne au moins une mesure'); return; }

  /* Si on éditait une mesure et qu'on a changé sa date, l'ancienne entrée (à
     l'ancien timestamp) doit disparaître : sans ce filtre en plus de celui sur
     `at`, on se retrouverait avec deux lignes pour ce qui n'est qu'une seule
     mesure déplacée dans le temps. */
  const wasEditing = editingBodyAt !== null;
  all[progressProfile] = list
    .filter(e => e.at !== at && e.at !== editingBodyAt)
    .concat([entry]);
  saveCoachSettingsRemote({ body: all }).catch(err => {
    console.error('Enregistrement des mesures', err);
    showToast(firestoreErrorMessage(err, "de l'enregistrement"));
  });
  showToast(wasEditing ? 'Mesure mise à jour' : 'Mesure enregistrée');
  cancelEditBodyEntry();
  renderBodyPanel();
  if(bodyProgressSelection) renderBodyProgressChart(bodyProgressSelection);
}

function deleteBodyEntry(at){
  const all = Object.assign({}, (coachSettings().body) || {});
  all[progressProfile] = (all[progressProfile] || []).filter(e => e.at !== at);
  saveCoachSettingsRemote({ body: all }).catch(err => console.error('Suppression de mesure', err));
  if(editingBodyAt === at) cancelEditBodyEntry();
  renderBodyPanel();
  if(bodyProgressSelection) renderBodyProgressChart(bodyProgressSelection);
}

/* Charge une mesure existante dans le formulaire pour la corriger, plutôt que
   de la supprimer et la ressaisir en entier. Le bouton "Enregistrer" existant
   fait le travail (voir le commentaire dans saveBodyEntry) : il ne reste qu'à
   pré-remplir la date et les champs, et à permettre d'annuler. */
function editBodyEntry(at){
  const entry = bodyEntries(progressProfile).find(e => e.at === at);
  if(!entry) return;
  editingBodyAt = at;
  document.getElementById('body-date').value = new Date(at).toISOString().slice(0, 10);
  BODY_FIELDS.forEach(f => {
    document.getElementById('body-' + f.id).value = bodyEntryValue(entry, f.id);
  });
  const label = document.getElementById('body-form-label');
  if(label) label.textContent = 'Modifier la mesure du ' + (entry.dateLabel || '');
  const saveBtn = document.getElementById('body-save-btn');
  if(saveBtn) saveBtn.textContent = 'Mettre à jour cette mesure';
  const cancelBtn = document.getElementById('body-cancel-edit-btn');
  if(cancelBtn) cancelBtn.style.display = 'block';
  const form = document.querySelector('#progress-body-panel .body-form');
  if(form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEditBodyEntry(){
  editingBodyAt = null;
  const label = document.getElementById('body-form-label');
  if(label) label.textContent = 'Nouvelle mesure';
  const saveBtn = document.getElementById('body-save-btn');
  if(saveBtn) saveBtn.textContent = 'Enregistrer cette mesure';
  const cancelBtn = document.getElementById('body-cancel-edit-btn');
  if(cancelBtn) cancelBtn.style.display = 'none';
  BODY_FIELDS.forEach(f => {
    const input = document.getElementById('body-' + f.id);
    if(input) input.value = '';
  });
}

/* Historique : une carte par date plutôt qu'une ligne de texte concaténé —
   les mesures du jour apparaissent en puces colorées (mêmes couleurs que la
   légende du graphique d'ensemble, voir BODY_FIELD_COLORS), scannable même
   quand plusieurs champs sont renseignés le même jour. */
function renderBodyList(){
  const list = document.getElementById('body-list');
  if(!list) return;
  list.innerHTML = '';
  const entries = bodyEntries();
  if(entries.length === 0){
    const p = document.createElement('p');
    p.className = 'archive-empty';
    p.textContent = 'Aucune mesure enregistrée. Le coach utilise le poids de corps pour estimer la dépense calorique.';
    list.appendChild(p);
    return;
  }
  entries.slice(0, 12).forEach(e => {
    const card = document.createElement('div');
    card.className = 'body-history-card';

    const head = document.createElement('div');
    head.className = 'body-history-head';
    const date = document.createElement('span');
    date.className = 'body-history-date';
    date.textContent = e.dateLabel || '';
    head.appendChild(date);

    const actions = document.createElement('div');
    actions.className = 'body-history-actions';
    const edit = document.createElement('button');
    edit.textContent = '✏️';
    edit.title = 'Modifier cette mesure';
    edit.onclick = () => editBodyEntry(e.at);
    actions.appendChild(edit);
    const del = document.createElement('button');
    del.textContent = '🗑️';
    del.title = 'Supprimer cette mesure';
    del.onclick = () => deleteBodyEntry(e.at);
    actions.appendChild(del);
    head.appendChild(actions);
    card.appendChild(head);

    const chipRow = document.createElement('div');
    chipRow.className = 'body-chip-row';
    BODY_FIELDS.forEach(f => {
      const v = bodyEntryValue(e, f.id);
      if(!v) return;
      const chip = document.createElement('span');
      chip.className = 'body-chip';
      chip.style.setProperty('--legend-color', bodyFieldColor(f.id));
      chip.innerHTML = `<span class="body-legend-dot"></span>${escapeHtml(bodyFieldLabel(f.id, progressProfile))} : ${escapeHtml(v)} ${escapeHtml(f.unit)}`;
      chipRow.appendChild(chip);
    });
    card.appendChild(chipRow);

    list.appendChild(card);
  });
}

function goToCoachView(){
  repairChatThreads();
  renderChatSelector();
  renderChatThread();
  setChatThread(currentChatThread);
  showView('view-coach', 'fwd');
  /* On arrive en bas du fil : c'est le dernier message qui intéresse, pas le
     premier. Le défilement est différé pour laisser l'écran s'afficher. */
  setTimeout(scrollChatToBottom, 60);
}

function scrollChatToBottom(){
  const thread = document.getElementById('chat-thread');
  if(thread) thread.scrollTop = thread.scrollHeight;
  window.scrollTo(0, document.documentElement.scrollHeight);
}

function renderChatThread(){
  const thread = document.getElementById('chat-thread');
  if(!thread) return;
  thread.innerHTML = '';
  const messages = getChatMessages();

  if(messages.length === 0){
    const empty = document.createElement('p');
    empty.className = 'chat-empty';
    const t = getThreadById(currentChatThread);
    if(t.prompt){
      empty.textContent = 'Conversation « ' + t.label + ' ». Le coach y tient ce rôle : ' + t.prompt;
    }else if(currentChatThread === 'questions'){
      empty.textContent = "Pose ici tes questions ponctuelles : technique d'un exercice, matériel, adaptation du programme. Le coach a vos séances, vos archives et le fil Suivi en tête.";
    }else{
      empty.textContent = "Le suivi de fond : l'état de forme, l'avancement, les ajustements de programme. Le coach connaît vos séances, vos records et vos bilans.";
    }
    thread.appendChild(empty);
    return;
  }

  messages.forEach(m => {
    const el = document.createElement('div');
    el.className = 'chat-msg ' + (m.role === 'user' ? 'user' : 'coach');
    if(m.role === 'user' && m.author){
      const who = document.createElement('span');
      who.className = 'chat-author';
      who.textContent = PROFILE_NAMES[m.author] || m.author;
      el.appendChild(who);
    }
    /* textContent : le texte vient d'un modèle ou d'une saisie libre, il ne doit
       jamais être interprété comme du HTML. */
    const body = document.createElement('span');
    body.textContent = m.text;
    el.appendChild(body);
    thread.appendChild(el);
  });
  /* Le fil peut se re-rendre pendant l'attente (retour Firestore du message
     qu'on vient d'envoyer) : sans ça, la bulle d'attente disparaîtrait avant
     que la vraie réponse n'arrive, laissant croire à un plantage. */
  if(chatBusy){
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-msg coach typing';
    typingEl.id = 'chat-typing-bubble';
    typingEl.innerHTML = `<div class="typing-bar-track"><div class="typing-bar-fill"></div></div>
      <span class="typing-status" id="chat-typing-status">Le coach réfléchit…</span>`;
    thread.appendChild(typingEl);
  }
  scrollChatToBottom();
}

function saveChatMessage(msg){
  if(!window.__fb) return;
  const { db, doc, setDoc } = window.__fb;
  setDoc(doc(db, 'coachChat', msg.id), msg)
    .catch(err => console.error('Écriture du message', err));
  /* optimiste : on affiche sans attendre le serveur, comme partout ailleurs */
  window.coachChatCache = (window.coachChatCache || []).concat([msg]);
  renderChatSelector();
  renderChatThread();
}

let chatBusy = false;
let coachRequestStartedAt = null;
let coachAbortController = null;
const COACH_REQUEST_TIMEOUT_MS = 45000;

/* Si l'app est mise en arrière-plan pendant que le coach répond (l'utilisateur
   change d'écran, verrouille le téléphone…), iOS peut couper la requête réseau
   sans jamais la faire échouer : le minuteur de sécurité existe déjà, mais lui
   aussi peut être mis en pause pendant la mise en veille et ne se déclencher
   qu'avec du retard une fois revenu. On revérifie donc dès que l'app redevient
   visible, pour débloquer tout de suite plutôt que d'attendre. */
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState !== 'visible') return;
  if(!coachAbortController || !coachRequestStartedAt) return;
  if(Date.now() - coachRequestStartedAt >= COACH_REQUEST_TIMEOUT_MS){
    coachAbortController.abort();
  }
});

async function sendCoachMessage(){
  if(chatBusy) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if(!text) return;

  if(!coachGetKey()){
    showToast('Renseigne la clé API pour commencer');
    openCoachSettings();
    return;
  }
  if(!navigator.onLine){
    showToast('Le coach a besoin du réseau — réessaie plus tard');
    return;
  }

  chatBusy = true;
  const sendBtn = document.getElementById('chat-send');
  sendBtn.disabled = true;
  sendBtn.textContent = 'Envoi…';

  saveChatMessage({
    id: 'msg_' + Date.now() + '_u',
    role: 'user',
    author: currentProfile,
    thread: currentChatThread,
    text: text,
    createdAt: Date.now()
  });
  input.value = '';

  /* Bulle d'attente : visible tant qu'on n'a ni réponse ni erreur, avec un
     statut qui évolue pour distinguer « ça travaille encore » de « ça a
     probablement planté » — sans ça, rien ne distingue les deux à l'écran. */
  const threadEl = document.getElementById('chat-thread');
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-msg coach typing';
  typingEl.id = 'chat-typing-bubble';
  typingEl.innerHTML = `<div class="typing-bar-track"><div class="typing-bar-fill"></div></div>
    <span class="typing-status" id="chat-typing-status">Le coach réfléchit…</span>`;
  if(threadEl){ threadEl.appendChild(typingEl); scrollChatToBottom(); }

  const startedAt = Date.now();
  const ticker = setInterval(() => {
    const status = document.getElementById('chat-typing-status');
    if(!status) return;
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    status.textContent = elapsed < 20
      ? `Le coach réfléchit… (${elapsed} s)`
      : `Ça prend plus longtemps que d'habitude (${elapsed} s)…`;
  }, 1000);

  /* Filet de sécurité : sans limite, un réseau qui reste bloqué laisserait la
     bulle tourner indéfiniment sans jamais dire que ça a échoué. Les deux
     variables sont partagées avec le contrôle "visibilitychange" ci-dessus,
     pour pouvoir débloquer immédiatement au retour sur l'app plutôt que
     d'attendre que ce minuteur se déclenche (lui aussi mis en pause pendant
     la mise en veille). */
  const controller = new AbortController();
  coachAbortController = controller;
  coachRequestStartedAt = startedAt;
  const timeoutId = setTimeout(() => controller.abort(), COACH_REQUEST_TIMEOUT_MS);

  try{
    const reply = await withModelRepair(() => callCoachChat(controller.signal));
    saveChatMessage({
      id: 'msg_' + Date.now() + '_c',
      role: 'coach',
      author: 'coach',
      thread: currentChatThread,
      text: reply,
      createdAt: Date.now() + 1
    });
  }catch(err){
    console.error('Coach', err);
    showToast(err && err.name === 'AbortError'
      ? "Le coach ne répond pas — réessaie dans un instant"
      : coachErrorMessage(err));
  }finally{
    clearInterval(ticker);
    clearTimeout(timeoutId);
    coachAbortController = null;
    coachRequestStartedAt = null;
    const bubble = document.getElementById('chat-typing-bubble');
    if(bubble) bubble.remove();
    chatBusy = false;
    sendBtn.disabled = false;
    sendBtn.textContent = 'Envoyer ↗';
  }
}

const CHAT_SYSTEM = `Tu es le coach de musculation personnel de Corentin et Lisa, un couple qui s'entraîne ensemble. Tu les suis depuis leurs débuts.

Tu discutes avec eux par messages. Réponds en français, de façon directe et concrète.

Règles :
- Appuie-toi sur les chiffres fournis : charges, écarts, records, tonnages. Cite-les.
- Compare toujours à des séances du MÊME type. Un bas du corps ne se compare pas à un haut du corps.
- Si une douleur est évoquée, sois prudent : propose de réduire l'amplitude ou de substituer un exercice, et invite à consulter un professionnel si ça persiste. Ne pousse jamais à forcer sur une douleur.
- Réponds à la question posée. Pas de bilan complet si on te demande juste un conseil.
- Pas d'encouragement générique.
- Le message indique qui parle, Corentin ou Lisa. Adresse-toi à cette personne, mais tu peux mentionner l'autre si c'est utile.

Réponds en texte simple, sans JSON ni balises.`;

async function callCoachChat(signal){
  const key = coachGetKey();
  if(!key) throw new Error('NO_KEY');

  const model = coachGetModel();

  /* Contexte rappelé à chaque envoi : le modèle n'a aucune mémoire propre. */
  let context = 'CE QUE TU SAIS D\'EUX\n';
  const profileText = getCoachProfileText();
  if(profileText) context += profileText + '\n';
  context += '\n' + buildCoachDigest('corentin') + '\n' + buildCoachDigest('lisa') + '\n';
  context += '\n' + buildArchiveExcerpts(6);
  const previous = getRecentCoachFeedbacks(2);
  if(previous.length){
    context += '\nTES DERNIERS BILANS\n';
    previous.forEach(a => { context += '[' + a.dateLabel + '] ' + a.coachFeedback + '\n\n'; });
  }

  /* Le fil « Question ? » doit connaître le suivi : sans ça, il redemanderait
     un contexte déjà donné dans l'autre conversation. */
  if(currentChatThread === 'questions'){
    const suivi = getChatMessages('suivi').slice(-8);
    if(suivi.length){
      context += '\nCE QUI S\'EST DIT DANS LE FIL SUIVI\n';
      suivi.forEach(m => {
        const who = m.role === 'user' ? (PROFILE_NAMES[m.author] || 'Eux') : 'Toi';
        context += who + ' : ' + m.text + '\n';
      });
      context += '\n';
    }
  }

  const history = getChatMessages().slice(-CHAT_HISTORY_LIMIT);
  const contents = [
    { role: 'user', parts: [{ text: context }] },
    { role: 'model', parts: [{ text: "C'est noté, j'ai leur historique en tête." }] }
  ];
  history.forEach(m => {
    contents.push({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.role === 'user' ? `[${PROFILE_NAMES[m.author] || 'Utilisateur'}] ${m.text}` : m.text }]
    });
  });

  /* Le rôle propre à la conversation passe AVANT les règles générales : dans un
     fil « diététicien », c'est lui qui doit primer. */
  const thread = getThreadById(currentChatThread);
  const systemText = thread.prompt
    ? thread.prompt + '\n\n' + CHAT_SYSTEM
    : CHAT_SYSTEM;

  const res = await geminiFetch(`models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemText }] },
      contents: contents,
      generationConfig: { temperature: 0.7 }
    }),
    signal: signal
  });

  if(!res.ok) throw await geminiError(res);

  const data = await res.json();
  const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
  const text = parts.map(x => x.text || '').join('').trim();
  if(!text) throw new Error('Réponse vide du modèle');
  return text;
}

window.addEventListener('coach-chat-updated', () => {
  const active = document.querySelector('.view.active');
  if(active && active.id === 'view-coach'){ renderChatSelector(); renderChatThread(); }
});

/* ---------- INTERFACE DU CONSEILLER ---------- */

function findCoachFeedbackForDate(dateLabel){
  const found = getDayArchives(dateLabel).find(a => a.coachFeedback);
  return found ? found.coachFeedback : null;
}

function renderCoachBlock(state){
  const block = document.getElementById('coach-block');
  if(!block || !coachViewedDate) return;
  block.innerHTML = '';

  if(state === 'loading'){
    block.innerHTML = `<div class="coach-loading"><span class="sk-line sk-lg"></span><span class="sk-line sk-lg"></span><span class="sk-line sk-sm"></span></div>
      <p class="coach-note">Le conseiller relit vos séances…</p>`;
    return;
  }

  const existing = findCoachFeedbackForDate(coachViewedDate);
  if(existing){
    const box = document.createElement('div');
    box.className = 'coach-feedback';
    box.textContent = existing; /* textContent : le texte vient d'un modèle, jamais interprété comme du HTML */
    block.appendChild(box);
  }

  const actions = document.createElement('div');
  actions.className = 'coach-actions';

  const runBtn = document.createElement('button');
  runBtn.className = 'coach-btn';
  runBtn.textContent = existing ? '🤖 Refaire le bilan' : '🤖 Demander un bilan du duo';
  runBtn.onclick = () => requestCoachFeedback(coachViewedDate);
  actions.appendChild(runBtn);

  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'coach-btn ghost';
  settingsBtn.textContent = '⚙️';
  settingsBtn.title = 'Réglages du conseiller';
  settingsBtn.onclick = openCoachSettings;
  actions.appendChild(settingsBtn);

  block.appendChild(actions);
}

/* Google retire et renomme régulièrement ses modèles : plutôt que de coder un
   nom en dur et de tomber sur un 404, on demande la liste à l'API. Le même appel
   sert de diagnostic pour la clé : s'il échoue, c'est elle qui est en cause. */
async function loadCoachModels(){
  const status = document.getElementById('coach-model-status');
  const select = document.getElementById('coach-model-select');
  const input = document.getElementById('coach-model-input');
  const key = document.getElementById('coach-key-input').value.trim();

  status.className = 'model-status';
  if(!key){ status.textContent = "Renseigne d'abord la clé API."; status.className = 'model-status error'; return; }

  status.textContent = 'Interrogation de Google…';
  try{
    /* On lit la clé saisie, pas encore enregistrée : le diagnostic doit pouvoir
       tester une clé avant de la valider. */
    const previous = window.coachSettingsCache;
    window.coachSettingsCache = Object.assign({}, previous || {}, { apiKey: key });
    let res;
    try{ res = await geminiFetch('models'); }
    finally{ window.coachSettingsCache = previous; }
    if(!res.ok){
      let detail = '';
      try{ const e = await res.json(); detail = (e.error && e.error.message) || ''; }catch(err){}
      throw new Error('HTTP ' + res.status + (detail ? ' — ' + detail : ''));
    }
    const data = await res.json();
    /* on ne garde que les modèles capables de générer du texte */
    const models = (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).indexOf('generateContent') !== -1)
      .map(m => String(m.name || '').replace(/^models\//, ''))
      .filter(n => n.indexOf('gemini') === 0)
      .sort();

    if(models.length === 0) throw new Error('Aucun modèle de texte disponible avec cette clé');

    select.innerHTML = '';
    models.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n; opt.textContent = n;
      select.appendChild(opt);
    });
    const current = input.value.trim() || coachGetModel();
    if(models.indexOf(current) !== -1) select.value = current;
    select.style.display = 'block';
    input.style.display = 'none';
    status.textContent = `${models.length} modèles disponibles. La clé fonctionne.`;
  }catch(err){
    console.error('Liste des modèles', err);
    select.style.display = 'none';
    input.style.display = 'block';
    status.className = 'model-status error';
    status.textContent = 'Échec : ' + err.message;
  }
}

function openCoachSettings(){
  document.getElementById('coach-key-input').value = coachGetKey();
  document.getElementById('coach-model-input').value = coachGetModel();
  document.getElementById('coach-model-select').style.display = 'none';
  document.getElementById('coach-model-input').style.display = 'block';
  document.getElementById('coach-model-status').textContent = '';
  document.getElementById('coach-model-status').className = 'model-status';
  document.getElementById('coach-settings-modal').classList.add('open');
}
function readCoachModelField(){
  const select = document.getElementById('coach-model-select');
  if(select && select.style.display !== 'none' && select.value) return select.value;
  return document.getElementById('coach-model-input').value.trim() || COACH_DEFAULT_MODEL;
}

function closeCoachSettings(){
  document.getElementById('coach-settings-modal').classList.remove('open');
}
function saveCoachSettings(){
  /* ⚠️ FUSION OBLIGATOIRE. `settings/coach` contient AUSSI la liste des
     conversations (`threads`). Écrire un objet neuf effaçait ce champ — donc
     toutes les discussions et leurs rôles — à chaque « Enregistrer ». */
  const next = Object.assign({}, coachSettings(), {
    apiKey: document.getElementById('coach-key-input').value.trim(),
    model: readCoachModelField()
  });
  saveCoachSettingsRemote(next).catch(err => {
    console.error('Enregistrement des réglages', err);
    showToast(firestoreErrorMessage(err, "de l'enregistrement"));
  });
  closeCoachSettings();
  showToast('Réglages enregistrés pour les deux téléphones');
  renderCoachBlock();
}

let coachBusy = false;

async function requestCoachFeedback(dateLabel){
  if(coachBusy) return;
  if(!coachGetKey()){
    showToast('Renseigne ta clé API pour commencer');
    openCoachSettings();
    return;
  }
  if(!navigator.onLine){
    showToast('Le bilan a besoin du réseau — réessaie plus tard');
    return;
  }
  coachBusy = true;
  renderCoachBlock('loading');
  try{
    const result = await withModelRepair(() => callCoach(dateLabel));
    saveCoachFeedback(dateLabel, result);
    showToast('Bilan reçu 🤖');
  }catch(err){
    console.error('Conseiller', err);
    showToast(coachErrorMessage(err));
  }finally{
    coachBusy = false;
    renderCoachBlock();
  }
}

function coachErrorMessage(err){
  const m = String(err && err.message);
  if(m === 'NO_KEY') return 'Aucune clé API enregistrée';
  if(m === 'BAD_KEY') return 'Clé API refusée — vérifie-la dans les réglages';
  if(m.indexOf('KEY_REJECTED') === 0) return "Clé refusée par Google (401) — voir les réglages pour le détail";
  if(m.indexOf('KEY_FORBIDDEN') === 0) return "Accès refusé (403) — l'API Gemini est peut-être désactivée sur ce projet";
  if(m === 'BAD_MODEL') return "Ce modèle n'existe pas — ouvre les réglages et charge la liste";
  if(m === 'QUOTA') return 'Quota atteint — réessaie dans quelques minutes';
  return 'Le bilan a échoué : ' + m;
}

/* Le bilan est écrit sur les DEUX archives du jour : il concerne le duo, et
   chacun doit le retrouver depuis son propre écran d'archives. */
function saveCoachFeedback(dateLabel, result){
  if(!window.__fb) return;
  const { db, doc, setDoc } = window.__fb;
  getDayArchives(dateLabel).forEach(arc => {
    const updated = Object.assign({}, arc, {
      coachFeedback: result.bilan,
      coachProfile: result.profil || arc.coachProfile || ''
    });
    setDoc(doc(db, 'archives', arc.id), updated)
      .catch(err => console.error('Écriture du bilan', err));
  });
}
/* ---------- EXPORT DE TOUTES LES ARCHIVES ---------- */
function exportAllArchives(){
  const archives = getArchivesList(currentProfile);
  if(archives.length === 0){
    showToast('Aucune archive à exporter');
    return;
  }
  const profileName = currentProfile === 'corentin' ? 'Corentin' : 'Lisa';
  let txt = `📚 HISTORIQUE COMPLET — ${profileName}\n${archives.length} séance(s) archivée(s)\n`;
  archives.slice().reverse().forEach(arc => {
    txt += `\n==============================\n`;
    txt += arc.exportText;
    txt += `\n`;
  });
  document.getElementById('export-text').value = txt;
  document.getElementById('motivation-line').textContent = `Export complet — ${archives.length} séance(s)`;
  document.getElementById('export-modal').classList.add('open');
}

/* ---------- SAUVEGARDE PAR MAIL (bouton des Réglages) ----------
   Même mécanisme que l'app Budget : POST du JSON vers le Google Apps Script
   (fonction doPost) qui le renvoie en pièce jointe par mail. Structure identique à
   exportFullDataJSON (réimportable), plus les messages du coach (`coachChat`),
   et le marqueur `_app: 'muscu'` qui permet au script de choisir l'objet du mail.
   ⚠️ La clé API du coach est RETIRÉE avant l'envoi : elle ne doit jamais partir par mail.
   L'envoi est en `no-cors` : impossible de lire la réponse, le mail reçu fait foi. */
const BACKUP_MAIL_URL = "https://script.google.com/macros/s/AKfycbwW3w-ScyWzRousgkNA7tdUeifNqB_kr2fXbGH1AqUSduOEdqjegbllEcxkkhVAko3ZIA/exec";

function buildMailBackupPayload(){
  const cs = Object.assign({}, coachSettings());
  delete cs.apiKey;
  return {
    _app: 'muscu',
    exportedAt: new Date().toISOString(),
    version: 1,
    archives: {
      corentin: getArchivesList('corentin'),
      lisa: getArchivesList('lisa')
    },
    archivesTrash: {
      corentin: getTrashList('corentin'),
      lisa: getTrashList('lisa')
    },
    customSessions: window.customSessionsCache || [],
    coachSettings: cs,
    coachChat: window.coachChatCache || []
  };
}

function sendBackupByMail(btn){
  /* Jamais d'envoi avant le premier snapshot : une sauvegarde vide serait pire que pas de sauvegarde. */
  if(!(window.__archivesLoaded && window.__customSessionsLoaded && window.__coachSettingsLoaded && window.__coachChatLoaded)){
    showToast("Données en cours de chargement, réessaie dans un instant");
    return;
  }
  const payload = buildMailBackupPayload();
  const total = payload.archives.corentin.length + payload.archives.lisa.length + payload.customSessions.length;
  if(total === 0){
    showToast("Aucune donnée à sauvegarder pour l'instant");
    return;
  }
  const label = btn.textContent;
  btn.textContent = '⏳ Envoi…';
  btn.disabled = true;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  fetch(BACKUP_MAIL_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload), signal: ctrl.signal })
    .then(() => showToast("✅ Sauvegarde envoyée — vérifie ta boîte mail"))
    .catch(() => showToast("❌ Envoi impossible — vérifie ta connexion"))
    .finally(() => { clearTimeout(timer); btn.textContent = label; btn.disabled = false; });
}

/* ---------- EXPORT BRUT COMPLET (JSON, préparation migration catalogue) ----------
   Distinct de exportAllArchives() : celui-ci sert un usage humain (lecture),
   celui-ci est fait pour être recollé tel quel et retraité automatiquement.
   Réutilise la modale d'export existante (textarea + Copier) plutôt qu'un
   téléchargement de fichier : pas de pattern de téléchargement Blob dans cette
   app, et le comportement de `<a download>` est peu fiable sur iOS Safari,
   alors que copier/coller depuis une textarea est déjà éprouvé ici.
   Clé API et modèle du coach volontairement exclus : inutiles à la migration,
   pas de raison de les faire circuler dans un texte copié-collé. */
function exportFullDataJSON(){
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    archives: {
      corentin: getArchivesList('corentin'),
      lisa: getArchivesList('lisa')
    },
    archivesTrash: {
      corentin: getTrashList('corentin'),
      lisa: getTrashList('lisa')
    },
    customSessions: window.customSessionsCache || [],
    coachSettings: {
      threads: coachSettings().threads || [],
      body: coachSettings().body || {}
    }
  };
  const json = JSON.stringify(payload, null, 2);
  document.getElementById('coach-block').innerHTML = '';
  document.getElementById('export-text').value = json;
  const totalArchives = payload.archives.corentin.length + payload.archives.lisa.length;
  document.getElementById('motivation-line').textContent =
    `Export brut complet — ${totalArchives} séance(s) archivée(s), ${payload.customSessions.length} séance(s) personnalisée(s)`;
  document.getElementById('export-modal').classList.add('open');
}

/* ---------- IMPORT BRUT COMPLET (symétrique de exportFullDataJSON) ----------
   Écrit par id (upsert) : une archive dont l'id existe déjà en Firestore est
   remplacée par la version migrée, une archive à un nouvel id s'ajoute. Ne
   supprime rien par déduction — seuls les ids listés explicitement dans
   `customSessionsToDelete` sont effacés, jamais une absence silencieuse.
   `settings/coach` est fusionné (Object.assign), jamais réécrit en entier :
   seul le champ `body` est éventuellement mis à jour, threads/apiKey/model
   intacts (voir l'avertissement sur ce document plus haut dans le fichier). */
function askImportFullDataJSON(){
  const raw = document.getElementById('import-text').value.trim();
  if(raw === ''){
    showToast('Colle d\u2019abord le JSON à importer');
    return;
  }
  let payload;
  try{
    payload = JSON.parse(raw);
  }catch(e){
    showToast('JSON invalide — vérifie que le collage est complet');
    return;
  }
  const archiveCount = ['corentin','lisa'].reduce((n, p) =>
    n + ((payload.archives && payload.archives[p]) || []).length
      + ((payload.archivesTrash && payload.archivesTrash[p]) || []).length, 0);
  const sessionCount = (payload.customSessions || []).length;
  const deleteCount = (payload.customSessionsToDelete || []).length;
  showConfirm(
    `Importer ${archiveCount} archive(s), ${sessionCount} séance(s) personnalisée(s)` +
    (deleteCount ? `, supprimer ${deleteCount} surcharge(s)` : '') +
    ' ? Les ids déjà existants seront écrasés.',
    () => importFullDataJSON(payload)
  );
}
function importFullDataJSON(payload){
  if(!window.__fb){
    showToast('Connexion au cloud en cours, réessaie dans un instant');
    return;
  }
  const { db, doc, setDoc, deleteDoc } = window.__fb;
  const writes = [];

  ['corentin', 'lisa'].forEach(profile => {
    ((payload.archives && payload.archives[profile]) || []).forEach(arc => {
      writes.push(setDoc(doc(db, 'archives', arc.id), arc));
    });
    ((payload.archivesTrash && payload.archivesTrash[profile]) || []).forEach(arc => {
      writes.push(setDoc(doc(db, 'archives', arc.id), arc));
    });
  });

  (payload.customSessions || []).forEach(cs => {
    writes.push(setDoc(doc(db, 'customSessions', cs.id), cs));
  });

  (payload.customSessionsToDelete || []).forEach(id => {
    writes.push(deleteDoc(doc(db, 'customSessions', id)));
  });

  if(payload.coachSettings && payload.coachSettings.body){
    writes.push(setDoc(doc(db, 'settings', 'coach'), Object.assign({}, coachSettings(), { body: payload.coachSettings.body }), { merge: true }));
  }

  /* Écritures offline-first : ne pas attendre leur résolution pour informer —
     hors ligne, la promesse resterait pendante indéfiniment alors que
     l'écriture est déjà en cache et se synchronisera au retour du réseau.
     Un échec réel (permission refusée, session expirée...) doit néanmoins
     être VISIBLE : le simple console.error est invisible sur iPhone. */
  let failCount = 0;
  writes.forEach(p => p.catch(err => {
    failCount++;
    console.error('Échec d\u2019une écriture d\u2019import', err);
    showToast('⚠️ Échec d\u2019écriture (' + failCount + ') : ' + (err && err.code ? err.code : 'vérifie ta connexion'));
  }));
  showToast(`Import envoyé — ${writes.length} écriture(s), synchronisation en cours`);
  document.getElementById('import-text').value = '';
}

/* ---------- GRAPHIQUE DE PROGRESSION ---------- */
/* ---------- ÉCRAN PROGRESSION ----------
   Trois réglages indépendants : la série suivie (un exercice, ou le tonnage de la
   séance entière), la métrique, et la période. Toute la chaîne passe par
   getSetsForExercise() : c'est le seul endroit qui connaît le format des archives. */

/* Le tonnage n'est comparable qu'entre séances identiques : additionner un bas
   du corps et un haut du corps ne veut rien dire. La clé porte donc l'id de la
   séance suivie — `__tonnage__:s1`, `__tonnage__:custom_1740…` */
const PROGRESS_TONNAGE_PREFIX = '__tonnage__:';
function tonnageKey(sessionId){ return PROGRESS_TONNAGE_PREFIX + sessionId; }
function isTonnageKey(key){ return typeof key === 'string' && key.indexOf(PROGRESS_TONNAGE_PREFIX) === 0; }
function tonnageSessionId(key){ return String(key).slice(PROGRESS_TONNAGE_PREFIX.length); }

/* ---------- SUIVI PAR MÉTHODE (14/09/26) ----------
   Un exercice à plusieurs méthodes (Développé incliné, Hip Thrust, etc. — voir
   `equipment` dans SESSIONS) mélange sinon des performances qui ne se
   comparent pas : 45 kg à la machine et 22,5 kg par haltère n'ont pas le même
   sens. La sélection « toutes méthodes confondues » (le nom d'exercice seul)
   reste possible, mais une clé composée permet de ne suivre qu'une méthode.
   Séparateur `||` : aucun nom d'exercice n'en contient dans ce catalogue. */
const PROGRESS_METHOD_PREFIX = '__method__:';
function methodProgressKey(exerciseName, methodId){ return PROGRESS_METHOD_PREFIX + exerciseName + '||' + methodId; }
function isMethodProgressKey(key){ return typeof key === 'string' && key.indexOf(PROGRESS_METHOD_PREFIX) === 0; }
function methodProgressExerciseName(key){ return String(key).slice(PROGRESS_METHOD_PREFIX.length).split('||')[0]; }
function methodProgressMethodId(key){ return String(key).slice(PROGRESS_METHOD_PREFIX.length).split('||')[1]; }

/* Méthode réellement utilisée pour cet exercice dans cette archive (même repli
   que archiveLoadFactor : premier de la liste si rien de stocké/valide, null si
   l'exercice n'a qu'une méthode fixe — la distinction n'a alors pas de sens). */
function archiveExerciseMethodId(archive, exerciseName){
  const exIdx = (archive.exerciseNames || []).indexOf(exerciseName);
  if(exIdx === -1) return null;
  const list = equipmentListForExerciseName(exerciseName);
  if(!list || list.length < 2) return null;
  const stored = readByExercise(archive.variants, { name: exerciseName }, exIdx);
  return list.includes(stored) ? stored : list[0];
}

/* Séances distinctes présentes dans les archives d'un profil, du plus récemment
   pratiqué au plus ancien. Le libellé retenu est celui de l'archive la plus
   récente : une séance personnalisée renommée garde son nom actuel. */
function getArchivedSessions(profile){
  const seen = new Map();
  getArchivesList(profile).forEach(arc => {
    if(!arc.sessionId || seen.has(arc.sessionId)) return;
    seen.set(arc.sessionId, {
      id: arc.sessionId,
      label: arc.sessionLabel || 'Séance',
      title: arc.sessionTitle || ''
    });
  });
  return Array.from(seen.values());
}

/* Une seule métrique : le poids max. Volume et reps max ont été retirés — trois
   choix pour une même courbe brouillaient la lecture plus qu'ils n'aidaient. */
const PROGRESS_PERIODS = [
  { id:'1m',  label:'1 mois', days:31 },
  { id:'3m',  label:'3 mois', days:92 },
  { id:'6m',  label:'6 mois', days:183 },
  { id:'all', label:'Tout',   days:null }
];

let progressPeriod = 'all';
let progressSelection = null; /* nom d'exercice, ou clé `__tonnage__:<sessionId>` */

function setProgressPeriod(id){
  progressPeriod = id;
  renderProgressControls();
  if(progressSelection) renderProgressChart(progressSelection);
}

/* Le filtre de période est placé juste au-dessus du graphique : c'est lui qu'il
   commande, et le voir loin de la courbe rendait le lien peu évident. */
function renderProgressControls(){
  const wrap = document.getElementById('progress-controls');
  if(!wrap) return;
  wrap.innerHTML = '';
  if(progressSelection === null){ wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';

  /* Méthode : uniquement pour un exercice (pas tonnage/mensuration) qui a
     plusieurs méthodes plausibles dans le catalogue. Apparaît AVANT la
     période, puisque changer de méthode revient à changer de courbe.
     Pas d'option « Toutes » : les méthodes ne se comparent pas entre elles
     (barre et haltères n'ont pas le même sens), select.onchange choisit donc
     toujours une méthode précise dès qu'un tel exercice est sélectionné. */
  const exerciseName = isMethodProgressKey(progressSelection)
    ? methodProgressExerciseName(progressSelection)
    : (!isTonnageKey(progressSelection) && !isBodyProgressKey(progressSelection) ? progressSelection : null);
  const methodList = exerciseName ? equipmentListForExerciseName(exerciseName) : null;

  if(exerciseName && methodList && methodList.length > 1){
    const methodLabel = document.createElement('span');
    methodLabel.className = 'section-label';
    methodLabel.textContent = 'Méthode';
    wrap.appendChild(methodLabel);

    const methodRow = document.createElement('div');
    methodRow.className = 'segmented';

    methodList.forEach(id => {
      const info = equipmentInfo(id);
      if(!info) return;
      const key = methodProgressKey(exerciseName, id);
      const b = document.createElement('button');
      b.className = 'segmented-btn' + (progressSelection === key ? ' selected' : '');
      b.textContent = info.label;
      b.onclick = () => {
        progressSelection = key;
        renderProgressControls();
        renderProgressChart(progressSelection);
      };
      methodRow.appendChild(b);
    });
    wrap.appendChild(methodRow);
  }

  const label = document.createElement('span');
  label.className = 'section-label';
  label.textContent = 'Période';
  wrap.appendChild(label);

  const periodRow = document.createElement('div');
  periodRow.className = 'segmented';
  PROGRESS_PERIODS.forEach(pd => {
    const b = document.createElement('button');
    b.className = 'segmented-btn' + (progressPeriod === pd.id ? ' selected' : '');
    b.textContent = pd.label;
    b.onclick = () => setProgressPeriod(pd.id);
    periodRow.appendChild(b);
  });
  wrap.appendChild(periodRow);
}

function getExerciseNamesFromArchives(profile){
  const archives = getArchivesList(profile);
  const names = new Set();
  archives.forEach(arc => {
    (arc.exerciseNames || []).forEach(n => names.add(n));
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'fr'));
}

/* Menu déroulant natif plutôt qu'une liste de boutons : sur iPhone, Safari
   l'affiche en molette plein écran, et l'écran reste court quel que soit le
   nombre d'exercices archivés. */
/* Mensurations sélectionnables dans le Suivi Progression, au même titre que le
   tonnage ou un exercice. Clé `__body__:<champ>`, pour ne jamais entrer en
   collision avec un nom d'exercice ou une clé de tonnage. */
const BODY_KEY_PREFIX = '__body__:';
function bodyProgressKey(fieldId){ return BODY_KEY_PREFIX + fieldId; }
function isBodyProgressKey(key){ return typeof key === 'string' && key.indexOf(BODY_KEY_PREFIX) === 0; }
function bodyProgressFieldId(key){ return String(key).slice(BODY_KEY_PREFIX.length); }

function renderProgressExerciseList(){
  const container = document.getElementById('progress-exercise-list');
  container.innerHTML = '';
  container.style.display = 'flex';

  const names = getExerciseNamesFromArchives(progressProfile);

  /* Squelette seulement s'il n'y a vraiment rien à montrer : si le cache contient
     déjà des données, on les affiche sans attendre la confirmation du snapshot. */
  if(names.length === 0 && !window.__archivesLoaded){
    const sk = document.createElement('div');
    sk.className = 'progress-select skeleton-item';
    sk.innerHTML = '<span class="sk-line sk-lg"></span>';
    container.appendChild(sk);
    return;
  }

  if(names.length === 0){
    const empty = document.createElement('p');
    empty.className = 'archive-empty';
    empty.textContent = `Aucune séance archivée pour ${progressProfile === 'corentin' ? 'Corentin' : 'Lisa'} — la progression apparaîtra après le premier archivage.`;
    container.appendChild(empty);
    return;
  }

  const select = document.createElement('select');
  select.className = 'progress-select';
  select.id = 'progress-select';

  /* Option d'amorce : sans elle, le premier exercice paraîtrait sélectionné
     alors qu'aucun graphique n'est encore affiché. */
  if(progressSelection === null){
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choisis un exercice…';
    placeholder.selected = true;
    select.appendChild(placeholder);
  }

  /* 032 : le tonnage est une donnée de séance, pas d'exercice. Une entrée par
     séance archivée, pour ne comparer que ce qui est comparable. */
  const sessions = getArchivedSessions(progressProfile);
  if(sessions.length > 0){
    const groupSession = document.createElement('optgroup');
    groupSession.label = `Tonnage par séance (${sessions.length})`;
    sessions.forEach(sess => {
      const opt = document.createElement('option');
      opt.value = tonnageKey(sess.id);
      opt.textContent = sess.title ? `${sess.label} — ${sess.title}` : sess.label;
      groupSession.appendChild(opt);
    });
    select.appendChild(groupSession);
  }

  /* Les mensurations ont leur propre onglet (« Poids & mensurations ») : les
     lister ici aussi les rendrait sélectionnables à deux endroits différents,
     ce qui contredit l'idée d'un menu unique et lisible par usage. */
  const groupEx = document.createElement('optgroup');
  groupEx.label = `Exercices (${names.length})`;
  names.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n;
    groupEx.appendChild(opt);
  });
  select.appendChild(groupEx);

  if(progressSelection !== null){
    /* Une sélection par méthode (`__method__:...`) n'a pas d'option propre dans
       ce menu — seul l'exercice de base y figure. Le menu doit quand même
       refléter quel exercice est actif, sinon il retomberait visuellement sur
       l'amorce alors qu'une courbe est bien affichée. */
    select.value = isMethodProgressKey(progressSelection)
      ? methodProgressExerciseName(progressSelection)
      : progressSelection;
    select.classList.add('chosen');
  }

  select.onchange = () => {
    if(select.value === ''){ return; }
    const picked = select.value;
    /* Un exercice à plusieurs méthodes ne propose plus de vue mélangée : on
       retombe directement sur sa première méthode (celle par défaut, voir
       getExerciseEquipmentId) plutôt que sur le nom brut de l'exercice. */
    const list = (!isTonnageKey(picked) && !isBodyProgressKey(picked)) ? equipmentListForExerciseName(picked) : null;
    progressSelection = (list && list.length > 1) ? methodProgressKey(picked, list[0]) : picked;
    /* on reconstruit le menu pour retirer l'amorce « Choisis un exercice… » et
       marquer le champ comme renseigné ; le menu est déjà refermé à ce stade. */
    renderProgressExerciseList();
    renderProgressControls();
    renderProgressChart(progressSelection);
  };

  container.appendChild(select);
}

/* Archives d'un profil filtrées par la période choisie, du plus ancien au plus récent. */
/* Filtre par période, générique : réutilisé pour les archives et les mesures
   corporelles, qui ont chacune leur propre notion de "liste chronologique". */
function filterByProgressPeriod(items, getTimestamp, periodId){
  const period = PROGRESS_PERIODS.find(p => p.id === (periodId || progressPeriod));
  if(!period || !period.days) return items;
  const floor = Date.now() - period.days * 24 * 60 * 60 * 1000;
  return items.filter(item => (getTimestamp(item) || 0) >= floor);
}

function getArchivesInPeriod(profile){
  const archives = getArchivesChrono(profile);
  return filterByProgressPeriod(archives, a => a.createdAt);
}

/* Un point par archive. `value` vaut null quand l'exercice n'a rien d'exploitable
   ce jour-là : le point est simplement absent de la courbe. */
function getProgressPoints(profile, selection){
  /* Une mensuration n'a pas d'archive : sa chronologie vient de bodyEntries. */
  if(isBodyProgressKey(selection)){
    const fieldId = bodyProgressFieldId(selection);
    const entries = filterByProgressPeriod(bodyEntries(profile).slice().reverse(), e => e.at, bodyProgressPeriod);
    return entries
      .map(e => ({ dateLabel: e.dateLabel, value: parseNum(bodyEntryValue(e, fieldId)), createdAt: e.at }))
      .filter(p => !isNaN(p.value));
  }

  const archives = getArchivesInPeriod(profile);
  const points = [];

  const wantedSession = isTonnageKey(selection) ? tonnageSessionId(selection) : null;
  const isMethodSel = isMethodProgressKey(selection);
  const methodExerciseName = isMethodSel ? methodProgressExerciseName(selection) : null;
  const methodId = isMethodSel ? methodProgressMethodId(selection) : null;

  archives.forEach(arc => {
    let value = null, weight = null, reps = null;
    if(wantedSession !== null){
      /* seules les occurrences de CETTE séance entrent dans la courbe */
      if(arc.sessionId === wantedSession && arc.tonnage > 0) value = arc.tonnage;
    } else if(isMethodSel){
      /* seules les séances où CETTE méthode a été utilisée pour cet exercice */
      if(archiveExerciseMethodId(arc, methodExerciseName) === methodId){
        const best = bestSetByVolume(arc, methodExerciseName);
        if(best){ value = best.volume; weight = best.weight; reps = best.reps; }
      }
    } else {
      /* Le seul poids masque la difficulté réelle : 45 kg × 8 n'est pas
         forcément mieux que 40 kg × 12. Le point tracé est donc le volume
         (poids × reps × facteur de charge) de la meilleure série du jour, la
         même mesure que celle qui sert au record (voir bestSetByVolume). */
      const best = bestSetByVolume(arc, selection);
      if(best){ value = best.volume; weight = best.weight; reps = best.reps; }
    }
    if(value !== null) points.push({ dateLabel: arc.dateLabel, value: value, createdAt: arc.createdAt, weight: weight, reps: reps });
  });

  return points;
}

/* ---------- TONNAGE TOTAL D'UN EXERCICE (toutes séries, pas la meilleure) ----------
   Complète la courbe « meilleure série » ci-dessus : celle-ci peut baisser un
   jour où la charge est montée mais les répétitions ont chuté (une série plus
   lourde mais plus courte pèse parfois moins en volume) — visuellement
   déroutant si rien d'autre ne l'explique. Ce second tracé additionne TOUTES
   les séries de l'exercice ce jour-là, comme le tonnage de séance mais borné
   à un seul exercice : une charge de travail totale en hausse malgré une
   meilleure série en baisse s'explique alors de lui-même, sans texte de plus. */
function getExerciseTonnagePoints(profile, selection){
  const archives = getArchivesInPeriod(profile);
  const points = [];
  const isMethodSel = isMethodProgressKey(selection);
  const exerciseName = isMethodSel ? methodProgressExerciseName(selection) : selection;
  const methodId = isMethodSel ? methodProgressMethodId(selection) : null;

  archives.forEach(arc => {
    if(isMethodSel && archiveExerciseMethodId(arc, exerciseName) !== methodId) return;
    const factor = archiveLoadFactor(arc, exerciseName);
    let total = 0, any = false;
    getSetsForExercise(arc, exerciseName).forEach(s => {
      const vol = setVolume(s.weight, s.reps, factor);
      if(!isNaN(vol)){ total += vol; any = true; }
    });
    if(any) points.push({ dateLabel: arc.dateLabel, value: total, createdAt: arc.createdAt });
  });

  return points;
}

/* 034 : écart entre le premier et le dernier point de la période affichée. */
function getProgressDelta(points){
  if(points.length < 2) return null;
  const first = points[0].value, last = points[points.length - 1].value;
  if(!first) return null;
  const diff = last - first;
  const pct = (diff / first) * 100;
  return { first, last, diff, pct };
}

function progressMetricInfo(selection){
  if(isBodyProgressKey(selection)){
    const fieldId = bodyProgressFieldId(selection);
    return { unit: bodyFieldInfo(fieldId).unit, title:'mesure corporelle', label: bodyFieldLabel(fieldId, progressProfile) };
  }
  if(isTonnageKey(selection)){
    const sess = getArchivedSessions(progressProfile)
      .find(x => x.id === tonnageSessionId(selection));
    const name = sess ? `${sess.label}${sess.title ? ' — ' + sess.title : ''}` : 'Séance';
    return { unit:'kg', title:'tonnage à chaque répétition de cette séance', label:name };
  }
  if(isMethodProgressKey(selection)){
    const name = methodProgressExerciseName(selection);
    const info = equipmentInfo(methodProgressMethodId(selection));
    return { unit:'kg×reps', title:'volume de la meilleure série (poids × reps), cette méthode uniquement', label: `${name} — ${info ? info.label : ''}` };
  }
  return { unit:'kg×reps', title:'volume de la meilleure série (poids × reps)', label:selection };
}

function renderProgressChart(selection){
  const wrap = document.getElementById('progress-chart-wrap');
  const info = progressMetricInfo(selection);
  const points = getProgressPoints(progressProfile, selection);
  const periodLabel = (PROGRESS_PERIODS.find(p => p.id === progressPeriod) || {}).label;

  /* Le second tracé (tonnage total, toutes séries) n'a de sens que pour un
     exercice suivi par sa meilleure série — pas pour un tonnage de séance
     déjà global, ni pour une mensuration. */
  const showTonnageChart = !isTonnageKey(selection) && !isBodyProgressKey(selection);

  if(points.length === 0){
    wrap.innerHTML = `
      <div class="progress-chart-card">
        <div class="progress-chart-title">${escapeHtml(info.label)}</div>
        <div class="progress-chart-empty">Rien d'enregistré sur cette période${progressPeriod === 'all' ? '' : ' (' + escapeHtml(periodLabel) + ')'}.</div>
      </div>
    `;
    return;
  }

  let html = `
    <div class="progress-chart-card">
      <div class="progress-chart-title">${escapeHtml(info.label)} — ${escapeHtml(info.title)}</div>
      ${buildChartSvg(points)}
      <div class="progress-chart-foot">${points.length} séance${points.length > 1 ? 's' : ''} sur la période</div>
      ${buildDeltaHtml(points, info.unit, progressPeriod === 'all' ? '' : periodLabel)}
    </div>
  `;

  if(showTonnageChart){
    const tonnagePoints = getExerciseTonnagePoints(progressProfile, selection);
    if(tonnagePoints.length > 0){
      html += `
        <div class="progress-chart-card">
          <div class="progress-chart-title">${escapeHtml(info.label)} — tonnage total (toutes séries de l'exercice)</div>
          ${buildChartSvg(tonnagePoints)}
          <div class="progress-chart-foot">${tonnagePoints.length} séance${tonnagePoints.length > 1 ? 's' : ''} sur la période</div>
          ${buildDeltaHtml(tonnagePoints, 'kg', progressPeriod === 'all' ? '' : periodLabel)}
        </div>
      `;
    }
  }

  wrap.innerHTML = html;
}

/* Courbe lissée partagée : une bézier quadratique par segment, dont le point de
   contrôle est l'extrémité de départ et le point d'arrivée le milieu du
   segment suivant. Utilisée par buildChartSvg (une série) et
   buildBodyOverviewSvg (plusieurs séries superposées) — une seule version
   pour ne pas les faire diverger. */
function smoothPath(cs){
  if(cs.length === 1) return `M ${cs[0].x.toFixed(1)},${cs[0].y.toFixed(1)}`;
  let d = `M ${cs[0].x.toFixed(1)},${cs[0].y.toFixed(1)}`;
  for(let i = 0; i < cs.length - 1; i++){
    const c0 = cs[i], c1 = cs[i + 1];
    const midX = (c0.x + c1.x) / 2, midY = (c0.y + c1.y) / 2;
    if(i === 0){
      d += ` L ${midX.toFixed(1)},${midY.toFixed(1)}`;
    } else {
      d += ` Q ${c0.x.toFixed(1)},${c0.y.toFixed(1)} ${midX.toFixed(1)},${midY.toFixed(1)}`;
    }
  }
  const last = cs[cs.length - 1];
  d += ` T ${last.x.toFixed(1)},${last.y.toFixed(1)}`;
  return d;
}

/* Tracé partagé : une ligne, ses points, la valeur et la date de chacun.
   Extrait de l'écran Progression pour servir aussi aux mensurations, plutôt que
   d'en dupliquer une seconde version qui divergerait. */
let chartInstanceCounter = 0;
function buildChartSvg(points){
  const width = 320, height = 168, padding = 28;
  const values = points.map(p => p.value);
  const maxV = Math.max(...values), minV = Math.min(...values);
  const range = (maxV - minV) || 1;
  const flat = maxV === minV;
  /* Identifiant unique par instance : l'onglet Entraînement et l'onglet Corps
     peuvent chacun avoir un graphique dans le DOM en même temps (l'un caché en
     display:none), un <linearGradient> partagerait sinon le même id. */
  const gid = 'chart-grad-' + (++chartInstanceCounter);

  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = points.length > 1 ? padding + i * stepX : width / 2;
    const ratio = flat ? 0.5 : (p.value - minV) / range;
    return { x: x, y: height - padding - ratio * (height - padding * 2), point: p };
  });

  const linePath = coords.length > 1 ? smoothPath(coords)
    : `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)} L ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  const baseline = height - padding;
  const areaPath = coords.length > 1
    ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${baseline} L ${coords[0].x.toFixed(1)},${baseline} Z`
    : '';

  const dots = coords.map((c, i) => {
    const isLast = i === coords.length - 1 && coords.length > 1;
    return `
    <circle class="chart-dot-glow" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="9" fill="var(--accent)" style="animation-delay:${(0.55 + i * 0.06).toFixed(2)}s"/>
    <circle class="chart-dot${isLast ? ' chart-dot-last' : ''}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${isLast ? 5 : 4}" fill="${isLast ? 'var(--accent)' : 'var(--card)'}" stroke="${isLast ? 'var(--gold)' : 'var(--accent)'}" stroke-width="${isLast ? 2.6 : 2}" style="animation-delay:${(0.6 + i * 0.06).toFixed(2)}s"/>
  `;
  }).join('');

  /* Au-delà de 8 points, les étiquettes se chevauchent : on n'en garde qu'une sur
     N, en conservant toujours la première et la dernière. */
  const stride = Math.ceil(points.length / 6);
  const keep = i => points.length <= 8 || i === 0 || i === points.length - 1 || i % stride === 0;

  const valueLabels = coords.map((c, i) => {
    if(!keep(i)) return '';
    /* Quand le point porte le détail poids/reps de la série (courbe
       "meilleure série"), l'afficher directement lève l'ambiguïté qu'un
       simple volume ne dit pas : une charge plus lourde sur moins de
       répétitions peut donner un volume plus bas, ce qui a dérouté avant
       que cette étiquette n'existe. */
    const hasDetail = c.point.weight != null && c.point.reps != null && !isNaN(c.point.weight) && !isNaN(c.point.reps);
    const text = hasDetail
      ? `${formatNumberFr(c.point.weight)}×${formatNumberFr(c.point.reps)}`
      : formatNumberFr(c.point.value);
    return `<text class="progress-value-label" x="${c.x.toFixed(1)}" y="${(c.y - 14).toFixed(1)}" text-anchor="middle">${escapeHtml(text)}</text>`;
  }).join('');
  const dateLabels = coords.map((c, i) => keep(i)
    ? `<text class="progress-point-label" x="${c.x.toFixed(1)}" y="${height - 8}" text-anchor="middle">${escapeHtml(String(c.point.dateLabel || '').slice(0,5))}</text>`
    : '').join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line class="chart-grid-row" x1="${padding - 8}" y1="${padding}" x2="${width - padding + 8}" y2="${padding}"/>
      <line class="chart-grid-row" x1="${padding - 8}" y1="${(height) / 2}" x2="${width - padding + 8}" y2="${(height) / 2}"/>
      <line class="chart-grid-row" x1="${padding - 8}" y1="${baseline}" x2="${width - padding + 8}" y2="${baseline}"/>
      ${areaPath ? `<path class="chart-area" d="${areaPath}" fill="url(#${gid})" stroke="none"/>` : ''}
      <path class="chart-line" d="${linePath}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
      ${valueLabels}
      ${dateLabels}
    </svg>
  `;
}

function buildDeltaHtml(points, unit, periodLabel){
  const delta = getProgressDelta(points);
  if(!delta) return '';
  const sign = delta.diff > 0 ? '+' : (delta.diff < 0 ? '−' : '');
  const cls = delta.diff > 0 ? 'up' : (delta.diff < 0 ? 'down' : 'flat');
  const abs = Math.abs(delta.diff);
  return `
    <div class="progress-delta ${cls}">
      <span class="delta-main">${sign}${escapeHtml(formatNumberFr(Math.round(abs * 10) / 10))} ${escapeHtml(unit)}</span>
      <span class="delta-pct">${sign}${escapeHtml(formatNumberFr(Math.abs(Math.round(delta.pct * 10) / 10)))} %</span>
      <span class="delta-ctx">de ${escapeHtml(formatNumberFr(delta.first))} à ${escapeHtml(formatNumberFr(delta.last))} ${escapeHtml(unit)}${periodLabel ? ' · ' + escapeHtml(periodLabel) : ''}</span>
    </div>
  `;
}

/* ---------- GRAPHIQUE D'ENSEMBLE DES MENSURATIONS (14/09/26) ----------
   Une seule courbe par type de mesure, toutes superposées sur un même
   graphique. Le poids se compte en kg, un tour de bras en cm : les mélanger
   sur une échelle commune n'aurait aucun sens (le poids écraserait tout).
   Chaque série est donc normalisée sur SA PROPRE plage min/max — seule
   l'allure (monte / descend / stagne) se compare d'une courbe à l'autre, pas
   les valeurs absolues, qui restent lisibles via l'étiquette de chaque point
   et l'historique juste en dessous. L'axe des dates, lui, est commun et
   proportionnel au temps réel écoulé (pas un simple index par point comme
   buildChartSvg) : des mesures prises à des dates irrégulières doivent
   s'aligner correctement les unes par rapport aux autres. */
function buildBodyOverviewSvg(seriesList){
  const width = 320, height = 190, padding = 30;
  const allTimes = seriesList.flatMap(s => s.points.map(p => p.at));
  if(allTimes.length === 0) return '';
  const minT = Math.min(...allTimes), maxT = Math.max(...allTimes);
  const rangeT = (maxT - minT) || 1;
  const xFor = t => allTimes.length > 1 && (maxT > minT)
    ? padding + ((t - minT) / rangeT) * (width - padding * 2)
    : width / 2;

  let lines = '', dots = '';
  seriesList.forEach((s, si) => {
    const vals = s.points.map(p => p.value);
    const minV = Math.min(...vals), maxV = Math.max(...vals);
    const rangeV = (maxV - minV) || 1;
    const coords = s.points
      .slice().sort((a, b) => a.at - b.at)
      .map(p => ({
        x: xFor(p.at),
        y: height - padding - ((p.value - minV) / rangeV) * (height - padding * 2),
        point: p
      }));
    const path = coords.length > 1 ? smoothPath(coords)
      : `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)} L ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    const delay = (si * 0.08).toFixed(2);
    lines += `<path class="body-overview-line" d="${path}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" style="animation-delay:${delay}s"/>`;
    coords.forEach(c => {
      dots += `<circle class="body-overview-dot" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.5" fill="${s.color}" stroke="var(--card)" stroke-width="1.2" style="animation-delay:${delay}s"/>`;
    });
  });

  /* Dates repères en bas : première, dernière, et quelques intermédiaires
     réparties dans le temps plutôt que par index de point. */
  const tickCount = Math.min(4, allTimes.length);
  const uniqueTimes = Array.from(new Set(allTimes)).sort((a, b) => a - b);
  const tickTimes = tickCount <= 1 ? uniqueTimes : uniqueTimes.filter((_, i) =>
    i === 0 || i === uniqueTimes.length - 1 || i % Math.ceil(uniqueTimes.length / (tickCount - 1)) === 0
  );
  const dateLabels = tickTimes.map(t => {
    const x = xFor(t);
    const label = new Date(t).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' });
    return `<text class="progress-point-label" x="${x.toFixed(1)}" y="${height - 8}" text-anchor="middle">${escapeHtml(label)}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
      ${lines}
      ${dots}
      ${dateLabels}
    </svg>
  `;
}

/* Légende à bascule + graphique. Chaque puce reflète et contrôle
   l'appartenance de sa mesure à `bodyVisibleFields`. Tant que l'utilisateur
   n'a touché aucune puce (`bodyVisibleFields === null`), tout ce qui a des
   données est affiché — c'est le "par défaut : toutes" demandé. */
function renderBodyOverviewChart(){
  const legendWrap = document.getElementById('body-legend-row');
  const chartWrap = document.getElementById('body-overview-chart-wrap');
  if(!legendWrap || !chartWrap) return;

  const entries = bodyEntries(progressProfile);
  const available = BODY_FIELDS.filter(f => entries.some(e => bodyEntryValue(e, f.id)));

  if(available.length === 0){
    legendWrap.innerHTML = '';
    chartWrap.innerHTML = `<p class="archive-empty">Ajoute une première mesure ci-dessus pour voir son évolution ici.</p>`;
    return;
  }

  const visible = bodyVisibleFields || new Set(available.map(f => f.id));

  legendWrap.innerHTML = '';
  available.forEach(f => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'body-legend-chip' + (visible.has(f.id) ? ' active' : '');
    chip.style.setProperty('--legend-color', bodyFieldColor(f.id));
    chip.innerHTML = `<span class="body-legend-dot"></span>${escapeHtml(bodyFieldLabel(f.id, progressProfile))}`;
    chip.onclick = () => {
      const next = new Set(bodyVisibleFields || new Set(available.map(x => x.id)));
      if(next.has(f.id)) next.delete(f.id); else next.add(f.id);
      bodyVisibleFields = next;
      renderBodyOverviewChart();
    };
    legendWrap.appendChild(chip);
  });

  const archives = filterByProgressPeriod(entries.slice().reverse(), e => e.at, bodyProgressPeriod);
  const seriesList = available
    .filter(f => visible.has(f.id))
    .map(f => ({
      id: f.id,
      label: bodyFieldLabel(f.id, progressProfile),
      color: bodyFieldColor(f.id),
      points: archives
        .map(e => ({ at: e.at, value: parseNum(bodyEntryValue(e, f.id)), dateLabel: e.dateLabel }))
        .filter(p => !isNaN(p.value))
    }))
    .filter(s => s.points.length > 0);

  if(seriesList.length === 0){
    chartWrap.innerHTML = `<p class="archive-empty">Rien à afficher${bodyVisibleFields ? ' pour la sélection actuelle' : ''} sur cette période.</p>`;
    return;
  }

  chartWrap.innerHTML = `<div class="progress-chart-card">${buildBodyOverviewSvg(seriesList)}</div>`;
}


/* ==========================================================================
   CONSEILLER (bilan IA)
   Trois couches de mémoire, pour que le conseiller connaisse l'historique sans
   qu'on lui envoie tout à chaque fois :
     1. les CHIFFRES, calculés ici (exacts, gratuits, compacts) ;
     2. les DERNIERS BILANS, pour qu'il ne se répète pas ;
     3. un PROFIL évolutif qu'il réécrit à chaque analyse.
   Le tout tient dans quelques milliers de tokens au lieu de l'historique brut,
   qui atteindrait 100 000 tokens au bout d'un an.

   Stockage : deux champs ajoutés à l'archive (`coachFeedback`, `coachProfile`).
   Aucune collection Firestore supplémentaire, donc aucune règle à modifier.
   ========================================================================== */

/* Alias maintenu par Google et repointé à chaque génération : plus durable
   qu'un numéro de version, qui finit toujours par être retiré du service. */
const COACH_DEFAULT_MODEL = 'gemini-flash-latest';

/* Les réglages vivent dans Firestore (document `settings/coach`) : saisis une
   fois, ils valent pour les deux téléphones. Les anciennes valeurs locales
   servent de repli tant que le premier snapshot n'est pas arrivé. */
function coachSettings(){ return window.coachSettingsCache || {}; }
function coachGetKey(){ return coachSettings().apiKey || storage.get('duo_coach_key') || ''; }
function coachGetModel(){ return coachSettings().model || COACH_DEFAULT_MODEL; }
function coachGetWeights(){ return coachSettings().weights || {}; }

function saveCoachSettingsRemote(next){
  if(!window.__fb) return Promise.reject(new Error('Cloud indisponible'));
  const { db, doc, setDoc } = window.__fb;
  /* setDoc REMPLACE le document entier. Si un appelant oublie un champ, on le
     réinjecte plutôt que de le perdre — cette erreur a déjà coûté des
     conversations une fois. */
  const merged = Object.assign({}, coachSettings(), next);
  window.coachSettingsCache = merged;
  backupChatThreads(merged.threads);
  /* { merge:true } : seuls les champs présents dans `merged` sont écrits, les
     autres champs du document serveur (apiKey, model, body…) sont conservés.
     Sans cela, une écriture partie d'un cache encore vide (avant le premier
     snapshot) remplaçait le document par `threads` seul et effaçait la clé API. */
  return setDoc(doc(db, 'settings', 'coach'), merged, { merge: true });
}

/* ---------- SAUVEGARDE LOCALE DES CONVERSATIONS ----------
   Miroir sur le téléphone de la liste des conversations, rôles compris. Les
   messages, eux, survivent toujours dans `coachChat` — mais le NOM et le RÔLE
   n'existent que dans `settings/coach`, et rien ne les protège d'une écriture
   malencontreuse. Ce miroir est le seul moyen de les rendre. */
const COACH_THREADS_BACKUP = 'duo_coach_threads_backup';

function backupChatThreads(list){
  if(!Array.isArray(list) || list.length === 0) return;
  try{ storage.set(COACH_THREADS_BACKUP, JSON.stringify(list)); }catch(e){ /* sans gravité */ }
}
function readChatThreadsBackup(){
  try{ const v = JSON.parse(storage.get(COACH_THREADS_BACKUP) || '[]'); return Array.isArray(v) ? v : []; }
  catch(e){ return []; }
}

const PROFILE_NAMES = { corentin:'Corentin', lisa:'Lisa' };

/* ---- Couche 1 : les chiffres ---- */

/* Historique compact d'un profil : records, 5 dernières valeurs par exercice,
   évolution du tonnage séance par séance. */
function buildCoachDigest(profile){
  const archives = getArchivesChrono(profile);
  if(archives.length === 0) return `${PROFILE_NAMES[profile]} : aucune séance archivée.`;

  const stats = getLifetimeStats(profile);
  let out = `--- ${PROFILE_NAMES[profile]} ---\n`;
  /* Le poids vient désormais du suivi tenu dans Progression, avec repli sur
     l'ancien réglage statique pour ne rien perdre de ce qui a pu être saisi
     avant l'existence de ce suivi. */
  const weight = latestBodyWeight(profile) || (coachGetWeights()[profile] || '');
  if(weight) out += `Poids de corps : ${weight} kg\n`;
  /* Plusieurs mesures, pas seulement la dernière : sans historique, le coach ne
     peut pas dire si un tour de taille progresse ou stagne, seulement le lire.
     `bodyEntries` est déjà trié du plus récent au plus ancien. */
  const measurementHistory = bodyEntries(profile).slice(0, 5);
  if(measurementHistory.length){
    const lines = measurementHistory
      .map(entry => {
        const parts = BODY_FIELDS.slice(1)
          .map(f => { const v = bodyEntryValue(entry, f.id); return v ? `${bodyFieldLabel(f.id, profile)} ${v} cm` : ''; })
          .filter(Boolean);
        return parts.length ? `[${entry.dateLabel}] ${parts.join(', ')}` : '';
      })
      .filter(Boolean);
    if(lines.length) out += `Mensurations (plus récent → plus ancien) :\n${lines.join('\n')}\n`;
  }
  out += `${stats.sessions} séances archivées, ${stats.tonnage} kg cumulés.\n`;

  /* Tonnage par type de séance : seules les séances identiques sont comparables. */
  getArchivedSessions(profile).forEach(sess => {
    const pts = archives
      .filter(a => a.sessionId === sess.id && a.tonnage > 0)
      .slice(-5)
      .map(a => `${a.dateLabel} ${a.tonnage}kg`);
    if(pts.length) out += `Tonnage ${sess.label} : ${pts.join(' → ')}\n`;
  });

  out += `Exercices :\n`;
  getExerciseNamesFromArchives(profile).forEach(name => {
    const line = [];
    archives.slice(-8).forEach(arc => {
      const best = bestSetByVolume(arc, name);
      if(!best) return;
      line.push(`${arc.dateLabel} ${formatNumberFr(best.weight)}kg×${isNaN(best.reps) ? '?' : best.reps}`);
    });
    const record = getPersonalRecord(profile, name);
    if(line.length) out += `  ${name} — record ${record ? formatNumberFr(record.weight) + 'kg×' + record.reps : '—'} | ${line.slice(-5).join(' → ')}\n`;
  });
  return out;
}

/* ---- Couche 2 et 3 : bilans précédents et profil évolutif ---- */

/* Le profil courant est celui de l'archive la plus récente qui en porte un :
   chaque bilan le réécrit, donc le dernier fait foi. */
function getCoachProfileText(){
  const all = getArchivesList('corentin').concat(getArchivesList('lisa'))
    .filter(a => a.coachProfile)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return all.length ? all[0].coachProfile : '';
}
function getRecentCoachFeedbacks(limit){
  const seen = new Set();
  return getArchivesList('corentin').concat(getArchivesList('lisa'))
    .filter(a => a.coachFeedback)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .filter(a => { const k = a.dateLabel; if(seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, limit)
    .reverse();
}

/* Archives récentes en texte intégral. Le condensé chiffré couvre TOUT
   l'historique, mais il perd le détail : notes, variantes, cardio, contexte du
   jour. On joint donc les dernières séances telles qu'elles ont été écrites.
   Pourquoi seulement les dernières : un an d'archives brutes représenterait
   ~100 000 tokens par appel, pour une pertinence moindre — le modèle se noierait
   dans le détail au lieu de voir les tendances, que les chiffres portent déjà. */
function buildArchiveExcerpts(limit){
  const recent = getArchivesList('corentin').concat(getArchivesList('lisa'))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limit)
    .reverse();
  if(recent.length === 0) return '';
  let out = 'ARCHIVES RÉCENTES (texte intégral, notes comprises)\n\n';
  recent.forEach(a => {
    out += a.exportText + '\n';
    if(a.coachFeedback) out += '↳ ton bilan de ce jour-là : ' + a.coachFeedback + '\n';
    out += '\n';
  });
  return out;
}

/* Les deux archives d'une même journée : le bilan est commun au duo. */
function getDayArchives(dateLabel){
  return getArchivesList('corentin').concat(getArchivesList('lisa'))
    .filter(a => a.dateLabel === dateLabel)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function buildCoachPrompt(dateLabel){
  const dayArchives = getDayArchives(dateLabel);
  let p = `SÉANCES DU ${dateLabel}\n\n`;
  dayArchives.forEach(arc => {
    p += arc.exportText + '\n\n';
  });

  p += `HISTORIQUE CHIFFRÉ\n`;
  p += buildCoachDigest('corentin') + '\n';
  p += buildCoachDigest('lisa') + '\n';

  const profileText = getCoachProfileText();
  if(profileText) p += `\nCE QUE TU SAIS D'EUX (profil que tu tiens à jour)\n${profileText}\n`;

  const previous = getRecentCoachFeedbacks(3);
  if(previous.length){
    p += `\nTES BILANS PRÉCÉDENTS (ne te répète pas, vérifie si tes conseils ont été suivis)\n`;
    previous.forEach(a => { p += `[${a.dateLabel}]\n${a.coachFeedback}\n\n`; });
  }
  return p;
}

const COACH_SYSTEM = `Tu es le coach de musculation personnel de Corentin et Lisa, un couple qui s'entraîne ensemble. Tu les suis depuis leurs débuts et tu connais leur historique.

Rédige un bilan de leur séance, en français, structuré ainsi :
- une phrase d'ouverture sur la séance dans son ensemble ;
- une section par personne, avec un titre clair ;
- dans chaque section, un point par exercice qui mérite un commentaire (pas tous) : ce qui a progressé, ce qui bloque, et un conseil technique CONCRET et actionnable ;
- une estimation de la dépense calorique de la musculation pour chacun, présentée comme un ordre de grandeur et non comme un chiffre exact ;
- une phrase de clôture.

Règles :
- Appuie-toi sur les chiffres fournis. Cite les charges, les écarts, les records.
- Compare à leurs séances précédentes du MÊME type. Un bas du corps ne se compare pas à un haut du corps.
- Si une douleur ou une gêne est mentionnée, sois prudent : propose de réduire l'amplitude ou de substituer un exercice, et invite à consulter un professionnel si ça persiste. Ne pousse jamais à forcer sur une douleur.
- Pas d'encouragement générique. Si tu n'as rien de précis à dire sur un exercice, n'en parle pas.
- Tiens compte du contexte qu'ils ont noté (fatigue, cycle, matériel indisponible).

Réponds UNIQUEMENT avec un objet JSON valide, sans balises de code :
{"bilan": "le texte du bilan", "profil": "le profil mis à jour"}

Le champ "profil" est ta mémoire longue : 10 lignes maximum, réécrites à chaque fois. Objectifs, contraintes physiques, habitudes observées, points de vigilance. Repars du profil existant et fais-le évoluer, ne le repars pas de zéro.`;

/* ---- Appel HTTP vers Gemini ----
   Google migre des clés « standard » (AIza…) vers des clés d'autorisation
   (AQ.…), liées à un compte de service. Les deux formats coexistent et ne sont
   pas acceptés de la même façon selon la voie utilisée.

   On tente d'abord la clé en paramètre d'URL : c'est la voie historique, et
   surtout elle n'ajoute aucun en-tête personnalisé, donc pas de requête CORS
   préalable depuis Safari. Si le serveur répond 401, on réessaie avec l'en-tête
   `x-goog-api-key`, recommandé pour les clés d'autorisation. */
async function geminiFetch(path, init){
  const key = coachGetKey();
  if(!key) throw new Error('NO_KEY');
  const base = 'https://generativelanguage.googleapis.com/v1beta/' + path;
  const sep = base.indexOf('?') !== -1 ? '&' : '?';

  let res = await fetch(base + sep + 'key=' + encodeURIComponent(key), init || {});
  if(res.status === 401){
    const retry = Object.assign({}, init || {});
    retry.headers = Object.assign({}, (init && init.headers) || {}, { 'x-goog-api-key': key });
    res = await fetch(base, retry);
  }
  return res;
}

/* Détail d'erreur renvoyé par Google, pour ne pas afficher un code nu. */
async function geminiError(res){
  let detail = '';
  try{ const e = await res.json(); detail = (e.error && e.error.message) || ''; }catch(err){}
  if(res.status === 401){
    /* Cas très fréquent avec les clés AQ. : la clé existe mais le service la
       refuse. Le message doit orienter vers la clé, pas vers le modèle. */
    return new Error('KEY_REJECTED:' + detail);
  }
  if(res.status === 400 && /API key/i.test(detail)) return new Error('BAD_KEY');
  if(res.status === 403) return new Error('KEY_FORBIDDEN:' + detail);
  if(res.status === 404) return new Error('BAD_MODEL');
  if(res.status === 429) return new Error('QUOTA');
  return new Error(detail || 'Erreur ' + res.status);
}

/* ---- Résistance aux changements de modèles ----
   Google retire régulièrement des modèles : un nom figé finit toujours par
   renvoyer un 404. Plutôt que de laisser l'app bloquée, on demande la liste
   à jour, on choisit le meilleur remplaçant, on l'enregistre et on réessaie
   une fois. L'utilisateur n'a rien à faire, il est simplement prévenu. */

async function fetchAvailableModels(){
  const res = await geminiFetch('models');
  if(!res.ok) throw new Error('Liste des modèles indisponible');
  const data = await res.json();
  return (data.models || [])
    .filter(m => (m.supportedGenerationMethods || []).indexOf('generateContent') !== -1)
    .map(m => String(m.name || '').replace(/^models\//, ''))
    .filter(n => n.indexOf('gemini') === 0);
}

/* Préférences, du plus durable au plus spécifique : un alias `latest` d'abord,
   puis un Flash stable, puis n'importe quel modèle capable de générer du texte. */
function pickBestModel(models){
  if(models.length === 0) return null;
  const byPref = [
    m => m === 'gemini-flash-latest',
    m => m.indexOf('flash-latest') !== -1,
    m => m.indexOf('flash') !== -1 && m.indexOf('lite') === -1 && m.indexOf('preview') === -1,
    m => m.indexOf('flash') !== -1,
    () => true
  ];
  for(const test of byPref){
    const found = models.find(test);
    if(found) return found;
  }
  return models[0];
}

let coachModelRepaired = false; /* une seule réparation par appel, pas de boucle */

async function repairCoachModel(){
  const key = coachGetKey();
  if(!key) return null;
  const models = await fetchAvailableModels();
  const next = pickBestModel(models);
  if(!next || next === coachGetModel()) return null;
  const settings = Object.assign({}, coachSettings(), { model: next });
  saveCoachSettingsRemote(settings).catch(err => console.error('Réparation du modèle', err));
  showToast(`Modèle mis à jour : ${next}`);
  return next;
}

/* Enveloppe commune aux deux appels (bilan et discussion). */
async function withModelRepair(run){
  try{
    return await run();
  }catch(err){
    if(String(err && err.message) !== 'BAD_MODEL' || coachModelRepaired) throw err;
    coachModelRepaired = true;
    let next = null;
    try{
      next = await repairCoachModel();
    }catch(repairErr){
      /* La réparation a échoué à son tour (clé invalide, pas de réseau) :
         on remonte l'erreur d'origine, plus parlante que « liste indisponible ». */
      console.error('Réparation impossible', repairErr);
    }finally{
      coachModelRepaired = false;
    }
    if(!next) throw err;
    return await run();
  }
}

/* ---- Appel API ---- */

async function callCoach(dateLabel){
  const key = coachGetKey();
  if(!key) throw new Error('NO_KEY');

  const model = coachGetModel();
  const res = await geminiFetch(`models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: COACH_SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: buildCoachPrompt(dateLabel) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
    })
  });

  if(!res.ok) throw await geminiError(res);

  const data = await res.json();
  const text = (((data.candidates || [])[0] || {}).content || {}).parts
    ? data.candidates[0].content.parts.map(x => x.text || '').join('')
    : '';
  if(!text) throw new Error('Réponse vide du modèle');

  /* Le JSON est demandé explicitement, mais on reste tolérant : si le modèle
     enrobe sa réponse, on récupère le texte brut plutôt que d'échouer. */
  try{
    const parsed = JSON.parse(text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());
    return { bilan: parsed.bilan || text, profil: parsed.profil || '' };
  }catch(e){
    return { bilan: text, profil: '' };
  }
}

/* ---------- CORBEILLE ----------
   Supprimer ne détruit plus rien : on pose un `deletedAt` et le document part en
   corbeille. Reste dans la collection `archives`, donc aucune règle Firestore à
   modifier. La destruction réelle n'a lieu qu'en vidant la corbeille. */
function findArchiveAnywhere(id){
  return getArchivesList(currentProfile).concat(getTrashList(currentProfile))
    .find(a => a.id === id) || null;
}

function askDeleteArchive(id){
  showConfirm('Mettre cette séance à la corbeille ?', () => deleteArchive(id));
}

function deleteArchive(id){
  if(!window.__fb){
    showToast('Connexion au cloud en cours, réessaie dans un instant');
    return;
  }
  const arc = findArchiveAnywhere(id);
  if(!arc) return;
  const { db, doc, setDoc } = window.__fb;
  setDoc(doc(db, 'archives', id), Object.assign({}, arc, { deletedAt: Date.now() }))
    .catch((err) => {
      console.error('Erreur mise à la corbeille Firestore', err);
      showToast(firestoreErrorMessage(err, "de la suppression"));
    });
  showToast('Déplacée vers la corbeille 🗑️');
}

function restoreArchive(id){
  if(!window.__fb){
    showToast('Connexion au cloud en cours, réessaie dans un instant');
    return;
  }
  const arc = findArchiveAnywhere(id);
  if(!arc) return;
  const restored = Object.assign({}, arc);
  delete restored.deletedAt;
  const { db, doc, setDoc } = window.__fb;
  setDoc(doc(db, 'archives', id), restored)
    .catch((err) => {
      console.error('Erreur restauration Firestore', err);
      showToast(firestoreErrorMessage(err, "de la restauration"));
    });
  showToast('Séance restaurée ♻️');
}

function askEmptyTrash(){
  const count = getTrashList(currentProfile).length;
  if(count === 0) return;
  showConfirm(
    `Supprimer définitivement ${count} séance${count > 1 ? 's' : ''} ? Cette fois c'est irréversible.`,
    emptyTrash
  );
}

function emptyTrash(){
  if(!window.__fb){
    showToast('Connexion au cloud en cours, réessaie dans un instant');
    return;
  }
  const { db, doc, deleteDoc } = window.__fb;
  const items = getTrashList(currentProfile);
  items.forEach(arc => {
    deleteDoc(doc(db, 'archives', arc.id))
      .catch((err) => {
        console.error('Erreur suppression définitive Firestore', err);
        showToast(firestoreErrorMessage(err, "de la suppression"));
      });
  });
  showToast(`${items.length} séance(s) supprimée(s) définitivement`);
  setArchivesMode('active');
}

/* ---------- RÉSUMÉ POUR LE PORTAIL (22/09/26) ----------
   Le tableau de bord du Portail affiche : la prochaine séance de chaque profil, le nombre de
   séances de la semaine, et une « série » de semaines. Muscu calcule ces valeurs (il connaît
   ses archives et ses séances modifiées) et les publie dans `portail/muscu` via `window.__portail`
   (pont défini dans index.html). Voir README.
   - Semaine = du lundi 00:00 au dimanche, heure de l'appareil. Une archive = une séance.
   - Série = semaines d'affilée où Corentin ET Lisa ont fait au moins PORTAIL_SERIE_MIN séances. La
     semaine en cours compte si c'est déjà atteint, et ne casse pas la série sinon (elle n'est pas finie).
   - Prochaine séance = celle qui suit, dans l'ordre du programme, la dernière séance FIXE archivée du
     profil (une séance personnalisée ne décale rien) ; la première du programme s'il n'y a rien. */
const PORTAIL_OBJECTIF_SEMAINE = 4;
const PORTAIL_SERIE_MIN = 3;
function portailDebutSemaine(ts){
  const d = new Date(ts); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}
function portailSemainePrecedente(debut){
  const d = new Date(debut); d.setDate(d.getDate() - 7);
  return portailDebutSemaine(d.getTime());
}
function calculerResumePortailMuscu(archives, getSessionFn, now){
  const profils = ['corentin', 'lisa'];
  const parSemaine = { corentin: {}, lisa: {} };
  profils.forEach(p => (archives[p] || []).forEach(a => {
    if(!a.createdAt) return;
    const k = portailDebutSemaine(a.createdAt);
    parSemaine[p][k] = (parSemaine[p][k] || 0) + 1;
  }));
  const debut = portailDebutSemaine(now);
  const atteint = k => profils.every(p => (parSemaine[p][k] || 0) >= PORTAIL_SERIE_MIN);
  let serie = atteint(debut) ? 1 : 0;
  let k = portailSemainePrecedente(debut);
  for(let i = 0; i < 520 && atteint(k); i++){ serie++; k = portailSemainePrecedente(k); }
  const prochaine = {};
  profils.forEach(p => {
    const derniere = (archives[p] || []).find(a => isFixedSessionId(a.sessionId));  /* déjà triées de la plus récente à la plus ancienne */
    const idx = derniere ? SESSIONS.findIndex(s => s.id === derniere.sessionId) : -1;
    const s = getSessionFn(SESSIONS[(idx + 1) % SESSIONS.length].id);
    prochaine[p] = { label: String(s.label || ''), title: String(s.title || ''), nbExos: (s.exercises || []).length, cardio: !!s.cardio };
  });
  return {
    objectif: PORTAIL_OBJECTIF_SEMAINE,
    semaine: { corentin: parSemaine.corentin[debut] || 0, lisa: parSemaine.lisa[debut] || 0 },
    serie: serie,
    prochaine: prochaine
  };
}
let portailMuscuMinuteur = null, portailMuscuDernier = '';
function planifierPublicationPortailMuscu(){
  /* Seulement quand archives ET séances sont arrivées, et que le dernier snapshot vient du serveur. */
  if(!window.__portail || !window.__archivesLoaded || !window.__customSessionsLoaded || window.__syncFromCache) return;
  clearTimeout(portailMuscuMinuteur);
  portailMuscuMinuteur = setTimeout(async () => {
    try{
      const resume = calculerResumePortailMuscu(window.archivesCache || {}, getSession, Date.now());
      const signature = JSON.stringify(resume);
      if(signature === portailMuscuDernier) return;
      portailMuscuDernier = signature;
      await window.__portail.publish('muscu', Object.assign({ maj: Date.now() }, resume));
    }catch(err){ portailMuscuDernier = ''; console.warn('Résumé Portail non publié :', err); }
  }, 3000);
}
window.addEventListener('archives-updated', planifierPublicationPortailMuscu);
window.addEventListener('custom-sessions-updated', planifierPublicationPortailMuscu);

/* réagit en temps réel aux changements Firestore (y compris depuis l'autre téléphone) */
window.addEventListener('archives-updated', () => {
  const activeView = document.querySelector('.view.active');
  if(!activeView) return;
  if(activeView.id === 'view-menu') renderMenuHero();
  if(activeView.id === 'view-session') renderSessionList();
  if(activeView.id === 'view-archives') renderArchivesList();
  if(activeView.id === 'view-progress'){
    /* `progressSelection` survit au re-render : le menu se repositionne dessus
       tout seul et le graphique reste affiché. */
    renderLifetimeCard();
    renderProgressExerciseList();
    if(progressSelection !== null) renderProgressChart(progressSelection);
  }
});
window.addEventListener('custom-sessions-updated', () => {
  const activeView = document.querySelector('.view.active');
  if(!activeView) return;
  if(activeView.id === 'view-session') renderSessionList();
});

/* ---------- CATALOGUE D'EXERCICES ----------
   Le graphique de progression retrouve un exercice par son nom exact : la moindre
   faute de frappe scinderait la courbe en deux. On propose donc les noms déjà
   utilisés, dérivés des trois sources existantes (programme fixe, séances
   personnalisées, archives). Aucune collection Firestore supplémentaire : rien à
   ajouter aux règles de sécurité, et un exercice reste proposé tant qu'il figure
   dans au moins une séance ou une archive. */
function normalizeExerciseName(name){
  return String(name == null ? '' : name)
    .trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  /* insensible aux accents */
    .replace(/\s+/g, ' ');
}

function getExerciseCatalog(){
  const seen = new Map(); /* clé normalisée -> orthographe à afficher */
  function add(name){
    if(!name || String(name).trim() === '') return;
    const display = String(name).trim().replace(/\s+/g, ' ');
    const key = normalizeExerciseName(display);
    if(!seen.has(key)) seen.set(key, display);
  }
  SESSIONS.forEach(s => (s.exercises || []).forEach(ex => add(ex.name)));
  (window.customSessionsCache || []).forEach(s => (s.exercises || []).forEach(ex => add(ex.name)));
  const archives = window.archivesCache || {};
  Object.keys(archives).forEach(profile => {
    (archives[profile] || []).forEach(arc => (arc.exerciseNames || []).forEach(n => add(n)));
  });
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, 'fr'));
}

/* Champ vide : on montre le début du catalogue. Sinon on filtre, en remontant
   d'abord les noms qui commencent par la saisie. */
function findExerciseMatches(query, limit){
  const catalog = getExerciseCatalog();
  const key = normalizeExerciseName(query);
  if(key === '') return catalog.slice(0, limit);
  const starts = [], contains = [];
  catalog.forEach(name => {
    const n = normalizeExerciseName(name);
    if(n === key) return;                 /* déjà saisi à l'identique */
    if(n.indexOf(key) === 0) starts.push(name);
    else if(n.indexOf(key) !== -1) contains.push(name);
  });
  return starts.concat(contains).slice(0, limit);
}

/* Distance d'édition, pour repérer "Leg Extention" vs "Leg Extension". */
function levenshtein(a, b){
  if(a === b) return 0;
  if(a.length === 0) return b.length;
  if(b.length === 0) return a.length;
  let prev = [];
  for(let j = 0; j <= b.length; j++) prev[j] = j;
  for(let i = 1; i <= a.length; i++){
    const row = [i];
    for(let j = 1; j <= b.length; j++){
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = row;
  }
  return prev[b.length];
}

function findNearExerciseName(value){
  const key = normalizeExerciseName(value);
  if(key.length < 4) return null;
  const catalog = getExerciseCatalog();
  if(catalog.some(n => normalizeExerciseName(n) === key)) return null; /* déjà exact */
  let best = null, bestDistance = Infinity;
  catalog.forEach(name => {
    const distance = levenshtein(key, normalizeExerciseName(name));
    if(distance < bestDistance){ bestDistance = distance; best = name; }
  });
  const tolerance = key.length > 12 ? 3 : 2;
  return (best !== null && bestDistance <= tolerance) ? best : null;
}

/* Filet de sécurité à l'enregistrement : si le nom ne diffère d'un nom connu que
   par la casse, les accents ou les espaces, on adopte l'orthographe du catalogue
   pour que les deux séances alimentent bien la même courbe. */
function canonicalExerciseName(name){
  const cleaned = String(name == null ? '' : name).trim().replace(/\s+/g, ' ');
  const key = normalizeExerciseName(cleaned);
  const match = getExerciseCatalog().find(n => normalizeExerciseName(n) === key);
  return match || cleaned;
}

/* ---------- BUILD TRAINING (création / édition de séance personnalisée) ---------- */
let builderDraft = { name: '', cardio: false, exercises: [] };
let editingSessionId = null;

function blankBuilderExercise(){
  return { name:'', sets:3, repsCorentin:'', repsLisa:'', isCircuit:false, equipment:[] };
}

function resetBuilderDraft(){
  editingSessionId = null;
  builderDraft = {
    name: '',
    cardio: false,
    exercises: [ blankBuilderExercise() ]
  };
}

function loadBuilderDraftFromSession(session){
  editingSessionId = session.id;
  builderDraft = {
    name: session.label || '',
    cardio: !!session.cardio,
    exercises: (session.exercises || []).map(ex => ({
      name: ex.name || '',
      sets: ex.sets || 3,
      repsCorentin: (ex.target && ex.target.corentin) || '',
      repsLisa: (ex.target && ex.target.lisa) || '',
      isCircuit: ex.logType === 'circuit',
      equipment: (ex.equipment || []).slice()
    }))
  };
  if(builderDraft.exercises.length === 0) builderDraft.exercises.push(blankBuilderExercise());
}

function editCustomSession(id){
  /* getSession rend la surcharge si elle existe, sinon la séance d'origine :
     modifier une séance fixe repart donc de son état affiché. */
  const session = isFixedSessionId(id)
    ? getSession(id)
    : (window.customSessionsCache || []).find(s => s.id === id);
  if(!session) return;
  loadBuilderDraftFromSession(session);
  showBuilderForm();
  /* Peut être appelée depuis le hub (déjà sur cette vue) ou, plus tard, depuis
     un autre écran : showView est sans effet si la vue est déjà active. */
  showView('view-builder', 'fwd');
}

function renderBuilderForm(){
  const titleEl = document.getElementById('builder-title');
  if(titleEl) titleEl.textContent = editingSessionId ? 'Modifier la séance' : 'Créer une séance';
  /* Le formulaire est toujours un sous-écran du hub désormais : le bouton
     retour y ramène systématiquement, exitBuilder() s'en charge seul. */
  const backBtn = document.getElementById('builder-back-btn');
  if(backBtn) backBtn.textContent = '← Retour';
  const saveBtn = document.getElementById('builder-save-btn');
  if(saveBtn) saveBtn.textContent = editingSessionId ? 'Enregistrer les modifications ✅' : 'Enregistrer la séance ✅';

  /* Ces deux champs n'étaient jamais recopiés dans builderDraft : au moindre
     re-render (cocher "circuit", réordonner avec ▲▼...) le nom saisi et la case
     cardio étaient réécrits avec les valeurs périmées du brouillon, donc vidés. */
  const nameField = document.getElementById('builder-name');
  const cardioField = document.getElementById('builder-cardio');
  nameField.value = builderDraft.name;
  cardioField.checked = builderDraft.cardio;
  nameField.oninput = () => { builderDraft.name = nameField.value; };
  cardioField.onchange = () => { builderDraft.cardio = cardioField.checked; };

  const container = document.getElementById('builder-exercises');
  container.innerHTML = '';

  builderDraft.exercises.forEach((ex, idx) => {
    const card = document.createElement('div');
    card.className = 'builder-exercise-card';

    const head = document.createElement('div');
    head.className = 'builder-exercise-head';
    head.innerHTML = `<span class="builder-exercise-num">Exercice ${idx + 1}</span>`;

    const headActions = document.createElement('div');
    headActions.className = 'builder-head-actions';

    const upBtn = document.createElement('button');
    upBtn.className = 'builder-move-btn';
    upBtn.textContent = '▲';
    upBtn.disabled = idx === 0;
    upBtn.onclick = () => moveBuilderExercise(idx, -1);
    headActions.appendChild(upBtn);

    const downBtn = document.createElement('button');
    downBtn.className = 'builder-move-btn';
    downBtn.textContent = '▼';
    downBtn.disabled = idx === builderDraft.exercises.length - 1;
    downBtn.onclick = () => moveBuilderExercise(idx, 1);
    headActions.appendChild(downBtn);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'builder-remove-btn';
    removeBtn.textContent = '✕';
    removeBtn.onclick = () => removeBuilderExercise(idx);
    headActions.appendChild(removeBtn);

    head.appendChild(headActions);
    card.appendChild(head);

    const nameRow = document.createElement('div');
    nameRow.className = 'builder-exercise-row exercise-name-field';
    nameRow.innerHTML = `<span class="mini-label">Nom de l'exercice</span>`;
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.autocomplete = 'off';
    nameInput.autocapitalize = 'sentences';
    nameInput.placeholder = 'ex: Curl biceps (Haltères)';
    nameInput.value = ex.name;
    nameRow.appendChild(nameInput);

    const suggestPanel = document.createElement('div');
    suggestPanel.className = 'suggest-panel';
    suggestPanel.style.display = 'none';
    nameRow.appendChild(suggestPanel);

    const typoHint = document.createElement('div');
    typoHint.className = 'suggest-hint';
    typoHint.style.display = 'none';
    nameRow.appendChild(typoHint);

    function hideSuggestions(){ suggestPanel.style.display = 'none'; }

    function applyExerciseName(name){
      nameInput.value = name;
      builderDraft.exercises[idx].name = name;
      hideSuggestions();
      updateTypoHint();
    }

    function updateTypoHint(){
      const near = findNearExerciseName(nameInput.value);
      if(!near){ typoHint.style.display = 'none'; typoHint.innerHTML = ''; return; }
      typoHint.innerHTML = '';
      const text = document.createElement('span');
      text.textContent = `Proche de « ${near} » — même nom = même courbe de progression.`;
      typoHint.appendChild(text);
      const useBtn = document.createElement('button');
      useBtn.type = 'button';
      useBtn.className = 'suggest-hint-btn';
      useBtn.textContent = 'Utiliser ce nom';
      useBtn.onmousedown = (e) => e.preventDefault();
      useBtn.onclick = () => applyExerciseName(near);
      typoHint.appendChild(useBtn);
      typoHint.style.display = 'flex';
    }

    function refreshSuggestions(){
      const matches = findExerciseMatches(nameInput.value, 8);
      suggestPanel.innerHTML = '';
      if(matches.length === 0){ hideSuggestions(); return; }
      const head = document.createElement('div');
      head.className = 'suggest-head';
      head.textContent = nameInput.value.trim() === '' ? 'Exercices déjà utilisés' : 'Suggestions';
      suggestPanel.appendChild(head);
      matches.forEach(name => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'suggest-item';
        option.textContent = name;
        /* preventDefault sur mousedown : sans ça le blur du champ masquerait le
           panneau avant que le clic n'aboutisse. */
        option.onmousedown = (e) => e.preventDefault();
        option.onclick = () => applyExerciseName(name);
        suggestPanel.appendChild(option);
      });
      suggestPanel.style.display = 'block';
    }

    nameInput.oninput = () => {
      builderDraft.exercises[idx].name = nameInput.value;
      refreshSuggestions();
      updateTypoHint();
    };
    nameInput.onfocus = refreshSuggestions;
    nameInput.onblur = () => setTimeout(hideSuggestions, 180);

    updateTypoHint();
    card.appendChild(nameRow);

    const setsRow = document.createElement('div');
    setsRow.className = 'builder-exercise-row';
    setsRow.innerHTML = `<span class="mini-label">Nombre de séries${ex.isCircuit ? ' (tours)' : ''}</span>`;
    const setsInput = document.createElement('input');
    setsInput.type = 'number';
    setsInput.inputMode = 'numeric';
    setsInput.placeholder = '3';
    setsInput.value = ex.sets;
    setsInput.oninput = () => { builderDraft.exercises[idx].sets = setsInput.value; };
    setsRow.appendChild(setsInput);
    card.appendChild(setsRow);

    const repsRow = document.createElement('div');
    repsRow.className = 'builder-reps-row';

    const repsCorentinRow = document.createElement('div');
    repsCorentinRow.className = 'builder-exercise-row';
    repsCorentinRow.innerHTML = `<span class="mini-label">${ex.isCircuit ? 'Cible Corentin' : 'Reps Corentin'}</span>`;
    const repsCorentinInput = document.createElement('input');
    repsCorentinInput.type = 'text';
    repsCorentinInput.placeholder = ex.isCircuit ? 'ex: 3 tours' : 'ex: 8-10 reps';
    repsCorentinInput.value = ex.repsCorentin;
    repsCorentinInput.oninput = () => { builderDraft.exercises[idx].repsCorentin = repsCorentinInput.value; };
    repsCorentinRow.appendChild(repsCorentinInput);
    repsRow.appendChild(repsCorentinRow);

    const repsLisaRow = document.createElement('div');
    repsLisaRow.className = 'builder-exercise-row';
    repsLisaRow.innerHTML = `<span class="mini-label">${ex.isCircuit ? 'Cible Lisa' : 'Reps Lisa'}</span>`;
    const repsLisaInput = document.createElement('input');
    repsLisaInput.type = 'text';
    repsLisaInput.placeholder = ex.isCircuit ? 'ex: 3 tours' : 'ex: 10-12 reps';
    repsLisaInput.value = ex.repsLisa;
    repsLisaInput.oninput = () => { builderDraft.exercises[idx].repsLisa = repsLisaInput.value; };
    repsLisaRow.appendChild(repsLisaInput);
    repsRow.appendChild(repsLisaRow);

    card.appendChild(repsRow);

    const optionsRow = document.createElement('div');
    optionsRow.className = 'builder-options-row';

    const circuitLabel = document.createElement('label');
    circuitLabel.className = 'builder-checkbox-label';
    const circuitCheckbox = document.createElement('input');
    circuitCheckbox.type = 'checkbox';
    circuitCheckbox.checked = ex.isCircuit;
    circuitCheckbox.onchange = () => {
      builderDraft.exercises[idx].isCircuit = circuitCheckbox.checked;
      renderBuilderForm();
    };
    circuitLabel.appendChild(circuitCheckbox);
    circuitLabel.appendChild(document.createTextNode(' Exercice type circuit (sans poids)'));
    optionsRow.appendChild(circuitLabel);

    card.appendChild(optionsRow);

    /* Méthodes possibles pour cet exercice (Liste B). Coché = plausible pour
       cet exercice ; la première case cochée, dans l'ordre du catalogue,
       fait office de méthode par défaut (voir getExerciseEquipmentId). Une
       seule case cochée = pas de sélecteur affiché à l'usage, méthode fixe.
       Aucune case cochée = ×1 par défaut (exercice à charge déjà totale). */
    if(!ex.isCircuit){
      const equipWrap = document.createElement('div');
      equipWrap.className = 'builder-field';
      equipWrap.innerHTML = `<span class="builder-label">Méthode(s) possibles</span>`;
      const equipOptionsRow = document.createElement('div');
      equipOptionsRow.className = 'builder-options-row';
      EQUIPMENT_METHOD_IDS.forEach(id => {
        const info = equipmentInfo(id);
        const label = document.createElement('label');
        label.className = 'builder-checkbox-label';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = (ex.equipment || []).includes(id);
        checkbox.onchange = () => {
          const current = builderDraft.exercises[idx].equipment || [];
          builderDraft.exercises[idx].equipment = checkbox.checked
            ? EQUIPMENT_METHOD_IDS.filter(m => current.includes(m) || m === id)
            : current.filter(m => m !== id);
        };
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + info.label));
        equipOptionsRow.appendChild(label);
      });
      equipWrap.appendChild(equipOptionsRow);
      card.appendChild(equipWrap);
    }
    container.appendChild(card);
  });
}

function moveBuilderExercise(idx, delta){
  const newIdx = idx + delta;
  if(newIdx < 0 || newIdx >= builderDraft.exercises.length) return;
  const tmp = builderDraft.exercises[idx];
  builderDraft.exercises[idx] = builderDraft.exercises[newIdx];
  builderDraft.exercises[newIdx] = tmp;
  renderBuilderForm();
}

function addBuilderExercise(){
  builderDraft.name = document.getElementById('builder-name').value;
  builderDraft.cardio = document.getElementById('builder-cardio').checked;
  builderDraft.exercises.push(blankBuilderExercise());
  renderBuilderForm();
}
function removeBuilderExercise(idx){
  builderDraft.name = document.getElementById('builder-name').value;
  builderDraft.cardio = document.getElementById('builder-cardio').checked;
  builderDraft.exercises.splice(idx, 1);
  if(builderDraft.exercises.length === 0){
    builderDraft.exercises.push(blankBuilderExercise());
  }
  renderBuilderForm();
}

function saveCustomSession(){
  if(!window.__fb){
    showToast('Connexion au cloud en cours, réessaie dans un instant');
    return;
  }

  const name = document.getElementById('builder-name').value.trim();
  const cardioEnabled = document.getElementById('builder-cardio').checked;

  if(name === ''){
    showToast('Donne un nom à ta séance');
    return;
  }

  const validExercises = builderDraft.exercises
    .filter(ex => ex.name && ex.name.trim() !== '')
    .map(ex => {
      const built = {
        /* canonicalExerciseName : "leg  extension" / "Leg Extension" deviennent le
           même nom, sinon le graphique afficherait deux courbes distinctes. */
        name: canonicalExerciseName(ex.name),
        sets: parseInt(ex.sets, 10) > 0 ? parseInt(ex.sets, 10) : 3,
        target: {
          corentin: ex.repsCorentin && ex.repsCorentin.trim() !== '' ? ex.repsCorentin.trim() : '—',
          lisa: ex.repsLisa && ex.repsLisa.trim() !== '' ? ex.repsLisa.trim() : '—'
        }
      };
      if(ex.isCircuit) built.logType = 'circuit';
      if(!ex.isCircuit && ex.equipment && ex.equipment.length) built.equipment = ex.equipment.slice();
      return built;
    });

  if(validExercises.length === 0){
    showToast('Ajoute au moins un exercice avec un nom');
    return;
  }

  const existing = editingSessionId ? (window.customSessionsCache || []).find(s => s.id === editingSessionId) : null;
  const originalFixed = editingSessionId ? SESSIONS.find(s => s.id === editingSessionId) : null;
  /* Le builder ne saisit que le nom : le sous-titre d'une séance fixe est donc
     repris tel quel plutôt qu'écrasé par « Séance personnalisée ». */
  const title = (existing && existing.title) || (originalFixed && originalFixed.title) || 'Séance personnalisée';
  const session = {
    id: editingSessionId || ('custom_' + Date.now()),
    label: name,
    title: title,
    createdAt: existing ? existing.createdAt : (originalFixed ? 0 : Date.now()),
    exercises: validExercises,
    cardio: cardioEnabled ? { name: 'Tapis incliné Zone 2', targetMinutes: 30 } : null
  };

  const { db, doc, setDoc } = window.__fb;
  const wasEditing = !!editingSessionId;
  setDoc(doc(db, 'customSessions', session.id), session)
    .catch((err) => {
      console.error('Erreur création séance Firestore', err);
      showToast(firestoreErrorMessage(err, "de la création"));
    });
  showToast(wasEditing ? 'Séance mise à jour ✅' : 'Séance créée ✅');
  renderSessionList();
  editingSessionId = null;
  exitBuilder();
}

function askRestoreFixedSession(id){
  const fixed = SESSIONS.find(s => s.id === id);
  if(!fixed) return;
  showConfirm(`Restaurer « ${fixed.label} » dans sa version d'origine ? Tes modifications seront perdues, mais tes archives et ta progression sont conservées.`,
    () => restoreFixedSession(id));
}
function restoreFixedSession(id){
  if(!window.__fb){
    showToast('Connexion au cloud en cours, réessaie dans un instant');
    return;
  }
  const { db, doc, deleteDoc } = window.__fb;
  /* Supprimer la surcharge suffit : la version codée en dur reprend la main. */
  deleteDoc(doc(db, 'customSessions', id))
    .catch((err) => {
      console.error('Erreur restauration séance Firestore', err);
      showToast(firestoreErrorMessage(err, "de la restauration"));
    });
  showToast("Séance d'origine restaurée ↺");
  renderSessionList();
}

function askDeleteCustomSession(id){
  showConfirm('Supprimer définitivement cette séance personnalisée (pour Corentin et Lisa) ?', () => deleteCustomSession(id));
}
function deleteCustomSession(id){
  if(!window.__fb){
    showToast('Connexion au cloud en cours, réessaie dans un instant');
    return;
  }
  const { db, doc, deleteDoc } = window.__fb;
  deleteDoc(doc(db, 'customSessions', id))
    .catch((err) => {
      console.error('Erreur suppression séance Firestore', err);
      showToast(firestoreErrorMessage(err, "de la suppression"));
    });
  showToast('Séance personnalisée supprimée');
}

/* ---------- TOASTS EMPILABLES (131) ----------
   Avant, un message unique était réécrit par le suivant : archiver puis échouer
   la synchro n'affichait que le second. Les messages s'empilent désormais, les
   plus anciens sortant en premier. */
const TOAST_MAX = 3;
function showToast(msg){
  const stack = document.getElementById('toast-stack');
  if(!stack) return;

  /* Un même message répété est relancé plutôt que dupliqué. */
  const existing = Array.prototype.find.call(stack.children, el => el.dataset.msg === msg);
  if(existing){
    clearTimeout(Number(existing.dataset.timer));
    existing.classList.remove('bump'); void existing.offsetWidth; existing.classList.add('bump');
    existing.dataset.timer = String(setTimeout(() => dismissToast(existing), 2600));
    return;
  }

  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  el.dataset.msg = msg;
  stack.appendChild(el);
  void el.offsetWidth;
  el.classList.add('show');
  el.dataset.timer = String(setTimeout(() => dismissToast(el), 2600));

  /* Le retrait du DOM est différé (le temps du fondu), donc une boucle `while`
     sur stack.children ne se terminerait jamais : on calcule d'abord la liste
     des messages encore vivants, puis on évince l'excédent. */
  const alive = Array.prototype.filter.call(stack.children, el => !el.dataset.leaving);
  for(let i = 0; i < alive.length - TOAST_MAX; i++) dismissToast(alive[i]);
}
function dismissToast(el){
  if(!el || el.dataset.leaving) return;
  el.dataset.leaving = '1';
  clearTimeout(Number(el.dataset.timer));
  el.classList.remove('show');
  setTimeout(() => { if(el.parentNode) el.parentNode.removeChild(el); }, 260);
}

/* ---------- AJUSTEMENT DYNAMIQUE DE L'ESPACE SOUS LE CONTENU (fix iPhone) ---------- */
function adjustBottomSpacing(){
  try{
    const activeView = document.querySelector('.view.active');
    const onExercises = activeView && activeView.id === 'view-exercises';
    // La bottom-bar n'existe que sur l'écran exercices : ailleurs, cette réserve
    // de 120px créait un grand vide en bas de page pour rien.
    if(!onExercises){
      document.body.style.paddingBottom = 'calc(24px + env(safe-area-inset-bottom, 0px))';
      return;
    }
    const bar = document.getElementById('bottom-bar');
    if(bar){
      const h = bar.offsetHeight;
      const computed = h + 24;
      // ne jamais descendre sous le minimum de sécurité défini en CSS (120px + safe-area)
      document.body.style.paddingBottom = Math.max(computed, 120) + 'px';
    }
  }catch(e){ /* ignore, le CSS statique sert de filet de sécurité */ }
}
window.addEventListener('resize', adjustBottomSpacing);
window.addEventListener('orientationchange', () => setTimeout(adjustBottomSpacing, 200));
window.addEventListener('load', adjustBottomSpacing);

/* ---------- INIT ---------- */
render();
adjustBottomSpacing();
setTimeout(adjustBottomSpacing, 300); // sécurité si les polices/safe-area se stabilisent après le premier rendu

;

  /* Service worker (17/09/26) : shell hors-ligne, voir sw.js pour le détail.
     Chemin ET scope volontairement relatifs ('sw.js', './') plutôt
     qu'absolus ('/Muscu/sw.js') — ça marche pareil que ce soit servi à la
     racine d'un domaine perso ou sous /PORTAIL-DUO/Muscu/ sur une page
     GitHub Pages de projet, sans rien à ajuster ici si le chemin change. */
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
