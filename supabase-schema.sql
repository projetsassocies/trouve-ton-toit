-- ============================================================
-- TrouveTonToit — Full Supabase Database Schema
-- Run this in Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- =====================
-- 1. LEADS
-- =====================
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  property_type TEXT,
  surface_min NUMERIC,
  surface_max NUMERIC,
  rooms_min INTEGER,
  lead_type TEXT,
  status TEXT DEFAULT 'nouveau',
  categorie TEXT DEFAULT 'FROID',
  score INTEGER DEFAULT 0,
  score_initial INTEGER DEFAULT 0,
  score_engagement INTEGER DEFAULT 0,
  score_progression INTEGER DEFAULT 0,
  financing_status TEXT,
  apport_percentage NUMERIC,
  delai TEXT,
  disponibilite TEXT,
  notes TEXT,
  source TEXT,
  blocking_criteria JSONB DEFAULT '[]',
  matched_listings JSONB DEFAULT '[]',
  match_score INTEGER DEFAULT 0,
  scoring_logs JSONB DEFAULT '[]',
  date_scoring TIMESTAMPTZ,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 2. LISTINGS
-- =====================
CREATE TABLE IF NOT EXISTS listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  description TEXT,
  price NUMERIC,
  city TEXT,
  address TEXT,
  postal_code TEXT,
  surface NUMERIC,
  rooms INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  floor INTEGER,
  total_floors INTEGER,
  property_type TEXT,
  transaction_type TEXT,
  status TEXT DEFAULT 'brouillon',
  images JSONB DEFAULT '[]',
  amenities JSONB DEFAULT '[]',
  amenities_data JSONB,
  exact_address TEXT,
  nearby_amenities JSONB,
  latitude NUMERIC,
  longitude NUMERIC,
  estimation_min NUMERIC,
  estimation_max NUMERIC,
  estimation_prix_m2 NUMERIC,
  estimation_date TIMESTAMPTZ,
  estimation_source TEXT,
  ventes_comparables JSONB,
  estimation_explication TEXT,
  energy_class TEXT,
  ges_class TEXT,
  year_built INTEGER,
  parking BOOLEAN DEFAULT FALSE,
  elevator BOOLEAN DEFAULT FALSE,
  balcony BOOLEAN DEFAULT FALSE,
  garden BOOLEAN DEFAULT FALSE,
  cellar BOOLEAN DEFAULT FALSE,
  source_url TEXT,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 3. ACTIVITIES
-- =====================
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT,
  title TEXT,
  description TEXT,
  content TEXT,
  linked_to_id TEXT,
  linked_to_type TEXT,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 4. EVENTS
-- =====================
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT,
  title TEXT,
  description TEXT,
  date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  location TEXT,
  status TEXT DEFAULT 'pending',
  linked_to_id TEXT,
  linked_to_type TEXT,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 5. TASKS
-- =====================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  linked_to_id TEXT,
  linked_to_type TEXT,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 6. NOTES
-- =====================
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT,
  linked_to_id TEXT,
  linked_to_type TEXT,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 7. NOTIFICATIONS
-- =====================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT,
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  linked_lead_id TEXT,
  linked_listing_id TEXT,
  match_count INTEGER,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 8. SOCIAL PAGE CONFIG
-- =====================
CREATE TABLE IF NOT EXISTS social_page_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_name TEXT,
  agency_logo TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_image TEXT,
  theme_color TEXT DEFAULT '#000000',
  accent_color TEXT DEFAULT '#c5ff4e',
  show_listings BOOLEAN DEFAULT TRUE,
  show_contact_form BOOLEAN DEFAULT TRUE,
  contact_email TEXT,
  contact_phone TEXT,
  about_text TEXT,
  custom_css TEXT,
  config JSONB DEFAULT '{}',
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 9. MATCHING CONFIG
-- =====================
CREATE TABLE IF NOT EXISTS matching_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  weights JSONB DEFAULT '{"budget": 35, "city": 25, "surface": 20, "rooms": 10, "property_type": 10}',
  thresholds JSONB DEFAULT '{"chaud_min": 75, "tiede_min": 40}',
  tolerance JSONB DEFAULT '{"budget_percentage": 15, "surface_percentage": 20, "rooms_difference": 1}',
  blocking_criteria_weight INTEGER DEFAULT 100,
  financing_bonus JSONB DEFAULT '{"valide": 15, "en_cours": 5}',
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 10. QUERIES
-- =====================
CREATE TABLE IF NOT EXISTS queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  query_data JSONB DEFAULT '{}',
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);


-- =====================
-- 11. CONVERSATIONS (AI Agent Chat)
-- =====================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL DEFAULT 'assistant',
  metadata JSONB DEFAULT '{}',
  messages JSONB DEFAULT '[]',
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);


