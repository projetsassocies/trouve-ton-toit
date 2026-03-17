-- À exécuter dans Supabase Dashboard > SQL Editor (une seule fois)
-- Ajoute toutes les colonnes manquantes pour l'estimation

-- Colonnes estimation (si pas déjà présentes)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimation_min NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimation_max NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimation_prix_m2 NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimation_date TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimation_source TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ventes_comparables JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimation_explication TEXT;
