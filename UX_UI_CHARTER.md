# 🎨 PORTAIL-DUO — Charte UX/UI

**Version** : 1.0  
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
--t-fast: .14s;
--t-mid: .22s;

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
- [ ] Bottom bar en `backdrop-filter: blur(18px) saturate(160%)` + `var(--glass-bar)`
- [ ] Transitions `.14s`/`.22s` ease, feedback tap `scale(0.97)`
- [ ] Toasts en `--r-pill`, `--card-2`, centrés bas d'écran
- [ ] Modales en bottom-sheet (`align-items: flex-end`) avec overlay `rgba(0,0,0,0.6)`

---

## 9. 🚫 À Éviter

- ❌ Couleurs de marque fixes indépendantes du profil actif (ex: ancien rouge "Fonte & Craie" retiré le 18/09/26)
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

*Cette section doit être mise à jour à chaque évolution majeure de la charte.*

---

## 🔗 Application aux Apps Existantes

| App | Statut Conformité | Action Requise |
|-----|-------------------|-----------------|
| **Muscu** | ✅ Référence | Aucune (source de vérité) |
| **Budget** | À auditer | Comparer `:root` avec ce document |
| **Course** | À auditer | Comparer `:root` avec ce document |
| **Portail** | À auditer | Doit adopter le même système pour la cohérence du hub |

---

**Prochaine étape recommandée** : Auditer Budget et Course pour lister les écarts avec cette charte, puis prioriser les corrections.

---

**Auteur** : Lead Developer Full-Stack  
**Dernière mise à jour** : 18 Septembre 2026
