/* ==========================================================================
   Notifications.gs — RELAIS DES NOTIFICATIONS de PORTAIL-DUO (30/09/2026)
   --------------------------------------------------------------------------
   À coller dans le projet Google Apps Script des sauvegardes (« Projet sans titre »),
   dans un NOUVEAU fichier nommé Notifications. Copie de référence versionnée dans le
   dépôt : /outils/Notifications.gs (aucun secret dedans).

   Rôle : recevoir une demande d'une app (Budget, Course…), vérifier qu'elle vient bien
   du compte du duo, puis envoyer la notification aux téléphones abonnés de L'AUTRE
   profil (Corentin ↔ Lisa) via Firebase Cloud Messaging.

   CLÉ : réutilise la propriété de script SA_BUDGET (clé du compte de service de
   course-app-36e9d, déjà là pour les sauvegardes). Rien d'autre à configurer.

   DÉPLOIEMENT (une fois) : Déployer › Nouveau déploiement › type « Application Web »,
   « Exécuter en tant que : moi », « Qui a accès : tout le monde ». L'URL …/exec obtenue
   va dans RELAIS_NOTIF (commun.js, section 7).
   ⚠️ Après toute modification de ce fichier : Déployer › Gérer les déploiements ›
   crayon › Version : « Nouvelle version » › Déployer (l'URL reste la même).

   TESTS depuis l'éditeur (menu déroulant des fonctions, puis Exécuter) :
   - notifTester : envoie « Test » à TOUS les téléphones abonnés (sans vérification).
   - notifListerAbonnes : affiche les téléphones abonnés dans le journal.

   Toutes les fonctions et constantes sont préfixées notif / NOTIF_ pour ne jamais
   entrer en collision avec le code des sauvegardes (même espace de noms dans un projet).
   ========================================================================== */

var NOTIF_CFG = {
  projet: 'course-app-36e9d',
  uidDuo: '4WmOzFC9U0a77LcM00xc9kaz4fh2',               // compte du duo (même UID que firestore.rules)
  cleWeb: 'AIzaSyCc12HZotF_AmmPHvSr0eXBYWOLSnBOONw',     // clé WEB Firebase (publique, déjà dans le code des apps)
  proprieteCle: 'SA_BUDGET',                            // clé du compte de service (propriétés du script)
  collection: 'notifAbonnes',
  profils: ['corentin', 'lisa'],
  maxParMinute: 20                                      // garde-fou : au-delà, les demandes sont refusées
};

/* ---------- Points d'entrée de l'application Web ---------- */
function doGet(e) {
  /* Retour de Strava après « Autoriser » (Strava.gs, connexion faite une seule fois). */
  if (e && e.parameter && (e.parameter.code || e.parameter.error) && typeof stravaRetour_ === 'function') return stravaRetour_(e);
  return notifJson_({ ok: true, service: 'Relais des notifications PORTAIL-DUO' });
}

function doPost(e) {
  try {
    var q = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    /* Bouton ❤️ de Muscu (30/09/2026) : FC et calories de la séance, lues sur Strava (Strava.gs). */
    if (q.action === 'strava') return notifJson_(stravaTraiter_(q));
    notifVerifierJeton_(q.idToken);
    notifLimiter_();
    var msg = notifNettoyer_(q);
    var abonnes = notifLireAbonnes_().filter(function (a) { return a.profil !== msg.profil; });
    var bilan = notifEnvoyerA_(abonnes, msg);
    return notifJson_({ ok: true, envoyes: bilan.envoyes, retires: bilan.retires });
  } catch (err) {
    console.warn('Notification refusée : ' + (err && err.message));
    return notifJson_({ ok: false, erreur: String((err && err.message) || err) });
  }
}

/* ---------- Tests manuels ---------- */
function notifTester() {
  var abonnes = notifLireAbonnes_();
  var bilan = notifEnvoyerA_(abonnes, { titre: 'Test du Portail', corps: 'Les notifications fonctionnent 🎉', url: './', tag: 'test', profil: '' });
  console.log(abonnes.length + ' téléphone(s) abonné(s) — envoyés : ' + bilan.envoyes + ', abonnements périmés retirés : ' + bilan.retires);
}
function notifListerAbonnes() {
  notifLireAbonnes_().forEach(function (a) {
    console.log(a.id + ' · ' + a.profil + ' · ' + a.appareil + ' · mis à jour le ' + new Date(a.maj).toLocaleString('fr-FR'));
  });
}

/* ---------- Vérifications ---------- */
/* Le jeton Firebase (ID token) de la session est vérifié par Firebase lui-même (accounts:lookup) :
   invalide, expiré ou d'un autre compte → refus. Apps Script ne sait pas vérifier une signature
   RSA seul ; ce contrôle par l'API fait foi. */
