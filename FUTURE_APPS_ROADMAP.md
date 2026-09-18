# 🚀 PORTAIL-DUO — Roadmap Apps Futures

**Date de création** : 18 Septembre 2026  
**Statut** : En développement futur  
**Audience** : Équipe de développement interne

---

## 📋 Vue d'ensemble

Ce document recense toutes les applications complémentaires envisagées pour l'écosystème PORTAIL-DUO (Muscu, Course, Budget, Portail).

**Objectif stratégique** : Épaissir l'écosystème de couple sans refondre le MVP existant.

**Principes de sélection** :
- ✅ Synergies fortes avec apps existantes
- ✅ Pain points couple réels
- ✅ Privacy-first (données sensibles)
- ✅ Mobile-first PWA compatible iOS/Safari
- ✅ Réduction churn via interconnectivité

---

## 🎯 TIER 1 — Must-Have (Priorité Haute)

### 1. 📅 AGENDA Partagé

**Impact** : ⭐⭐⭐⭐⭐  
**Effort Dev** : Moyen (1-2 sprints)  
**Status** : Non commencé

#### Rationale
- **Connective tissue** manquant entre Muscu, Course, Budget
- Synchronisation native des événements cross-app
- Central hub de coordination couple

#### Cas d'Usage
```
Lundi 19h      : Séance Muscu (Corentin)
Mardi 18h30    : Run 10km (Lisa)
Mercredi 20h   : Dîner resto budget 60€
Samedi 14h     : Cours de danse Pro-Am
Jeudi 17h      : Apéro avec pote (2 personnes → budget partagé)
```

#### Fonctionnalités Core
- [ ] Calendrier bidimensionnel (Moi / Nous)
- [ ] Vue mensuelle + hebdomadaire
- [ ] **Intégrations automatiques** :
  - Muscu → pull séances planifiées
  - Course → pull runs planifiées
  - Budget → affichage dépenses + reminders
- [ ] Notifications croisées ("Lisa a séance 18h, t'es libre?")
- [ ] Sync optionnel Google Calendar (OAuth)
- [ ] Édition inline depuis chaque event

#### Architecture Firebase
```
/agenda/{userId}/
  - events/{eventId}
    - title: string
    - date: timestamp
    - startTime: HH:mm
    - endTime: HH:mm
    - type: enum ['muscu', 'course', 'budget', 'custom', 'dance']
    - attendees: [user1, user2]
    - linkedApp: string (ref to muscu/courseId)
    - isShared: boolean
    - reminders: [15min, 1day]

/agenda/shared/{coupleId}/
  - sharedEvents/{eventId}
    - (same schema but synced between users)
```

#### Viabilité
- **Rétention** : Très haute (daily use si bien intégré)
- **Churn** : Faible
- **Monétisation** : Premium (analytics, notifications avancées)

---

### 2. 🍽️ MEAL PLANNING & RECETTES

**Impact** : ⭐⭐⭐⭐  
**Effort Dev** : Moyen-Haut (2-3 sprints)  
**Status** : Non commencé

#### Rationale
- Synergie **Muscu** (nutrition macros)
- Synergie **Budget** (liste de courses automatique)
- Pain point couple : "Quoi manger ce soir?"

#### Cas d'Usage
```
Muscu App:     "J'ai besoin de +30g protéine aujourd'hui"
              ↓
Recettes:      "5 idées avec poulet riche protéine"
              ↓
Budget:        "Courses pour la semaine = 45€"
              ↓
Agenda:        "Dinner prep : 30min" (ajout automatique)
```

#### Fonctionnalités Core
- [ ] **Recette library** (seeds + user-contributed)
  - Macros (protéines, carbs, lipides, calories)
  - Temps de préparation
  - Difficulté
  - Allergènes
- [ ] **Recette du jour** (smart suggestion basée sur Muscu goals)
- [ ] **Shared pantry** (inventaire commun)
  - Expiration dates tracking
  - Quantity management
- [ ] **Meal planning hebdo** (drag-drop interface)
- [ ] **Auto-generate shopping list** → Budget app
- [ ] **Macros tracking** (link to Muscu progress)
- [ ] Intégration USDA Nutrition DB (ou équiv FR)

