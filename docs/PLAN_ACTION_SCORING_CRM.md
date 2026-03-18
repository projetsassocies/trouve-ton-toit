# Plan d'action : Système de Scoring CRM par type de lead

> Analyse croisée : conversation Google IA (PDF) vs codebase actuelle TrouveTonToit

---

## 1. Synthèse des recommandations du PDF

### 1.1 Concept central : séparer la logique de scoring

| Type de lead | Sémantique | Objectif du score | Échelle de temps |
|--------------|------------|-------------------|------------------|
| **Acheteur** | Froid / Tiède / Chaud | "Température de maturité" — probabilité de signature à 3 mois | 2-4 semaines "chaud" |
| **Vendeur** | Froid / Tiède / Chaud | Idem — mandat, estimation, compromis | 6+ mois "tiède" possible |
| **Locataire** | En veille / Actif / Urgent | "Température de réactivité" — exploitabilité immédiate du dossier | 3-5 jours "chaud" max |

**Point clé** : Un locataire chaud peut devenir froid en 48h s'il trouve ailleurs. Un acheteur chaud reste chaud 2-4 semaines.

---

### 1.2 Scoring Vente (Acheteurs & Vendeurs) — Module 1

| Critère | Points | Condition |
|---------|--------|-----------|
| Financement validé | 40 pts | Accord de principe / Courtier validé |
| Projet urgent (< 3 mois) | 30 pts | Mutation, vente déjà actée |
| Apport > 20% | 10-15 pts | Numérique |
| Critères précis (secteur + type) | 10 pts | Champs remplis |
| Dernière interaction < 7 jours | 10 pts | Date auto |
| Aucun contact > 30 jours | -20 pts | **Dépréciation** |

**Seuils affichage** : 0-35 ❄ Froid | 36-75 🟡 Tiède | 76-100 🔥 Chaud

**Spécificité vendeur** : Mandat signé, estimation demandée, bien déjà vendu (compromis) = indicateurs forts.

---

### 1.3 Scoring Location (Locataires) — Module 2

| Critère | Points | Condition |
|---------|--------|-----------|
| Dossier PDF complet | 50 pts | Pack Identité + Solvabilité + Garantie |
| Revenus ≥ 3× loyer | 20 pts | Calcul auto (ratio) |
| Garantie validée | 15 pts | Visale / Cautionéo / Physique |
| Date d'entrée < 15 jours | 15 pts | Date souhaitée |
| Préavis posé | 5 pts | Oui/Non |
| Aucun contact > 5 jours | -40 pts | **Dépréciation forte** |

**Seuils affichage** : 0-40 ☁ En veille | 41-75 🏃 Actif | 76-100 🚀 Urgent

**Documents "triggers" locataire** :
- Pack Identité : CNI, justificatif domicile
- Pack Solvabilité : contrat travail, 3 bulletins, avis impôt
- Pack Garantie : Visale/Cautionéo ou garant physique

---

### 1.4 Règles de refroidissement (cooling down)

| Type | Règle |
|------|-------|
| **Vente** | Si T > 45 jours sans activité → forcer Froid |
| **Location** | Si T > 7 jours → -10 pts par jour supplémentaire |

---

## 2. État actuel du codebase

### 2.1 Ce qui existe

- **`lead_type`** : `acheteur`, `locataire`, `vendeur`, `bailleur` (présent en BDD et UI)
- **Scoring unique** : `functions/leadScoring.ts` — **ne prend pas en compte `lead_type`**
- **Score composé** : `score_initial` (0-50) + `score_engagement` (0-30) + `score_progression` (0-20)
- **Champs acheteur** : `financing_status`, `apport_percentage`, `delai`, `disponibilite`
- **Catégories actuelles** : FROID / TIEDE / CHAUD (identique pour tous)
- **Formulaires** : AddLead différencie acheteur/locataire/vendeur mais champs limités

### 2.2 Ce qui manque

| Élément | Acheteur | Locataire | Vendeur |
|---------|----------|-----------|---------|
| Champs spécifiques | Projet < 3 mois, bien à vendre | Dossier complet, garantie, date entrée, préavis, revenus, loyer cible | Mandat, estimation demandée |
| Sémantique catégories | OK (Froid/Tiède/Chaud) | **En veille / Actif / Urgent** | OK |
| Scoring adapté | Partiel (financing OK) | **Aucun** | **Aucun** |
| Refroidissement | Non implémenté | Non implémenté | Non implémenté |
| Dernière interaction | Non utilisé | Non utilisé | Non utilisé |

---

