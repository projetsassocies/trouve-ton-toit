# Plan UX — Refonte Leads et cohérence CRM

> **Statut :** Partiellement exécuté — voir détails ci-dessous.

---

## ✅ Implémenté

- **Ordre vues** : [Tous] [Achat / Vente] [Locataires]
- **Couleur sélection** : Vert secondaire #095237 (`bg-secondary`)
- **Couleur primaire** : #c8fc00 (HSL 80 100% 49%) dans `index.css`
- **Emojis → Lucide** : Vues raccourcis (LayoutGrid, CircleDollarSign, Key), badges catégories (Flame, Sun, Snowflake, Cloud, Activity, Zap), ScoreBreakdown matching
- **Plan boutons** : Implémenté — Option C/D hybride : icônes seules avec tooltip, à droite sur la ligne des vues raccourcis

---

## 1. Ordre des vues raccourcis
**Cible :** [Tous] [Achat / Vente] [Locataires]

- Mise en avant de la vue globale
- Logique : Tous → Achat/Vente → Locataires

---

## 2. Couleur de sélection
**Cible :** Vert secondaire `#095237` au lieu du noir

- Remplacer `bg-black text-white` par `bg-secondary text-secondary-foreground` sur les boutons de vue raccourcis
- Harmonisation avec la charte TTT

---

## 3. Audit couleur primaire `#c8fc00`
**État actuel :** `index.css` utilise HSL `80 92% 67%` (proche de #c6f960)

- Ajuster `--primary` en HSL pour coller à `#c8fc00`
- Vérifier tous les usages `bg-primary`, `text-primary`, `border-primary` dans le CRM

---

## 4. Remplacer les emojis par des icônes Lucide
**Cible :** Style flat / premium (Airbnb, Uber)

| Contexte | Emoji actuel | Icône Lucide |
|----------|--------------|--------------|
| Vue Locataires | 🔑 | `Key` |
| Vue Achat / Vente | 💰 | `CircleDollarSign` |
| Vue Tous | 📋 | `LayoutGrid` |
| Chaud / Urgent | 🔥 | `Flame` |
| Tiède / Actif | ☀️ | `Sun` |
| Froid / En veille | ❄️ | `Snowflake` / `Cloud` |

**Fichiers impactés :**
- `Leads.jsx` — barre vues raccourcis
- `scoring-constants.js` — labels Kanban + filtres catégorie
- `EditableCategorieBadge.jsx` — badges catégorie
- `LeadsKanbanView.jsx` — en-têtes colonnes (si nécessaire)
- `matching-engine.js` — icône Budget (💰)

---

## 5. Boutons « Nettoyer les doublons » et « Sélectionner »

### Options envisagées

**Option A — Regrouper dans un menu**
- Un seul bouton « Actions » avec dropdown
- Items : Nettoyer les doublons, Mode sélection

**Option B — Déplacer vers la zone filtres**
- Boutons alignés à droite de Liste/Kanban

**Option C — Garder visibles, revoir le style**
- Style `outline` plus sobre
- Ou style `ghost` pour moins charger la barre

**Option D — Réduire en icônes + tooltip**
- Icône Sparkles (nettoyer) et CheckSquare (sélectionner)
- Libellés au survol

### Recommandation : Option C + D hybride
- Boutons `variant="outline"` cohérents avec la charte
- Icônes + libellés courts (déjà le cas)
- Alignement visuel avec les vues raccourcis (même famille de boutons)

### Décision requise
Quelle option préfère-t-on pour ces 2 boutons ?
