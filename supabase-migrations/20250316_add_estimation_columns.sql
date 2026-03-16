-- Migration: Colonnes pour ventes comparables et explication IA
-- À exécuter dans Supabase Dashboard > SQL Editor

ALTER TABLE listings ADD COLUMN IF NOT EXISTS ventes_comparables JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimation_explication TEXT;