## 3. Plan d'action priorisé

### Phase 1 : Base de données et champs (priorité haute)

#### 1.1 Migration Supabase — Nouveaux champs

**Tous les leads (nouveau champ commun)** :
- `date_derniere_interaction` TIMESTAMPTZ — mis à jour par activités/events/tasks/notes

**Leads locataires** :
- `dossier_location_complet` BOOLEAN DEFAULT FALSE
- `garantie_type` TEXT — `visale` | `cautioneo` | `physique` | `aucune`
- `date_entree_souhaitee` DATE
- `preavis_pose` BOOLEAN DEFAULT FALSE
- `revenus_mensuels_nets` NUMERIC — pour ratio 3× loyer
- `loyer_cible_max` NUMERIC — pour calcul ratio
- `dossier_valide_agent` BOOLEAN DEFAULT FALSE

**Leads vendeurs** :
- `mandat_signé` BOOLEAN DEFAULT FALSE
- `estimation_demandee` BOOLEAN DEFAULT FALSE
- `bien_sous_compromis` BOOLEAN DEFAULT FALSE

#### 1.2 Fichier de migration

Créer `supabase-migrations/YYYYMMDD_scoring_par_type_lead.sql`

---

### Phase 2 : Logique de scoring par type (priorité haute)

#### 2.1 Refactorer `functions/leadScoring.ts`

- **Détecter `lead_type`** au début du calcul
- **Brancher vers 3 modules** :
  - `calculateScoreAcheteur(lead)` — financement, apport, délai, critères, dernière interaction
  - `calculateScoreLocataire(lead)` — dossier, garantie, date entrée, préavis, ratio revenus
  - `calculateScoreVendeur(lead)` — mandat, estimation, compromis, dernière interaction

#### 2.2 Implémenter le refroidissement

- Récupérer `date_derniere_interaction` (ou déduire des activities/events)
- **Vente** : si > 45 jours → forcer score faible / catégorie Froid
- **Location** : si > 7 jours → appliquer pénalité progressive (-10 pts/jour)

#### 2.3 Catégories par type

- **Acheteur / Vendeur** : FROID, TIEDE, CHAUD (seuils 0-35, 36-75, 76-100)
- **Locataire** : EN_VEILLE, ACTIF, URGENT (seuils 0-40, 41-75, 76-100)

---

### Phase 3 : UI formulaires et affichage (priorité moyenne)

#### 3.1 AddLead / LeadDetail — Champs conditionnels

- **Locataire** : section "Dossier location" (garantie, date entrée, préavis, revenus, loyer cible)
- **Vendeur** : section "Projet vente" (mandat, estimation, bien sous compromis)
- Barre de progression du score en temps réel (optionnel Phase 1)

#### 3.2 Affichage des badges

- Adapter les libellés : Locataire → En veille / Actif / Urgent
- Icônes : ☁ / 🏃 / 🚀 pour locataires

#### 3.3 LeadDetail / Leads

- Afficher le "détail du score" selon le type (ex : "Dossier 75% — Manque avis impôt")

---

### Phase 4 : Mise à jour `date_derniere_interaction` (priorité moyenne)

- Trigger ou edge function : à chaque création de activity/event/task/note lié au lead → mettre à jour `date_derniere_interaction` sur le lead
- Ou : calculer à la volée dans leadScoring à partir des tables

---

### Phase 5 : Bonus / Évolutions (priorité basse)

- Notification push "Lead Chaud détecté"
- Emails automatisés de nurturing
- Analyse NLP des notes (mots-clés urgence)
- Dashboard "Briefing matinal IA"
- Upload documents + validation (OCR)

---

## 4. Matrice de correspondance : ancien → nouveau

| Ancien (actuel) | Acheteur (nouveau) | Locataire (nouveau) | Vendeur (nouveau) |
|-----------------|-------------------|---------------------|-------------------|
| financing_status | ✅ Gardé, poids 40 pts | ❌ Non utilisé | ❌ Non utilisé |
| apport_percentage | ✅ Gardé, 10-15 pts | ❌ Non utilisé | ❌ Non utilisé |
| delai | ✅ Gardé (projet < 3 mois) | → date_entree_souhaitee | ✅ Gardé |
| criteriaCount | ✅ Gardé | ✅ Adapté | ✅ Gardé |
| "dossier complet" (notes) | ✅ Gardé | → dossier_location_complet | → mandat_signé |
| FROID/TIEDE/CHAUD | ✅ Inchangé | EN_VEILLE/ACTIF/URGENT | ✅ Inchangé |

---

