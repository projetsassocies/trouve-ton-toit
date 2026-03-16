# Instructions – Configuration estimation DVF

Guide pour configurer Supabase et les outils associés pour l'estimation immobilière (DVF local, ventes comparables, coefficients commodités, explication IA).

---

## 1. SUPABASE – Migrations SQL

Dans **Supabase Dashboard** : va dans **SQL Editor** (menu gauche) → **New query**.

### Migration 1 : Table DVF

Copie-colle et exécute le contenu du fichier :

```
supabase-migrations/20250316_create_dvf_transactions.sql
```

Ou exécute directement ce SQL :

```sql
CREATE TABLE IF NOT EXISTS dvf_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_mutation TEXT,
  date_mutation DATE,
  valeur_fonciere NUMERIC NOT NULL,
  type_local TEXT NOT NULL,
  surface_reelle_bati NUMERIC NOT NULL,
  surface_terrain NUMERIC,
  nombre_pieces_principales INTEGER,
  code_postal TEXT,
  code_commune TEXT,
  code_departement TEXT,
  adresse_nom_voie TEXT,
  longitude NUMERIC,
  latitude NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dvf_code_postal ON dvf_transactions(code_postal) WHERE code_postal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dvf_type_surface ON dvf_transactions(type_local, surface_reelle_bati);
CREATE INDEX IF NOT EXISTS idx_dvf_lat_lon ON dvf_transactions(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dvf_date ON dvf_transactions(date_mutation DESC);
CREATE INDEX IF NOT EXISTS idx_dvf_postal_type ON dvf_transactions(code_postal, type_local);

ALTER TABLE dvf_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read dvf_transactions" ON dvf_transactions FOR SELECT USING (true);
```

Clique sur **Run**. Tu dois voir "Success".

---

### Migration 2 : Colonnes listings (ventes comparables + explication)

Même principe : **SQL Editor** → **New query**.

Copie-colle :

```sql
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ventes_comparables JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimation_explication TEXT;
```

Clique sur **Run**.

---

## 2. SUPABASE – Secrets (explication IA)

L’explication générée par OpenAI est optionnelle. Sans `OPENAI_API_KEY`, les estimations sont calculées mais sans texte explicatif.

### Ajouter la clé OpenAI

1. Dans Supabase : **Project Settings** (icône engrenage)
2. **Edge Functions** (ou **Functions**)
3. Onglet **Secrets**
4. **New secret** :
   - Name : `OPENAI_API_KEY`
   - Value : ta clé API OpenAI (comme `sk-...`)

---

## 3. SUPABASE – Déploiement de la fonction Edge

Pour que la nouvelle logique d’estimation soit utilisée, il faut déployer la fonction `getPropertyEstimation`.

Depuis le dossier du projet (PowerShell ou CMD) :

```powershell
cd "e:\CURSOR FILES\TTT web app\trouve-ton-toit"
npx supabase functions deploy getPropertyEstimation
```

Si tu utilises le lien au projet :

```powershell
npx supabase link --project-ref iiwmtzorwwanjrnhsrah
npx supabase functions deploy getPropertyEstimation
```

Tu peux aussi déployer toutes les fonctions :

```powershell
npx supabase functions deploy
```

---

## 4. IMPORT DES DONNÉES DVF

Le fichier DVF (`valeursfoncieres-2025-s1.txt.zip`) doit être importé dans la table `dvf_transactions`.

### Fichier .env

À la racine du projet, crée un fichier `.env` (s’il n’existe pas) avec :

```
SUPABASE_URL=https://iiwmtzorwwanjrnhsrah.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- **SUPABASE_URL** : dans Supabase → **Settings** → **API** → **Project URL**
- **SUPABASE_SERVICE_ROLE_KEY** : dans **Settings** → **API** → **Project API keys** → **service_role** (la clé secrète, ne pas la partager)

### Lancer l’import

```powershell
# Installer les dépendances (inclut unzipper)
npm install

# Test rapide : 1 département (ex. Rhône)
node scripts/import-dvf.js valeursfoncieres-2025-s1.txt.zip --departements=69

# Import complet (le fichier peut être gros, plusieurs minutes)
node scripts/import-dvf.js valeursfoncieres-2025-s1.txt.zip
```

Le script lit le fichier, filtre Maison + Appartement, et insère par lots de 5 000 lignes.

---

## 5. RÉCAPITULATIF – Ordre des étapes

| Étape | Action |
|-------|--------|
| 1 | Migration 1 (table `dvf_transactions`) dans Supabase SQL Editor |
| 2 | Migration 2 (colonnes `listings`) dans Supabase SQL Editor |
| 3 | Déployer la fonction : `npx supabase functions deploy getPropertyEstimation` |
| 4 | (Optionnel) Ajouter `OPENAI_API_KEY` dans les secrets Supabase |
| 5 | Créer `.env` avec `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` |
| 6 | Lancer l’import DVF : `node scripts/import-dvf.js valeursfoncieres-2025-s1.txt.zip` |

---

## 6. VÉRIFICATIONS

- **Table dvf_transactions** : Supabase → **Table Editor** → `dvf_transactions` → vérifier que des lignes sont présentes  
- **Estimation** : ouvrir un bien à vendre dans le CRM → onglet **Estimation** → **Générer l'estimation**  
- **Source** : si tu vois "données DVF locales", les données DVF sont bien utilisées  
- **Ventes comparables** : tableau affiché sous la fourchette d’estimation  
- **Explication** : texte court uniquement si `OPENAI_API_KEY` est configurée  

---

## 7. EN CAS DE PROBLÈME

| Problème | Pistes |
|----------|--------|
| "Colonnes manquantes" à l’import | Vérifier le format du fichier DVF (séparateur `\|`, colonnes Etalab) |
| Pas de ventes comparables | Vérifier que des lignes existent dans `dvf_transactions` pour le code postal du bien |
| Erreur 401 sur l’estimation | Vérifier que l’utilisateur est bien connecté au CRM |
| Pas d’explication IA | Vérifier que `OPENAI_API_KEY` est définie dans Supabase Edge Functions → Secrets |