#### Architecture Firebase
```
/recipes/{recipeId}
  - title: string
  - instructions: string[]
  - ingredients: [{name, qty, unit, calories, protein, carbs, fat}]
  - difficulty: 1-5
  - prepTime: minutes
  - tags: [vegetarian, high-protein, budget-friendly]
  - createdBy: userId (for user recipes)

/households/{coupleId}/
  - mealPlan/{weekId}
    - [monday, tuesday, ...]: recipeId
  - pantry/{ingredientId}
    - name: string
    - qty: number
    - unit: string
    - expiryDate: timestamp
  - shoppingList/{itemId}
    - linkedToRecipe: recipeId
    - status: [pending, purchased]
    - price: float (sync to Budget)
```

#### Viabilité
- **Rétention** : Haute (meal planning = routine quotidienne)
- **Monétisation** : Premium (pro recipes, meal plans, nutritionist content)
- **Viral potential** : Modéré (family/friends sharing recipes)

---

## 🎯 TIER 2 — High-Impact Optional

### 3. 💍 BUCKET LIST / COUPLE GOALS

**Impact** : ⭐⭐⭐⭐  
**Effort Dev** : Moyen (2 sprints)  
**Status** : Non commencé

#### Rationale
- Planification long-terme couple
- Intégration Budget (allocation par goal)
- Motivation partagée + shared milestones

#### Cas d'Usage
```
Goal: "Marathon Paris 2027"
  ├─ Intègre Course (plan d'entraînement)
  ├─ Budget allocation (8 mois × €150 = €1200)
  ├─ Countdown (240 jours)
  └─ Consistency check (90 days streak?)

Goal: "Week-end Barcelone"
  ├─ Budget: €2500 total (flights, hotel, meals)
  ├─ Agenda: dates réservées
  └─ Recherches partagées (lieux, restaurants)

Goal: "Apprendre bachata ensemble" 💃
  ├─ Milestones (Level 1, competitions, etc.)
  └─ Agenda: cours schedules
```

#### Fonctionnalités Core
- [ ] **Goal creation wizard** (titre, description, end date, budget)
- [ ] **Milestones** (sub-goals avec deadlines)
- [ ] **Budget allocation per goal** (visible dans Budget app)
- [ ] **Countdown widget** (visual progress)
- [ ] **Shared notes** (research, ideas, progress)
- [ ] **Gamification** (badges, streaks, "days until")
- [ ] **Photo memories** (capture moments toward goal)
- [ ] **Goal completion** (retrouvez memories + celebrate)

#### Architecture Firebase
```
/couples/{coupleId}/goals/{goalId}
  - title: string
  - description: string
  - startDate: timestamp
  - targetDate: timestamp
  - category: enum ['travel', 'fitness', 'learn', 'home', 'other']
  - status: enum ['active', 'completed', 'abandoned']
  - budgetAllocation: float (links to Budget/monthly)
  - milestones: [{title, dueDate, completed}]
  - sharedNotes: string
  - memories: [photoIds]
  - createdBy: userId
  - updatedAt: timestamp

/couples/{coupleId}/goals/{goalId}/budget
  - linkedBudgetId: ref to Budget app
  - monthlyAllocation: float
  - spent: float
```

#### Viabilité
- **Rétention** : Haute (couples adorent planifier ensemble)
- **Viral potential** : Très haut (partageable socialement)
- **Monétisation** : Premium (goal templates, planning tools)

---

### 4. 🏆 DÉFIS / CHALLENGES COUPLE

**Impact** : ⭐⭐⭐⭐  
**Effort Dev** : Moyen (1-2 sprints)  
**Status** : Non commencé

#### Rationale
- Gamification native du fitness
- Intègre Muscu + Course nativement
- Crée habits via streaks & rewards

#### Cas d'Usage
```
Challenge: "30-Day Abs Challenge"
  ├─ Sync Muscu (exercises logged = streak)
  ├─ Notifications (push reminder each day)
  └─ Leaderboard (just couple, or invite friends?)

Challenge: "Couple Running Sprint (30km total)"
  ├─ Sync Course (runs logged)
  ├─ Joint progress bar
  └─ Reward (unlock "Marathon Ready" badge)

Challenge: "No Takeout Challenge"
  ├─ Sync Budget (no takeout expenses)
  ├─ Save counter (€150 saved in 30 days!)
  └─ Real-world reward (nice dinner on savings)
```

