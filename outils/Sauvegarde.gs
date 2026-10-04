/* ==========================================================================
   Sauvegarde.gs — SAUVEGARDE MANUELLE PAR MAIL de Budget et Muscu (04/10/2026)
   --------------------------------------------------------------------------
   À coller dans le projet Google Apps Script « Projet sans titre » (celui des sauvegardes
   et du relais), dans un NOUVEAU fichier nommé Sauvegarde. Copie de référence versionnée
   dans le dépôt : /outils/Sauvegarde.gs (aucun secret dedans).

   Rôle : les boutons « ✉️ Envoyer fichier .json par mail » de Budget et Muscu envoient leurs
   données au RELAIS (même URL que les notifications, window.RELAIS_DUO de commun.js) avec
   action:'sauvegarde'. Le doPost de Notifications.gs aiguille ici. On vérifie que la demande
   vient bien du compte du duo (jeton Firebase), puis on envoie le fichier .json en pièce
   jointe au propriétaire du script.

   Pourquoi (audit de sécurité du 04/10/2026) : l'ancien doPost des sauvegardes acceptait
   n'importe quel envoi SANS jeton, depuis une URL publique (écrite dans le dépôt). N'importe
   qui pouvait t'envoyer un faux « Sauvegarde Budget » (indiscernable d'un vrai : même
   expéditeur, même objet), qu'une restauration aurait réécrit dans Firestore, ou épuiser le
   quota de mails du compte (et faire échouer la sauvegarde du dimanche sans alerte).

   MISE EN PLACE (une fois) :
   1. Coller ce fichier (nouveau fichier « Sauvegarde ») et la nouvelle version de
      Notifications.gs.
   2. SUPPRIMER la fonction doPost de l'ancien fichier des sauvegardes (celui qui contient
      sauvegardeHebdomadaireBudget). Ne pas toucher au reste : le déclencheur du dimanche
      continue de fonctionner.
   3. Déployer › Gérer les déploiements › déploiement du RELAIS (URL en …AKfycbzAXl…) ›
      crayon › Version : « Nouvelle version » › Déployer.
   4. Dans la même liste, ARCHIVER l'ancien déploiement des sauvegardes (URL en
      …AKfycbwW3w…) : tant qu'il existe, il reste appelable avec son ancien code, sans jeton.
   5. Tester depuis Budget puis Muscu (Réglages › ✉️ Envoyer fichier .json par mail) :
      l'app affiche maintenant le vrai résultat (✅ ou le message d'erreur du relais).

   Toutes les fonctions et constantes sont préfixées sauvegarde / SAUVEGARDE_ pour ne pas
   entrer en collision avec le code des sauvegardes du dimanche (même espace de noms).
   ========================================================================== */

var SAUVEGARDE_CFG = {
  apps: {
    budget: { objet: '📥 Sauvegarde Manuelle - Budget', fichier: 'Sauvegarde_Budget_' },
    muscu:  { objet: '📥 Sauvegarde Manuelle - Muscu',  fichier: 'Sauvegarde_Muscu_' }
  },
  maxParHeure: 6,                       // garde-fou : protège le quota quotidien de mails du compte
  maxOctets: 15 * 1024 * 1024           // pièce jointe (MailApp accepte 25 Mo au total)
};

/* Appelé par doPost (Notifications.gs) quand q.action === 'sauvegarde'. */
function sauvegardeTraiter_(q) {
  notifVerifierJeton_(q.idToken);       // compte du duo exigé (Notifications.gs)
  notifCompter_('sauvegarde-heure-' + Math.floor(Date.now() / 3600000), SAUVEGARDE_CFG.maxParHeure, 3700);

  var app = SAUVEGARDE_CFG.apps[q.app];
  if (!app) throw new Error('application inconnue');
  var d = q.donnees;
  if (q.app === 'budget' && !(Array.isArray(d) && d.length)) throw new Error('sauvegarde Budget vide');
  if (q.app === 'muscu' && !(d && typeof d === 'object' && d.archives)) throw new Error('sauvegarde Muscu vide');

  var json = JSON.stringify(d, null, 2);
  if (json.length > SAUVEGARDE_CFG.maxOctets) throw new Error('sauvegarde trop volumineuse');

  var horodatage = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Paris', "yyyy-MM-dd_HH'h'mm");
  var pj = Utilities.newBlob(json, 'application/json', app.fichier + horodatage + '.json');
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),   // propriétaire du script : aucune adresse dans le code
    subject: app.objet,
    body: 'Sauvegarde demandée depuis l\'app (' + q.app + ') le '
      + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Paris', 'dd/MM/yyyy à HH:mm')
      + '.\nFichier en pièce jointe, réimportable tel quel.',
    attachments: [pj]
  });
  return { ok: true };
}
