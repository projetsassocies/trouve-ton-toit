-- Migration: Champs pour scoring par type de lead (Phase 1)
-- À exécuter dans Supabase Dashboard > SQL Editor
-- Plan: docs/PLAN_ACTION_SCORING_CRM.md

-- ═══════════════════════════════════════════════════════════
-- Champ commun à tous les leads
-- ═══════════════════════════════════════════════════════════

-- Dernière interaction (pour refroidissement)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS date_derniere_interaction TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════
-- Champs spécifiques Locataires
-- ═══════════════════════════════════════════════════════════

-- Dossier complet (pack identité + solvabilité + garantie)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS dossier_location_complet BOOLEAN DEFAULT FALSE;
-- Garantie : visale | cautioneo | physique | aucune
ALTER TABLE leads ADD COLUMN IF NOT EXISTS garantie_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS date_entree_souhaitee DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preavis_pose BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS revenus_mensuels_nets NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS loyer_cible_max NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS dossier_valide_agent BOOLEAN DEFAULT FALSE;

-- ═══════════════════════════════════════════════════════════
-- Champs spécifiques Vendeurs
-- ═══════════════════════════════════════════════════════════

ALTER TABLE leads ADD COLUMN IF NOT EXISTS mandat_signe BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimation_demandee BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bien_sous_compromis BOOLEAN DEFAULT FALSE;
