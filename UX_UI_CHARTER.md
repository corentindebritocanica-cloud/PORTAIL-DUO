# 🎨 PORTAIL-DUO — Charte UX/UI

**Version** : 1.3  
**Date de création** : 18 Septembre 2026  
**Statut** : Référence officielle pour toutes les apps de l'écosystème  
**App de référence** : Muscu (Duo Training) — extraite directement de son code source

---

## 📋 Philosophie

Cette charte standardise **typographie, couleurs, composants (cards, boutons, modales, barres de navigation)** et comportements iOS pour que Portail, Muscu, Budget, Course (et futures apps : Agenda, Recettes, Goals, Défis…) partagent **une seule identité visuelle cohérente**.

**Principe directeur** : Muscu fait référence. Toute nouvelle app ou refonte doit copier son système de variables CSS (`:root`), sa hiérarchie de radius/ombres, et ses patterns de composants — puis n'adapter que la **couleur d'accent** si nécessaire.

---

## 1. 🎨 Palette de Couleurs (Design Tokens)

### Variables CSS `:root` (thème sombre — par défaut)

```css
:root {
  /* Fonds, du plus profond au plus proche */
  --bg: #0d1014;
  --card: #161b22;
  --card-2: #1e2530;

  /* Bordures neutres (blanc translucide, pas de teinte froide) */
  --border: rgba(255,255,255,0.09);
  --border-strong: rgba(255,255,255,0.17);

  /* Voile posé sur les fonds (icônes, états sélectionnés) — suit la couleur du profil actif */
  --tint: rgba(var(--accent-rgb), 0.07);
  --tint-strong: rgba(var(--accent-rgb), 0.13);

  /* Texte */
  --text: #e9eff6;
  --text-dim: #8a97a8;

  /* Identité — Couple (Corentin / Lisa) */
  --corentin: #1f8fff;
  --corentin-rgb: 31,143,255;
  --corentin-dark: #1a5fc4;
  --lisa: #ff3d7e;
  --lisa-rgb: 255,61,126;
  --lisa-dark: #c4225f;

  /* États sémantiques */
  --done: #12b981;      /* succès / validation */
  --danger: #ef4444;    /* erreur / suppression */
  --gold: #ffb800;      /* records / highlights */

  /* Accent dynamique — bascule bleu (Corentin) / rose (Lisa) selon le profil actif */
  --accent: var(--corentin);
  --accent-rgb: var(--corentin-rgb);
  --accent-dark: var(--corentin-dark);
  --accent-glow: rgba(var(--accent-rgb), 0.30);

  /* Surfaces flottantes (barres, modales) */
  --glass-bar: rgba(19,24,31,0.86);
  --glass-modal: rgba(22,27,34,0.95);
  --reset-btn-bg: var(--tint-strong);
  --sheen: rgba(255,255,255,0.55);
}
```

### Thème clair (`.light-mode`)

```css
.light-mode {
  --bg: #eef1f5;
  --card: #ffffff;
  --card-2: #e7ecf2;
  --border: rgba(23,38,56,0.11);
  --border-strong: rgba(23,38,56,0.20);
  --tint: rgba(var(--accent-rgb), 0.06);
  --tint-strong: rgba(var(--accent-rgb), 0.10);
  --text: #131a23;
  --text-dim: #5f6c7c;
  --shadow-sm: 0 6px 14px rgba(20,30,45,0.08);
  --shadow: 0 14px 28px rgba(20,30,45,0.10), 0 2px 8px rgba(20,30,45,0.05);
  --shadow-lg: 0 -8px 40px rgba(20,30,45,0.14);
  --glass-bar: rgba(255,255,255,0.84);
  --glass-modal: rgba(255,255,255,0.95);
}
```

### 🎯 Règle d'Identité Couple
- **Corentin** = Bleu (`#1f8fff`)
- **Lisa** = Rose (`#ff3d7e`)
- `--accent` bascule automatiquement selon le profil actif (JS : `applyThemeColor()`)
- **Toute app doit reprendre ce système** : jamais de couleur de marque fixe indépendante du profil.

---

## 2. ✍️ Typographie

### Polices

