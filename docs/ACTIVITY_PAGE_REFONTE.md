# Refonte page Activité – Analyse et Recommandations

> Document de référence pour la modernisation de la page Activité du CRM TrouveTonToit, inspiré des meilleures pratiques Notion, Airbnb, Linear.

---

## 1. Bugs identifiés et corrections appliquées

### ✅ Notes : modal qui ne s'ouvre pas
**Cause** : Conflit Radix UI entre `DropdownMenu` et `Dialog`. Quand on clique sur « Créer une note » dans le menu déroulant, la fermeture du dropdown interfère avec l’ouverture du Dialog (gestion des `pointer-events`, focus, etc.).

**Correction** : `setTimeout(() => setCreateModalOpen(true), 0)` dans `handleCreateClick` pour retarder l’ouverture du modal jusqu’à la fin de la fermeture du dropdown.

### ✅ Tâches : incohérence affichage
**Observation** : Les tâches s’affichent dans la Timeline et le dashboard. La section Tâches utilise la même query `['tasks']` et devrait être à jour après `invalidateQueries`. Si ce n’est pas le cas, vérifier :

- Le tri : `Task.list('-created_date')` vs `Task.list()`
- L’éventuel filtre `created_by` côté base44

**Recommandation** : Harmoniser les query keys et les paramètres de tri sur l’ensemble des composants.

### ✅ Ordre des onglets
**Modification** : L’Agenda est désormais le premier onglet affiché par défaut, puis Tâches & Notes, puis Timeline.

---

## 2. Structure actuelle de la page

```
Page Activité
├── Header (titre + bouton Nouveau dropdown)
├── Tabs
│   ├── Agenda (calendrier + liste événements)
│   ├── Tâches & Notes (sous-tabs : Tâches | Notes)
│   └── Timeline (flux unifié activités/tâches/notes/événements)
└── Modals (CreateActivity, CreateTask, CreateNote, CreateEvent)
```

**Problèmes UX** :
- Trop de niveaux d’onglets (Activité → Tâches & Notes → Tâches/Notes)
- L’Agenda n’est pas mis en avant alors qu’il est prioritaire
- Le bouton « Nouveau » mélange types d’activité (appels, emails, notes, tâches, événements) sans hiérarchie claire

---

## 3. Inspiration Notion / Airbnb : pistes d’évolution

### 3.1 Notion
- **Navigation latérale** : vues (Database, Calendar, Board) au lieu de gros onglets en haut
- **Vue par défaut** : Calendrier ou vue « Aujourd’hui » pour la productivité
- **Actions rapides** : raccourcis toujours visibles
- **Peu de bordures** : groupes visuels par espacements, pas par des cadres
- **Typo** : hiérarchie nette (titres, sous-titres, métadonnées)

### 3.2 Airbnb
- **Vue d’ensemble** : résumé en haut (aujourd’hui, prochains jours)
- **Cartes claires** : ombres légères, coins arrondis, infos essentielles visibles
- **Hiérarchie** : actions principales immédiatement visibles
- **Couleur** : usage restreint pour les actions et les états importants
- **Empty states** : message explicite + CTA pour créer du contenu

### 3.3 Linear
- **Vue de journée** : focus sur « aujourd’hui » avec tâches et événements
- **Feedback immédiat** : animations courtes sur les changements d’état
- **Raccourcis claviers** : création rapide (ex. N pour nouvelle tâche)
- **Design minimal** : peu de distractions, beaucoup de lisibilité

---

## 4. Proposition de nouvelle structure

### Option A : Vue hybride (recommandée)
```
┌─────────────────────────────────────────────────────────────┐
│ Activité                                    [+ Nouveau]     │
├─────────────────────────────────────────────────────────────┤
│ [Agenda] [Tâches] [Notes] [Timeline]                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │ AUJOURD'HUI         │  │ À FAIRE (tâches prioritaires)│   │
│  │ • Événement 1       │  │ • Tâche 1                    │   │
│  │ • Événement 2       │  │ • Tâche 2                    │   │
│  └─────────────────────┘  └─────────────────────────────┘   │
│                                                             │
│  [Contenu principal : Agenda détaillé / Tâches Kanban /     │
│   Liste notes / Timeline]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Agenda en premier** et focus sur aujourd’hui
- **Sidebar ou barre rapide** avec « Aujourd’hui » et « À faire »
- **4 onglets** : Agenda, Tâches, Notes, Timeline (sans sous-onglet)

### Option B : Layout type Notion
```
┌──────────┬──────────────────────────────────────────────────┐
│ Views    │                                                  │
│ • Auj.   │  Calendrier ou vue principale                     │
│ • Semaine│                                                  │
│ • Tâches │                                                  │
│ • Notes  │                                                  │
│ • Flux   │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 5. Design system recommandé

### 5.1 Couleurs et contrastes
- **Primaire** : garder le vert TTT pour les CTA
- **Neutres** : `#1a1a1a` pour le texte, `#666666` secondaire, `#999999` tertiaire
- **Surfaces** : `#FAFAFA` pour les zones secondaires, fond principal blanc ou très léger

### 5.2 Espacements
- Grille : 4, 8, 12, 16, 24, 32, 48 px
- Padding cartes : 16–24 px
- Marge entre blocs : 24–32 px

### 5.3 Typographie
- Titre page : 24–28 px, font-weight 600
- Sous-titre : 14–16 px, couleur secondaire
- Labels : 12–14 px, uppercase optionnel pour les petits labels
- Corps : 14–16 px, line-height 1.5

### 5.4 Bordures et ombres
- Réduire bordures : préférer `border-gray-100` ou `border-gray-200`
- Ombres légères : `shadow-sm` sur hover, `shadow-md` pour modales
- Rayon : 12–16 px pour cartes, 8–12 px pour boutons

### 5.5 Empty states
- Icône grande et discrète
- Titre court (« Aucune tâche »)
- Sous-titre explicatif
- CTA clair

---

## 6. Améliorations techniques possibles

1. **Query keys** : uniformiser `['tasks']`, `['events']`, `['notes']`, `['activities']`
2. **Optimistic updates** : mettre à jour l’UI avant la réponse serveur
3. **Raccourcis clavier** : N = nouvelle note, T = nouvelle tâche, E = nouvel événement
4. **Filtres côté client** : éviter de refetch pour chaque filtre
5. **Skeleton loaders** : états de chargement cohérents partout

---

## 7. Prochaines étapes

| Priorité | Action |
|----------|--------|
| 1 | Valider les corrections (notes, ordre des onglets) |
| 2 | Séparer Tâches et Notes en onglets au lieu de sous-onglets |
| 3 | Mettre en place le design system (couleurs, espacements, ombres) |
| 4 | Ajouter une section « Aujourd’hui » en haut de l’Agenda |
| 5 | Revoir les empty states avec icônes + CTA |
| 6 | Étudier un layout type sidebar pour les vues (option B) |

---

*Document créé le 15 mars 2025*
