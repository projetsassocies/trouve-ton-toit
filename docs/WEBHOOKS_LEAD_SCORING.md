# Configuration des webhooks pour leadScoring

La fonction Edge `leadScoring` recalcule le score d’un lead à chaque modification. Elle doit être déclenchée par des webhooks Supabase.

---

## 1. Déployer la fonction

```bash
supabase functions deploy leadScoring
```

---

## 2. Créer les webhooks dans le Dashboard

1. Ouvre **Supabase Dashboard** → ton projet
2. Va dans **Database** → **Webhooks** (ou **Integrations** → **Webhooks**)
3. Clique sur **Create a new webhook**

### Webhook 1 : Leads

- **Name** : `lead_scoring_on_leads`
- **Table** : `leads`
- **Events** : INSERT, UPDATE
- **Type** : HTTP Request
- **URL** : `https://VOTRE_PROJECT_REF.supabase.co/functions/v1/leadScoring`
  - Remplace `VOTRE_PROJECT_REF` par l’ID de ton projet (ex. `iiwmtzorwwanjrnhsrah`)
  - L’ID est dans l’URL du Dashboard : `https://supabase.com/dashboard/project/VOTRE_PROJECT_REF`
- **Method** : POST
- **Headers** : `Content-Type: application/json` (géré par défaut)

### Webhook 2 : Activities

- **Name** : `lead_scoring_on_activities`
- **Table** : `activities`
- **Events** : INSERT, UPDATE
- **URL** : `https://VOTRE_PROJECT_REF.supabase.co/functions/v1/leadScoring`
- **Method** : POST

### Webhook 3 : Events

- **Name** : `lead_scoring_on_events`
- **Table** : `events`
- **Events** : INSERT, UPDATE
- **URL** : idem
- **Method** : POST

### Webhook 4 : Tasks

- **Name** : `lead_scoring_on_tasks`
- **Table** : `tasks`
- **Events** : INSERT, UPDATE
- **URL** : idem
- **Method** : POST

### Webhook 5 : Notes

- **Name** : `lead_scoring_on_notes`
- **Table** : `notes`
- **Events** : INSERT, UPDATE
- **URL** : idem
- **Method** : POST

---

## 3. Vérification

Après mise en place :

1. Modifie un lead (ex. statut financement) → le score doit se recalculer
2. Ajoute une activité liée à un lead → le score doit se recalculer

Les logs sont visibles dans **Edge Functions** → `leadScoring` → **Logs**.

---

## 4. Format du payload (automatique)

Supabase envoie un JSON de ce type :

```json
{
  "type": "INSERT",
  "table": "leads",
  "schema": "public",
  "record": { "id": "...", ... },
  "old_record": null
}
```

La fonction `leadScoring` gère ce format directement.