```css
/* Corps de texte — police système iOS native (perf + cohérence OS) */
--f-body: -apple-system, BlinkMacSystemFont, "Roboto", "Segoe UI", sans-serif;

/* Titres/chiffres impactants (gros nombres, hero) */
--f-display: 'Bebas Neue', -apple-system, BlinkMacSystemFont, sans-serif;

/* Import Google Fonts (à mettre dans <head> de chaque app) */
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap">

/* Chiffres tabulaires (stats, chronos) */
font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
```

### Échelle de Tailles (extraite de l'usage réel Muscu)

| Usage | Taille | Poids | Notes |
|-------|--------|-------|-------|
| Titre app (eyebrow) | `12.5px` | 700 | uppercase, letter-spacing 1.6px |
| Label de section | `11px` | 800 | uppercase, letter-spacing 0.9px |
| Texte body standard | `13px`–`14px` | 400–600 | usage le plus fréquent |
| Boutons | `14px`–`15px` | 700 | |
| Sous-titres | `15px`–`17px` | 600–700 | |
| Titres de card | `19px`–`20px` | 700 | |
| Gros chiffres/hero | `24px`–`34px` | 700 (ou `--f-display`) | stats clés, chronos |

**Règle** : uppercase + letter-spacing réservé aux labels/eyebrows, jamais au texte courant.

---

## 3. 📐 Système de Radius (Rayons)

**5 crans — la taille encode la hiérarchie visuelle** (plus l'élément est grand/contenant, plus le rayon est ample) :

```css
--r-xs: 4px;     /* jauges, filets */
--r-sm: 10px;    /* champs de saisie, petits boutons */
--r-md: 14px;    /* boutons pleins, bascules (segmented) */
--r-lg: 18px;    /* cards */
--r-xl: 22px;    /* modales, gros choix */
--r-pill: 999px; /* toasts, badges arrondis */
```

---

## 4. 🌑 Système d'Ombres

**2 niveaux + 1 pour surfaces flottantes** :

```css
--shadow-sm: 0 6px 16px rgba(0,0,0,0.30);              /* cards standards */
--shadow: 0 14px 32px rgba(0,0,0,0.44), 0 2px 8px rgba(0,0,0,0.28);  /* éléments élevés */
--shadow-lg: 0 -8px 40px rgba(0,0,0,0.5);               /* modales, bottom-bar */
```

---

## 5. 🧩 Composants Standards

### 5.1 Card générique

```css
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color var(--t-mid) ease;
}
```

### 5.2 Card "Hero" (en-tête de section avec dégradé)

```css
.menu-hero {
  background: linear-gradient(140deg, var(--card-2), var(--card) 55%);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 16px;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}
```

### 5.3 Bouton d'action principal (bottom bar)

```css
.bottom-btn {
  flex: 1;
  padding: 14px 10px;
  border-radius: var(--r-lg);
  border: 1px solid transparent;
  font-size: 15px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: transform .15s ease;
}
.bottom-btn:active { transform: scale(0.97); }
```

### 5.4 Bouton d'action solide (accent)

```css
.btn-export {
  background: var(--accent); color: #fff; border-color: transparent;
  /* box-shadow selon contexte */
}
```

### 5.5 Barre de navigation basse (bottom-bar) — Safe Area Compliant

```css
.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 30;
  background: var(--glass-bar);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  backdrop-filter: blur(18px) saturate(160%);
  border-top: 1px solid var(--border);
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom)) 14px;
  display: flex; gap: 10px;
}
```

**Variante Muscu (20/09/2026)** : la bottom-bar de Muscu (bouton « Séance terminée ») utilise `padding-bottom: calc(24px + env(safe-area-inset-bottom))` au lieu de `10px` — boutons remontés de 14 px à la demande de Corentin, fond translucide toujours collé au bord bas. Écart voulu propre à Muscu, ne pas le « normaliser ».

### 5.5b Barre de navigation flottante — variante « pilule » (onglets)

**Quand l'utiliser** : app à onglets (2 à 4 destinations) où l'on veut une navigation plus légère et plus « native iOS 26 » que la bottom-bar pleine largeur (5.5). La bottom-bar 5.5 reste la référence pour une barre d'**actions** (boutons d'export, valider, etc.). **Utilisée par** : Course et Budget (20/09/26) — sur Budget, sans bouton rond (4 onglets Mois / Année / Fixes / Réglages) et avec `--nav-offset = max(20px, safe-area − 12px)` (≈ 22px du bord), choisi par Corentin (Course : ≈ 4px).

