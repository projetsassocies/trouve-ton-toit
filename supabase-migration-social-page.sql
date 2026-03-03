-- ============================================================
-- TrouveTonToit — Migration Social Page (Linktree)
-- Run this in Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- =====================
-- 1. Add new columns to social_page_configs
-- =====================

ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS zone TEXT;
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#000000';
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#f8f9fa';
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS custom_links JSONB DEFAULT '[]';
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS featured_listings JSONB DEFAULT '[]';
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS form_fields JSONB;
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS cta_button_text TEXT DEFAULT 'Prendre contact avec';
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS qr_label TEXT;
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS qr_color TEXT DEFAULT '#000000';
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS qr_background TEXT DEFAULT '#FFFFFF';
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS qr_logo TEXT;
ALTER TABLE social_page_configs ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- Backfill slug for existing rows (required before UNIQUE + NOT NULL)
UPDATE social_page_configs
SET slug = 'config-' || left(id::text, 8)
WHERE slug IS NULL;

-- Add NOT NULL and UNIQUE constraint for slug
ALTER TABLE social_page_configs ALTER COLUMN slug SET NOT NULL;

-- Create unique index (drop first if re-running migration)
DROP INDEX IF EXISTS idx_social_slug;
CREATE UNIQUE INDEX idx_social_slug ON social_page_configs(slug);

-- =====================
-- 2. Update RLS: public read only for published configs
-- =====================

-- Drop the old "Anyone can read social configs" policy
DROP POLICY IF EXISTS "Anyone can read social configs" ON social_page_configs;

-- Replace with policy: anonymous can only read published configs
CREATE POLICY "Anyone can read published social configs" ON social_page_configs
  FOR SELECT USING (is_published = true);

-- Note: The "Users manage own social config" policy (FOR ALL) already allows
-- owners to SELECT their own configs regardless of is_published.
-- Anonymous users will only see configs where is_published = true.
