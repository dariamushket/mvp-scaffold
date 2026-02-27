-- Migration 007: Subtask Attachments
-- Depends on: 004_tasks.sql (subtasks, materials)

CREATE TABLE subtask_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id  UUID NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  url         TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'link' CHECK (type IN ('link', 'material')),
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subtask_attachments_subtask_id ON subtask_attachments (subtask_id);

ALTER TABLE subtask_attachments ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admins manage subtask_attachments" ON subtask_attachments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Customers: read their own company's subtask attachments
CREATE POLICY "Customers view own subtask_attachments" ON subtask_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subtasks st
      JOIN tasks t ON t.id = st.task_id
      JOIN profiles p ON p.company_id = t.company_id
      WHERE st.id = subtask_attachments.subtask_id AND p.id = auth.uid()
    )
  );
