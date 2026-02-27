-- Soft-delete support for tags
ALTER TABLE task_tags ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Materials tagging
ALTER TABLE materials ADD COLUMN IF NOT EXISTS tag_id UUID REFERENCES task_tags(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_materials_tag_id ON materials (tag_id);

-- Seed 5 dimension tags (skip if name already exists)
INSERT INTO task_tags (name, color) VALUES
  ('Strategie',    '#3b82f6'),
  ('Führung',      '#8b5cf6'),
  ('Prozesse',     '#f59e0b'),
  ('People',       '#22c55e'),
  ('Performance',  '#ef4444')
ON CONFLICT DO NOTHING;