#### Fonctionnalités Core
- [ ] **Challenge library** (public templates)
- [ ] **Custom challenges** (create own rules)
- [ ] **Streaks tracking** (visual calendar)
- [ ] **Leaderboard** (couple only, or invite friends?)
- [ ] **Badges & achievements** (unlock collectibles)
- [ ] **Real-world rewards** (e.g., unlock free dinner idea)
- [ ] **Auto-sync from Muscu/Course/Budget** (zero friction)
- [ ] **Notifications** (reminder + celebrate streaks)

#### Architecture Firebase
```
/challenges/templates/{templateId}
  - title: string
  - description: string
  - duration: days
  - rules: string[]
  - category: enum ['fitness', 'budget', 'couple', 'lifestyle']
  - difficulty: 1-5

/couples/{coupleId}/challenges/active/{challengeId}
  - templateId: ref
  - startDate: timestamp
  - status: enum ['active', 'completed', 'failed']
  - participants: [user1, user2]
  - progress:
    - streakDays: number
    - completedDays: [timestamps]
    - badges: [badgeIds]
  - linkedData: {musculoId, courseId, budgetId} (for auto-sync)
```

#### Viabilité
- **Rétention** : Très haute (addictive streaks)
- **Engagement** : Daily active users
- **Monétisation** : Premium (pro challenges, coaching)

---

## 🎯 TIER 3 — Luxury if Time

### 5. 🚗 TRIP PLANNER / Road Trip

**Impact** : ⭐⭐⭐⭐ (si voyageurs)  
**Effort Dev** : Moyen-Haut (2-3 sprints)  
**Status** : Non commencé

#### Conditions de Viabilité
- ✅ Applicable si Corentin & Lisa voyagent souvent
- ⚠️ Niche, mais stickiness énorme pour cible

#### Fonctionnalités Core
- [ ] **Itinerary builder** (drag-drop destinations)
- [ ] **Budget per day** (auto-tracked via Budget app)
- [ ] **Points of interest** (map integration, Google Places API)
- [ ] **Shared notes** (restaurants, hikes, attractions)
- [ ] **Real-time expense split** (who paid for what?)
- [ ] **Moments gallery** (geotagged photos)
- [ ] **Offline maps** (important for abroad)

#### Architecture Firebase
```
/trips/{tripId}
  - title: string
  - startDate: timestamp
  - endDate: timestamp
  - destinations: [{city, lat, lng, notes}]
  - budget: float
  - expenses: [{date, item, amount, paidBy}]
  - photos: [photoIds with location]
```

---

### 6. 🎥 COUPLE MEMORIES / SHARED GALLERY

**Impact** : ⭐⭐⭐  
**Effort Dev** : Moyen (1-2 sprints)  
**Status** : Non commencé

#### Fonctionnalités Core
- [ ] **Shared photo gallery** (couple only)
- [ ] **Timeline view** (chronological memories)
- [ ] **Auto-generate memory cards** (1 year ago, etc.)
- [ ] **Story feature** (24h stories, couple-only)
- [ ] **Private sharing** (no accidental export)
- [ ] **Album organization** (by month, by event)
- [ ] **Privacy controls** (encrypt, delete on breakup option)

#### ⚠️ Risk: Breakup Privacy
- **Sensitive data** : Couple moments, intimate photos
- **Solution** : "Account dissolution" feature (delete all shared data)

---

### 7. 🎓 HABITS / ROUTINES TRACKER

**Impact** : ⭐⭐⭐  
**Effort Dev** : Faible-Moyen (1 sprint)  
**Status** : Non commencé

#### Cas d'Usage
```
Habit: "Méditation 10min chaque matin"
Habit: "Lire 20min avant lit" (ensemble ou seul)
Habit: "Faire l'amour 2x/semaine" (sensitive but honest 😏)
Habit: "Pas d'écran après 22h" (couple discipline)
```

#### Fonctionnalités Core
- [ ] **Habit creation** (name, frequency, goal streak)
- [ ] **Daily check-in** (tap to mark done)
- [ ] **Shared vs personal habits** (toggle)
- [ ] **Streak visualization** (calendar view)
- [ ] **Joint contribution** (some habits need both to count)
- [ ] **Analytics** (consistency % over time)

#### Architecture Firebase
```
/habits/{userId}/habits/{habitId}
  - title: string
  - frequency: enum ['daily', 'weekly', '2x/week']
  - isShared: boolean
  - streak: number
  - completedDates: [timestamps]
  - linkedGoalId: ref (optional)
```

