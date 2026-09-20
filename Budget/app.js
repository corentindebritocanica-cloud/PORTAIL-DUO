/* app.js — code de l'app.
   Extrait des anciens <script> inline de index.html le 20/09/2026 (contenu inchangé,
   sauf la constante DERNIERE_MAJ, qui reste dans index.html : voir README). */
        // Firebase compat — scripts chargés en <head>
        const firebaseConfig = {
            apiKey: "AIzaSyBro9AXaoXhSptyUVxoKVtr6xC4rtZQ3FI",
            authDomain: "lisa-et-corentin.firebaseapp.com",
            databaseURL: "https://lisa-et-corentin-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "lisa-et-corentin",
            storageBucket: "lisa-et-corentin.firebasestorage.app",
            messagingSenderId: "694332145017",
            appId: "1:694332145017:web:1bf6fb387f54d46b1643a8"
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
        const authLogout  = ()           => auth.signOut();

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

        // --- Utilitaires ---
        const eur = (n) => (parseFloat(n) || 0).toFixed(2) + " €";
        const genId = () => Math.random().toString(36).substr(2, 9);
        const sansAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        
        const somme = (arr) => (arr || []).reduce((s, i) => s + (parseFloat(i.montant) || 0), 0);
        const sommeCB = (arr) => (arr || []).reduce((s, i) => (!i.moyenPaiement || i.moyenPaiement === 'CB' ? s + (parseFloat(i.montant) || 0) : s), 0);

        const normaliserMois = (m) => ({
            ...m,
            charges: Array.isArray(m.charges) ? m.charges : (m.charges ? Object.values(m.charges) : []),
            depenses: Array.isArray(m.depenses) ? m.depenses : (m.depenses ? Object.values(m.depenses) : []),
            epargne: Array.isArray(m.epargne) ? m.epargne : (m.epargne ? Object.values(m.epargne) : []),
            provisions: Array.isArray(m.provisions) ? m.provisions : (m.provisions ? Object.values(m.provisions) : []),
            fixes: Array.isArray(m.fixes) ? m.fixes : (m.fixes ? Object.values(m.fixes) : []), 
            revenus_add: m.revenus_add || 0,
            annee: m.annee || parseInt(m.nom.split(' ')[1])
        });

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

        const autoResize = (el) => {
            el.style.height = '24px';
            el.style.height = el.scrollHeight + 'px';
        };

        // --- Comparaison et Changelog ---
        const extractAllItems = (dataArray) => {
            let items = {};
            (dataArray || []).forEach(m => {
                ['charges', 'depenses', 'epargne', 'provisions', 'fixes'].forEach(type => {
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
            const moisTxt = (it) => `<span style="color:var(--text-muted); font-size:0.8em;">(${esc(it.moisNom)})</span>`;
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
                        const avant = mOld !== mNew ? `<s style="color:var(--text-muted);">${mOld}€</s> → ` : '';
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
            document.getElementById('changelog-content').innerHTML = changes.map(d => `<div style="padding: 8px 0; border-bottom: 1px solid var(--border);">${d}</div>`).join('');
            document.getElementById('changelog-popup').classList.remove('hidden');
            state.popupOuvert = true;
        };

        document.getElementById('btn-close-changelog').onclick = () => {
            document.getElementById('changelog-popup').classList.add('hidden');
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

        // --- Logique DB ---
        const attacherEcouteurs = () => {
            unsubMois = colMois().onSnapshot((snap) => {
                let data = [];
                snap.forEach(doc => data.push(doc.data()));
                data = data.map(normaliserMois);
                const depuisCache = snap.metadata.fromCache;            // vrai = données du cache local, pas encore du serveur
                const ecrituresLocales = snap.metadata.hasPendingWrites; // vrai = écho de MA modification

                if (data.length) {
                    state.firstLoad = false;
                    state.donnees = trierMois(data);
                    if (!state.moisActifId || !state.donnees.find(m => m.id === state.moisActifId)) {
                        state.moisActifId = state.donnees[state.donnees.length - 1].id;
                    }
                    gererNouveautes(state.donnees, depuisCache, ecrituresLocales);
                    rafraichirTouteLInterface();
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
                    state.corbeille = c.corbeille || [];
                    state.objectifsProvisions = c.objectifsProvisions || [];
                    rafraichirTouteLInterface();
                }
            }, (err) => { console.error("Erreur écoute Firestore (config) :", err); setSyncDot('offline'); });
        };

        const sauvegarderMois = (mois) => {
            setSyncDot('saving');
            refMois(mois.id).set(clean(mois)).then(() => setSyncDot('online')).catch((e) => { console.error(e); setSyncDot('offline'); });
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
            return batch.commit().then(() => setSyncDot('online')).catch((e) => { console.error(e); setSyncDot('offline'); throw e; });
        };


        const sauvegarderConfig = (silencieux = false) => {
            if(!silencieux) setSyncDot('saving');
            refConfig().set(clean({
                categories: state.categories,
                corbeille: state.corbeille,
                objectifsProvisions: state.objectifsProvisions
            })).then(() => { if(!silencieux) setSyncDot('online'); }).catch((e) => { console.error(e); setSyncDot('offline'); });
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
            else if (state.vueActuelle === 'vacances') rendreVueVacances();
            else if (state.vueActuelle === 'admin') rendreAdmin();
        };

        const rendreMenu = () => {
            const list = document.getElementById('month-list');
            list.innerHTML = '';
            const groupes = {};
            state.donnees.forEach(m => {
                if (!groupes[m.annee]) groupes[m.annee] = [];
                groupes[m.annee].push(m);
            });

            Object.keys(groupes).sort((a,b) => b-a).forEach(annee => {
                const open = state.anneesOuvertes.has(parseInt(annee));
                const div = document.createElement('div');
                div.className = 'year-group';
                div.innerHTML = `<div class="year-header ${!open ? 'collapsed' : ''}" data-year="${annee}">${annee}</div>
                                 <div class="month-sublist ${!open ? 'hidden' : ''}"></div>`;
                const sub = div.querySelector('.month-sublist');
                groupes[annee].reverse().forEach(m => {
                    const pill = document.createElement('div');
                    pill.className = `month-pill ${m.id === state.moisActifId ? 'active' : ''}`;
                    pill.innerText = m.nom.split(' ')[0];
                    pill.onclick = () => { state.moisActifId = m.id; rafraichirTouteLInterface(); };
                    sub.appendChild(pill);
                });
                list.appendChild(div);
            });
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
                // L'épargne et les Tickets Restos/Especes sont exclus
                solde += (rev - tc - tdCB - tprov);
            }
            return solde;
        };

        // --- Rendu des tableaux ---
        const rendreLignes = (containerId, tableau, type) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';

            const filtered = (tableau || []).filter(i => sansAccents(i.libelle || i.categorie || "").includes(state.termeRecherche));

            filtered.forEach(item => {
                const row = document.createElement('div');
                row.className = 'item-row';
                row.dataset.id = item.id;

                const isNeg = (item.montant < 0) || item.isRetrait;
                const style = isNeg ? 'color:var(--danger);' : '';
                const mntFinal = isNeg ? Math.abs(item.montant || 0) : (item.montant || 0);

                // CONDITION SPECIALE: ONGLET FIXES MINIMALISTE
                if (type === 'fixes') {
                    row.innerHTML = `
                        <div class="drag-handle">☰</div>
                        <div class="item-content" style="flex-direction: row; align-items: center; justify-content: space-between;">
                            <select data-id="${item.id}" data-type="${type}" data-field="categorie" style="flex:1; font-weight:600; background:none; border:none; padding:0; font-size:1rem !important;">
                                ${state.categories.map(c => `<option value="${c}" ${item.categorie === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                            <div style="display:flex; align-items:center;">
                                <input type="number" value="${mntFinal}" style="${style} width:85px; text-align:right; font-weight:700; border:none; background:var(--bg-color); padding:8px; border-radius:8px;" data-id="${item.id}" data-type="${type}" data-field="montant">
                            </div>
                        </div>
                        <button class="btn-delete" data-del-type="${type}" data-del-id="${item.id}">✕</button>
                    `;
                } 
                // AFFICHAGE CLASSIQUE POUR LES AUTRES ONGLETS
                else {
                    let payIcon = '';
                    if (type === 'depenses') {
                        const meth = item.moyenPaiement || 'CB';
                        const icon = meth === 'TR' ? '🎟️' : (meth === 'ESPECES' ? '💵' : '💳');
                        payIcon = `<button class="btn-pay-method" data-pay="${item.id}">${icon}</button>`;
                    }

                    row.innerHTML = `
                        <div class="drag-handle">☰</div>
                        <div class="item-content">
                            <div class="item-top">
                                <textarea data-id="${item.id}" data-type="${type}" data-field="libelle" placeholder="Note...">${item.libelle || ''}</textarea>
                                <div style="display:flex; align-items:center;">
                                    ${isNeg ? '-' : ''}<input type="number" value="${mntFinal}" style="${style}" data-id="${item.id}" data-type="${type}" data-field="montant">
                                    ${payIcon}
                                </div>
                            </div>
                            <div class="item-bottom">
                                <input type="date" value="${item.date || ''}" data-id="${item.id}" data-type="${type}" data-field="date">
                                <select data-id="${item.id}" data-type="${type}" data-field="categorie">
                                    ${state.categories.map(c => `<option value="${c}" ${item.categorie === c ? 'selected' : ''}>${c}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <button class="btn-delete" data-del-type="${type}" data-del-id="${item.id}">✕</button>
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
                    const ids = Array.from(container.children).map(r => r.dataset.id);
                    const mois = getMoisActif();
                    mois[type] = ids.map(id => (mois[type] || []).find(x => x.id === id));
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
            document.getElementById('solde_reporte').value = report.toFixed(2);
            document.getElementById('revenus').value = mois.revenus || 0;
            document.getElementById('revenus_add').value = mois.revenus_add || 0;

            rendreLignes('conteneur-charges', mois.charges, 'charges');
            rendreLignes('conteneur-depenses', mois.depenses, 'depenses');
            rendreLignes('conteneur-epargne',  mois.epargne,  'epargne');
            rendreLignes('conteneur-provisions', mois.provisions, 'provisions');

            calculerTotauxMensuels(mois, report);
        };

        const calculerTotauxMensuels = (m, report) => {
            const tc = somme(m.charges);
            const tdTotal = somme(m.depenses);
            const tdCB = sommeCB(m.depenses);
            const te = somme(m.epargne);
            const tprov = somme(m.provisions);
            const totalRev = report + (parseFloat(m.revenus) || 0) + (parseFloat(m.revenus_add) || 0);

            const reste = totalRev - tc - tdCB - tprov; // L'épargne (te) n'est plus soustraite car c'est un compte à part

            document.getElementById('total-charges').innerText = tc.toFixed(0);
            document.getElementById('total-epargne').innerText = te.toFixed(0);
            document.getElementById('total-provisions').innerText = tprov.toFixed(0);
            document.getElementById('reste-a-vivre').innerText = eur(reste);

            const tdDiff = tdTotal - tdCB;
            document.getElementById('titre-depenses').innerHTML = `🛒 Dépenses (${tdTotal.toFixed(0)}€) ${tdDiff > 0 ? `<small style="font-weight:normal; opacity:0.6;">(dont ${tdDiff.toFixed(0)}€ 🎟️/💵)</small>` : ''}`;

            // Jauges
            const globalTotal = tc + tdTotal + Math.abs(te) + tprov + (reste > 0 ? reste : 0);
            const fmt = (n) => { const v = parseFloat(n) || 0; return parseFloat(v.toFixed(2)).toString().replace('.', ','); };
            const setBar = (id, val) => {
                const p = globalTotal > 0 ? Math.round((val / globalTotal) * 100) : 0;
                document.getElementById(`bar-${id}-m`).style.width = p + '%';
                document.getElementById(`pct-${id}-m`).innerText = fmt(val) + ' € · ' + p + '%';
            };
            setBar('charges', tc); setBar('depenses', tdTotal); setBar('epargne', Math.abs(te)); setBar('provisions', tprov); setBar('reste', reste > 0 ? reste : 0);

            // Jours restants
            const [n, a] = m.nom.split(' ');
            const mIdx = NOMS_MOIS.indexOf(n);
            const today = new Date();
            if (today.getFullYear() === parseInt(a) && today.getMonth() === mIdx) {
                const last = new Date(today.getFullYear(), mIdx + 1, 0).getDate();
                document.getElementById('jours-restants').innerText = (last - today.getDate()) + " jours restants";
            } else {
                document.getElementById('jours-restants').innerText = "Mois clôturé";
            }
        };

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
            if (!sel.options.length) {
                const ans = [...new Set(state.donnees.map(m => m.annee))].sort((a,b) => b-a);
                ans.forEach(a => sel.add(new Option(a, a)));
                sel.onchange = rendreVueAnnuelle;
            }
            const an = parseInt(sel.value);
            const mois = state.donnees.filter(m => m.annee === an);
            
            let te = 0, tc = 0, td = 0, tp = 0;
            mois.forEach(m => {
                te += (m.epargne || []).reduce((s, i) => s + (parseFloat(i.montant) || 0), 0);
                tc += somme(m.charges);
                td += somme(m.depenses);
                tp += somme(m.provisions);
            });

            document.getElementById('annuel-total-epargne').innerText = eur(te);
            
            const bloc = document.getElementById('bloc-annuel-stats');
            bloc.innerHTML = `
                <div class="progress-container"><div class="progress-header"><span>🏠 Charges Fixes</span><span>${eur(tc)}</span></div></div>
                <div class="progress-container"><div class="progress-header"><span>🛒 Dépenses</span><span>${eur(td)}</span></div></div>
                <div class="progress-container"><div class="progress-header"><span>🛡️ Provisions</span><span>${eur(tp)}</span></div></div>
            `;

            const parseMontant = (v) => parseFloat(String(v).replace(',', '.')) || 0;
            state.objectifsProvisions.forEach(obj => {
                let totalObj = 0;
                const search = sansAccents(obj.nom).trim();
                mois.forEach(m => {
                    [...(m.provisions||[]), ...(m.epargne||[])].forEach(line => {
                        const cat = sansAccents(line.categorie || '').replace(/[^\w\s]/g, '').trim();
                        if (cat.includes(search)) totalObj += parseMontant(line.montant);
                    });
                });
                const pct = Math.min(Math.round((totalObj / obj.montant) * 100), 100);
                bloc.innerHTML += `
                    <div style="margin-top:20px;">
                        <div class="progress-header"><span>🎯 ${obj.nom}</span><span>${totalObj.toFixed(2)} / ${obj.montant}€</span></div>
                        <div class="progress-track"><div class="progress-fill" style="background:var(--secondary); width:${pct}%"></div></div>
                    </div>
                `;
            });
        };

        // --- Vue Vacances ---
        // --- Vue Admin RESTAURÉE ---
        const rendreAdmin = () => {
            const catDiv = document.getElementById('admin-categories');
            catDiv.innerHTML = state.categories.map((c, i) => `
                <div class="month-pill" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <span>${c}</span><button class="btn-delete" data-del-cat="${i}">✕</button>
                </div>
            `).join('');

            const objDiv = document.getElementById('admin-objectifs');
            objDiv.innerHTML = state.objectifsProvisions.map((o, i) => `
                <div class="month-pill" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <span>${o.nom} (${o.montant}€)</span><button class="btn-delete" data-del-obj="${i}">✕</button>
                </div>
            `).join('');

            const corbDiv = document.getElementById('admin-corbeille');
            if (!state.corbeille.length) corbDiv.innerHTML = "<p style='color:var(--text-muted); font-size:0.8rem;'>Corbeille vide.</p>";
            else {
                corbDiv.innerHTML = state.corbeille.slice(0,5).map((item, i) => `
                    <div style="font-size:0.8rem; border-bottom:1px solid var(--border); padding:8px 0; display:flex; justify-content:space-between;">
                        <span>${item.libelle || item.categorie} (${item.montant}€)</span>
                        <button class="btn-small bg-primary" data-restore="${i}" style="color:white; font-size:0.7rem; border-radius:4px; padding:2px 6px;">Restaurer</button>
                    </div>
                `).join('');
            }

        };

        // --- Corbeille : restauration et vidage (remet l'élément dans le mois actif, faute de mois d'origine mémorisé) ---
        const restaurerCorbeille = (index) => {
            const item = state.corbeille[index];
            if (!item) return;
            const mois = getMoisActif();
            if (!mois) { alert("Sélectionnez d'abord un mois pour y restaurer cette ligne."); return; }

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
            if (confirm("Vider définitivement la corbeille ?")) {
                state.corbeille = [];
                sauvegarderConfig();
                rendreAdmin();
            }
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
            const header = e.target.closest('.year-header');
            if (header) {
                const an = parseInt(header.dataset.year);
                if (state.anneesOuvertes.has(an)) state.anneesOuvertes.delete(an);
                else state.anneesOuvertes.add(an);
                rendreMenu();
            }
        });

        // 4. Actions Mois
        document.getElementById('btn-next-month').onclick = () => {
            const last = state.donnees[state.donnees.length - 1];
            let idx = NOMS_MOIS.indexOf(last.nom.split(' ')[0]) + 1;
            let an = last.annee;
            if (idx > 11) { idx = 0; an++; }
            
            const nouveau = normaliserMois({
                id: genId(),
                nom: NOMS_MOIS[idx] + " " + an,
                annee: an,
                revenus: last.revenus,
                revenus_add: 0,
                charges: last.charges.map(c => ({ ...c, id: genId(), montant: 0 })),
                depenses: [],
                epargne: [],
                provisions: last.provisions.map(p => ({ ...p, id: genId(), montant: 0 })),
                fixes: last.fixes ? last.fixes.map(f => ({ ...f, id: genId(), montant: 0 })) : []
            });
            state.donnees.push(nouveau);
            state.moisActifId = nouveau.id;
            sauvegarderDonnees();
        };

        document.getElementById('btn-del-month').onclick = () => {
            if (confirm("Supprimer ce mois définitivement ?")) {
                const idASupprimer = state.moisActifId;
                state.donnees = state.donnees.filter(m => m.id !== idASupprimer);
                state.moisActifId = state.donnees.length ? state.donnees[state.donnees.length - 1].id : null;
                setSyncDot('saving');
                refMois(idASupprimer).delete().then(() => setSyncDot('online')).catch((e) => { console.error(e); setSyncDot('offline'); });
            }
        };

        // 5. Manipulation des lignes (Délégation d'événements)
        const setupTableListeners = (containerId) => {
            document.getElementById(containerId).addEventListener('input', (e) => {
                const mois = getMoisActif();
                const { id, type, field } = e.target.dataset;
                const item = mois[type].find(x => x.id === id);
                if (item) {
                    if (field === 'montant') {
                        let val = parseFloat(e.target.value) || 0;
                        item.montant = item.isRetrait ? -Math.abs(val) : val;
                    } else {
                        item[field] = e.target.value;
                    }
                    
                    if (field === 'libelle' && type === 'depenses' && REGEX_SUPERMARCHE.test(item.libelle)) {
                        item.categorie = "🛒 Courses";
                        const sel = e.target.closest('.item-row').querySelector('select');
                        if(sel) sel.value = item.categorie;
                    }
                    if (e.target.tagName === 'TEXTAREA') autoResize(e.target);
                }
            });

            document.getElementById(containerId).addEventListener('change', () => {
                sauvegarderDonnees();
                rafraichirTouteLInterface();
            });

            document.getElementById(containerId).addEventListener('click', (e) => {
                const delBtn = e.target.closest('[data-del-id]');
                if (delBtn) {
                    const { delType, delId } = delBtn.dataset;
                    const mois = getMoisActif();
                    const idx = mois[delType].findIndex(x => x.id === delId);
                    const item = mois[delType].splice(idx, 1)[0];
                    
                    // Toast Annuler
                    state.suppressionEnAttente = { type: delType, item, moisId: state.moisActifId, index: idx };
                    const toast = document.getElementById('toast');
                    toast.classList.add('show');
                    clearTimeout(state.toastTimeout);
                    state.toastTimeout = setTimeout(() => {
                        toast.classList.remove('show');
                        if (state.suppressionEnAttente) {
                            state.corbeille.unshift({ ...state.suppressionEnAttente.item, typeOriginal: state.suppressionEnAttente.type });
                            sauvegarderConfig(true);
                            state.suppressionEnAttente = null;
                        }
                    }, 4000);
                    
                    sauvegarderDonnees();
                    rafraichirTouteLInterface();
                    return;
                }

                const payBtn = e.target.closest('[data-pay]');
                if (payBtn) {
                    const item = getMoisActif().depenses.find(x => x.id === payBtn.dataset.pay);
                    const meths = ['CB', 'TR', 'ESPECES'];
                    item.moyenPaiement = meths[(meths.indexOf(item.moyenPaiement || 'CB') + 1) % 3];
                    sauvegarderDonnees();
                    rafraichirTouteLInterface();
                }
            });
        };

        setupTableListeners('mois-content-wrapper');
        setupTableListeners('vue-fixes');

        // 6. Ajout de lignes
        document.body.addEventListener('click', (e) => {
            const type = e.target.dataset.add;
            if (type) {
                const mois = getMoisActif();
                const nouv = { id: genId(), libelle: "", montant: 0, date: new Date().toISOString().split('T')[0], categorie: state.categories[0] };
                if (type === 'epargne') {
                    if (e.target.dataset.special === 'epargne') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                    else nouv.isRetrait = true;
                }
                if (type === 'depenses') nouv.moyenPaiement = 'CB';
                
                mois[type].unshift(nouv);
                sauvegarderDonnees();
                rafraichirTouteLInterface();

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


        // 10. Initialisation Thème (sombre par defaut - charte UX/UI du 18/09/2026 ;
        // les 10 themes decoratifs "Garde-robe" ont ete retires, seul le mode
        // sombre/clair subsiste desormais, comme sur Muscu/Course/Portail)
        const toggleDark = () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem(LS_DARK, isDark);
            document.getElementById('btn-toggle-dark').innerText = isDark ? '🌙' : '☀️';
            document.getElementById('meta-theme-color').content = isDark ? '#0d1014' : '#eef1f5';
        };
        document.getElementById('btn-toggle-dark').onclick = toggleDark;
        // Sombre par defaut : active sauf si l'utilisateur a explicitement choisi le clair
        // (ancienne logique : dark uniquement si LS_DARK==='true' ; nouvelle logique :
        // dark sauf si LS_DARK==='false' explicitement enregistre par un clic anterieur).
        if (localStorage.getItem(LS_DARK) !== 'false') toggleDark();

        // 10bis. Profil actif (Corentin/Lisa) — preference par appareil, purement
        // visuelle (couleur d'accent), memorisee dans localStorage. Le compte et
        // les donnees restent partages entre les deux.
        const LS_PROFIL = 'budgetLC_profil';
        const applyProfil = (p) => {
            document.body.classList.toggle('profil-lisa', p === 'lisa');
            document.querySelectorAll('.profile-switch-btn').forEach(b => b.classList.toggle('selected', b.dataset.profil === p));
            localStorage.setItem(LS_PROFIL, p);
        };
        document.getElementById('btn-profil-corentin').onclick = () => applyProfil('corentin');
        document.getElementById('btn-profil-lisa').onclick = () => applyProfil('lisa');
        applyProfil(localStorage.getItem(LS_PROFIL) === 'lisa' ? 'lisa' : 'corentin');

        // 11. Auth Listener (attend que Firestore/Auth soient initialisés avec le cache persistant)
        dbReady.then(() => authListen((user) => {
            if (user) {
                document.getElementById('login-screen').classList.add('hidden');
                attacherEcouteurs();
            } else {
                document.getElementById('login-screen').classList.remove('hidden');
                if (unsubMois) { unsubMois(); unsubMois = null; }
                if (unsubConfig) { unsubConfig(); unsubConfig = null; }
            }
        }));

        // Nouveau mois manuel
        document.getElementById('btn-creer-mois').onclick = () => {
            const val = document.getElementById('input-new-month').value;
            if(!val) { alert("Veuillez sélectionner un mois et une année."); return; }
            const parts = val.split('-'); const an = parseInt(parts[0]); const moisIdx = parseInt(parts[1]) - 1;
            const nomMois = NOMS_MOIS[moisIdx] + " " + an;
            
            if(state.donnees.find(m => m.nom === nomMois)) { alert("Ce mois existe déjà !"); return; }
            
            let lastRevenus = 0;
            if(state.donnees.length > 0) lastRevenus = state.donnees[state.donnees.length-1].revenus;
            
            const nouveau = normaliserMois({
                id: genId(), nom: nomMois, annee: an, revenus: lastRevenus, revenus_add: 0,
                charges: [], depenses: [], epargne: [], provisions: [], fixes: []
            });
            
            state.donnees.push(nouveau);
            state.donnees = trierMois(state.donnees);
            state.moisActifId = nouveau.id;
            sauvegarderDonnees(); changerVue('mensuelle');
            document.getElementById('input-new-month').value = "";
        };

        // Sauvegarde Mail
        document.getElementById('btn-sauvegarde-mail').onclick = (e) => {
            const btn = e.target;
            const originalText = btn.innerText; btn.innerText = "⏳ Envoi..."; btn.disabled = true;
            const urlScript = "https://script.google.com/macros/s/AKfycbwW3w-ScyWzRousgkNA7tdUeifNqB_kr2fXbGH1AqUSduOEdqjegbllEcxkkhVAko3ZIA/exec";
            fetch(urlScript, { method: 'POST', mode: 'no-cors', body: JSON.stringify(state.donnees) })
            .then(() => { alert("✅ Sauvegarde envoyée !"); btn.innerText = originalText; btn.disabled = false; })
            .catch(() => { alert("❌ Erreur"); btn.innerText = originalText; btn.disabled = false; });
        };

        // Importation manuelle
        const importInput = document.getElementById('import-json');
        if(importInput) {
            importInput.addEventListener('change', function(e) {
                const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
                reader.onload = function(evt) {
                    try {
                        const imported = JSON.parse(evt.target.result);
                        if(confirm("Écraser les données actuelles avec ce fichier ?")) {
                            const nouvellesDonnees = trierMois(imported.map(normaliserMois));
                            restaurerCollectionComplete(nouvellesDonnees).then(() => {
                                state.donnees = nouvellesDonnees;
                                state.moisActifId = state.donnees.length ? state.donnees[state.donnees.length-1].id : null;
                                alert("Restauration réussie !");
                                changerVue('mensuelle');
                            }).catch(() => alert("❌ Erreur lors de la restauration, rien n'a été modifié."));
                        }
                    } catch(err) { alert("Fichier invalide."); }
                }; reader.readAsText(file);
            });
        }

        document.getElementById('btn-add-cat').onclick = () => {
            const v = document.getElementById('new-cat-input').value;
            if (v) { state.categories.push(v); sauvegarderConfig(); rendreAdmin(); }
        };

        document.getElementById('btn-add-obj').onclick = () => {
            const nom = document.getElementById('new-obj-nom').value;
            const montant = parseFloat(document.getElementById('new-obj-mnt').value);
            if (nom && montant) { state.objectifsProvisions.push({ nom, montant }); sauvegarderConfig(); rendreAdmin(); }
        };

        document.getElementById('btn-logout').onclick = () => authLogout().then(() => window.location.reload());

        document.getElementById('btn-undo').onclick = () => {
            if (state.suppressionEnAttente) {
                const { type, item, moisId, index } = state.suppressionEnAttente;
                const mois = state.donnees.find(m => m.id === moisId);
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
            // Supprimer catégorie
            const delCat = e.target.closest('[data-del-cat]');
            if (delCat) { state.categories.splice(parseInt(delCat.dataset.delCat), 1); sauvegarderConfig(true); rendreAdmin(); return; }

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
            setSyncDot('offline');
            document.getElementById('offline-popup').classList.remove('hidden');
        });
        window.addEventListener('online', () => {
            setSyncDot('online');
            document.getElementById('offline-popup').classList.add('hidden');
        });

        // Service worker (18/09/26) : ouverture hors-ligne du shell de
        // l'app, voir sw.js pour le détail. Chemin ET scope volontairement
        // relatifs ('sw.js', './'), comme dans /Muscu/ et /Course/.
        /* Horodatage du dernier deploiement de code (pas des donnees) : mise a jour automatiquement (workflow auto-version) a chaque commit sur cette app.
           Complement du bandeau "Nouvelle version disponible". */
/* DERNIERE_MAJ est définie dans index.html (mise à jour automatiquement par le workflow auto-version). */
        function formaterDerniereMaj(iso) {
            const d = new Date(iso);
            const jour = String(d.getDate()).padStart(2,'0');
            const mois = String(d.getMonth()+1).padStart(2,'0');
            const h = String(d.getHours()).padStart(2,'0');
            const m = String(d.getMinutes()).padStart(2,'0');
            return `${jour}/${mois}/${d.getFullYear()} à ${h}h${m}`;
        }
        const elDerniereMaj = document.getElementById('derniere-maj');
        if (elDerniereMaj) elDerniereMaj.textContent = 'Dernière mise à jour du code : ' + formaterDerniereMaj(DERNIERE_MAJ);

        if('serviceWorker' in navigator){
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js', { scope: './' }).then((reg) => {
                    const afficherToastMaj = () => {
                        const t = document.getElementById('maj-toast');
                        if (t) t.style.display = 'flex';
                    };
                    if (reg.waiting) afficherToastMaj();
                    reg.addEventListener('updatefound', () => {
                        const nv = reg.installing;
                        if (!nv) return;
                        nv.addEventListener('statechange', () => {
                            if (nv.state === 'installed' && navigator.serviceWorker.controller) {
                                afficherToastMaj();
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
  const verifierVersion = async () => {
    if (Date.now() - dernierControle < 30000) return;
    dernierControle = Date.now();
    try {
      const rep = await fetch('index.html', { cache: 'no-store' });
      if (!rep.ok) return;
      const m = (await rep.text()).match(/DERNIERE_MAJ\s*=\s*'([^']+)'/);
      if (!m || m[1] === DERNIERE_MAJ) return;
      if (utilisateurOccupe()) {
        const t = document.getElementById('maj-toast');
        if (t) t.style.display = 'flex';
      } else {
        window.location.reload();
      }
    } catch (e) { /* hors ligne : on garde la version en cours */ }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') verifierVersion();
  });
})();