**Anatomie** : un conteneur transparent posé *par-dessus* le contenu, avec (1) la pilule contenant les onglets, (2) optionnellement un bouton rond d'action posé **juste au-dessus de la pilule, aligné à droite** (ex. « + »).

```css
.tabbar-flottante{
  position:absolute; left:14px; right:14px; z-index:30;
  bottom:var(--nav-offset);   /* --nav-offset: max(2px, calc(env(safe-area-inset-bottom) - 30px)) */
  display:flex; align-items:center; gap:10px;
  pointer-events:none;                               /* les marges laissent passer scroll/taps */
}
nav.tabbar, .nav-add{
  pointer-events:auto;
  background:var(--glass-bar);
  -webkit-backdrop-filter:blur(18px) saturate(160%);
  backdrop-filter:blur(18px) saturate(160%);
  border:1px solid var(--border);
  box-shadow:var(--shadow);
}
nav.tabbar{ flex:1; min-width:0; display:flex; gap:4px; height:62px; padding:5px; border-radius:var(--r-pill); }
nav.tabbar button{
  flex:1; min-width:0; padding:0; border:none; background:transparent; color:var(--text-dim);
  border-radius:var(--r-pill);
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;
  font-family:inherit; font-size:11px; font-weight:600;
  transition:background var(--t-mid) ease, color var(--t-mid) ease, transform var(--t-fast) ease;
}
nav.tabbar button:active{ transform:scale(0.97); }
nav.tabbar button.actif{ color:var(--accent); background:var(--accent-soft); }  /* accent-soft = rgba(var(--accent-rgb),0.14) */
.nav-add{                                           /* au-dessus de la pilule, à droite */
  position:absolute; right:0; bottom:calc(100% + 12px);
  width:56px; height:56px; padding:0; border-radius:50%; color:var(--accent);
  display:flex; align-items:center; justify-content:center;
}
```

