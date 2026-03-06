# Stratégie Dashboard — Copilote Proactif Agent Immo

## Vision
Transformer le dashboard générique en un **vrai copilote IA proactif** : un assistant qui analyse les données en temps réel pour fournir des **actions quotidiennes concrètes et priorisées** — comme un Siri dédié à l'agent immobilier indépendant.

## Principes directeurs
- **Stratégique et opérationnel** : métriques qui comptent (visites, mandats, conversion, signatures)
- **Proactif** : insights du jour actionnables, pas de simples affichages
- **Compact et intuitif** : pas de surcharge visuelle, hiérarchie claire
- **Action-first** : chaque élément doit inviter à l'action

---

## 1. Barre de stats compacte (remplace les 4 grosses cards)

### Métriques stratégiques temps réel
| Métrique | Source | Description |
|----------|--------|-------------|
| **Visites planifiées** | Events (type=visit, date ≥ today) + Matches (status=visite_planifiee) | RDV à venir |
| **Mandats signés** | Matches (status=accepte) | Leads ayant accepté un bien → mandat imminent |
| **Taux conversion** | Matches (proposés vs acceptés) | Efficacité des propositions |
| **Signatures** | Events (type=signing, à venir ou aujourd'hui) | RDV signatures planifiés |

### Design
- Barre horizontale compacte, puces/métriques en ligne
- Icônes + valeur + libellé court
- Pas de cards énormes : badges ou chips compacts
- Option : mini-graphiques sparkline pour tendance

---

## 2. Insights du jour — Pile de Post-its (haut droite)

### Concept
- **Position** : coin supérieur droit
- **Design** : pile de post-its superposés, feuilles qui débordent (effet visuel "stack")
- **Navigation** : boutons "Suivant" / "Précédent" en bas de chaque post-it
- **Action** : bouton "Traité" pour marquer la tâche comme faite (archive ou met à jour la task/event)

### Sources des insights (priorité)
1. **Tasks en attente** (tâches à faire aujourd'hui ou en retard)
2. **Visites aujourd'hui** (Events visit non completed)
3. **Signatures aujourd'hui** (Events signing)
4. **Leads chauds sans contact récent** (CHAUD + dernière activité > 3j)
5. **Matches en attente** (proposition envoyée, pas de réponse depuis X jours)
6. **Suggestions IA** (si LLM disponible : "Rappeler M. Dupont — visite hier")

### UX
- Un post-it visible à la fois, stack en arrière-plan
- Indicateur type "3/5" pour position dans la pile
- "Traité" → post-it disparaît de la pile, passe au suivant

---

## 3. Zone Leads prioritaires

### Critères
- Score élevé (≥ 70)
- Catégorie CHAUD ou TIÈDE
- Match en attente (propose, visite_planifiee) ou dernière activité récente
- Pas de contact depuis 48h+ (actions à mener)

### Affichage
- Liste compacte de leads avec action suggérée
- Ex : "Rappeler", "Planifier visite", "Relancer proposition"
- Lien direct vers fiche lead

---

## 4. Agencement global

```
┌─────────────────────────────────────────────────────────────────────┐
│ Header (Bonjour...)                    [Notifications] [Post-its pile]│
├─────────────────────────────────────────────────────────────────────┤
│ [GlobalSearch]                                                        │
├─────────────────────────────────────────────────────────────────────┤
│ Stats compactes: Visites | Mandats | Conversion | Signatures          │
├─────────────────────────────────────────────────────────────────────┤
│ [AIAssistantTabs — Chat / Lead]     (copilote conversationnel)       │
├─────────────────────────────────────────────────────────────────────┤
│ Leads prioritaires          │  Activité récente / Prochaines visites  │
│ (actions à mener)           │  (widgets secondaires)                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Éléments retirés du dashboard
- **Leads Chaud/Tiède** (LeadCategoryColumn) : déplacés vers page Leads avec filtres
- **Derniers biens** : déplacés vers page Listings ou réductible
- Raccourcis redondants : garder uniquement si contexte pertinent

---

## 5. Données requises (entities)

- **Lead** : id, score, categorie, created_date
- **Match** : status, lead_id, listing_id, created_date
- **Event** : type (visit, signing, call, meeting), date, status, linked_to_id
- **Task** : status, due_date, priority, linked_to_id
- **Activity** : type, created_date, linked_to_id (pour dernier contact)

---

## 6. Implémentation progressive

1. **Phase 1** : Stats compactes + refonte layout
2. **Phase 2** : Composant Post-its + logique insights (tasks, events)
3. **Phase 3** : Zone Leads prioritaires avec critères
4. **Phase 4** : Déplacer Chaud/Tiède vers Leads, alléger sidebar