## 5. UX/UI : Vues raccourcis et adaptation Kanban

### 5.1 Objectif

Offrir un accès rapide à des vues **filtrées par type de lead**, car :
- Les **locataires** ont des colonnes Kanban différentes (En veille / Actif / Urgent)
- Les **acheteurs/vendeurs** gardent (Froid / Tiède / Chaud)
- Le mandataire doit pouvoir basculer instantanément selon son activité du moment

### 5.2 Proposition : Vues raccourcis en un clic

**Emplacement** : au-dessus ou à côté du filtre "Liste / Kanban", ou en barre d’onglets dédiée

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [🔑 Locataires]  [💰 Achat / Vente]  [📋 Tous]                              │
│      42                18                   60                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Vue raccourci | Filtre lead_type | Comportement List | Comportement Kanban |
|---------------|------------------|-------------------|---------------------|
| **🔑 Locataires** | `locataire` | Liste des locataires uniquement | Colonnes : En veille / Actif / Urgent |
| **💰 Achat / Vente** | `acheteur` + `vendeur` | Liste acheteurs + vendeurs | Colonnes : Froid / Tiède / Chaud |
| **📋 Tous** | aucun | Liste complète | Kanban mixte — voir 5.3 |

### 5.3 Gestion du Kanban "Tous" (vue mixte)

Quand l’utilisateur choisit **Tous**, deux options :

**Option A — Kanban par type avec sous-colonnes**

- Une section **Locataires** (En veille / Actif / Urgent)
- Une section **Achat / Vente** (Froid / Tiède / Chaud)
- Chaque lead est dans la colonne correspondant à son `categorie` (avec mapping locataire → EN_VEILLE/ACTIF/URGENT)

**Option B — Kanban unifié (colonnes hybrides)**

- Colonnes : `Froid / En veille` | `Tiède / Actif` | `Chaud / Urgent`
- Mapping : Froid ↔ En veille, Tiède ↔ Actif, Chaud ↔ Urgent
- Un seul set de colonnes, les libellés s’adaptent selon la vue (ex. si "Locataires" : En veille / Actif / Urgent ; si "Tous" : Froid·En veille / Tiède·Actif / Chaud·Urgent)

**Recommandation** : **Option B** — plus simple, une seule logique de colonnes, libellés dynamiques selon le filtre.

### 5.4 Spécifications UI

#### Barre de vues raccourcis

- **Composant** : Tabs ou boutons groupés (style segmented control)
- **Position** : entre le titre "Leads" et la recherche, ou sous la recherche, avant Liste/Kanban
- **État actif** : mise en avant du filtre sélectionné
- **Badge** : nombre de leads par vue (optionnel mais utile)
- **Persistance** : préférence utilisateur (ex. `localStorage`) pour rouvrir la dernière vue

#### Kanban dynamique

| Vue active | Colonne 1 | Colonne 2 | Colonne 3 |
|------------|-----------|-----------|-----------|
| Locataires | En veille ☁ (0-40) | Actif 🏃 (41-75) | Urgent 🚀 (76-100) |
| Achat / Vente | Froid ❄️ (0-35) | Tiède ☀️ (36-75) | Chaud 🔥 (76-100) |
| Tous | Froid / En veille | Tiède / Actif | Chaud / Urgent |

- **Mapping `categorie` → colonne** : selon le `lead_type` du lead, interpréter `categorie` en conséquence (locataire : EN_VEILLE/ACTIF/URGENT ; acheteur/vendeur : FROID/TIEDE/CHAUD)
- **Drag & drop** : quand on déplace un lead, mettre à jour `categorie` avec la valeur correcte (ex. colonne "Urgent" → `categorie: 'URGENT'` pour un locataire)

#### Liste

- Même filtre `lead_type` (Locataires / Achat / Vente / Tous)
- Filtres Statut et Catégorie **adaptés** à la vue :
  - Vue **Locataires** : catégories = En veille, Actif, Urgent
  - Vue **Achat / Vente** : catégories = Froid, Tiède, Chaud
  - Vue **Tous** : catégories = les 6, ou regroupées (ex. "Froid / En veille", etc.)
- Colonne ou badge `lead_type` visible dans la liste

### 5.5 Décisions validées

| Sujet | Choix |
|-------|-------|
| Position barre vues | **En dessous** de la recherche |
| Vue "Tous" | **Option B** — colonnes hybrides |
| Persistance | **localStorage** — mémoriser la dernière vue |
| LeadsPipelineCompact | **Vue globale** pour l'instant (à revoir plus tard) |