---

## 📊 Tableau de Comparaison

| App | Impact | Effort | Priority | Synergies | Churn Risk |
|-----|--------|--------|----------|-----------|-----------|
| **Agenda** | ⭐⭐⭐⭐⭐ | Moyen | 1 | Muscu, Course, Budget | Très faible |
| **Recettes** | ⭐⭐⭐⭐ | Moyen-Haut | 2 | Muscu, Budget, Agenda | Faible |
| **Goals** | ⭐⭐⭐⭐ | Moyen | 3 | Budget, Agenda, Muscu, Course | Faible |
| **Défis** | ⭐⭐⭐⭐ | Moyen | 4 | Muscu, Course, Budget | Très faible |
| **Trip Planner** | ⭐⭐⭐⭐ | Moyen-Haut | 5 | Budget, Agenda | Niche |
| **Memories** | ⭐⭐⭐ | Moyen | 6 | (standalone) | Moyen (privacy) |
| **Habits** | ⭐⭐⭐ | Faible | 7 | Goals, Muscu | Moyen |

---

## 🏗️ Impact Technique — Monorepo Structure

```
/PORTAIL-DUO (monorepo root)
├── /Portail               (hub launcher)
├── /Muscu                 (existing)
├── /Course                (existing)
├── /Budget                (existing)
├── /Agenda                (TIER 1)
├── /Recettes              (TIER 1)
├── /Goals                 (TIER 2)
├── /Defis                 (TIER 2)
├── /TripPlanner           (TIER 3)
├── /Memories              (TIER 3)
├── /Habits                (TIER 3)
├── /shared-components     (calendar, budget-sync, photo gallery, etc.)
├── /firebase-config       (shared Firestore schema)
└── /docs                  (this roadmap + architecture docs)
```

### Cross-App Data Schema (Firestore)

```
/users/{userId}
  - profile (shared across all apps)
  - preferences
  - accounts (link to couple/household)

/couples/{coupleId}        ← Shared data hub
  - profile
  - muscu/ (sync data)
  - course/ (sync data)
  - budget/ (sync data)
  - agenda/ (new)
  - recettes/ (new)
  - goals/ (new)
  - defis/ (new)

/notifications/{userId}    ← Cross-app notifications
  - [agenda reminders, muscu milestones, budget alerts, etc.]
```

---

## 🔐 Security & Privacy Checklist

- [ ] **Admin SDK keys** : Never expose in client code (only backend)
- [ ] **User auth** : Firebase Auth (same session across all apps)
- [ ] **Encryption** : Firestore rules enforce couple-only access
- [ ] **Breakup scenario** : Data deletion workflow (legal + technical)
- [ ] **PII handling** : Minimal storage, anonymization where possible

---

## 📅 Proposé Development Timeline

### **Phase 1 (Q4 2026 — Automne)**
- ✅ Agenda Partagé (TIER 1)
- ✅ Recettes (TIER 1)

### **Phase 2 (Q1 2027 — Hiver)**
- ✅ Goals (TIER 2)
- ✅ Défis (TIER 2)

### **Phase 3 (Q2 2027 — Printemps)**
- 🔄 Trip Planner (si pertinent)
- 🔄 Habits Tracker
- 🔄 Memories (si priorité)

---

## 🎯 Decision Points (À Valider avec User)

1. **Voyagez-vous beaucoup?** → Priorité Trip Planner
2. **Aimez-vous la danse ensemble?** → Défis (très pertinent)
3. **Couples friends pour challenge multiplayer?** → Leaderboard cross-couple
4. **Privacy concern** → Priorité encryption (Memories, Chat)
5. **Monetization strategy?** → Freemium vs premium tiers

---

## 📝 Notes de Développement

- Tous les fichiers HTML doivent rester **self-contained** (pas d'imports externes)
- Priorité **mobile-first** (iOS/Safari optimization)
- Chaque app = propre `/index.html` + `/README.md`
- Firestore rules strictes : **couple-only access** par défaut
- Tests: Favoriser les user stories réelles (Corentin + Lisa)

---

**Dernière mise à jour** : 18 Sept 2026  
**Auteur** : Lead Developer Full-Stack  
**Status** : Prêt pour Développement

