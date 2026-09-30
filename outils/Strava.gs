/* ==========================================================================
   Strava.gs — FC ET CALORIES DE LA MONTRE DE LISA (Suunto → Strava) POUR MUSCU (30/09/2026)
   --------------------------------------------------------------------------
   À coller dans le projet Google Apps Script du relais (« Projet sans titre »), dans un
   NOUVEAU fichier nommé Strava, à côté de Notifications. Copie de référence versionnée :
   /outils/Strava.gs (aucun secret dedans).

   Rôle : le bouton ❤️ d'une archive de Muscu envoie { action:'strava', idToken, archive } au
   relais (doPost de Notifications.gs, qui aiguille ici). Le relais vérifie le jeton du duo,
   lit l'archive dans Firestore, cherche sur Strava la séance de Lisa qui correspond (heure
   de la séance ou, pour une archive sans chrono, heure d'archivage), puis écrit le champ
   `montre` de l'archive : { fcMoy, fcMax, kcal, source:'Strava', activite, debut, dureeSec, stravaId }.

   PROPRIÉTÉS DU SCRIPT (Paramètres du projet › Propriétés du script) :
   - STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET : de l'application API créée PAR LISA sur
     strava.com/settings/api (« Domaine du rappel d'autorisation » : script.google.com).
   - STRAVA_REFRESH, STRAVA_ETAT, STRAVA_ATHLETE : écrites par le script lui-même.
   - SA_BUDGET : clé du compte de service (déjà là, partagée avec Notifications).

   CONNEXION À STRAVA (une fois) :
   1. Exécuter stravaLienConnexion dans l'éditeur → le journal affiche un lien.
   2. Lisa ouvre ce lien sur son téléphone (connectée à Strava) › Autoriser.
   3. La page « ✅ Strava connecté » s'affiche : c'est fini. Vérifier avec stravaTester.

   ⚠️ Après toute modification : Déployer › Gérer les déploiements › crayon › Version :
   « Nouvelle version » › Déployer (l'URL …/exec reste la même).

   Fonctions et constantes préfixées strava / STRAVA_ : aucune collision avec le reste du projet.
   ========================================================================== */

var STRAVA_CFG = {
  collection: 'archives',
  profil: 'lisa',                       // seules les archives de ce profil sont servies (compte Strava de Lisa)
  dureeEstimeeMin: 50,                  // archive sans chrono : séance supposée finie à l'archivage, 50 min avant
  margeRechercheH: 4                    // fenêtre de recherche Strava autour de la séance
};

/* ---------- Aiguillage (appelé par doPost / doGet de Notifications.gs) ---------- */
function stravaTraiter_(q) {
  notifVerifierJeton_(q.idToken);
  notifLimiter_();
  var id = String(q.archive || '');
  if (!/^arc_[A-Za-z0-9_]{1,60}$/.test(id)) throw new Error('archive invalide');
  var arc = stravaLireArchive_(id);
  if (arc.profil !== STRAVA_CFG.profil) return { ok: false, code: 'profil', erreur: 'Strava n’est relié que pour Lisa' };

  var ref = stravaFenetre_(arc);
  var marge = STRAVA_CFG.margeRechercheH * 3600 * 1000;
  var activites = stravaApi_('/athlete/activities?per_page=50'
    + '&after=' + Math.floor((ref.debut - marge) / 1000)
    + '&before=' + Math.ceil((ref.fin + marge) / 1000));
  var choisie = stravaChoisir_(activites, ref);
  if (!choisie) return { ok: false, code: 'absente', erreur: 'Aucune séance Strava autour de cette heure' };

  var d = stravaApi_('/activities/' + choisie.id);
  var montre = {
    fcMoy: d.has_heartrate ? Math.round(d.average_heartrate || 0) : 0,
    fcMax: d.has_heartrate ? Math.round(d.max_heartrate || 0) : 0,
    kcal: Math.round(d.calories || 0),
    source: 'Strava',
    activite: String(d.name || d.sport_type || '').slice(0, 80),
    debut: Date.parse(d.start_date) || 0,
    dureeSec: Math.round(d.elapsed_time || 0),
    stravaId: String(d.id)
  };
  stravaEcrireMontre_(id, montre);
  return { ok: true, montre: montre };
}