-- =====================
-- 12. MATCHES (Lead <-> Listing correspondences)
-- =====================
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  score_details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'nouveau',
  proposed_date TIMESTAMPTZ,
  visit_date TIMESTAMPTZ,
  decision_date TIMESTAMPTZ,
  notes TEXT,
  history JSONB DEFAULT '[]',
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, listing_id)
);

-- ============================================================
-- ROW-LEVEL SECURITY (RLS)
-- Users can only access their own data
-- ============================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_page_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Leads
CREATE POLICY "Users manage own leads" ON leads
  FOR ALL USING (created_by = (SELECT auth.jwt()->>'email'))
  WITH CHECK (created_by = (SELECT auth.jwt()->>'email'));

-- Listings
CREATE POLICY "Users manage own listings" ON listings
  FOR ALL USING (created_by = (SELECT auth.jwt()->>'email'))
  WITH CHECK (created_by = (SELECT auth.jwt()->>'email'));

-- Activities
CREATE POLICY "Users manage own activities" ON activities
  FOR ALL USING (created_by = (SELECT auth.jwt()->>'email'))
  WITH CHECK (created_by = (SELECT auth.jwt()->>'email'));

-- Events
CREATE POLICY "Users manage own events" ON events
  FOR ALL USING (created_by = (SELECT auth.jwt()->>'email'))
  WITH CHECK (created_by = (SELECT auth.jwt()->>'email'));

-- Tasks
CREATE POLICY "Users manage own tasks" ON tasks
  FOR ALL USING (created_by = (SELECT auth.jwt()->>'email'))
  WITH CHECK (created_by = (SELECT auth.jwt()->>'email'));

-- Notes
CREATE POLICY "Users manage own notes" ON notes
  FOR ALL USING (created_by = (SELECT auth.jwt()->>'email'))
  WITH CHECK (created_by = (SELECT auth.jwt()->>'email'));

-- Notifications
CREATE POLICY "Users manage own notifications" ON notifications
  FOR ALL USING (created_by = (SELECT auth.jwt()->>'email'))
  WITH CHECK (created_by = (SELECT auth.jwt()->>'email'));

-- Social page configs (owner + public read for the social page)
CREATE POLICY "Users manage own social config" ON social_page_configs
  FOR ALL USING (created_by = (SELECT auth.jwt()->>'email'))
  WITH CHECK (created_by = (SELECT auth.jwt()->>'email'));

CREATE POLICY "Anyone can read social configs" ON social_page_configs
  FOR SELECT USING (true);

-- Matching configs
CREATE POLICY "Users manage own matching config" ON matching_configs
  FOR ALL USING (created_by = (SELECT auth.jwt()->>'email'))
  WITH CHECK (created_by = (SELECT auth.jwt()->>'email'));

-- Queries
CREATE POLICY "Users manage own queries" ON queries
  FOR ALL USING (created_by = (SELECT auth.jwt()->>'email'))
  WITH CHECK (created_by = (SELECT auth.jwt()->>'email'));

-- Conversations
CREATE POLICY "Users manage own conversations" ON conversations
  FOR ALL USING (created_by = (SELECT auth.jwt()->>'email'))
  WITH CHECK (created_by = (SELECT auth.jwt()->>'email'));

-- Matches
CREATE POLICY "Users manage own matches" ON matches
  FOR ALL USING (created_by = (SELECT auth.jwt()->>'email'))
  WITH CHECK (created_by = (SELECT auth.jwt()->>'email'));

-- Public read for listings on the social page
CREATE POLICY "Anyone can read published listings" ON listings
  FOR SELECT USING (status = 'publie');


-- ============================================================
-- AUTO-UPDATE updated_date TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_date
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

CREATE TRIGGER listings_updated_date
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

CREATE TRIGGER social_page_configs_updated_date
  BEFORE UPDATE ON social_page_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

CREATE TRIGGER conversations_updated_date
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

CREATE TRIGGER matches_updated_date
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();


-- ============================================================
-- ENABLE REALTIME (for notifications)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_categorie ON leads(categorie);
CREATE INDEX IF NOT EXISTS idx_leads_created_date ON leads(created_date DESC);

CREATE INDEX IF NOT EXISTS idx_listings_created_by ON listings(created_by);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_date ON listings(created_date DESC);

CREATE INDEX IF NOT EXISTS idx_activities_linked ON activities(linked_to_id, linked_to_type);
CREATE INDEX IF NOT EXISTS idx_events_linked ON events(linked_to_id, linked_to_type);
CREATE INDEX IF NOT EXISTS idx_tasks_linked ON tasks(linked_to_id, linked_to_type);
CREATE INDEX IF NOT EXISTS idx_notes_linked ON notes(linked_to_id, linked_to_type);

CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON notifications(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_name);

CREATE INDEX IF NOT EXISTS idx_matches_lead ON matches(lead_id);
CREATE INDEX IF NOT EXISTS idx_matches_listing ON matches(listing_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_by ON matches(created_by);
CREATE INDEX IF NOT EXISTS idx_matches_score ON matches(score DESC);
