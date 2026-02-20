-- Migration 003: Sessions table for per-lead bookable coaching sessions
-- Idempotent — safe to re-run whether the table exists or not.

CREATE TABLE IF NOT EXISTS sessions (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id              UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_by_admin_id  UUID REFERENCES auth.users(id),
  title                TEXT NOT NULL,
  description          TEXT,
  calendly_url         TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'booking_open',
  booked_start_at      TIMESTAMPTZ,
  booked_end_at        TIMESTAMPTZ,
  location             TEXT,
  meeting_url          TEXT,
  recording_url        TEXT,
  calendly_event_uri   TEXT,
  calendly_invitee_uri TEXT,
  show_on_dashboard    BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at           TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- If the table already existed with a different schema, add any missing columns.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lead_id              UUID REFERENCES leads(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_by_admin_id  UUID REFERENCES auth.users(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS description          TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS calendly_url         TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS booked_start_at      TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS booked_end_at        TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS location             TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS meeting_url          TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS recording_url        TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS calendly_event_uri   TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS calendly_invitee_uri TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS show_on_dashboard    BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT now() NOT NULL;

-- Ensure status column default is correct
ALTER TABLE sessions ALTER COLUMN status SET DEFAULT 'booking_open';

-- RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_all" ON sessions;
DROP POLICY IF EXISTS "customers_read_own" ON sessions;

CREATE POLICY "admins_all" ON sessions FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "customers_read_own" ON sessions FOR SELECT
  USING (
    lead_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'customer'
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_updated_at ON sessions;
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- NOTE: Register a Calendly webhook subscription pointing to:
--   https://<your-domain>/api/webhooks/calendly
-- Events to subscribe: invitee.created, invitee.canceled
-- Copy the signing key into CALENDLY_WEBHOOK_SIGNING_KEY in your .env.local
-- When creating session booking links, append ?utm_content={session.id}
-- The webhook reads payload.tracking.utm_content to map bookings to sessions.