**Règles à respecter absolument** (leçons de l'implémentation Course — détail dans `PROBLEMES_RESOLUS.md`) :
- **Le conteneur de l'app doit être `position:fixed; inset:0`** (voir `GUIDE_PWA_IOS.md` §0) : la barre en `position:absolute` s'ancre alors sur le vrai viewport, sans le bug `dvh`.
- **Position basse** : la pilule se pose à `--nav-offset = max(2px, safe-area-inset-bottom − 30px)` du bord de l'écran (≈ 4px sur iPhone à home indicator : valeur choisie sur Course à la demande de Corentin, **volontairement très basse**, au-delà de la recommandation initiale ≈ 20px). Plus la barre est basse, plus les boutons s'approchent de la zone de geste du home indicator ; à surveiller, et à remonter (~8 à 20px) en cas de déclenchement de Siri. Ne pas descendre en dessous : les boutons doivent rester hors de la zone de geste du home indicator (sinon Siri / retour à l'accueil se déclenchent au tap).
- **Le contenu défile sous la barre** : tout `padding-bottom` du contenu scrollable doit valoir au minimum `hauteur totale de la barre + marge`. Course : `--tabbar-height = 62px + --nav-offset` (la safe-area y est **déjà incluse** — ne pas la rajouter), réutilisée par les listes et les boutons fixes au-dessus de la barre. Avec un bouton rond au-dessus de la pilule, ajouter aussi sa hauteur + son écart (`+ 56px + 12px + marge`) au `padding-bottom` de la liste, sinon le dernier élément reste masqué derrière lui.
- **`pointer-events:none` sur le conteneur**, `auto` uniquement sur la pilule et le bouton rond — sinon la zone vide bloque le scroll.
- **Onglet actif = teinte d'accent** (`--accent-soft` + icône/label en `--accent`), jamais une couleur fixe : la barre suit le profil Corentin/Lisa et le mode clair/sombre.
- **Zones tactiles** : chaque onglet ≥ 44px de haut (≈ 50px ici), bouton rond 56px.
- **Le bouton rond doit être masqué explicitement** sur les onglets où il n'a pas de sens (ex. attribut `data-onglet` sur le conteneur + `#app:not([data-onglet="liste"]) .nav-add{display:none}`) ; le laisser dans une section masquée ne suffit plus une fois déplacé dans la barre.
- Le blur (`backdrop-filter`) n'est visible que parce que le contenu passe réellement derrière la barre : ne pas la remettre comme ligne flex séparée.
- **Transition des onglets** (`background`/`color` en `--t-mid`, `transform` en `--t-fast`) : conservée malgré le §11.2 (« navigation fréquente = minimum »), car c'est une indication d'état (couleur de l'onglet actif), pas un déplacement. Ne pas y ajouter d'animation de mouvement (indicateur qui glisse, rebond…) sans passer par le §11.8.

---

### 5.6 Sélecteur de profil (Corentin/Lisa) — Pattern réutilisable

```css
.profile-switch {
  display: flex; gap: 8px; padding: 5px; margin-top: 2px;
  background: var(--card-2); border: 1px solid var(--border); border-radius: var(--r-md);
}
.profile-switch-btn {
  flex: 1; padding: 11px 8px; border-radius: var(--r-sm); border: 1px solid transparent;
  background: transparent; color: var(--text-dim); font-size: 14.5px; font-weight: 700;
  font-family: inherit;
}
.profile-switch-btn.corentin.selected {
  background: rgba(31,143,255,0.14); border-color: var(--corentin); color: var(--corentin);
}
.profile-switch-btn.lisa.selected {
  background: rgba(255,61,126,0.14); border-color: var(--lisa); color: var(--lisa);
}
```

> 💡 **Toute app avec une notion "qui" (dépense de qui, séance de qui, tâche de qui) doit réutiliser ce composant tel quel.**

### 5.7 Bouton de bascule thème (dark/light)

```css
.theme-toggle {
  position: fixed; top: 14px; right: 14px; z-index: 25;
  width: 38px; height: 38px; border-radius: 50%;
  background: var(--card); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; box-shadow: var(--shadow-sm);
}
```

### 5.8 Toast (notification légère)

```css
.toast {
  max-width: 100%; background: var(--card-2); color: var(--text);
  padding: 10px 18px; border-radius: var(--r-pill);
  font-size: 13.5px; font-weight: 600; border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  opacity: 0; transform: translateY(12px) scale(.96);
  transition: opacity .25s ease, transform .25s cubic-bezier(.32,.72,.3,1);
  text-align: center;
}
```

### 5.9 Modale (bottom-sheet style)

```css
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 50;
  display: none; align-items: flex-end; justify-content: center;
}
.modal-overlay.open { display: flex; }
/* Le contenu de la modale utilise --glass-modal + backdrop-filter blur(20px) saturate(160%) */
```

---

## 6. 📱 Standards iOS / Safari (PWA)

### 6.1 Meta Tags Obligatoires (chaque `<head>`)

```html
<meta charset="UTF-8">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="[Nom App]">
<meta name="theme-color" content="#0d1014">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="apple-touch-icon" href="[icon]">
<link rel="icon" type="image/png" sizes="512x512" href="[icon-512]">
```

### 6.2 Reset & Comportements Tactiles

```css
* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;  /* supprime le flash gris au tap */
}

body {
  margin: 0; padding: 0; min-height: 100%;
  background: var(--bg); color: var(--text);
  font-family: var(--f-body);
  -webkit-font-smoothing: antialiased;
  -webkit-overflow-scrolling: touch;
  transition: background .25s ease, color .25s ease;
}
```

### 6.3 Safe Area (encoche / Dynamic Island)

```css
/* Padding bas pour libérer la zone home indicator */
padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));

/* Bottom bar */
padding: 10px 14px calc(10px + env(safe-area-inset-bottom)) 14px;
```

**Règle** : toute barre fixe en bas d'écran DOIT inclure `env(safe-area-inset-bottom)`.

### 6.4 Zones Tactiles

- Boutons d'action principaux (bottom-bar) : `padding: 14px 10px` minimum → zone tactile ≥ 44px de hauteur
- Petits boutons icône : `30px × 30px` minimum avec `border-radius: var(--r-sm)`
- **Règle Apple HIG** : jamais en dessous de 44×44px pour un élément interactif isolé

### 6.5 Animations & Transitions Standards

```css
--t-fast: .15s;   /* 150 ms — feedback tactile, petits changements d'état (plancher du §11.3) */
--t-mid: .22s;    /* 220 ms — transitions d'interface standard */

/* Micro-feedback au tap (pattern à reprendre partout) */
.btn:active { transform: scale(0.97); }
```

---

## 7. 🏗️ Architecture des Écrans

### Pattern de page standard (observé dans Muscu)

```
┌─────────────────────────────┐
│ [theme-toggle] (fixed, top-right, cercle 38px)
│                              │
│  .app-title (eyebrow)       │
│  .menu-hero (card dégradé)  │
│                              │
│  .section-label             │
│  [Liste de .card / .session-btn]
│                              │
├─────────────────────────────┤
│  .bottom-bar (fixed, blur)  │  ← safe-area compliant
└─────────────────────────────┘
```

### Hiérarchie visuelle
1. **Hero card** en haut (dégradé `--card-2` → `--card`) : résumé/stat clé
2. **Section labels** en uppercase, `--text-dim`, séparent les blocs
3. **Cards de contenu** : fond `--card`, bordure `--border`, radius `--r-lg`
4. **Bottom bar** : actions principales, glassmorphism (`backdrop-filter`)

---

## 8. ✅ Checklist de Conformité (pour toute nouvelle app/refonte)

- [ ] Import des variables `:root` identiques à Muscu (couleurs, radius, ombres)
- [ ] Support `.light-mode` avec les mêmes overrides
- [ ] `--accent` dynamique si notion de profil (Corentin/Lisa)
- [ ] Police body = système iOS (`-apple-system...`), `Bebas Neue` réservée aux gros chiffres
- [ ] Meta tags PWA complets (apple-mobile-web-app-*, theme-color, viewport no-zoom)
- [ ] `-webkit-tap-highlight-color: transparent` sur `*`
- [ ] `-webkit-overflow-scrolling: touch` sur body
- [ ] `env(safe-area-inset-bottom)` sur toute barre fixe en bas
- [ ] Zones tactiles ≥ 44px pour les actions principales
- [ ] Cards : `var(--card)` + `var(--border)` + `var(--r-lg)` + `var(--shadow-sm)`
- [ ] Bottom bar en `backdrop-filter: blur(18px) saturate(160%)` + `var(--glass-bar)` (ou variante flottante « pilule » §5.5b, avec ses règles)
- [ ] Transitions `.14s`/`.22s` ease, feedback tap `scale(0.97)`
- [ ] Toasts en `--r-pill`, `--card-2`, centrés bas d'écran
- [ ] Modales en bottom-sheet (`align-items: flex-end`) avec overlay `rgba(0,0,0,0.6)`
- [ ] **Animations (§11)** : aucune `transition: all`, jamais de `transition` posée sur `*`
- [ ] Seuls `transform` et `opacity` sont animés (pas `width`/`height`/`top`/`left`/`bottom`/`max-height`) — jauges en `scaleX`/`translateX`, toasts en `transform`
- [ ] Entrées en `ease-out`, sorties en `ease-in`, durées 150–300 ms ; apparition depuis `scale(.9)` minimum, jamais `scale(0)`
- [ ] Actions répétées (validation, coche) : feedback bref, sans rebond
- [ ] `transform-box: fill-box` sur tout élément SVG animé en `scale`/`rotate`
- [ ] Bloc `@media (prefers-reduced-motion: reduce)` présent

---

## 9. 🚫 À Éviter

- ❌ Couleurs de marque fixes indépendantes du profil actif (ex: ancien rouge "Fonte & Craie" retiré le 18/09/26)
  - *Exception tolérée* : couleurs de **catégories de données** qui portent un sens métier (ex. Budget : `--cat-depenses` orange, `--cat-provisions` jaune, à côté de `--danger`/`--done`). Nommées `--cat-*`, jamais utilisées en décoration (fonds, boutons, dégradés).
- ❌ Bordures teintées bleu-gris froides (remplacées par blanc neutre translucide)
- ❌ Radius incohérents hors de l'échelle à 5 crans
- ❌ Boutons/zones tactiles < 44px
- ❌ Oublier `env(safe-area-inset-bottom)` → contenu caché derrière la home indicator sur iPhone
- ❌ Polices custom pour le texte courant (perf + cohérence native iOS)

---

## 10. 📝 Historique des Décisions de Design

| Date | Décision |
|------|----------|
| 08/09/26 | Identité couleurs Corentin/Lisa passée en tons "Ardoise & craie" plus francs |
| 17/09/26 | Bordures neutralisées (retrait de la teinte bleu-gris froide) |
| 18/09/26 | Suppression du rouge de marque fixe "Fonte & Craie" → tout passe en `--accent` dynamique |
| 20/09/26 | Ajout de la variante « barre de navigation flottante en pilule » (§5.5b), adoptée par Course puis Budget. La bottom-bar pleine largeur (§5.5) reste la référence pour les barres d'actions. |
| 24/09/26 | Budget aligné sur les sections 1 à 7 : tokens renommés comme Muscu, thème clair via `.light-mode`, couleurs décoratives retirées (seules les couleurs de catégories restent), hero sobre, cards bordées, zones tactiles ≥ 44px, modales en bottom-sheet et `alert()`/`confirm()` natifs remplacés par une boîte de dialogue maison. |
| 24/09/26 | Charte v1.3 — Audit des 4 apps contre la section 11 et mise en conformité : Budget (retrait du `transition: all` global, jauges et toast en `transform`, reduced-motion), Muscu (validation de série adoucie à 1,08 sans rebond — exception documentée au §11.2, points de graphique, `left` → `translateX`), Portail (jauge en `translateX`), Course (reduced-motion). `--t-fast` passé de 140 à 150 ms. Checklist §8 complétée. |
| 23/09/26 | Ajout de la section 11 « Animation & Micro-interactions » (grille de fréquence, règles GPU-safe, springs, principes Apple Fluid Interfaces, clip-path, reduced-motion) — synthèse des skills communautaires `emil-design-eng`/`apple-design` d'Emil Kowalski et de la WWDC 2018. Référentiel de règles, pas encore appliqué aux 4 apps. |

*Cette section doit être mise à jour à chaque évolution majeure de la charte.*

---

## 11. 🎬 Animation & Micro-interactions

> Section ajoutée le 23/09/2026, synthétisée à partir de deux skills communautaires pour agents IA (`emil-design-eng` et `apple-design`, par Emil Kowalski — ex-Vercel/Linear, auteur de Sonner/Vaul) et de la conférence Apple WWDC 2018 *Designing Fluid Interfaces*, dont `apple-design` est la traduction directe pour le web. Elle complète les tokens statiques (couleurs, radius, ombres) des sections précédentes avec des règles de **mouvement**, jusque-là absentes de la charte.
>
> **Statut** : 4 apps auditées et mises en conformité le 24/09/2026 (détail dans chaque README, section « Animations mises en conformité avec la charte §11 »). Non encore vérifié sur iPhone.

### 11.1 Philosophie directrice

- Le goût en matière de design ne relève pas de la préférence perso : c'est un ensemble de règles apprenables. Les petites erreurs (mauvais easing, bordure pleine au lieu d'une ombre semi-transparente, animation qui démarre de `scale(0)`) sont individuellement invisibles mais s'accumulent et font toute la différence entre une interface "générique" et une interface "premium".
- **Chaque animation doit répondre à la question "pourquoi ça anime ?"**. Trois raisons valables seulement :
  1. **Cohérence spatiale** : un toast qui sort et rentre par le même côté, pour que le swipe-to-dismiss reste intuitif.
  2. **Indication d'état** : un bouton qui change de forme pour montrer un changement d'état (ex: bouton like qui se remplit).
  3. **Explication** : une animation qui montre comment une fonctionnalité marche (rare dans nos 4 apps, plutôt utile pour un onboarding).
  Si aucune de ces 3 raisons ne s'applique → pas d'animation.

### 11.2 Grille de décision par fréquence d'usage

C'est le critère le plus important, absent de la charte actuelle. Il faut se demander *à quelle fréquence l'utilisateur déclenche cette action*, pas seulement quel est le type de composant :

| Fréquence dans nos apps | Exemples concrets | Règle |
|---|---|---|
| **100+ fois/jour** — actions répétitives | Cocher une série dans Muscu, cocher un produit dans Course | **Aucune animation. Jamais.** Ou transition quasi instantanée (<100ms), sans bounce. |
| **Dizaines de fois/jour** | Navigation entre onglets de la bottom-bar, hover/tap sur une card de liste | Réduire au minimum : feedback tactile `:active` seulement, pas de transition d'entrée/sortie élaborée |
| **Occasionnel** | Ouvrir une modale bottom-sheet, ajouter une transaction Budget, afficher un toast | Animation standard (voir §11.3) |
| **Rare / première fois** | Écran de bienvenue, badge de succès, célébration d'objectif atteint | On peut se permettre plus de "delight" (spring avec un peu de bounce, confettis, etc.) |

**Actions fréquentes recensées (audit du 24/09/2026)** :
- **Muscu — validation de série** : **exception assumée**, décidée par Corentin. Le feedback (léger agrandissement + onde verte) est gardé parce qu'il confirme la saisie en pleine séance, mais **adouci** : `scale(1.08)` sans rebond en 0,2 s, onde de 0,28 s. Ne pas y remettre de rebond ni l'allonger.
- **Course — coche produit** : aucune animation (conforme).
- **Budget — ajout/suppression de ligne** : aucune animation sur la ligne ; seul le toast « Annuler » (occasionnel) est animé.

### 11.3 Durées, easing, propriétés (règles GPU-safe)

- **N'animer que `transform` et `opacity`.** Jamais `width`, `height`, `top`, `left`, `margin` (re-layout coûteux, source de jank sur Safari iOS). Jamais `transition: all` (imprécis, anime des propriétés non désirées) — toujours cibler les propriétés explicitement.
- **Durées** : 150–300ms pour la majorité des transitions d'interface. Tokens : `--t-fast` = 150 ms, `--t-mid` = 220 ms (§6.5). Exception tolérée : indicateurs d'activité (rotation du bouton recharger du Portail, 0,5 s ; squelettes de chargement en boucle).
- **Easing** : `ease-out` pour les entrées (l'élément démarre vite, ralentit en arrivant — perçu comme plus réactif). `ease-in` pour les sorties. Un `ease-in` sur une entrée est une erreur fréquente d'agent IA à surveiller : ça donne une impression de lenteur/latence même à durée égale.

### 11.4 Règles d'apparition (scale, origine)

- **Ne jamais partir de `scale(0)`.** Rien dans le monde réel n'apparaît de nulle part. Démarrer à `scale(0.9)` ou plus (0.9–0.95), combiné à `opacity: 0 → 1`.
- **Les popovers/dropdowns doivent s'agrandir depuis leur point de déclenchement** (le bouton qui les a ouverts), pas depuis leur propre centre — ça garde le lien spatial pour l'utilisateur. **Les modales plein écran/bottom-sheet, elles, restent centrées/ancrées en bas** (ne pas leur appliquer cette règle).

### 11.5 Feedback tactile (boutons, cards, zones tactiles)

```css
.button, .card-tappable {
  transition: transform var(--t-fast) ease-out; /* 150 ms */
}
.button:active, .card-tappable:active {
  transform: scale(0.97); /* subtil : entre 0.95 et 0.98 */
}
```

- S'applique à tout élément pressable : boutons, cards cliquables, items de liste.
- **Point important issu du skill `apple-design` (doctrine Apple WWDC)** : le feedback visuel doit se déclencher **au moment où le doigt touche l'écran** (`touchstart`/`pointerdown`), pas seulement à la validation du tap (`touchend`/`click`). Actuellement nos apps utilisent probablement `:active` en CSS pur, ce qui respecte déjà globalement ce principe (le pseudo-état `:active` s'active au toucher) — à vérifier qu'aucun JS ne retarde artificiellement le retour visuel jusqu'au relâchement.

### 11.6 Animations à ressort (springs) — quand et comment

- **Springs vs durée fixe** : une transition à durée fixe (`transition: transform 200ms ease-out`) est prévisible et suffit pour la plupart des cas. Un spring (physique simulée, pas de durée fixe) est préférable pour :
  - les interactions de glisser-déposer avec inertie (ex: swipe-to-delete sur une ligne Budget/Course)
  - les éléments qui doivent sembler "vivants" (Dynamic Island-like)
  - les gestes interruptibles en plein mouvement
- **Configuration recommandée** (approche Apple, plus simple à régler) : `{ type: "spring", duration: 0.5, bounce: 0.2 }`. Garder le bounce subtil (0.1–0.3). **Éviter le bounce dans la majorité des cas d'interface** — le réserver au drag-to-dismiss et aux interactions ludiques (pas aux boutons/cards du quotidien).
- **Avantage clé des springs** : ils conservent la vélocité en cas d'interruption, contrairement à une transition CSS classique qui redémarre de zéro. Concrètement : si l'utilisateur retape vite pendant qu'une animation est en cours (ex: changer d'onglet juste après avoir ouvert une modale), l'animation doit repartir de sa position réelle à l'écran, pas sauter brutalement ou recommencer depuis le début.

### 11.7 Principes Apple "Fluid Interfaces" (WWDC 2018) — pertinents car nos apps sont 100% iOS

- **Response (tuer la latence)** : dès qu'un délai perceptible apparaît entre le geste et la réaction visuelle, la sensation de "direct" s'effondre. C'est la base de tout le reste.
- **Manipulation directe** : sur un geste de glissement (drag d'une modale bottom-sheet pour la fermer, swipe sur une carte), l'élément doit suivre le doigt en 1:1, pas avec un décalage ou un effet de lissage qui donne une sensation de "élastique mou".
- **Interruptibilité** : toute animation en cours doit pouvoir être reprise/inversée à tout instant à partir de sa position actuelle (voir §11.6).
- **Projection du momentum** : sur un geste rapide relâché en mouvement (fling), la vélocité du geste doit influencer où l'élément atterrit — pas uniquement une transition à durée fixe qui ignore la vitesse du doigt au relâchement. Pertinent pour un swipe-to-dismiss de modale ou un swipe-to-delete.
- **Matériaux et profondeur** : le glassmorphism déjà utilisé sur nos bottom-bars va dans ce sens (translucidité = profondeur perçue).

### 11.8 Technique clip-path pour indicateur de navigation glissant

Pour une bottom-bar ou un sélecteur d'onglets où un fond coloré ("pilule") se déplace d'un item actif à l'autre : plutôt qu'un simple fondu de couleur de texte (qui passe par un gris disgracieux à mi-chemin), utiliser `clip-path` pour qu'une copie du texte en couleur inversée soit révélée progressivement *au fur et à mesure* que la pilule la traverse. Effet nettement plus soigné qu'un cross-fade classique, pour un coût CSS raisonnable. À évaluer pour la bottom-bar / le profile-switch Corentin/Lisa si un jour ils adoptent un indicateur glissant plutôt qu'un état actif statique.

### 11.9 Accessibilité

- Ajouter un bloc `@media (prefers-reduced-motion: reduce)` qui désactive ou réduit drastiquement toutes les animations non essentielles (garder uniquement les changements d'état instantanés). Présent dans les 4 apps depuis le 24/09/2026.
- ⚠️ Le sélecteur du bloc reduced-motion doit être **au moins aussi spécifique** que celui qui déclare l'animation, sinon il est ignoré (voir `PROBLEMES_RESOLUS.md`, flammes de record Muscu). Variante radicale acceptable pour une app sobre (Course) : `*, *::before, *::after { transition-duration:0s !important; animation-duration:0s !important; }`.

### 11.10 Anti-patterns à traquer lors des audits futurs

- ❌ `transition: all` (toujours cibler les propriétés)
- ❌ Durées > 300ms pour une interaction standard (sensation de lenteur)
- ❌ `ease-in` sur une animation d'entrée (devrait être `ease-out`)
- ❌ `scale(0)` en point de départ d'une apparition
- ❌ Bounce/spring sur une action répétée 100+ fois/jour
- ❌ Popover qui s'agrandit depuis son propre centre au lieu du point de déclenchement
- ❌ Animation sans réponse claire à "pourquoi ça anime ?"
- ❌ Absence de `prefers-reduced-motion`

---

## 🔗 Application aux Apps Existantes

| App | Statut Conformité | Action Requise |
|-----|-------------------|-----------------|
| **Muscu** | ✅ Référence | Aucune (source de vérité) |
| **Budget** | ✅ Conforme §1–§7 et §11 (24/09/26) · pilule §5.5b (20/09/26) | Écarts assumés : couleurs de catégories `--cat-depenses`/`--cat-provisions` (sens métier, jamais décoratives) ; bouton thème dans l'en-tête plutôt qu'en position fixe |
| **Course** | ✅ Animations (§11) conformes (24/09/26) · pilule §5.5b adoptée (20/09/26) | Audit statique `:root` restant |
| **Portail** | ✅ Animations (§11) conformes (24/09/26) | Audit statique `:root` restant |

---

**Prochaine étape recommandée** : vérifier sur iPhone les retouches du 24/09/26 (Budget en priorité), puis auditer Course et Portail contre les sections 1 à 7.

---

**Auteur** : Lead Developer Full-Stack  
**Dernière mise à jour** : 24 Septembre 2026