/* Fenêtre de la séance côté Muscu : chrono (GO) si présent, sinon 50 min avant l'archivage. */
function stravaFenetre_(arc) {
  if (arc.startedAt && arc.durationSec > 0) return { debut: arc.startedAt, fin: arc.startedAt + arc.durationSec * 1000, estimee: false };
  return { debut: arc.createdAt - STRAVA_CFG.dureeEstimeeMin * 60000, fin: arc.createdAt, estimee: true };
}

/* La séance Strava qui chevauche le plus la fenêtre ; à défaut (archivage tardif), celle
   qui s'est terminée le plus près AVANT la fin de la fenêtre, à moins de 3 h. */
function stravaChoisir_(activites, ref) {
  var meilleure = null, meilleurChev = 0, plusProche = null, ecartMin = 3 * 3600 * 1000;
  (activites || []).forEach(function (a) {
    var debut = Date.parse(a.start_date);
    if (!debut) return;
    var fin = debut + (a.elapsed_time || 0) * 1000;
    var chev = Math.min(fin, ref.fin) - Math.max(debut, ref.debut);
    if (chev > meilleurChev) { meilleurChev = chev; meilleure = a; }
    var ecart = ref.fin - fin;
    if (ecart >= 0 && ecart < ecartMin) { ecartMin = ecart; plusProche = a; }
  });
  return meilleure || plusProche;
}

/* ---------- Firestore (compte de service, via notifJetonAcces_ de Notifications.gs) ---------- */
function stravaUrlArchive_(id) {
  return 'https://firestore.googleapis.com/v1/projects/' + NOTIF_CFG.projet + '/databases/(default)/documents/'
    + STRAVA_CFG.collection + '/' + encodeURIComponent(id);
}
function stravaLireArchive_(id) {
  var rep = UrlFetchApp.fetch(stravaUrlArchive_(id), { headers: { Authorization: 'Bearer ' + notifJetonAcces_() }, muteHttpExceptions: true });
  if (rep.getResponseCode() === 404) throw new Error('archive introuvable');
  if (rep.getResponseCode() !== 200) throw new Error('lecture de l’archive impossible (' + rep.getResponseCode() + ')');
  var f = JSON.parse(rep.getContentText()).fields || {};
  var n = function (k) { return f[k] ? Number(f[k].integerValue || f[k].doubleValue || 0) : 0; };
  return { profil: f.profile ? f.profile.stringValue : '', createdAt: n('createdAt'), startedAt: n('startedAt'), durationSec: n('durationSec') };
}
/* PATCH du seul champ `montre`, archive obligatoirement existante (jamais d'archive fantôme). */
function stravaEcrireMontre_(id, m) {
  var entier = function (x) { return { integerValue: String(Math.round(x || 0)) }; };
  var texte = function (x) { return { stringValue: String(x || '') }; };
  var corps = { fields: { montre: { mapValue: { fields: {
    fcMoy: entier(m.fcMoy), fcMax: entier(m.fcMax), kcal: entier(m.kcal), debut: entier(m.debut), dureeSec: entier(m.dureeSec),
    source: texte(m.source), activite: texte(m.activite), stravaId: texte(m.stravaId), importeLe: entier(Date.now())
  } } } } };
  var rep = UrlFetchApp.fetch(stravaUrlArchive_(id) + '?updateMask.fieldPaths=montre&currentDocument.exists=true', {
    method: 'patch', contentType: 'application/json', payload: JSON.stringify(corps),
    headers: { Authorization: 'Bearer ' + notifJetonAcces_() }, muteHttpExceptions: true
  });
  if (rep.getResponseCode() !== 200) throw new Error('écriture impossible (' + rep.getResponseCode() + ') ' + rep.getContentText().slice(0, 200));
}

