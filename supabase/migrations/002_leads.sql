-- Migration 002: Lovable-compatible leads schema
-- Run this in the Supabase SQL editor to rebuild leads + assessments tables
-- with columns that match the Lovable production schema.
-- Safe on mvp-scaffold (only 2 test leads).

DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS leads;

CREATE TABLE leads (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Contact (matches Lovable lead form fields)
  first_name              TEXT NOT NULL,
  last_name               TEXT NOT NULL,
  email                   TEXT NOT NULL UNIQUE,
  phone                   TEXT,
  company                 TEXT NOT NULL,
  position                TEXT,
  employee_count          TEXT,          -- "1-20", "21-50", "51-200", "201-500", "500+"
  annual_revenue          TEXT,          -- "unter-1m", "1-5m", "5-20m", "20-50m", "uber-50m"
  -- Assessment results (matches Lovable scoring output)
  total_score             INTEGER,       -- 0–100 (sum of all 20 answers × 5)
  max_score               INTEGER DEFAULT 100,
  typology_id             TEXT,          -- e.g. "strategic-paralyzed"
  typology_name           TEXT,          -- e.g. "Strategisch Gelähmt"
  bottleneck_dimension    TEXT,          -- name of the weakest dimension
  bottleneck_score        INTEGER,
  dimension_scores        JSONB,         -- array of { name, score, maxScore, percentage }
  -- Diagnostic tracking
  diagnostic_status       TEXT,          -- "in_progress" | "completed" | "abandoned"
  diagnostic_started_at   TIMESTAMPTZ,
  diagnostic_completed_at TIMESTAMPTZ,
  last_dimension_index    INTEGER,
  -- Portal extensions (not in Lovable — added here, migrated later)
  company_id              UUID DEFAULT gen_random_uuid() NOT NULL,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "admins_all" ON leads FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE TABLE assessments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  answers      JSONB NOT NULL,
  score        INTEGER,
  completed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON assessments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "admins_all" ON assessments FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Trigger: when a new auth user is invited via the portal invite flow,
-- create their profile using company_id and role from raw_user_meta_data.
-- If this trigger already exists, replace it with the updated version.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, company_id, has_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    (NEW.raw_user_meta_data->>'company_id')::UUID,
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
