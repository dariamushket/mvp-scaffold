-- Editable current score (separate from assessment total_score)
ALTER TABLE leads ADD COLUMN current_score INTEGER;
UPDATE leads SET current_score = total_score WHERE total_score IS NOT NULL;

-- Track when admin generated/shared the portal invite link
ALTER TABLE leads ADD COLUMN portal_invite_shared_at TIMESTAMPTZ;

-- Per-admin timestamped notes (replaces single notes text field)
CREATE TABLE lead_notes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage lead_notes" ON lead_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Download tracking counter on materials
ALTER TABLE materials ADD COLUMN download_count INTEGER NOT NULL DEFAULT 0;