/* ---------- Strava : jeton d'accès (6 h, renouvelé avec le refresh token) ---------- */
function stravaProps_() { return PropertiesService.getScriptProperties(); }
function stravaJeton_() {
  var cache = CacheService.getScriptCache();
  var enCache = cache.get('strava-jeton');
  if (enCache) return enCache;
  var p = stravaProps_();
  var refresh = p.getProperty('STRAVA_REFRESH');
  if (!refresh) throw new Error('Strava pas encore connecté (exécuter stravaLienConnexion)');
  var r = stravaEchangerJeton_({ grant_type: 'refresh_token', refresh_token: refresh });
  if (r.refresh_token && r.refresh_token !== refresh) p.setProperty('STRAVA_REFRESH', r.refresh_token);
  var duree = Math.max(60, Math.min(21600, (r.expires_at || 0) - Math.floor(Date.now() / 1000) - 300));
  cache.put('strava-jeton', r.access_token, duree);
  return r.access_token;
}
function stravaEchangerJeton_(params) {
  var p = stravaProps_();
  params.client_id = p.getProperty('STRAVA_CLIENT_ID');
  params.client_secret = p.getProperty('STRAVA_CLIENT_SECRET');
  if (!params.client_id || !params.client_secret) throw new Error('STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET absents des propriétés du script');
  var rep = UrlFetchApp.fetch('https://www.strava.com/oauth/token', { method: 'post', payload: params, muteHttpExceptions: true });
  var r = JSON.parse(rep.getContentText() || '{}');
  if (rep.getResponseCode() !== 200 || !r.access_token) throw new Error('Strava a refusé le jeton : ' + rep.getContentText().slice(0, 200));
  return r;
}
function stravaApi_(chemin) {
  var rep = UrlFetchApp.fetch('https://www.strava.com/api/v3' + chemin, { headers: { Authorization: 'Bearer ' + stravaJeton_() }, muteHttpExceptions: true });
  if (rep.getResponseCode() === 401) { CacheService.getScriptCache().remove('strava-jeton'); throw new Error('Strava : autorisation refusée (reconnecter avec stravaLienConnexion)'); }
  if (rep.getResponseCode() === 429) throw new Error('Strava : trop de demandes, réessaie dans 15 min');
  if (rep.getResponseCode() !== 200) throw new Error('Strava ' + rep.getResponseCode() + ' : ' + rep.getContentText().slice(0, 200));
  return JSON.parse(rep.getContentText());
}

/* ---------- Connexion (une fois) ---------- */
function stravaLienConnexion() {
  var p = stravaProps_();
  var etat = Utilities.getUuid();
  p.setProperty('STRAVA_ETAT', etat);
  var lien = 'https://www.strava.com/oauth/authorize?client_id=' + encodeURIComponent(p.getProperty('STRAVA_CLIENT_ID') || '')
    + '&response_type=code&approval_prompt=force&scope=' + encodeURIComponent('read,activity:read_all')
    + '&redirect_uri=' + encodeURIComponent(ScriptApp.getService().getUrl())
    + '&state=' + etat;
  console.log('Lien à ouvrir par Lisa (connectée à Strava) :\n' + lien);
}
/* Retour de Strava après « Autoriser » : l'état doit correspondre au dernier lien généré. */
function stravaRetour_(e) {
  var prm = (e && e.parameter) || {};
  var p = stravaProps_();
  var page = function (titre, texte) {
    return HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<div style="font:17px -apple-system,sans-serif;padding:40px 24px;text-align:center"><h2>' + titre + '</h2><p>' + texte + '</p></div>');
  };
  if (prm.error) return page('❌ Autorisation refusée', 'Relance le lien et touche « Autoriser ».');
  if (!prm.state || prm.state !== p.getProperty('STRAVA_ETAT')) return page('❌ Lien périmé', 'Génère un nouveau lien avec stravaLienConnexion.');
  if (!/activity:read_all/.test(prm.scope || '')) return page('❌ Accès incomplet', 'Laisse cochée la case « Voir les données de vos activités privées ».');
  var r = stravaEchangerJeton_({ grant_type: 'authorization_code', code: prm.code });
  p.setProperty('STRAVA_REFRESH', r.refresh_token);
  p.deleteProperty('STRAVA_ETAT');
  var nom = r.athlete ? ((r.athlete.firstname || '') + ' ' + (r.athlete.lastname || '')).trim() : '';
  p.setProperty('STRAVA_ATHLETE', nom);
  CacheService.getScriptCache().put('strava-jeton', r.access_token, 3600);
  return page('✅ Strava connecté', (nom ? nom + ' — ' : '') + 'Muscu peut maintenant récupérer la FC et les calories de tes séances. Tu peux fermer cette page.');
}

/* ---------- Test depuis l'éditeur ---------- */
function stravaTester() {
  var p = stravaProps_();
  console.log('Compte Strava relié : ' + (p.getProperty('STRAVA_ATHLETE') || '(aucun)'));
  stravaApi_('/athlete/activities?per_page=5').forEach(function (a) {
    console.log(new Date(a.start_date).toLocaleString('fr-FR') + ' · ' + a.name + ' · ' + Math.round(a.elapsed_time / 60) + ' min · FC moy '
      + (a.average_heartrate || '—') + ' · max ' + (a.max_heartrate || '—'));
  });
}