function notifVerifierJeton_(idToken) {
  if (typeof idToken !== 'string' || idToken.length < 100) throw new Error('jeton absent');
  var rep = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + NOTIF_CFG.cleWeb, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
  });
  var r = JSON.parse(rep.getContentText() || '{}');
  var u = r.users && r.users[0];
  if (rep.getResponseCode() !== 200 || !u || u.localId !== NOTIF_CFG.uidDuo) throw new Error('jeton refusé');
}
function notifLimiter_() {
  var cache = CacheService.getScriptCache();
  var cle = 'notif-minute-' + Math.floor(Date.now() / 60000);
  var n = Number(cache.get(cle) || 0) + 1;
  cache.put(cle, String(n), 120);
  if (n > NOTIF_CFG.maxParMinute) throw new Error('trop de demandes');
}
/* Rien de ce qui arrive n'est utilisé tel quel : longueurs bornées, lien limité aux apps du site. */
function notifNettoyer_(q) {
  var texte = function (x, max) { return (typeof x === 'string' ? x : '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); };
  var titre = texte(q.titre, 60);
  if (!titre) throw new Error('titre absent');
  var url = /^\.\/((Budget|Course|Muscu)\/)?$/.test(q.url) ? q.url : './';
  var tag = /^[a-z0-9-]{1,40}$/.test(q.tag || '') ? q.tag : '';
  var profil = NOTIF_CFG.profils.indexOf(q.profil) >= 0 ? q.profil : '';
  return { titre: titre, corps: texte(q.corps, 180), url: url, tag: tag, profil: profil };
}

/* ---------- Firestore (lecture des abonnés, retrait des périmés) ---------- */
function notifBaseUrl_() {
  return 'https://firestore.googleapis.com/v1/projects/' + NOTIF_CFG.projet + '/databases/(default)/documents/' + NOTIF_CFG.collection;
}
function notifLireAbonnes_() {
  var rep = UrlFetchApp.fetch(notifBaseUrl_() + '?pageSize=100', {
    headers: { Authorization: 'Bearer ' + notifJetonAcces_() }, muteHttpExceptions: true
  });
  if (rep.getResponseCode() !== 200) throw new Error('lecture des abonnés impossible (' + rep.getResponseCode() + ')');
  var docs = JSON.parse(rep.getContentText()).documents || [];
  return docs.map(function (d) {
    var f = d.fields || {};
    var s = function (k) { return f[k] && typeof f[k].stringValue === 'string' ? f[k].stringValue : ''; };
    var n = function (k) { return f[k] ? Number(f[k].integerValue || f[k].doubleValue || 0) : 0; };
    return { id: d.name.split('/').pop(), token: s('token'), profil: s('profil'), appareil: s('appareil'), maj: n('maj') };
  }).filter(function (a) { return a.token; });
}
function notifRetirerAbonne_(id) {
  UrlFetchApp.fetch(notifBaseUrl_() + '/' + encodeURIComponent(id), {
    method: 'delete', headers: { Authorization: 'Bearer ' + notifJetonAcces_() }, muteHttpExceptions: true
  });
}

/* ---------- Firebase Cloud Messaging ---------- */
/* Message « data » seulement : c'est le service worker du Portail (sw.js, racine) qui l'affiche. */
function notifEnvoyerA_(abonnes, msg) {
  var bilan = { envoyes: 0, retires: 0 };
  if (!abonnes.length) return bilan;
  var jeton = notifJetonAcces_();
  var requetes = abonnes.map(function (a) {
    return {
      url: 'https://fcm.googleapis.com/v1/projects/' + NOTIF_CFG.projet + '/messages:send',
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + jeton },
      payload: JSON.stringify({ message: {
        token: a.token,
        data: { titre: msg.titre, corps: msg.corps, url: msg.url, tag: msg.tag },
        webpush: { headers: { Urgency: 'high', TTL: '86400' } }
      } })
    };
  });
  var reponses = UrlFetchApp.fetchAll(requetes);
  reponses.forEach(function (rep, i) {
    var code = rep.getResponseCode();
    if (code === 200) { bilan.envoyes++; return; }
    var corps = rep.getContentText();
    /* Jeton périmé (appli désinstallée, notifications coupées, jeton renouvelé) : abonnement retiré. */
    if (code === 404 || /UNREGISTERED|registration token is not a valid/i.test(corps)) {
      notifRetirerAbonne_(abonnes[i].id); bilan.retires++;
    } else {
      console.warn('FCM ' + code + ' pour ' + abonnes[i].id + ' : ' + corps.slice(0, 300));
    }
  });
  return bilan;
}

/* ---------- Jeton d'accès du compte de service (JWT signé, gardé 50 min) ---------- */
function notifJetonAcces_() {
  var cache = CacheService.getScriptCache();
  var enCache = cache.get('notif-jeton-acces');
  if (enCache) return enCache;
  var brut = PropertiesService.getScriptProperties().getProperty(NOTIF_CFG.proprieteCle);
  if (!brut) throw new Error('propriété ' + NOTIF_CFG.proprieteCle + ' absente');
  var cle = JSON.parse(brut);
  var b64 = function (o) { return Utilities.base64EncodeWebSafe(typeof o === 'string' ? o : JSON.stringify(o)).replace(/=+$/, ''); };
  var maintenant = Math.floor(Date.now() / 1000);
  var entete = b64({ alg: 'RS256', typ: 'JWT' });
  var charge = b64({
    iss: cle.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: maintenant, exp: maintenant + 3600
  });
  var signature = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(entete + '.' + charge, cle.private_key)).replace(/=+$/, '');
  var rep = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post', muteHttpExceptions: true,
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: entete + '.' + charge + '.' + signature }
  });
  var r = JSON.parse(rep.getContentText() || '{}');
  if (!r.access_token) throw new Error('jeton du compte de service refusé : ' + rep.getContentText().slice(0, 200));
  cache.put('notif-jeton-acces', r.access_token, 3000);
  return r.access_token;
}

function notifJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
