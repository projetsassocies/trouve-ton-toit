# Import DVF (valeurs foncières)

## Prérequis

1. **Exécuter la migration SQL** dans Supabase Dashboard > SQL Editor :
   - Fichier : `supabase-migrations/20250316_create_dvf_transactions.sql`

2. **Variables d'environnement** (dans `.env` ou en ligne de commande) :
   - `SUPABASE_URL` — URL du projet Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` — Clé service role (Settings > API dans Supabase)

## Usage

```bash
# Installer la dépendance pour les .zip (optionnel)
npm install

# Fichier extrait (.txt)
node scripts/import-dvf.js valeursfoncieres-2025-s1.txt

# Fichier .zip (nécessite unzipper)
node scripts/import-dvf.js valeursfoncieres-2025-s1.txt.zip

# Test rapide : 1 département uniquement
node scripts/import-dvf.js valeursfoncieres-2025-s1.txt --departements=69

# Simulation sans insérer
node scripts/import-dvf.js valeursfoncieres-2025-s1.txt --departements=69 --dry-run
```

## Options

| Option | Description |
|--------|-------------|
| `--departements=01,69,75` | Limiter aux départements (ex. test) |
| `--dry-run` | Simuler sans insérer |

## Format attendu

Le fichier DVF Etalab utilise :
- Séparateur : `|` (pipe)
- Encodage : UTF-8
- Colonnes : id_mutation, date_mutation, valeur_fonciere, type_local, surface_reelle_bati, code_postal, etc.

Seules les transactions **Maison** et **Appartement** avec `valeur_fonciere > 0` et `surface_reelle_bati > 0` sont importées.
