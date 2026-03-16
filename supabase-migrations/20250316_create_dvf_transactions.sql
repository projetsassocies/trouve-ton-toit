-- Migration: Table DVF pour les transactions immobilières (estimation locale)
-- À exécuter dans Supabase Dashboard > SQL Editor
-- Référence: données Etalab DVF (valeursfoncieres-*.txt)

-- Table des transactions DVF (ventes uniquement, Maison + Appartement)
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

-- Index pour les requêtes d'estimation par code postal
CREATE INDEX IF NOT EXISTS idx_dvf_code_postal ON dvf_transactions(code_postal) WHERE code_postal IS NOT NULL;

-- Index pour filtrer par type et surface (ventes comparables)
CREATE INDEX IF NOT EXISTS idx_dvf_type_surface ON dvf_transactions(type_local, surface_reelle_bati);

-- Index pour recherche géographique (si lat/lon disponibles)
CREATE INDEX IF NOT EXISTS idx_dvf_lat_lon ON dvf_transactions(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index pour filtrer sur les ventes récentes
CREATE INDEX IF NOT EXISTS idx_dvf_date ON dvf_transactions(date_mutation DESC);

-- Index composite pour la requête principale (code postal + type + surface)
CREATE INDEX IF NOT EXISTS idx_dvf_postal_type ON dvf_transactions(code_postal, type_local);

-- RLS : lecture publique (open data), écriture via service_role uniquement (script d'import)
ALTER TABLE dvf_transactions ENABLE ROW LEVEL SECURITY;

-- Politique : lecture autorisée pour tous (données DVF open data)
CREATE POLICY "Allow read dvf_transactions" ON dvf_transactions FOR SELECT USING (true);