### 5.6 Charte design — Pages Leads & Lead Detail

**Principes** : flat design, épuré, moderne. Rien de trop chargé visuellement.

| Élément | Règle |
|---------|-------|
| Ombres (shadow) | **Aucune** — éviter `shadow`, `shadow-md`, `shadow-lg`, etc. |
| Bordures | Subtiles, fine épaisseur (ex. `border-[#E5E5E5]`) |
| États hover | Légère variation de fond ou bordure, jamais shadow |
| Couleurs | Plages étendues pour les badges, mais rester sobre |
| Espacements | Aérés, intentionnels |
| Focus | Hiérarchie visuelle par typo et couleur, pas par profondeur |

À appliquer sur : Leads, LeadDetail, AddLead, Kanban cards, liste, badges.

### 5.7 Maquette simplifiée

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Leads                                                      [+ Ajouter]      │
│ 60 prospects                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Rechercher...]                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ [🔑 Locataires 42]  [💰 Achat/Vente 18]  [📋 Tous 60]   ← sous recherche    │
│        ▲ sélectionné                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Liste] [Kanban]  │  Statut: Tous ▾  │  Catégorie: En veille ▾              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │ En veille ☁ │  │ Actif 🏃   │  │ Urgent 🚀   │                         │
│  │     12      │  │     18     │  │     12      │                         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤                          │
│  │  [Card]     │  │  [Card]    │  │  [Card]     │                         │
│  │  [Card]     │  │  [Card]    │  │  [Card]     │   ← Kanban Locataires   │
│  │  ...        │  │  ...       │  │  ...        │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.8 Fichiers à modifier (UX)

| Fichier | Modifications |
|---------|---------------|
| `src/pages/Leads.jsx` | Ajout state `leadTypeView` (locataire | achat_vente | tous), barre vues raccourcis, passage du filtre aux vues |
| `src/components/leads/LeadsKanbanView.jsx` | Props `leadTypeView`, colonnes et labels dynamiques, mapping catégories |
| `src/components/leads/LeadsListView.jsx` (si extrait) | Props `leadTypeView` pour filtres catégorie adaptés |
| `src/lib/scoring-constants.js` (nouveau) | `CATEGORIES_VENTE`, `CATEGORIES_LOCATION`, mapping bidirectionnel |

### 5.9 Récapitulatif des vues

| Vue | Filtre | Kanban colonnes | Filtre catégorie liste |
|-----|--------|------------------|-------------------------|
| Locataires | lead_type IN (locataire) | En veille / Actif / Urgent | Idem |
| Achat / Vente | lead_type IN (acheteur, vendeur) | Froid / Tiède / Chaud | Idem |
| Tous | aucun | Froid·En veille / Tiède·Actif / Chaud·Urgent | Regroupé ou les 6 |

---

## 6. Ordre d'exécution suggéré

### Phase technique (scoring)
1. **Migration SQL** — ajouter les champs manquants
2. **leadScoring.ts** — branchement par `lead_type` + 3 modules
3. **date_derniere_interaction** — logique de mise à jour
4. **Refroidissement** — intégrer dans les modules
5. **AddLead / LeadDetail** — champs conditionnels locataire/vendeur
6. **Badges / libellés** — En veille / Actif / Urgent pour locataires

### Phase UX (vues raccourcis)
7. **Vues raccourcis** — barre Locataires / Achat·Vente / Tous dans `Leads.jsx`
8. **Kanban dynamique** — colonnes et labels selon la vue active dans `LeadsKanbanView.jsx`
9. **Filtres adaptés** — catégories Liste selon `leadTypeView`

---

## 7. Fichiers à modifier

| Fichier | Modifications |
|---------|----------------|
| `supabase-migrations/` | Nouvelle migration scoring |
| `functions/leadScoring.ts` | Refactor complet par lead_type |
| `src/pages/AddLead.jsx` | Champs locataire/vendeur |
| `src/pages/LeadDetail.jsx` | Champs + affichage badges |
| `src/components/dashboard/LeadCardDashboard.jsx` | Badge locataire |
| `src/lib/scoring-constants.js` | Constantes catégories par type, mapping |
| `src/pages/Leads.jsx` | Vues raccourcis, state leadTypeView |
| `src/components/leads/LeadsKanbanView.jsx` | Colonnes dynamiques selon leadTypeView |
| **Design** | Supprimer shadows (Leads, LeadDetail, Kanban) — flat, épuré |

---

*Document généré le 17/03/2025 — Source : Conversation_IA_Scoring.pdf + analyse codebase TTT*
