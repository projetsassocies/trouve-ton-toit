-- Migration: Commodités et estimations
-- À exécuter dans Supabase Dashboard > SQL Editor

-- Colonnes pour les commodités (adresse exacte + commodités environnantes)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS exact_address TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS nearby_amenities JSONB;

-- Colonnes pour les estimations immobilières
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimation_min NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimation_max NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimation_prix_m2 NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimation_date TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimation_source TEXT;
