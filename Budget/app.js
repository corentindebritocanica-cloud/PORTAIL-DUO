/* app.js — code de l'app.
   Extrait des anciens <script> inline de index.html le 20/09/2026 (contenu inchangé,
   sauf la constante DERNIERE_MAJ, qui reste dans index.html : voir README). */
        // Firebase compat — scripts chargés en <head>
        // 29/09/2026 : projet Firebase UNIQUE des 4 apps (course-app-36e9d). Avant : projet dédié
        // `lisa-et-corentin`, gardé en lecture seule comme archive. Collections `mois` et `config`
        // copiées à l'identique ; règles réservées au compte e-mail du duo (voir /firestore.rules).
        const firebaseConfig = {
            apiKey: "AIzaSyCc12HZotF_AmmPHvSr0eXBYWOLSnBOONw",
            authDomain: "course-app-36e9d.firebaseapp.com",
            projectId: "course-app-36e9d",
            storageBucket: "course-app-36e9d.firebasestorage.app",
            messagingSenderId: "55041357024",
            appId: "1:55041357024:web:48ee2d71b97dc15c55cc85"
        };

        firebase.initializeApp(firebaseConfig);
        let db, auth;
        // Cache Firestore persistant (remplace enablePersistence, déprécié) : import dynamique
        // pour rester compatible avec le SDK compat (pas de passage en type="module").
        // Tant que dbReady n'est pas résolue, db/auth restent undefined — voir plus bas
        // où le tout premier authListen(...) attend cette promesse avant de démarrer l'app.
        const dbReady = (async () => {
          try {
            const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } =
              await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
            initializeFirestore(firebase.app(), {
              localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
            });
          } catch (err) {
            console.warn('Cache Firestore persistant indisponible, repli sur le cache mémoire :', err);
          }
          db = firebase.firestore();
          auth = firebase.auth();

          // Persistance LOCAL : reste connecté entre les ouvertures de l'app (survit à la fermeture de Safari/PWA)
          // Limite connue Safari iOS : l'ITP peut purger ce stockage après plusieurs jours d'inactivité — comportement du navigateur, pas un bug corrigeable côté code.
          auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
        })();

        // Wrappers Firestore — 1 document par mois dans la collection "mois", config dans "config/global"
        const clean       = (obj)        => JSON.parse(JSON.stringify(obj)); // retire toute valeur undefined (refusée par Firestore)
        const colMois     = ()           => db.collection('mois');
        const refMois     = (id)         => db.collection('mois').doc(String(id));
        const refConfig   = ()           => db.collection('config').doc('global');
        let unsubMois   = null;
        let unsubConfig = null;
        const authListen  = (cb)         => auth.onAuthStateChanged(cb);
        const authLogin   = (email, pass)=> auth.signInWithEmailAndPassword(email, pass);

        // --- Configuration ---
        const LS_DARK = 'budgetLC_dark';
        const LS_CACHE = 'budgetLC_cache';
        const NOMS_MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
        const REGEX_SUPERMARCHE = /leclerc|carrefour|auchan|intermarch|super\s*u|lidl|aldi|frais|cora|casino|netto/i;


        // --- État de l'application ---
        const state = {
            donnees: [],
            categories: ["🏠 Loyer", "⚡ Électricité", "💧 Eau", "🛡️ Assurance", "🌐 Internet", "🛒 Courses", "🍽️ Restaurant", "🎬 Loisirs", "🏥 Santé", "✈️ Vacances", "🛠️ Travaux", "❓ Autre"],
            corbeille: [],
            objectifsProvisions: [],
            moisActifId: null,
            termeRecherche: "",
            anneesOuvertes: new Set(),
            suppressionEnAttente: null,
            toastTimeout: null,
            firstLoad: true,
            vueActuelle: 'mensuelle',
            // Nouveautés (pop-up) : voir gererNouveautes()
            reference: null,        // dernier état « vu » sur cet appareil
            serveurVu: false,       // un snapshot serveur (hors cache local) a-t-il été reçu ?
            fenetreVerif: true,     // comparer au prochain snapshot serveur (ouverture / retour au premier plan)
            popupOuvert: false
        };

        // Suivi du glisser tactile sur le chiffre "espèces" (mode Mixte, voir setupTableListeners) —
        // volontairement hors de `state` : purement transitoire, jamais persisté ni comparé aux Nouveautés.
        let mixteDragId = null, mixteDragStartY = 0, mixteDragStartVal = 0, mixteDragLive = null;

        // --- Utilitaires ---
        const arr2 = (n) => Math.round((parseFloat(n) || 0) * 100) / 100 + 0; // audit 08-02 : pas de « -0,00 € » par dérive flottante
        const eur = (n) => arr2(n).toFixed(2) + " €";
        const genId = () => Math.random().toString(36).substr(2, 9);
        const sansAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        
        const somme = (arr) => (arr || []).reduce((s, i) => s + (parseFloat(i.montant) || 0), 0);
        // Part Revolut (carte) d'une liste de dépenses : CB = tout, MIXTE = montant - part espèces, ESPECES/TR = rien.
        const sommeCB = (arr) => (arr || []).reduce((s, i) => {
            const meth = i.moyenPaiement || 'CB';
            if (meth === 'CB') return s + (parseFloat(i.montant) || 0);
            if (meth === 'MIXTE') return s + Math.max((parseFloat(i.montant) || 0) - (parseFloat(i.montantEspeces) || 0), 0);
            return s; // ESPECES, TR (legacy, laissée à part comme avant)
        }, 0);
        // Part Espèces d'une liste de dépenses : ESPECES = tout, MIXTE = part espèces saisie, CB/TR = rien.
        const sommeEspeces = (arr) => (arr || []).reduce((s, i) => {
            const meth = i.moyenPaiement || 'CB';
            if (meth === 'ESPECES') return s + (parseFloat(i.montant) || 0);
            if (meth === 'MIXTE') return s + Math.min(Math.max(parseFloat(i.montantEspeces) || 0, 0), Math.max(parseFloat(i.montant) || 0, 0)); // audit 09-02 : bornée au montant
            return s; // CB, TR (legacy, laissée à part comme avant)
        }, 0);

        const normaliserMois = (m) => ({
            ...(({ epargne, ...reste }) => reste)(m), // le champ « epargne » (carte Projets / Épargne) n'existe plus : on l'écarte, même s'il vient d'une ancienne sauvegarde .json
            charges: Array.isArray(m.charges) ? m.charges : (m.charges ? Object.values(m.charges) : []),
            depenses: Array.isArray(m.depenses) ? m.depenses : (m.depenses ? Object.values(m.depenses) : []),
            provisions: Array.isArray(m.provisions) ? m.provisions : (m.provisions ? Object.values(m.provisions) : []),
            fixes: Array.isArray(m.fixes) ? m.fixes : (m.fixes ? Object.values(m.fixes) : []), 
            revenus_add: m.revenus_add || 0,
            especes_add: m.especes_add || 0, // apport d'espèces du mois (report cumulatif séparé, voir calculerSoldeReporteEspeces)
            annee: m.annee || parseInt(m.nom.split(' ')[1])
        });

        // 04/10/2026 (audit) : contrôle d'un fichier .json AVANT la restauration (qui remplace toute la
        // collection « mois »). Avant : seul « tableau + nom texte » était vérifié — un mois sans id
        // s'écrivait dans mois/undefined (plusieurs mois écrasant le même document), un id « a/b/c »
        // créait une sous-collection, un montant texte restait texte. Lève une erreur au moindre écart.
        // Identifiants réels observés : 9 caractères base 36, ou horodatage avec décimales (« 1772714252130.8916 »).
        const ID_IMPORT = /^[A-Za-z0-9._-]{1,40}$/;
        const LISTES_MOIS = ['charges', 'depenses', 'provisions', 'fixes'];
        const validerImport = (imported) => {
            if (!Array.isArray(imported) || !imported.length || imported.length > 600) throw new Error('fichier : tableau de mois attendu');
            const vus = new Set();
            return imported.map((m) => {
                if (!m || typeof m !== 'object' || Array.isArray(m)) throw new Error('mois invalide');
                const id = (typeof m.id === 'string' || typeof m.id === 'number') ? String(m.id) : '';
                if (!ID_IMPORT.test(id) || id === '.' || id === '..' || vus.has(id)) throw new Error('identifiant de mois invalide : ' + id);
                vus.add(id);
                const [nomMois, anneeTxt] = typeof m.nom === 'string' ? m.nom.split(' ') : [];
                if (!NOMS_MOIS.includes(nomMois) || !/^\d{4}$/.test(anneeTxt || '')) throw new Error('nom de mois invalide');
                const annee = m.annee === undefined ? parseInt(anneeTxt, 10) : Number(m.annee);
                if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) throw new Error('année invalide');
                const nombre = (v, champ) => {
                    if (v === undefined || v === null || v === '') return 0;
                    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
                    if (!Number.isFinite(n) || Math.abs(n) > 1e7) throw new Error(champ + ' invalide');
                    return n;
                };
                const propre = { ...m, id, annee, revenus: nombre(m.revenus, 'revenus'), revenus_add: nombre(m.revenus_add, 'revenus_add'), especes_add: nombre(m.especes_add, 'especes_add') };
                LISTES_MOIS.forEach((cle) => {
                    const brut = m[cle];
                    if (brut === undefined || brut === null) return;
                    const liste = Array.isArray(brut) ? brut : (typeof brut === 'object' ? Object.values(brut) : null);
                    if (!liste || liste.length > 2000) throw new Error(cle + ' invalide');
                    propre[cle] = liste.map((it) => {
                        if (!it || typeof it !== 'object' || Array.isArray(it)) throw new Error('ligne invalide');
                        ['id', 'libelle', 'categorie', 'date', 'moyenPaiement'].forEach((k) => {
                            if (it[k] !== undefined && it[k] !== null && (typeof it[k] !== 'string' || it[k].length > 500)) throw new Error('ligne invalide (' + k + ')');
                        });
                        const ligne = { ...it, montant: nombre(it.montant, 'montant') };
                        if (it.montantEspeces !== undefined) ligne.montantEspeces = nombre(it.montantEspeces, 'montantEspeces');
                        return ligne;
                    });
                });
                return propre;
            });
        };

        const trierMois = (arr) => {
            return arr.sort((a,b) => {
                if(a.annee !== b.annee) return a.annee - b.annee;
                return NOMS_MOIS.indexOf(a.nom.split(' ')[0]) - NOMS_MOIS.indexOf(b.nom.split(' ')[0]);
            });
        };

        const getMoisActif = () => state.donnees.find(m => m.id === state.moisActifId);

        const setSyncDot = (status) => {
            const dot = document.getElementById('sync-dot');
            dot.className = 'status-dot ' + (status || '');
        };

        // --- Boîte de dialogue maison (bottom-sheet, charte UX/UI §5.9) — remplace alert()/confirm() de Safari ---
        // dialogue({ titre, texte, ok, annuler, danger }) → Promise<boolean>.
        // Sans `annuler` : simple information à un bouton. Tap sur le fond = annuler.
        // Le fond porte la classe .overlay-popup : la mise à jour auto au retour dans l'app
        // (utilisateurOccupe) le voit donc comme une fenêtre ouverte et n'interrompt rien.
        const dialogue = ({ titre = '', texte = '', ok = 'OK', annuler = null, danger = false } = {}) => new Promise((resolve) => {
            const fond = document.getElementById('dialogue');
            const bOk = document.getElementById('dialogue-ok');
            const bAnnuler = document.getElementById('dialogue-annuler');
            const t = document.getElementById('dialogue-texte');
            document.getElementById('dialogue-titre').textContent = titre;
            t.textContent = texte;
            t.classList.toggle('hidden', !texte);
            bOk.textContent = ok;
            bOk.className = 'btn-action ' + (danger ? 'bg-danger' : 'bg-primary');
            bAnnuler.textContent = annuler || '';
            bAnnuler.classList.toggle('hidden', !annuler);
            const fermer = (res) => {
                fermerAnime(fond, () => fond.classList.add('hidden'));   /* sortie animée (commun.js, 12/10/2026) */
                bOk.onclick = bAnnuler.onclick = fond.onclick = null;
                resolve(res);
            };
            bOk.onclick = () => fermer(true);
            bAnnuler.onclick = () => fermer(false);
            fond.onclick = (e) => { if (e.target === fond) fermer(false); };
            annulerFermeture(fond);
            fond.classList.remove('hidden');
        });

        const autoResize = (el) => {
            el.style.height = '24px';
            el.style.height = el.scrollHeight + 'px';
        };

        // --- Comparaison et Changelog ---
        const extractAllItems = (dataArray) => {
            let items = {};
            (dataArray || []).forEach(m => {
                ['charges', 'depenses', 'provisions', 'fixes'].forEach(type => {
                    (m[type] || []).forEach(item => {
                        items[item.id] = { ...item, type, moisNom: m.nom };
                    });
                });
            });
            return items;
        };

        // --- Nouveautés depuis la dernière visite (pop-up « 🔔 Nouveautés ») ---
        // Référence = dernier état « vu » sur CET appareil (localStorage LS_VU). Règles :
        //  - on ne compare JAMAIS sur un snapshot issu du cache local (sinon l'écart est nul) ;
        //  - la référence n'avance ni en arrière-plan, ni tant que le pop-up est ouvert :
        //    elle est enregistrée à la fermeture du pop-up (« J'ai compris ») ;
        //  - mes propres modifications (hasPendingWrites) mettent la référence à jour sans pop-up ;
        //  - comparaison à l'ouverture et à chaque retour au premier plan.
        const LS_VU = 'budgetLC_vu';
        const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const lireReference = () => {
            try {
                const s = localStorage.getItem(LS_VU) || localStorage.getItem(LS_CACHE); // LS_CACHE : ancienne clé (migration)
                return s ? JSON.parse(s) : null;
            } catch (e) { return null; }
        };
        const ecrireReference = (data) => {
            state.reference = JSON.parse(JSON.stringify(data));
            try { localStorage.setItem(LS_VU, JSON.stringify(state.reference)); } catch (e) {}
        };
        state.reference = lireReference();

        const calculerChangements = (oldData, newData) => {
            const oldItems = extractAllItems(oldData);
            const newItems = extractAllItems(newData);
            const moisTxt = (it) => `<span class="txt-dim" style="font-size:0.85em;">(${esc(it.moisNom)})</span>`;
            const changes = [];

            for (const id in newItems) {
                const n = newItems[id];
                const o = oldItems[id];
                const mNew = parseFloat(n.montant) || 0;
                if (!o) {
                    if (mNew !== 0) changes.push(`➕ <b>${mNew}€</b> ${esc(n.categorie)} ${moisTxt(n)}`);
                } else {
                    const mOld = parseFloat(o.montant) || 0;
                    if ((mNew !== mOld || n.categorie !== o.categorie) && !(mOld === 0 && mNew === 0)) {
                        const avant = mOld !== mNew ? `<s class="txt-dim">${mOld}€</s> → ` : '';
                        changes.push(`✏️ ${avant}<b>${mNew}€</b> ${esc(n.categorie)} ${moisTxt(n)}`);
                    }
                }
            }
            for (const id in oldItems) {
                if (!newItems[id]) {
                    const o = oldItems[id];
                    const mOld = parseFloat(o.montant) || 0;
                    if (mOld !== 0) changes.push(`🗑️ Supprimé : <b>${mOld}€</b> ${esc(o.categorie)} ${moisTxt(o)}`);
                }
            }
            return changes;
        };

        const afficherNouveautes = (changes) => {
            document.getElementById('changelog-content').innerHTML = changes.map(d => `<div class="changelog-item">${d}</div>`).join('');
            annulerFermeture(document.getElementById('changelog-popup'));
            document.getElementById('changelog-popup').classList.remove('hidden');
            state.popupOuvert = true;
        };

        document.getElementById('btn-close-changelog').onclick = () => {
            const pop = document.getElementById('changelog-popup');
            fermerAnime(pop, () => pop.classList.add('hidden'));
            state.popupOuvert = false;
            ecrireReference(state.donnees); // « vu » = à la fermeture du pop-up, pas à l'affichage
        };

        const gererNouveautes = (data, depuisCache, ecrituresLocales) => {
            if (document.visibilityState === 'hidden') return;   // jamais d'avance de la référence en arrière-plan
            if (depuisCache && !state.serveurVu) return;         // 1er snapshot = cache local : on attend le serveur
            if (!depuisCache) state.serveurVu = true;
            if (state.popupOuvert) {                             // référence figée : on rafraîchit la liste affichée
                if (!ecrituresLocales && state.reference) {
                    const ch = calculerChangements(state.reference, data);
                    if (ch.length) afficherNouveautes(ch);
                }
                return;
            }
            if (ecrituresLocales || !state.reference) { ecrireReference(data); return; }
            if (state.fenetreVerif) {
                state.fenetreVerif = false;
                const ch = calculerChangements(state.reference, data);
                if (ch.length) { afficherNouveautes(ch); return; }
            }
            ecrireReference(data);
        };

        // Retour au premier plan (iOS ne relance pas la page) : nouvelle fenêtre de comparaison,
        // et comparaison immédiate si des données sont déjà arrivées pendant l'arrière-plan.
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState !== 'visible') return;
            state.fenetreVerif = true;
            if (state.serveurVu && !state.popupOuvert && state.reference && state.donnees.length) {
                const ch = calculerChangements(state.reference, state.donnees);
                if (ch.length) { state.fenetreVerif = false; afficherNouveautes(ch); }
            }
        });

        // --- Résumé pour le Portail (22/09/2026) ---
        // Le Portail (tableau de bord) affiche un aperçu de chaque app. Budget écrit ici un petit
        // document `portail/budget` (voir README).
        // - 29/09/2026 : publié avec la base et la session e-mail de Budget (compte du duo). Plus de
        //   2e application Firebase 'portail' ni de connexion anonyme : `portail/*` est réservé au
        //   compte du duo (firestore.rules).
        // - Publié seulement après un snapshot venu du SERVEUR (jamais avec le seul cache local).
        // - Toute erreur est absorbée : cette fonction ne doit jamais gêner l'app.
        let portailServeurVu = false, portailDernier = '', portailMinuteur = null;
        let portailJeton = null, portailOk = false;
        const compteDuo = () => (auth && auth.currentUser && !auth.currentUser.isAnonymous) ? auth.currentUser : null;
        // Reste à vivre du mois CALENDAIRE en cours, avec exactement la formule de calculerTotauxMensuels().
        const calculerResumePortail = () => {
            const now = new Date();
            const nom = NOMS_MOIS[now.getMonth()] + ' ' + now.getFullYear();
            const m = state.donnees.find(x => x.nom === nom);
            if (!m) return { mois: nom, reste: null, budget: null, depense: null, joursRestants: null }; // mois pas encore démarré
            const idx = state.donnees.indexOf(m);
            const budgetRevolut = calculerSoldeReporte(idx) + (parseFloat(m.revenus) || 0) + (parseFloat(m.revenus_add) || 0);
            const budgetEspeces = calculerSoldeReporteEspeces(idx) + (parseFloat(m.especes_add) || 0);
            const budget = budgetRevolut + budgetEspeces; // Revolut + Espèces, formule identique à calculerTotauxMensuels
            const depense = somme(m.charges) + sommeCB(m.depenses) + somme(m.provisions) + sommeEspeces(m.depenses);
            const r2 = (n) => Math.round(n * 100) / 100;
            const dernierJour = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            // Lot 3 (20/10/2026) : 3 dernières dépenses du mois pour la vitre du Portail (libellé ou catégorie, montant, emoji)
            const dernieres = (m.depenses || []).filter(d => (Number(d.montant) || 0) !== 0)
                .slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
                .slice(0, 3).map(d => {
                    const cat = String(d.categorie || '');
                    const emoji = (cat.match(/^\S+/) || [''])[0].slice(0, 4);
                    return { l: String(d.libelle || cat.replace(/^\S+\s*/, '') || 'Dépense').replace(/\s+/g, ' ').trim().slice(0, 30), m: r2(Number(d.montant) || 0), e: emoji };
                });
            return { mois: nom, reste: r2(budget - depense), budget: r2(budget), depense: r2(depense), joursRestants: dernierJour - now.getDate(), dernieres };
        };
        // 23/09/2026 (v2) — PUBLICATION FIABLE (même principe que Courses, voir README du Portail) :
        // regroupement ramené à 0,3 s ; `portailOk` = écriture CONFIRMÉE par le serveur ; au
        // départ de la page, si rien n'est confirmé, secours par l'API REST de Firestore avec
        // `fetch(..., { keepalive: true })`, seule requête que Safari laisse finir après la
        // destruction de la page (le SDK garde sa file d'écriture en mémoire : perdue).
        const publierResumePortail = async () => {
            try {
                const resume = calculerResumePortail();
                portailDernier = JSON.stringify(resume);
                if (!compteDuo()) throw new Error('pas connecté');
                await db.collection('portail').doc('budget').set(Object.assign({ maj: Date.now() }, resume));
                portailOk = true;
            } catch (err) { portailDernier = ''; console.warn('Résumé Portail non publié :', err); }
        };
        const planifierPublicationPortail = () => {
            if (!portailServeurVu || !state.donnees.length) return;
            portailOk = false;
            const u = compteDuo();
            if (u) u.getIdToken().then(t => { portailJeton = t; }).catch(() => {});
            clearTimeout(portailMinuteur);
            portailMinuteur = setTimeout(() => { portailMinuteur = null; publierResumePortail(); }, 300);
        };
        const versValeurFirestore = (v) => {
            if (v === null || v === undefined) return { nullValue: null };
            if (typeof v === 'boolean') return { booleanValue: v };
            if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
            if (typeof v === 'string') return { stringValue: v };
            if (Array.isArray(v)) return { arrayValue: { values: v.map(versValeurFirestore) } };
            const f = {}; Object.keys(v).forEach(k => { f[k] = versValeurFirestore(v[k]); });
            return { mapValue: { fields: f } };
        };
        const secoursPublicationPortail = () => {
            if (!portailServeurVu || !state.donnees.length || portailOk || !portailJeton) return;
            clearTimeout(portailMinuteur); portailMinuteur = null;
            try {
                const data = Object.assign({ maj: Date.now() }, calculerResumePortail());
                fetch('https://firestore.googleapis.com/v1/projects/course-app-36e9d/databases/(default)/documents/portail/budget', {
                    method: 'PATCH', keepalive: true,
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + portailJeton },
                    body: JSON.stringify({ fields: versValeurFirestore(data).mapValue.fields })
                }).then(r => { if (r.ok) portailOk = true; }).catch(() => {});
            } catch (e) {}
        };
        window.addEventListener('pagehide', secoursPublicationPortail);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') secoursPublicationPortail(); });

        // Lot 2 (20/10/2026) : un champ de ligne a le focus → le re-rendu attend qu'on en sorte
        const saisieEnCours = () => { const a = document.activeElement; return !!(a && a.dataset && a.dataset.field && a.closest('.item-row')); };
        document.addEventListener('focusout', () => setTimeout(() => {
            if (state.rendreApresSaisie && !saisieEnCours()) { state.rendreApresSaisie = false; rafraichirTouteLInterface(); }
        }, 0));

        let minuteurRendu = null;
        const planifierRendu = () => {
            clearTimeout(minuteurRendu);
            minuteurRendu = setTimeout(() => { if (saisieEnCours()) state.rendreApresSaisie = true; else rafraichirTouteLInterface(); }, 350);
        };

        // Lot 3 (20/10/2026) : « + » de la vitre Budget du Portail → ?saisie=depense. Feuille Dépenses ouverte sur le
        // MOIS EN COURS (s'il existe), reflet sur « + Nouvelle dépense » : le toucher crée la ligne et ouvre le clavier
        // (un focus automatique au chargement n'ouvre pas le clavier sur iPhone, et créer la ligne d'office
        // laisserait une dépense vide si on renonce).
        let saisieDemandee = new URLSearchParams(location.search).get('saisie') === 'depense';
        if (saisieDemandee) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
        const ouvrirSaisieDemandee = () => {
            if (!saisieDemandee || !state.donnees.length) return;
            saisieDemandee = false;
            const now = new Date();
            const courant = state.donnees.find(m => m.nom === NOMS_MOIS[now.getMonth()] + ' ' + now.getFullYear());
            if (courant && courant.id !== state.moisActifId) { state.moisActifId = courant.id; rafraichirTouteLInterface(); }
            ouvrirFeuille('depenses');
            const b = document.querySelector('#sheet-depenses [data-add="depenses"]');
            if (b) { b.classList.add('reflet'); b.addEventListener('click', () => b.classList.remove('reflet'), { once: true }); }
        };

        // --- Logique DB ---
        const attacherEcouteurs = () => {
            unsubMois = colMois().onSnapshot((snap) => {
                let data = [];
                snap.forEach(doc => data.push(doc.data()));
                data = data.map(normaliserMois);
                const depuisCache = snap.metadata.fromCache;            // vrai = données du cache local, pas encore du serveur
                const ecrituresLocales = snap.metadata.hasPendingWrites; // vrai = écho de MA modification

                document.body.classList.remove('duo-chargement');   // lot 3 : fin des lignes grises d'attente
                if (data.length) {
                    state.firstLoad = false;
                    state.donnees = trierMois(data);
                    if (!state.moisActifId || !state.donnees.find(m => m.id === state.moisActifId)) {
                        state.moisActifId = state.donnees[state.donnees.length - 1].id;
                    }
                    gererNouveautes(state.donnees, depuisCache, ecrituresLocales);
                    if (!depuisCache) portailServeurVu = true;
                    planifierPublicationPortail();
                    if (saisieEnCours()) state.rendreApresSaisie = true; // Lot 2 : ne pas casser le champ actif
                    else rafraichirTouteLInterface();
                    ouvrirSaisieDemandee();
                } else {
                    // Ne jamais créer le mois par défaut sur un snapshot vide issu du cache local
                    if (state.firstLoad && !depuisCache) {
                        const premier = normaliserMois({ id: genId(), nom: "Mars 2026", annee: 2026, revenus: 4500, revenus_add: 0 });
                        state.donnees = [premier];
                        state.moisActifId = premier.id;
                        sauvegarderMois(premier);
                        state.firstLoad = false;
                        rafraichirTouteLInterface();
                    }
                }
            }, (err) => { console.error("Erreur écoute Firestore (mois) :", err); setSyncDot('offline'); });

            unsubConfig = refConfig().onSnapshot((doc) => {
                if (doc.exists) {
                    const c = doc.data();
                    state.categories = c.categories || state.categories;
                    state.corbeille = (c.corbeille || []).filter(i => i.typeOriginal !== 'epargne'); // anciennes lignes de la carte Épargne supprimée
                    state.objectifsProvisions = c.objectifsProvisions || [];
                    if (saisieEnCours()) state.rendreApresSaisie = true; else rafraichirTouteLInterface();
                }
            }, (err) => { console.error("Erreur écoute Firestore (config) :", err); setSyncDot('offline'); });
        };

        const sauvegarderMois = (mois) => {
            setSyncDot('saving');
            refMois(mois.id).set(clean(mois)).then(() => setSyncDot('online')).catch((e) => { console.error(e); setSyncDot('offline'); duoEchec(e, 'Modification'); });
        };

        const sauvegarderDonnees = () => {
            const mois = getMoisActif();
            if (!mois) return;
            sauvegarderMois(mois);
        };

        // Remplace intégralement la collection "mois" (utilisé uniquement par la restauration .json)
        const restaurerCollectionComplete = (nouvellesDonnees) => {
            setSyncDot('saving');
            const anciensIds = new Set(state.donnees.map(m => String(m.id)));
            const nouveauxIds = new Set(nouvellesDonnees.map(m => String(m.id)));
            const batch = db.batch();
            anciensIds.forEach(id => { if (!nouveauxIds.has(id)) batch.delete(refMois(id)); });
            nouvellesDonnees.forEach(m => batch.set(refMois(m.id), clean(m)));
            return batch.commit().then(() => setSyncDot('online')).catch((e) => { console.error(e); setSyncDot('offline'); duoEchec(e, 'Restauration'); throw e; });
        };


        const sauvegarderConfig = (silencieux = false) => {
            if(!silencieux) setSyncDot('saving');
            refConfig().set(clean({
                categories: state.categories,
                corbeille: state.corbeille,
                objectifsProvisions: state.objectifsProvisions
            })).then(() => { if(!silencieux) setSyncDot('online'); }).catch((e) => { console.error(e); setSyncDot('offline'); duoEchec(e, 'Réglage'); });
        };

        // --- Navigation et Vues ---
        const changerVue = (vue) => {
            state.vueActuelle = vue;
            document.querySelectorAll('main > div').forEach(d => d.classList.toggle('hidden', d.id !== `vue-${vue}`));
            document.querySelectorAll('.btn-tab').forEach(b => b.classList.toggle('active', b.dataset.view === vue));
            document.getElementById('month-nav-group').classList.toggle('hidden', vue === 'annuelle' || vue === 'admin');
            rafraichirTouteLInterface();
        };

        const toggleSection = (id, header) => {
            const el = document.getElementById(id);
            el.classList.toggle('collapsed');
            if (header) header.classList.toggle('collapsed');
        };

        const rafraichirTouteLInterface = () => {
            rendreMenu();
            if (state.vueActuelle === 'mensuelle') rendreVueMensuelle();
            else if (state.vueActuelle === 'fixes') rendreVueFixes();
            else if (state.vueActuelle === 'annuelle') rendreVueAnnuelle();
            else if (state.vueActuelle === 'admin') rendreAdmin();
        };

        // V2 (18/10/2026) : navigateur « ‹ Préc. · Mois Année · Suiv. › » au lieu de la liste par année.
        // Le bouton « + Démarrer … » n'apparaît que sur le dernier mois existant.
        const rendreMenu = () => {
            const list = document.getElementById('month-list');
            const idx = state.donnees.findIndex(m => m.id === state.moisActifId);
            const cur = state.donnees[idx];
            const prev = idx > 0 ? state.donnees[idx - 1] : null;
            const next = idx >= 0 && idx < state.donnees.length - 1 ? state.donnees[idx + 1] : null;
            const court = (m) => m ? m.nom.split(' ')[0].slice(0, 4).replace(/\.$/, '') + '.' : '';
            list.innerHTML = `
                <button type="button" class="v2-mois-btn" ${prev ? `data-mois-id="${esc(prev.id)}"` : 'disabled'} aria-label="Mois précédent">${prev ? '‹ ' + esc(court(prev)) : ''}</button>
                <button type="button" class="v2-mois-cur" data-ouvrir-mois aria-label="Choisir un mois">${cur ? esc(cur.nom) : '—'} <span class="v2-chev">▾</span></button>
                <button type="button" class="v2-mois-btn" ${next ? `data-mois-id="${esc(next.id)}"` : 'disabled'} aria-label="Mois suivant">${next ? esc(court(next)) + ' ›' : ''}</button>`;
            // Feuille « Tous les mois » : regroupés par année, la plus récente en haut
            const parAn = {};
            state.donnees.forEach(m => { (parAn[m.annee] = parAn[m.annee] || []).push(m); });
            document.getElementById('v2-liste-mois').innerHTML = Object.keys(parAn).sort((a, b) => b - a).map(an =>
                `<div class="v2-an">${esc(an)}</div><div class="v2-mois-grille">` +
                parAn[an].slice().reverse().map(m => `<button type="button" class="v2-mois-item ${m.id === state.moisActifId ? 'on' : ''}" data-mois-id="${esc(m.id)}">${esc(m.nom.split(' ')[0])}</button>`).join('') +
                '</div>').join('');
            const btnNext = document.getElementById('btn-next-month');
            const dernier = state.donnees[state.donnees.length - 1];
            btnNext.classList.toggle('hidden', !!(dernier && cur && cur.id !== dernier.id));
            if (dernier) {
                const i = NOMS_MOIS.indexOf(dernier.nom.split(' ')[0]);
                btnNext.textContent = '+ Démarrer ' + NOMS_MOIS[(i + 1) % 12];
                /* Reflet (20/10/2026) : un nouveau mois civil a commencé et n'est pas encore créé. */
                const now = new Date();
                btnNext.classList.toggle('reflet', i >= 0 && (dernier.annee * 12 + i) < (now.getFullYear() * 12 + now.getMonth()));
            }
        };

        // --- Logique du Reste à Vivre (Calcul du report exclusif Revolut) ---
        const calculerSoldeReporte = (cibleIdx) => {
            let solde = 0;
            for (let i = 0; i < cibleIdx; i++) {
                const m = state.donnees[i];
                const rev = (parseFloat(m.revenus) || 0) + (parseFloat(m.revenus_add) || 0);
                const tc = somme(m.charges);
                const tdCB = sommeCB(m.depenses);
                const tprov = somme(m.provisions);
                // Les Tickets Restos/Especes sont exclus
                solde += (rev - tc - tdCB - tprov);
            }
            return arr2(solde);
        };

        // --- Logique du Reste à Vivre (Calcul du report cumulatif Espèces) ---
        // Même principe que calculerSoldeReporte, mais pour la cagnotte espèces : ne concerne que
        // les Dépenses (Charges fixes/Provisions restent 100% Revolut, décision explicite de Corentin).
        const calculerSoldeReporteEspeces = (cibleIdx) => {
            let solde = 0;
            for (let i = 0; i < cibleIdx; i++) {
                const m = state.donnees[i];
                solde += (parseFloat(m.especes_add) || 0) - sommeEspeces(m.depenses);
            }
            return arr2(solde);
        };

        // Lot 2 (20/10/2026) : 4 dernières catégories utilisées, en pastilles sous une dépense qu'on vient de créer
        const categoriesRecentes = () => {
            const toutes = [];
            state.donnees.forEach(m => (m.depenses || []).forEach(d => { if (d.id !== state.ligneNeuve && d.categorie && (Number(d.montant) || 0) !== 0) toutes.push(d); }));
            toutes.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
            const vues = [];
            toutes.forEach(d => { if (!vues.includes(d.categorie) && state.categories.includes(d.categorie)) vues.push(d.categorie); });
            ['🛒 Courses', '🍽️ Restaurant', '🎬 Loisirs', '🏥 Santé'].forEach(c => { if (!vues.includes(c) && state.categories.includes(c)) vues.push(c); });
            return vues.slice(0, 4);
        };
        const pastillesCategories = (item) => `<div class="cat-rapides"><button type="button" class="btn-signe" data-signe="${esc(item.id)}" aria-label="Dépense ou remboursement">±</button>${categoriesRecentes().map(c =>
            `<button type="button" class="cat-rapide${item.categorie === c ? ' on' : ''}" data-cat-rapide="${esc(c)}" data-id="${esc(item.id)}">${esc(c)}</button>`).join('')}</div>`;

        // --- Rendu des tableaux ---
        const rendreLignes = (containerId, tableau, type) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';

            const filtered = (tableau || []).filter(i => sansAccents(i.libelle || i.categorie || "").includes(state.termeRecherche))
                .filter(i => type !== 'depenses' || !state.filtreQui || i.par === state.filtreQui); // V2 : filtre Tous / Corentin / Lisa

            filtered.forEach(item => {
                const row = document.createElement('div');
                row.className = 'item-row';
                row.dataset.id = item.id;

                // 04/10/2026 (audit) : le champ affiche le montant AVEC son signe. Avant, il affichait la
                // valeur absolue et la saisie enregistrait ce qui était tapé : toucher le chiffre d'un
                // remboursement (−20 €) l'enregistrait en dépense (+20 €), sans aucun message.
                const isNeg = item.montant < 0;
                const negCls = isNeg ? 'montant-neg' : '';
                const mntFinal = Number(item.montant) || 0;
                const options = state.categories.map(c => `<option value="${esc(c)}" ${item.categorie === c ? 'selected' : ''}>${esc(c)}</option>`).join('');

                // CONDITION SPECIALE: ONGLET FIXES MINIMALISTE
                if (type === 'fixes') {
                    row.innerHTML = `
                        <div class="drag-handle">☰</div>
                        <div class="item-content fix-content">
                            <select class="fix-cat" data-id="${esc(item.id)}" data-type="${type}" data-field="categorie">
                                ${options}
                            </select>
                            <div class="item-montant">
                                <input type="number" value="${mntFinal}" class="fix-montant ${negCls}" data-id="${esc(item.id)}" data-type="${type}" data-field="montant">
                            </div>
                        </div>
                        <button class="btn-delete" data-del-type="${type}" data-del-id="${esc(item.id)}">✕</button>
                    `;
                } 
                // AFFICHAGE CLASSIQUE POUR LES AUTRES ONGLETS
                else {
                    let payIcon = '';
                    let mixteRow = '';
                    if (type === 'depenses') {
                        const meth = item.moyenPaiement || 'CB';
                        const icon = meth === 'TR' ? '🎟️' : meth === 'ESPECES' ? '💵' : meth === 'MIXTE' ? '🔀' : '💳';
                        payIcon = `<button class="btn-pay-method" data-pay="${esc(item.id)}" title="Mode de paiement">${icon}</button>`;
                        if (meth === 'MIXTE') {
                            const especes = Math.min(Math.max(parseFloat(item.montantEspeces) || 0, 0), Math.max(parseFloat(item.montant) || 0, 0));
                            const carte = Math.max((parseFloat(item.montant) || 0) - especes, 0);
                            mixteRow = `
                            <div class="item-mixte">
                                <div class="mixte-label">💵 Espèces — par paliers de 5 €</div>
                                <div class="mixte-row">
                                    <button class="mixte-btn" data-mixte-decr="${esc(item.id)}" aria-label="Retirer 5 € d'espèces">−</button>
                                    <div class="mixte-scrub" data-mixte-scrub="${esc(item.id)}">
                                        <div class="mixte-value">${especes.toFixed(0)} €</div>
                                    </div>
                                    <button class="mixte-btn" data-mixte-incr="${esc(item.id)}" aria-label="Ajouter 5 € d'espèces">+</button>
                                </div>
                                <div class="mixte-hint">↕ glisser pour ajuster</div>
                                <div class="mixte-recap">
                                    <div class="mixte-recap-row"><span>💳 Carte (reste automatique)</span><span>${carte.toFixed(2)} €</span></div>
                                    <div class="mixte-recap-row"><span>💵 Espèces</span><span>${especes.toFixed(2)} €</span></div>
                                </div>
                            </div>`;
                        }
                    }

                    row.innerHTML = `
                        <div class="drag-handle">☰</div>
                        <div class="item-content">
                            <div class="item-top">
                                <textarea data-id="${esc(item.id)}" data-type="${type}" data-field="libelle" placeholder="Note...">${esc(item.libelle || '')}</textarea>
                                <div class="item-montant">
                                    <input type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" placeholder="0" value="${mntFinal ? mntFinal : ''}" class="${negCls}" data-id="${esc(item.id)}" data-type="${type}" data-field="montant" aria-label="Montant">
                                    ${payIcon}
                                </div>
                            </div>
                            <div class="item-bottom">
                                <input type="date" value="${esc(item.date || '')}" data-id="${esc(item.id)}" data-type="${type}" data-field="date">
                                <select data-id="${esc(item.id)}" data-type="${type}" data-field="categorie">
                                    ${options}
                                </select>
                            </div>
                            ${type === 'depenses' && state.ligneNeuve === item.id ? pastillesCategories(item) : ''}
                            ${mixteRow}
                        </div>
                        <button class="btn-delete" data-del-type="${type}" data-del-id="${esc(item.id)}">✕</button>
                    `;
                }
                
                container.appendChild(row);
                if(type !== 'fixes') autoResize(row.querySelector('textarea'));
            });

            // Drag and Drop
            if (container._sortable) container._sortable.destroy();
            container._sortable = new Sortable(container, {
                handle: '.drag-handle',
                animation: 150,
                delay: 150,
                delayOnTouchOnly: true,
                fallbackTolerance: 5,
                touchStartThreshold: 5,
                onEnd: () => {
                    // Audit 08-01 : avec une recherche ou un filtre actif, seules les lignes visibles sont dans le DOM.
                    // On réordonne les visibles dans les places qu'elles occupaient, les masquées restent où elles sont.
                    const ids = Array.from(container.children).map(r => r.dataset.id).filter(Boolean);
                    const mois = getMoisActif();
                    const liste = mois[type] || [];
                    const visibles = new Set(ids);
                    let k = 0;
                    mois[type] = liste.map(x => visibles.has(x.id) ? (liste.find(y => y.id === ids[k++]) || x) : x);
                    sauvegarderDonnees();
                }
            });
        };

        // --- Vue Mensuelle ---
        const rendreVueMensuelle = () => {
            const mois = getMoisActif();
            if (!mois) return;

            document.getElementById('titre-mois').innerText = mois.nom;
            
            const idx = state.donnees.indexOf(mois);
            const report = calculerSoldeReporte(idx);
            const reportEspeces = calculerSoldeReporteEspeces(idx);
            document.getElementById('solde_reporte').value = report.toFixed(2);
            document.getElementById('solde_reporte_especes').value = reportEspeces.toFixed(2);
            document.getElementById('revenus').value = mois.revenus || 0;
            document.getElementById('revenus_add').value = mois.revenus_add || 0;
            document.getElementById('especes_add').value = mois.especes_add || 0;

            rendreLignes('conteneur-charges', mois.charges, 'charges');
            rendreLignes('conteneur-depenses', mois.depenses, 'depenses');
            rendreLignes('conteneur-provisions', mois.provisions, 'provisions');

            calculerTotauxMensuels(mois, report, reportEspeces);
            rendreV2(mois, report, reportEspeces);
        };

        const calculerTotauxMensuels = (m, report, reportEspeces) => {
            const tc = somme(m.charges);
            const tdTotal = somme(m.depenses);
            const tdCB = sommeCB(m.depenses);
            const tdEspeces = sommeEspeces(m.depenses);
            const tprov = somme(m.provisions);
            const totalRev = report + (parseFloat(m.revenus) || 0) + (parseFloat(m.revenus_add) || 0);
            const totalEspeces = reportEspeces + (parseFloat(m.especes_add) || 0);

            const resteRevolut = totalRev - tc - tdCB - tprov;
            const resteEspeces = totalEspeces - tdEspeces;
            const reste = arr2(resteRevolut + resteEspeces);

            document.getElementById('total-charges').innerText = tc.toFixed(0);
            document.getElementById('total-provisions').innerText = tprov.toFixed(0);
            document.getElementById('detail-reste').innerText = `💳 ${eur(resteRevolut)} · 💵 ${eur(resteEspeces)}`;
            // V2 : chiffre héros, barre empilée, vignettes et jours restants → rendreV2()
        };

        // ===================== V2 (18/10/2026) : tableau de bord, feuilles, calendrier =====================
        // Même données, même calculs que Budget (calculerSoldeReporte, sommeCB, sommeEspeces…) : seule la
        // présentation change. Tout le HTML inséré passe par esc().
        state.vueMois = 'resume';   // 'resume' | 'calendrier'
        state.jourSel = null;       // jour choisi dans le calendrier
        state.filtreQui = '';       // '' | 'corentin' | 'lisa' (feuille Dépenses)
        const JOURS_SEM = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        const fmtEur = (v) => arr2(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        const fmtEur0 = (v) => Math.round(Number(v) || 0).toLocaleString('fr-FR') + ' €';
        const montantHTML = (v) => { const [i, d] = fmtEur(v).split(','); return `<span class="v2-int">${esc(i)}</span><span class="v2-dec">,${esc(d)}</span>`; };
        const decoupeCat = (c) => {
            const s = String(c || '').trim();
            const m = s.match(/^(\S+)\s+(.+)$/);
            return (m && !/[A-Za-zÀ-ÿ0-9]/.test(m[1])) ? { ico: m[1], nom: m[2] } : { ico: '•', nom: s || 'Autre' };
        };
        const infosMois = (m) => {
            const [n, a] = m.nom.split(' ');
            const mi = NOMS_MOIS.indexOf(n), an = parseInt(a);
            const nbJ = new Date(an, mi + 1, 0).getDate();
            const t = new Date();
            const courant = t.getFullYear() === an && t.getMonth() === mi;
            const passe = new Date(an, mi + 1, 1) <= t;
            return { mi, an, nbJ, courant, passe, auj: courant ? t.getDate() : (passe ? nbJ + 1 : 0), prefixe: `${an}-${String(mi + 1).padStart(2, '0')}` };
        };
        const dateCourte = (d) => { if (!d) return ''; const [, mo, j] = d.split('-'); return parseInt(j) + ' ' + (NOMS_MOIS[parseInt(mo) - 1] || '').slice(0, 4).toLowerCase() + '.'; };
        const ligneOpHTML = (it, type) => {
            const cat = decoupeCat(it.categorie);
            const mnt = Number(it.montant) || 0;
            const credit = mnt < 0;
            const meth = type === 'depenses' ? ({ ESPECES: ' · 💵', MIXTE: ' · 💳+💵', TR: ' · 🎟️' }[it.moyenPaiement] || '') : '';
            const genre = type === 'charges' ? 'Charge' : type === 'provisions' ? 'Provision' : cat.nom;
            const pt = it.par === 'lisa' ? 'l' : it.par === 'corentin' ? 'c' : '';
            return `<button type="button" class="v2-op" data-sheet="${esc(type)}">
                <span class="v2-op-ico ${type === 'depenses' ? (credit ? 'k-rev' : 'k-dep') : 'k-' + esc(type)}">${esc(cat.ico)}</span>
                <span class="v2-op-txt"><span class="v2-op-nom">${esc(it.libelle || cat.nom)}</span><span class="v2-op-meta">${esc(genre + (it.date ? ' · ' + dateCourte(it.date) : '') + meth)}</span></span>
                ${pt ? `<i class="v2-pt ${pt}"></i>` : ''}
                <span class="v2-op-mnt ${credit ? 'pos' : ''}">${credit ? '+ ' : '− '}${esc(fmtEur(Math.abs(mnt)))}</span>
            </button>`;
        };
        const barreHTML = (parts) => {
            const tot = parts.reduce((s, p) => s + Math.max(p.v, 0), 0);
            return parts.filter(p => p.v > 0 && tot > 0).map(p => `<i class="${p.cls}" style="flex-grow:${(p.v / tot * 100).toFixed(2)}"></i>`).join('');
        };
        const legendeHTML = (parts) => {
            const tot = parts.reduce((s, p) => s + Math.max(p.v, 0), 0);
            return parts.map(p => `<div class="v2-leg-i ${p.cls}"><span>${esc(p.nom)}</span><strong>${esc(fmtEur0(p.v))}</strong><em>${tot > 0 ? Math.round(Math.max(p.v, 0) / tot * 100) : 0} %</em></div>`).join('');
        };

        const rendreV2 = (m, report, reportEspeces) => {
            const info = infosMois(m);
            const tc = somme(m.charges), tdTotal = somme(m.depenses), tdEsp = sommeEspeces(m.depenses), tprov = somme(m.provisions);
            const totalRev = report + (parseFloat(m.revenus) || 0) + (parseFloat(m.revenus_add) || 0);
            const resteRevolut = totalRev - tc - sommeCB(m.depenses) - tprov;
            const resteEspeces = reportEspeces + (parseFloat(m.especes_add) || 0) - tdEsp;
            const reste = arr2(resteRevolut + resteEspeces);

            // Héros
            const big = document.getElementById('reste-a-vivre');
            big.innerHTML = montantHTML(reste);
            big.classList.toggle('neg', reste < 0);
            const jr = info.nbJ - info.auj;
            document.getElementById('jours-restants').textContent = info.courant
                ? `${jr} jour${jr > 1 ? 's' : ''} restant${jr > 1 ? 's' : ''} · ≈ ${fmtEur(reste / Math.max(jr + 1, 1))} par jour`
                : (info.passe ? 'Mois clôturé' : 'Mois à venir');
            document.getElementById('detail-reste').textContent = `💳 ${fmtEur(resteRevolut)} · 💵 ${fmtEur(resteEspeces)}`;
            document.getElementById('v2-prog').style.transform = `scaleX(${info.courant ? info.auj / info.nbJ : (info.passe ? 1 : 0)})`;

            // Résumé : barre empilée + vignettes
            const parts = [
                { nom: 'Charges', v: tc, cls: 'k-charges' }, { nom: 'Dépenses', v: tdTotal, cls: 'k-dep' },
                { nom: 'Provisions', v: tprov, cls: 'k-provisions' }, { nom: 'Reste', v: Math.max(reste, 0), cls: 'k-reste' }
            ];
            document.getElementById('v2-leg').innerHTML = legendeHTML(parts);
            document.getElementById('v2-bar').innerHTML = barreHTML(parts);
            document.getElementById('v2-revenus').textContent = fmtEur(totalRev);
            const pl = (n, s) => `${n} ${s}${n > 1 ? 's' : ''}`;
            document.getElementById('v2-t-charges').innerHTML = montantHTML(tc);
            document.getElementById('v2-i-charges').textContent = pl(m.charges.length, 'ligne');
            document.getElementById('v2-t-depenses').innerHTML = montantHTML(tdTotal);
            document.getElementById('v2-i-depenses').textContent = pl(m.depenses.length, 'achat') + (tdEsp > 0 ? ` · ${fmtEur0(tdEsp)} en espèces` : '');
            document.getElementById('v2-t-provisions').innerHTML = montantHTML(tprov);
            document.getElementById('v2-i-provisions').textContent = pl(m.provisions.length, 'ligne');
            document.getElementById('v2-t-especes').innerHTML = montantHTML(resteEspeces);
            document.getElementById('v2-i-especes').textContent = `dont ${fmtEur0(reportEspeces)} reportés`;
            document.getElementById('titre-depenses').innerHTML = `Dépenses <small>(${esc(fmtEur0(tdTotal))})</small>`;

            // Dernières opérations (dépenses, les plus récentes d'abord)
            const recentes = m.depenses.map((d, i) => ({ d, i }))
                .sort((a, b) => String(b.d.date || '').localeCompare(String(a.d.date || '')) || a.i - b.i)
                .slice(0, 6).map(x => ligneOpHTML(x.d, 'depenses')).join('');
            document.getElementById('v2-ops').innerHTML = recentes || '<p class="v2-vide">Aucune dépense ce mois-ci</p>';

            // Feuille Dépenses : total par catégorie (selon le filtre Qui)
            const parCat = {};
            m.depenses.filter(d => !state.filtreQui || d.par === state.filtreQui)
                .forEach(d => { const v = Number(d.montant) || 0; if (v > 0) parCat[d.categorie || '❓ Autre'] = (parCat[d.categorie || '❓ Autre'] || 0) + v; });
            const cats = Object.entries(parCat).sort((a, b) => b[1] - a[1]);
            const max = cats.length ? cats[0][1] : 1;
            document.getElementById('v2-cats').innerHTML = cats.map(([c, v]) => {
                const k = decoupeCat(c);
                return `<div class="v2-cat"><div class="v2-row"><span>${esc(k.ico + ' ' + k.nom)}</span><strong>${esc(fmtEur(v))}</strong></div><div class="v2-cat-bar"><i style="transform:scaleX(${(v / max).toFixed(3)})"></i></div></div>`;
            }).join('') || '<p class="v2-vide">Pas encore de dépense</p>';
            document.querySelectorAll('#v2-qui [data-qui]').forEach(b => b.classList.toggle('on', b.dataset.qui === state.filtreQui));

            // Bascule Résumé / Calendrier
            const cal = state.vueMois === 'calendrier';
            document.querySelectorAll('#v2-seg [data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === state.vueMois));
            document.getElementById('mois-content-wrapper').classList.toggle('hidden', cal);
            document.getElementById('v2-calendrier').classList.toggle('hidden', !cal);
            if (cal) rendreCalendrier(m, info, { tc, tdTotal, tprov, reste });
        };

        // Calendrier : dépenses et charges DATÉES dans le mois. Charge datée après aujourd'hui = « à venir ».
        const rendreCalendrier = (m, info, t) => {
            const jours = {};
            const j0 = (j) => (jours[j] = jours[j] || { dep: 0, rem: 0, chg: 0, avenir: 0, ops: [] });
            const ajouter = (it, type) => {
                if (!it.date || it.date.slice(0, 7) !== info.prefixe) return;
                const j = parseInt(it.date.slice(8, 10)), v = Number(it.montant) || 0, d = j0(j);
                d.ops.push({ it, type });
                if (type === 'depenses') { if (v >= 0) d.dep += v; else d.rem -= v; }
                else if (j > info.auj) d.avenir += v; else d.chg += v;
            };
            m.depenses.forEach(it => ajouter(it, 'depenses'));
            m.charges.forEach(it => ajouter(it, 'charges'));
            const avenir = Object.values(jours).reduce((s, d) => s + d.avenir, 0);
            const parts = [
                { nom: 'Dépensé', v: t.tdTotal + t.tc - avenir + t.tprov, cls: 'k-dep' },
                { nom: 'À venir', v: avenir, cls: 'k-avenir' },
                { nom: 'Reste', v: Math.max(t.reste, 0), cls: 'k-reste' }
            ];
            document.getElementById('v2-cal-leg').innerHTML = legendeHTML(parts);
            document.getElementById('v2-cal-bar').innerHTML = barreHTML(parts);

            const decal = (new Date(info.an, info.mi, 1).getDay() + 6) % 7;
            const sel = state.jourSel || (info.courant ? info.auj : null);
            let html = '<span></span>'.repeat(decal);
            for (let j = 1; j <= info.nbJ; j++) {
                const d = jours[j];
                let cls = '', lib = '';
                if (d) {
                    const net = d.dep + d.chg + d.avenir - d.rem;
                    cls = d.avenir > 0 ? 'c-avenir' : (net > 0 ? 'c-dep' : (d.rem > 0 ? 'c-rem' : ''));
                    if (Math.round(net) !== 0) lib = (net > 0 ? '−' : '+') + Math.abs(Math.round(net));
                }
                if (info.courant && j === info.auj) cls += ' c-auj';
                if (j > info.auj) cls += ' c-futur';
                if (j === sel) cls += ' c-sel';
                html += `<button type="button" class="v2-jour ${cls}" data-jour="${j}" aria-label="${j} ${esc(NOMS_MOIS[info.mi])}"><span>${j}</span><small>${esc(lib)}</small></button>`;
            }
            document.getElementById('v2-cal').innerHTML = html;

            const det = document.getElementById('v2-cal-detail');
            if (!sel) { det.innerHTML = '<p class="v2-vide">Touchez un jour pour voir ses opérations</p>'; return; }
            const nomJour = JOURS_SEM[(new Date(info.an, info.mi, sel).getDay() + 6) % 7];
            const ops = (jours[sel] ? jours[sel].ops : []).map(o => ligneOpHTML(o.it, o.type)).join('');
            det.innerHTML = `<div class="v2-cal-titre">${esc(nomJour + ' ' + sel + ' ' + NOMS_MOIS[info.mi].toLowerCase())}${info.courant && sel === info.auj ? ' · aujourd’hui' : ''}</div>`
                + (ops || '<p class="v2-vide">Aucune opération ce jour-là</p>');
        };

        // Feuilles (bottom sheets)
        const ouvrirFeuille = (nom) => {
            const w = document.getElementById('sheet-' + nom);
            if (!w) return;
            document.querySelectorAll('.v2-sheet-wrap.open').forEach(x => { if (x !== w) fermerFeuille(x); });
            w.classList.add('open');
            w.setAttribute('aria-hidden', 'false');
            document.body.classList.add('v2-feuille');
        };
        const fermerFeuille = (w) => {
            if (!w) return;
            w.classList.remove('open');
            w.setAttribute('aria-hidden', 'true');
            if (w.id === 'sheet-depenses') state.ligneNeuve = null;
            if (!document.querySelector('.v2-sheet-wrap.open')) document.body.classList.remove('v2-feuille');
        };
        document.getElementById('v2-sheets').addEventListener('click', (e) => {
            if (e.target.closest('[data-close]')) { fermerFeuille(e.target.closest('.v2-sheet-wrap')); return; }
            const choixMois = e.target.closest('[data-mois-id]');
            if (choixMois) { state.moisActifId = choixMois.dataset.moisId; state.jourSel = null; fermerFeuille(document.getElementById('sheet-mois')); rafraichirTouteLInterface(); return; }
            const qui = e.target.closest('[data-qui]');
            if (qui) { state.filtreQui = qui.dataset.qui; rafraichirTouteLInterface(); }
        });
        document.getElementById('vue-mensuelle').addEventListener('click', (e) => {
            const mode = e.target.closest('[data-mode]');
            if (mode) { state.vueMois = mode.dataset.mode; rafraichirTouteLInterface(); return; }
            const jour = e.target.closest('[data-jour]');
            if (jour) { state.jourSel = parseInt(jour.dataset.jour); rafraichirTouteLInterface(); return; }
            const feuille = e.target.closest('[data-sheet]');
            if (feuille) { ouvrirFeuille(feuille.dataset.sheet); return; }
            const act = e.target.closest('[data-action]');
            if (!act) return;
            // Focus pendant le geste (sinon iOS n'ouvre pas le clavier)
            if (act.dataset.action === 'depense') {
                ouvrirFeuille('depenses');
                document.querySelector('#sheet-depenses [data-add="depenses"]').click(); // met le curseur dans le montant
            } else if (act.dataset.action === 'revenu') { ouvrirFeuille('revenus'); document.getElementById('revenus_add').focus(); }
            else if (act.dataset.action === 'especes') { ouvrirFeuille('revenus'); document.getElementById('especes_add').focus(); }
            else if (act.dataset.action === 'chercher') { ouvrirFeuille('depenses'); document.getElementById('search-bar').focus(); }
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.v2-sheet-wrap.open').forEach(fermerFeuille); });

        // --- Vue Charges Fixes ---
        const rendreVueFixes = () => {
            const mois = getMoisActif();
            if (!mois) return;

            rendreLignes('conteneur-fixes', mois.fixes, 'fixes');
            const total = somme(mois.fixes);
            document.getElementById('total-fixes-calcul').innerText = eur(total);
            document.getElementById('part-individuelle').innerText = eur(total / 2);
        };

        // --- Vue Annuelle ---
        const rendreVueAnnuelle = () => {
            const sel = document.getElementById('select-annee');
            // Audit 09-05 : options reconstruites à chaque rendu (une nouvelle année apparaît sans recharger)
            const ans = [...new Set(state.donnees.map(m => m.annee))].sort((a,b) => b-a);
            const choix = sel.value;
            if (sel.options.length !== ans.length || ans.some((a, i) => String(a) !== sel.options[i].value)) {
                sel.innerHTML = '';
                ans.forEach(a => sel.add(new Option(a, a)));
                if (ans.map(String).includes(choix)) sel.value = choix;
            }
            sel.onchange = rendreVueAnnuelle;
            const an = parseInt(sel.value);
            const mois = state.donnees.filter(m => m.annee === an);
            
            let tc = 0, td = 0, tp = 0;
            mois.forEach(m => {
                tc += somme(m.charges);
                td += somme(m.depenses);
                tp += somme(m.provisions);
            });

            document.getElementById('annuel-total-depenses').innerText = eur(tc + td); // Courses (carte Dépenses) + Charges fixes (carte Charges)

            const bloc = document.getElementById('bloc-annuel-stats');
            bloc.innerHTML = `
                <div class="progress-container"><div class="progress-header"><span>🏠 Charges Fixes</span><span>${eur(tc)}</span></div></div>
                <div class="progress-container"><div class="progress-header"><span>🛒 Dépenses</span><span>${eur(td)}</span></div></div>
                <div class="progress-container"><div class="progress-header"><span>🛡️ Provisions</span><span>${eur(tp)}</span></div></div>
            `;

            const parseMontant = (v) => parseFloat(String(v).replace(',', '.')) || 0;
            state.objectifsProvisions.forEach(obj => {
                let totalObj = 0;
                const search = sansAccents(obj.nom || '').replace(/[^\w\s]/g, '').trim(); // audit 09-04 : même normalisation que la catégorie
                if (!search) return; // un nom réduit à un emoji captait toutes les provisions
                mois.forEach(m => {
                    (m.provisions||[]).forEach(line => {
                        const cat = sansAccents(line.categorie || '').replace(/[^\w\s]/g, '').trim();
                        if (cat.includes(search)) totalObj += parseMontant(line.montant);
                    });
                });
                const pct = Math.min(Math.round((totalObj / obj.montant) * 100), 100);
                bloc.innerHTML += `
                    <div class="obj-bloc">
                        <div class="progress-header"><span>🎯 ${esc(obj.nom)}</span><span>${totalObj.toFixed(2)} / ${esc(obj.montant)}€</span></div>
                        <div class="progress-track"><div class="progress-fill fill-provisions" style="width:${pct}%"></div></div>
                    </div>
                `;
            });
        };

        // --- Vue Admin ---
        const rendreAdmin = () => {
            const objDiv = document.getElementById('admin-objectifs');
            objDiv.innerHTML = state.objectifsProvisions.map((o, i) => `
                <div class="month-pill obj-pill">
                    <span>${esc(o.nom)} (${esc(o.montant)}€)</span><button class="btn-delete" data-del-obj="${i}">✕</button>
                </div>
            `).join('');

            const corbDiv = document.getElementById('admin-corbeille');
            if (!state.corbeille.length) corbDiv.innerHTML = "<p class='txt-dim corb-vide'>Corbeille vide.</p>";
            else {
                corbDiv.innerHTML = state.corbeille.slice(0,5).map((item, i) => `
                    <div class="corb-row">
                        <span>${esc(item.libelle || item.categorie)} (${esc(item.montant)}€)</span>
                        <button class="btn-small bg-primary" data-restore="${i}">Restaurer</button>
                    </div>
                `).join('');
            }

        };

        // --- Corbeille : restauration et vidage (remet l'élément dans le mois actif, faute de mois d'origine mémorisé) ---
        const restaurerCorbeille = (index) => {
            const item = state.corbeille[index];
            if (!item) return;
            const mois = getMoisActif();
            if (!mois) { dialogue({ titre: 'Aucun mois sélectionné', texte: "Sélectionnez d'abord un mois pour y restaurer cette ligne." }); return; }

            const { typeOriginal, ...itemPropre } = item;
            if (!Array.isArray(mois[typeOriginal])) mois[typeOriginal] = [];
            mois[typeOriginal].unshift(itemPropre);

            state.corbeille.splice(index, 1);
            sauvegarderDonnees();
            sauvegarderConfig(true);
            rafraichirTouteLInterface();
        };

        const viderCorbeille = () => {
            if (!state.corbeille.length) return;
            dialogue({ titre: 'Vider la corbeille ?', texte: 'Les lignes supprimées seront effacées définitivement.', ok: 'Vider', annuler: 'Annuler', danger: true }).then((oui) => {
                if (!oui) return;
                state.corbeille = [];
                sauvegarderConfig();
                rendreAdmin();
            });
        };

        // --- Gestionnaires d'événements (BULLES FLOTTANTES CORRIGÉES) ---
        
        
        // 1. Bouton Login
        document.getElementById('btn-login').onclick = () => {
            const email = document.getElementById('login-email').value.trim();
            const pass  = document.getElementById('login-password').value;
            const errEl = document.getElementById('login-error');
            errEl.style.display = 'none';
            authLogin(email, pass).catch((err) => {
                errEl.style.display = 'block';
                const msgs = {
                    'auth/invalid-credential':     'Email ou mot de passe incorrect.',
                    'auth/wrong-password':         'Mot de passe incorrect.',
                    'auth/user-not-found':         'Aucun compte avec cet email.',
                    'auth/too-many-requests':      'Trop de tentatives. Réessaie plus tard.',
                    'auth/network-request-failed': 'Pas de connexion réseau.',
                };
                errEl.textContent = msgs[err.code] || ('Erreur : ' + err.code);
            });
        };
        document.getElementById('login-password').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('btn-login').click();
        });

        // 2. Navigation Tabs
        document.querySelector('.tab-buttons').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-view]');
            if (btn) changerVue(btn.dataset.view);
        });

        // 3. Barre Latérale (Mois/Années)
        document.getElementById('month-list').addEventListener('click', (e) => {
            if (e.target.closest('[data-ouvrir-mois]')) { ouvrirFeuille('mois'); return; }
            const btn = e.target.closest('[data-mois-id]');
            if (btn) { state.moisActifId = btn.dataset.moisId; state.jourSel = null; rafraichirTouteLInterface(); }
        });

        // Lot 3 (20/10/2026) : CHANGER DE MOIS EN BALAYANT l'onglet Mois — vers la gauche = mois suivant, vers la
        // droite = mois précédent (mêmes cibles que ‹ › du navigateur). Geste nettement horizontal seulement
        // (touch-action: pan-y, le défilement vertical reste libre), seuil 70 px ou pichenette ; départ à moins
        // de 24 px du bord gauche ignoré (geste retour d'iOS). Le contenu suit un peu le doigt (30 %).
        (function balayerMois(){
            const zone = document.getElementById('vue-mensuelle');
            let g = null, aBalaye = false;
            const voisin = (sens) => { const i = state.donnees.findIndex(m => m.id === state.moisActifId); return state.donnees[i + sens] || null; };
            zone.addEventListener('pointerdown', (e) => {
                if (g || (e.pointerType === 'mouse' && e.button !== 0) || e.clientX < 24) return;
                if (e.target.closest('input, textarea, select')) return;
                g = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), actif: false, dx: 0 };
                aBalaye = false;
            });
            zone.addEventListener('pointermove', (e) => {
                if (!g || e.pointerId !== g.id) return;
                const dx = e.clientX - g.x, dy = e.clientY - g.y;
                if (!g.actif) {
                    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { g = null; return; }
                    if (Math.abs(dx) < 14) return;
                    g.actif = true; aBalaye = true; zone.classList.add('balaye-mois');
                    try { zone.setPointerCapture(e.pointerId); } catch (err) {}
                }
                g.dx = dx;
                const bloque = !voisin(dx < 0 ? 1 : -1);
                zone.style.transform = 'translateX(' + (dx * (bloque ? 0.1 : 0.3)).toFixed(1) + 'px)';
            });
            const finir = (e) => {
                if (!g || e.pointerId !== g.id) return;
                const { dx, actif, t } = g; g = null;
                zone.classList.remove('balaye-mois'); zone.style.transform = '';
                if (!actif) return;
                setTimeout(() => { aBalaye = false; }, 400);   // même correctif que Todo (audit 17-01/17-02) : pas de toucher avalé
                if (e.type === 'pointercancel') return;        // geste annulé par iOS : pas de changement de mois
                const v = Math.abs(dx) / Math.max(1, performance.now() - t);
                if (Math.abs(dx) < 70 && !(Math.abs(dx) > 30 && v > 0.5)) return;
                const cible = voisin(dx < 0 ? 1 : -1);
                if (!cible) return;
                state.moisActifId = cible.id; state.jourSel = null;
                rafraichirTouteLInterface();
                zone.classList.remove('arrive-gauche', 'arrive-droite'); void zone.offsetWidth;
                zone.classList.add(dx < 0 ? 'arrive-droite' : 'arrive-gauche');
            };
            zone.addEventListener('pointerup', finir);
            zone.addEventListener('pointercancel', finir);
            zone.addEventListener('click', (e) => { if (aBalaye) { e.preventDefault(); e.stopPropagation(); aBalaye = false; } }, true);
        })();

        // 4. Actions Mois
        document.getElementById('btn-next-month').onclick = () => {
            // Audit 09-07 : plus aucun mois (dernier supprimé) → on crée le mois civil en cours, vide
            const auj = new Date();
            const last = state.donnees[state.donnees.length - 1] || { nom: NOMS_MOIS[(auj.getMonth() + 11) % 12], annee: auj.getMonth() ? auj.getFullYear() : auj.getFullYear() - 1, revenus: 0, charges: [], provisions: [], fixes: [] };
            let idx = NOMS_MOIS.indexOf(last.nom.split(' ')[0]) + 1;
            let an = last.annee;
            if (idx > 11) { idx = 0; an++; }
            // Audit 09-03 : les lignes recopiées gardaient la date du mois précédent (absentes du Calendrier) → même jour, dans le nouveau mois
            const nbJ = new Date(an, idx + 1, 0).getDate();
            const recaler = (l) => l.date ? { ...l, date: `${an}-${String(idx + 1).padStart(2, '0')}-${String(Math.min(parseInt(String(l.date).slice(8, 10), 10) || 1, nbJ)).padStart(2, '0')}` } : l;
            
            const nouveau = normaliserMois({
                id: genId(),
                nom: NOMS_MOIS[idx] + " " + an,
                annee: an,
                revenus: last.revenus,
                revenus_add: 0,
                especes_add: 0,
                charges: (last.charges || []).map(c => recaler({ ...c, id: genId(), montant: 0 })),
                depenses: [],
                provisions: (last.provisions || []).map(p => recaler({ ...p, id: genId(), montant: 0 })),
                fixes: last.fixes ? last.fixes.map(f => recaler({ ...f, id: genId(), montant: 0 })) : []
            });
            state.donnees.push(nouveau);
            state.moisActifId = nouveau.id;
            sauvegarderDonnees();
        };

        document.getElementById('btn-del-month').onclick = () => {
            const idASupprimer = state.moisActifId; // figé à l'ouverture de la boîte de dialogue
            const nomMois = (getMoisActif() || {}).nom || 'ce mois';
            dialogue({ titre: 'Supprimer ' + nomMois + ' ?', texte: 'Le mois et toutes ses lignes seront supprimés définitivement.', ok: 'Supprimer', annuler: 'Annuler', danger: true }).then((oui) => {
                if (!oui) return;
                state.donnees = state.donnees.filter(m => m.id !== idASupprimer);
                state.moisActifId = state.donnees.length ? state.donnees[state.donnees.length - 1].id : null;
                setSyncDot('saving');
                refMois(idASupprimer).delete().then(() => setSyncDot('online')).catch((e) => { console.error(e); setSyncDot('offline'); duoEchec(e, 'Suppression'); });
            });
        };

        // Audit 09-01 : verse la suppression en attente dans la corbeille (avant une 2e suppression, ou app mise en arrière-plan)
        const verserEnCorbeille = () => {
            if (!state.suppressionEnAttente) return;
            state.corbeille.unshift({ ...state.suppressionEnAttente.item, typeOriginal: state.suppressionEnAttente.type });
            state.suppressionEnAttente = null;
            sauvegarderConfig(true);
        };
        window.addEventListener('pagehide', verserEnCorbeille);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') verserEnCorbeille(); });

        // 5. Manipulation des lignes (Délégation d'événements)
        const setupTableListeners = (containerId) => {
            // Lot 2 : aussi rejouée au « change » — un instantané Firestore reçu pendant la saisie remplace
            // state.donnees (le re-rendu attend la sortie du champ) : la valeur affichée est réappliquée avant d'enregistrer.
            const majChamp = (e) => {
                const mois = getMoisActif();
                const { id, type, field } = e.target.dataset;
                if (!mois || !type || !Array.isArray(mois[type])) return; // V2 : champs de revenus (gérés plus bas) dans la même feuille
                const item = mois[type].find(x => x.id === id);
                if (item) {
                    if (field === 'montant') {
                        let val = parseFloat(String(e.target.value).replace(',', '.').replace(/\s/g, '')) || 0; // clavier décimal FR : virgule
                        item.montant = val;
                        // Audit 09-02 : en Mixte, la part espèces ne peut pas dépasser le nouveau montant
                        if (item.moyenPaiement === 'MIXTE') item.montantEspeces = Math.min(Math.max(parseFloat(item.montantEspeces) || 0, 0), Math.max(val, 0));
                    } else {
                        item[field] = e.target.value;
                    }
                    
                    if (field === 'libelle' && type === 'depenses' && REGEX_SUPERMARCHE.test(item.libelle)) {
                        item.categorie = "🛒 Courses";
                        const sel = e.target.closest('.item-row').querySelector('select');
                        if(sel) sel.value = item.categorie;
                    }
                    if (e.target.tagName === 'TEXTAREA') autoResize(e.target);
                    if (field === 'montant') e.target.classList.toggle('montant-neg', item.montant < 0);
                }
            };
            document.getElementById(containerId).addEventListener('input', majChamp);

            document.getElementById(containerId).addEventListener('change', (e) => {
                majChamp(e);
                sauvegarderDonnees();
                planifierRendu(); // Lot 2 : différé — un re-rendu immédiat (au blur) avalait le toucher sur la pastille / le bouton voisin
                // NOTIFICATIONS (30/09/2026) : une dépense qui vient de recevoir un montant prévient l'autre
                const d = e.target && e.target.dataset;
                if (d && d.type === 'depenses' && d.id) planifierNotifDepense(state.moisActifId, d.id);
            });

            document.getElementById(containerId).addEventListener('click', (e) => {
                const delBtn = e.target.closest('[data-del-id]');
                if (delBtn) {
                    const { delType, delId } = delBtn.dataset;
                    const mois = getMoisActif();
                    const idx = mois[delType].findIndex(x => x.id === delId);
                    if (idx < 0) return; // audit 09-08 : splice(-1) retirait la dernière ligne
                    const item = mois[delType].splice(idx, 1)[0];
                    
                    // Toast Annuler — audit 09-01 : la suppression précédente part d'abord en corbeille (sinon perdue)
                    verserEnCorbeille();
                    state.suppressionEnAttente = { type: delType, item, moisId: state.moisActifId, index: idx };
                    const toast = document.getElementById('toast');
                    toast.classList.add('show');
                    clearTimeout(state.toastTimeout);
                    state.toastTimeout = setTimeout(() => {
                        toast.classList.remove('show');
                        verserEnCorbeille();
                    }, 4000);
                    
                    sauvegarderDonnees();
                    rafraichirTouteLInterface();
                    return;
                }

                // Lot 2 : ± bascule dépense / remboursement (le clavier décimal n'a pas de signe moins)
                const signe = e.target.closest('[data-signe]');
                if (signe) {
                    const item = getMoisActif().depenses.find(x => x.id === signe.dataset.signe);
                    const champ = signe.closest('.item-row').querySelector('[data-field="montant"]');
                    if (!item || !champ) return;
                    if (!item.montant) { champ.value = '-'; champ.focus(); return; } // pendant le geste : le clavier s'ouvre
                    item.montant = -item.montant;
                    if (item.moyenPaiement === 'MIXTE') item.montantEspeces = Math.min(parseFloat(item.montantEspeces) || 0, Math.max(item.montant, 0));
                    champ.value = item.montant;
                    champ.classList.toggle('montant-neg', item.montant < 0);
                    sauvegarderDonnees();
                    return;
                }
                const catR = e.target.closest('[data-cat-rapide]');
                if (catR) {
                    const item = getMoisActif().depenses.find(x => x.id === catR.dataset.id);
                    if (!item) return;
                    item.categorie = catR.dataset.catRapide;
                    const row = catR.closest('.item-row');
                    const sel = row.querySelector('select[data-field="categorie"]');
                    if (sel) sel.value = item.categorie;
                    row.querySelectorAll('.cat-rapide').forEach(b => b.classList.toggle('on', b === catR));
                    sauvegarderDonnees();
                    planifierNotifDepense(state.moisActifId, item.id);
                    return;
                }

                const payBtn = e.target.closest('[data-pay]');
                if (payBtn) {
                    const item = getMoisActif().depenses.find(x => x.id === payBtn.dataset.pay);
                    const meths = ['CB', 'ESPECES', 'MIXTE']; // Ticket Resto (legacy) n'est plus proposé
                    if (item.moyenPaiement === 'TR') {
                        // Une ancienne ligne Ticket Resto qu'on touche rejoint le nouveau cycle, en repartant de Carte
                        item.moyenPaiement = 'CB';
                    } else {
                        item.moyenPaiement = meths[(meths.indexOf(item.moyenPaiement || 'CB') + 1) % meths.length];
                    }
                    if (item.moyenPaiement === 'MIXTE' && item.montantEspeces === undefined) item.montantEspeces = 0;
                    sauvegarderDonnees();
                    rafraichirTouteLInterface();
                    return;
                }

                // Boutons ±5€ du mode Mixte : la part espèces avance par paliers de 5, jamais de saisie libre.
                const mixteBtn = e.target.closest('[data-mixte-decr], [data-mixte-incr]');
                if (mixteBtn) {
                    const id = mixteBtn.dataset.mixteDecr || mixteBtn.dataset.mixteIncr;
                    const item = getMoisActif().depenses.find(x => x.id === id);
                    if (item) {
                        const max = Math.max(parseFloat(item.montant) || 0, 0);
                        const cur = parseFloat(item.montantEspeces) || 0;
                        const delta = mixteBtn.dataset.mixteIncr !== undefined ? 5 : -5;
                        item.montantEspeces = Math.min(Math.max(cur + delta, 0), max);
                        sauvegarderDonnees();
                        rafraichirTouteLInterface();
                    }
                }
            });

            // Glisser verticalement sur le chiffre pour ajuster la part espèces (mode Mixte), par paliers de 5€.
            // Mise à jour visuelle immédiate pendant le geste (sans re-render, pour ne pas casser la capture du
            // pointeur), sauvegarde uniquement au relâchement.
            document.getElementById(containerId).addEventListener('pointerdown', (e) => {
                const scrub = e.target.closest('[data-mixte-scrub]');
                if (!scrub) return;
                const item = getMoisActif().depenses.find(x => x.id === scrub.dataset.mixteScrub);
                if (!item) return;
                e.preventDefault(); // priorité au drag : empêche tout défilement de la page dès que le doigt se pose sur la zone
                mixteDragId = item.id;
                mixteDragStartY = e.clientY;
                mixteDragStartVal = Math.min(Math.max(parseFloat(item.montantEspeces) || 0, 0), Math.max(parseFloat(item.montant) || 0, 0));
                mixteDragLive = mixteDragStartVal;
                scrub.setPointerCapture(e.pointerId);
            }, { passive: false });
            document.getElementById(containerId).addEventListener('pointermove', (e) => {
                if (!mixteDragId) return;
                e.preventDefault(); // idem : le geste en cours ne doit jamais faire défiler la page en dessous
                const item = getMoisActif().depenses.find(x => x.id === mixteDragId);
                if (!item) return;
                const max = Math.max(parseFloat(item.montant) || 0, 0);
                const deltaY = mixteDragStartY - e.clientY;
                const steps = Math.round(deltaY / 18);
                mixteDragLive = Math.min(Math.max(mixteDragStartVal + steps * 5, 0), max);
                const valueEl = document.querySelector(`[data-mixte-scrub="${CSS.escape(String(mixteDragId))}"] .mixte-value`);
                if (valueEl) valueEl.textContent = mixteDragLive.toFixed(0) + ' €';
            }, { passive: false });
            const finirGlisserMixte = () => {
                if (!mixteDragId) return;
                const item = getMoisActif().depenses.find(x => x.id === mixteDragId);
                if (item && mixteDragLive !== null) {
                    item.montantEspeces = mixteDragLive;
                    sauvegarderDonnees();
                    rafraichirTouteLInterface();
                }
                mixteDragId = null; mixteDragLive = null;
            };
            document.getElementById(containerId).addEventListener('pointerup', finirGlisserMixte);
            document.getElementById(containerId).addEventListener('pointercancel', finirGlisserMixte);
        };

        // NOTIFICATIONS DU DUO (30/09/2026) — voir README, « Notifications »
        // Une dépense est saisie ligne par ligne (bouton +, puis libellé et montant dans n'importe quel
        // ordre) : il n'y a pas de bouton « Valider ». On attend donc NOTIF_DELAI_MS après le dernier
        // champ modifié (le libellé a le temps d'arriver), puis on envoie UNE notification à l'autre
        // profil via notifierDuo() (../commun.js → relais Apps Script). Envoi anticipé si l'app passe
        // en arrière-plan (keepalive). La ligne reçoit notifie:true (enregistré dans le mois) : jamais
        // deux notifications pour la même dépense, même modifiée ensuite ou sur l'autre téléphone.
        // Pas de notification pour : montant nul ou négatif (remboursement), ligne supprimée entre-temps,
        // dépense datée de plus de 2 jours (anciennes lignes modifiées, antérieures à cette fonction).
        const NOTIF_DELAI_MS = 15000;
        const notifsEnAttente = new Map();   // id de ligne → { moisId, minuteur }
        const ilYaJours = (j) => { const d = new Date(); d.setDate(d.getDate() - j); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
        const trouverDepense = (moisId, id) => {
            const m = state.donnees.find(x => x.id === moisId);
            return { mois: m, item: m && (m.depenses || []).find(x => x.id === id) };
        };
        function planifierNotifDepense(moisId, id) {
            const { item } = trouverDepense(moisId, id);
            if (!item || item.notifie || !(parseFloat(item.montant) > 0) || (item.date && item.date < ilYaJours(2))) return;
            const avant = notifsEnAttente.get(id);
            if (avant) clearTimeout(avant.minuteur);
            notifsEnAttente.set(id, { moisId, minuteur: setTimeout(() => envoyerNotifDepense(id, false), NOTIF_DELAI_MS) });
        }
        function envoyerNotifDepense(id, keepalive) {
            const attente = notifsEnAttente.get(id);
            if (!attente) return;
            clearTimeout(attente.minuteur);
            notifsEnAttente.delete(id);
            const { mois, item } = trouverDepense(attente.moisId, id);
            const montant = item ? parseFloat(item.montant) : 0;
            if (!item || item.notifie || !(montant > 0) || typeof window.notifierDuo !== 'function') return;
            item.notifie = true;
            sauvegarderMois(mois);
            const qui = localStorage.getItem('duo_profile') === 'lisa' ? 'Lisa' : 'Corentin';
            const libelle = String(item.libelle || '').trim().split('\n')[0].slice(0, 60);
            const details = [libelle, item.categorie || ''].filter(Boolean).join(' · ');
            window.notifierDuo({
                titre: 'Dépense de ' + qui,
                corps: montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' + (details ? ' — ' + details : ''),
                url: './Budget/',
                tag: 'depense-' + item.id,   // audit 16-02 : un doublon (page tuée après l'envoi keepalive) remplace la 1re notification
                keepalive
            });
        }
        const envoyerNotifsEnAttente = () => { Array.from(notifsEnAttente.keys()).forEach((id) => envoyerNotifDepense(id, true)); };
        window.addEventListener('pagehide', envoyerNotifsEnAttente);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') envoyerNotifsEnAttente(); });

        setupTableListeners('v2-sheets'); // V2 : les listes éditables sont dans les feuilles
        setupTableListeners('vue-fixes');

        // Date du jour en heure locale (toISOString donne l'UTC : une saisie après minuit tombait la veille, 20/10/2026)
        const dateLocale = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        // 6. Ajout de lignes
        document.body.addEventListener('click', (e) => {
            const type = e.target.dataset.add;
            if (type) {
                const mois = getMoisActif();
                if (!mois || !Array.isArray(mois[type])) return; // audit 09-07 : aucun mois
                // Audit 09-06 : dans un autre mois que le mois civil, la ligne est datée du même jour dans ce mois (borné)
                const maint = new Date();
                let dateLigne = dateLocale(maint);
                const iM = NOMS_MOIS.indexOf(String(mois.nom || '').split(' ')[0]);
                if (iM >= 0 && mois.annee && (iM !== maint.getMonth() || mois.annee !== maint.getFullYear()))
                    dateLigne = dateLocale(new Date(mois.annee, iM, Math.min(maint.getDate(), new Date(mois.annee, iM + 1, 0).getDate())));
                const nouv = { id: genId(), libelle: "", montant: 0, date: dateLigne, categorie: state.categories[0] };
                if (type === 'depenses') {
                    nouv.moyenPaiement = 'CB';
                    if (state.categories.includes('🛒 Courses')) nouv.categorie = '🛒 Courses';   // 20/10/2026 : Courses par défaut pour une dépense
                    // V2 : qui a saisi la dépense (point bleu/rose). Champ en plus, ignoré par Budget v1.
                    nouv.par = localStorage.getItem('duo_profile') === 'lisa' ? 'lisa' : 'corentin';
                }
                
                mois[type].unshift(nouv);
                if (type === 'depenses') state.ligneNeuve = nouv.id;
                sauvegarderDonnees();
                rafraichirTouteLInterface();
                // Lot 2 : curseur dans le montant (pendant le geste, sinon iOS n'ouvre pas le clavier)
                const champ = document.querySelector(`#conteneur-${type} .item-row[data-id="${CSS.escape(nouv.id)}"] [data-field="montant"]`);
                if (champ && type !== 'fixes') champ.focus();

                // Déplie automatiquement la carte correspondante si elle était repliée
                const conteneur = document.getElementById('conteneur-' + type);
                if (conteneur && conteneur.classList.contains('collapsed')) {
                    const header = document.querySelector(`.card-header[data-target="conteneur-${type}"]`);
                    toggleSection('conteneur-' + type, header);
                }
            }
        });

        // 7. Recherche
        document.getElementById('search-bar').oninput = (e) => {
            state.termeRecherche = sansAccents(e.target.value);
            rafraichirTouteLInterface();
        };


        // 10. Thème : sombre uniquement depuis le 28/09/2026 (décision de Corentin, valable pour les 4 apps) —
        // bouton lune/soleil et mode clair retirés. Nettoyage de l'ancien réglage (clé LS_DARK).
        try { localStorage.removeItem(LS_DARK); } catch (e) {}

        // 10bis. Profil actif (Corentin/Lisa) — preference par appareil, purement
        // visuelle (couleur d'accent), memorisee dans localStorage. Le compte et
        // les donnees restent partages entre les deux.
        // PROFIL COMMUN AUX 4 APPS (28/09/2026) : clé duo_profile ('corentin' | 'lisa'), partagée avec
        // le Portail, Muscu et Course. L'ancienne clé propre à Budget (budgetLC_profil) est reprise une fois
        // puis effacée.
        const LS_PROFIL = 'duo_profile';
        const applyProfil = (p) => {
            document.body.classList.toggle('profil-lisa', p === 'lisa');
            document.querySelectorAll('.profile-switch-btn').forEach(b => b.classList.toggle('selected', b.dataset.profil === p));
            try { localStorage.setItem(LS_PROFIL, p); } catch (e) {}
        };
        document.getElementById('btn-profil-corentin').onclick = () => applyProfil('corentin');
        document.getElementById('btn-profil-lisa').onclick = () => applyProfil('lisa');
        let profilDepart = null;
        try {
            profilDepart = localStorage.getItem(LS_PROFIL);
            if (profilDepart !== 'corentin' && profilDepart !== 'lisa') profilDepart = localStorage.getItem('budgetLC_profil');
            localStorage.removeItem('budgetLC_profil');
        } catch (e) {}
        applyProfil(profilDepart === 'lisa' ? 'lisa' : 'corentin');

        // 11. Auth Listener (attend que Firestore/Auth soient initialisés avec le cache persistant)
        // 28/09/2026 : #login-screen est MASQUÉ par défaut (index.html) et n'apparaît que si Firebase répond
        // « pas de session » (user === null) — Firebase ne rend ce verdict qu'après avoir relu la session
        // enregistrée sur l'appareil, donc jamais à tort. Avant, l'écran de connexion restait affiché le temps
        // du démarrage de Firebase (import du cache persistant + relecture de la session), même connecté.
        // 29/09/2026 (projet Firebase unique) : la session est PARTAGÉE avec Muscu et Course (même
        // projet, même origine). Course peut avoir ouvert une session ANONYME : elle ne donne pas accès
        // aux données du Budget (règles) → traitée comme « pas connecté », l'écran de connexion s'affiche
        // et la connexion e-mail remplace la session anonyme pour toutes les apps.
        dbReady.then(() => authListen((user) => {
            if (user && !user.isAnonymous) {
                document.getElementById('login-screen').classList.add('hidden');
                if (!unsubMois) attacherEcouteurs(); // jamais deux écoutes (l'état d'auth peut être re-signalé, session partagée)
            } else {
                document.getElementById('login-screen').classList.remove('hidden');
                if (unsubMois) { unsubMois(); unsubMois = null; }
                if (unsubConfig) { unsubConfig(); unsubConfig = null; }
            }
        }));

        // Sauvegarde Mail — 04/10/2026 (audit) : passe par le RELAIS (window.RELAIS_DUO, commun.js §7) avec le
        // jeton de la session : seul le compte du duo peut déclencher le mail (outils/Sauvegarde.gs).
        // L'ancienne URL (…AKfycbwW3w…) acceptait n'importe quel envoi sans jeton. Réponse lisible :
        // l'app affiche le vrai résultat au lieu d'un « envoyée » systématique.
        document.getElementById('btn-sauvegarde-mail').onclick = (e) => {
            const btn = e.currentTarget;
            const u = auth.currentUser;
            if (!u || u.isAnonymous) { dialogue({ titre: 'Connexion requise' }); return; }
            if (!state.donnees.length) { dialogue({ titre: 'Rien à sauvegarder' }); return; }
            if (!window.RELAIS_DUO) { dialogue({ titre: '❌ Erreur', texte: 'Relais indisponible.' }); return; }
            const originalText = btn.innerText; btn.innerText = "⏳ Envoi..."; btn.disabled = true;
            const fin = () => { btn.innerText = originalText; btn.disabled = false; };
            u.getIdToken()
                // text/plain : requête « simple », sans pré-vérification CORS (voir commun.js §7)
                .then((jeton) => fetch(window.RELAIS_DUO, { method: 'POST', redirect: 'follow', body: JSON.stringify({ action: 'sauvegarde', app: 'budget', idToken: jeton, donnees: state.donnees }) }))
                .then((rep) => rep.json())
                .then((r) => {
                    fin();
                    if (r && r.ok) dialogue({ titre: '✅ Sauvegarde envoyée', texte: 'Vérifie ta boîte mail.' });
                    else dialogue({ titre: '❌ Sauvegarde refusée', texte: (r && r.erreur) || 'Erreur inconnue.' });
                })
                .catch(() => { fin(); dialogue({ titre: '❌ Erreur', texte: "La sauvegarde n'a pas pu être envoyée." }); });
        };

        // Importation manuelle
        const importInput = document.getElementById('import-json');
        if(importInput) {
            importInput.addEventListener('change', function(e) {
                const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
                reader.onload = function(evt) {
                    try {
                        const imported = JSON.parse(evt.target.result);
                        const nouvellesDonnees = trierMois(validerImport(imported).map(normaliserMois)); // lève une erreur si le fichier est invalide
                        const nbSupprimes = state.donnees.filter(m => !nouvellesDonnees.some(n => String(n.id) === String(m.id))).length;
                        const texte = nouvellesDonnees.length + ' mois dans le fichier. Les données actuelles seront remplacées'
                            + (nbSupprimes ? ' et ' + nbSupprimes + ' mois absent(s) du fichier seront supprimés.' : '.');
                        dialogue({ titre: 'Écraser les données ?', texte, ok: 'Écraser', annuler: 'Annuler', danger: true }).then((oui) => {
                            if (!oui) { importInput.value = ''; return; }
                            restaurerCollectionComplete(nouvellesDonnees).then(() => {
                                state.donnees = nouvellesDonnees;
                                state.moisActifId = state.donnees.length ? state.donnees[state.donnees.length-1].id : null;
                                dialogue({ titre: '✅ Restauration réussie' });
                                changerVue('mensuelle');
                            }).catch(() => dialogue({ titre: '❌ Erreur', texte: "Erreur lors de la restauration, rien n'a été modifié." }));
                        });
                    } catch(err) { importInput.value = ''; dialogue({ titre: 'Fichier invalide', texte: (err && err.message) || '' }); }
                }; reader.readAsText(file);
            });
        }

        document.getElementById('btn-add-obj').onclick = () => {
            const nom = document.getElementById('new-obj-nom').value;
            const montant = parseFloat(document.getElementById('new-obj-mnt').value);
            if (nom && montant) { state.objectifsProvisions.push({ nom, montant }); sauvegarderConfig(); rendreAdmin(); }
        };

        document.getElementById('btn-undo').onclick = () => {
            if (state.suppressionEnAttente) {
                const { type, item, moisId, index } = state.suppressionEnAttente;
                const mois = state.donnees.find(m => m.id === moisId);
                if (!mois || !Array.isArray(mois[type])) { verserEnCorbeille(); return; } // mois supprimé entre-temps : la ligne va en corbeille
                mois[type].splice(index, 0, item);
                state.suppressionEnAttente = null;
                document.getElementById('toast').classList.remove('show');
                sauvegarderMois(mois); rafraichirTouteLInterface();
            }
        };

        // Inputs de revenus (Vue Mensuelle)
        document.querySelectorAll('[data-field]').forEach(inp => {
            inp.onchange = (e) => {
                const mois = getMoisActif();
                mois[e.target.dataset.field] = parseFloat(e.target.value) || 0;
                sauvegarderDonnees();
                rafraichirTouteLInterface();
            };
        });

        // 13. Events globaux
        document.getElementById('select-annee').onchange = (e) => rendreVueAnnuelle();

        document.getElementById('vue-admin').addEventListener('click', (e) => {
            // Supprimer objectif
            const delObj = e.target.closest('[data-del-obj]');
            if (delObj) { state.objectifsProvisions.splice(parseInt(delObj.dataset.delObj), 1); sauvegarderConfig(true); rendreAdmin(); return; }

            // Restaurer depuis corbeille
            const restore = e.target.closest('[data-restore]');
            if (restore) { restaurerCorbeille(parseInt(restore.dataset.restore)); return; }

            // Vider corbeille
            if (e.target.id === 'btn-vider-corbeille') { viderCorbeille(); return; }
        });

        // Accordéon (toutes les cartes, toutes les vues) — écouteur global délégué
        document.body.addEventListener('click', (e) => {
            const header = e.target.closest('.card-header[data-target]');
            if (header) toggleSection(header.dataset.target, header);
        });

        // --- Hors-ligne ---
        window.addEventListener('offline', () => {
            setSyncDot('offline');   // « Hors ligne » en texte (verre.css, lot 3) ; ancien pop-up retiré : il disait à tort que rien n'était enregistré
        });
        window.addEventListener('online', () => {
            setSyncDot('online');
        });

        /* Date de MAJ, service worker et vérification de version : dans ../commun.js (noyau commun aux 4 apps,
           28/09/2026), chargé par index.html. */
