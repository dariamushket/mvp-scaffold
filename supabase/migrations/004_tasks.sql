-- Migration 004: Tasks Feature
-- Run in Supabase SQL Editor
-- Depends on: 001_materials.sql, 002_leads.sql, 003_sessions.sql (set_updated_at)

-- ============================================================
-- Clean slate: drop any pre-existing task tables in FK order.
-- Safe to re-run — CASCADE removes dependent policies/indexes.
-- ============================================================
DROP TABLE IF EXISTS task_comments    CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS subtasks         CASCADE;
DROP TABLE IF EXISTS tasks            CASCADE;
DROP TABLE IF EXISTS task_templates   CASCADE;
DROP TABLE IF EXISTS task_tags        CASCADE;

-- ============================================================
-- task_tags: admin-managed label palette
-- ============================================================
CREATE TABLE task_tags (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#2d8a8a',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_task_tags" ON task_tags FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "customers_select_task_tags" ON task_tags FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'customer');

-- ============================================================
-- tasks
-- company_id = leads.id (the primary key / tenant identifier)
-- ============================================================
CREATE TABLE tasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'not_started'
                CHECK (status IN ('not_started', 'in_progress', 'done')),
  tag_id      UUID REFERENCES task_tags(id) ON DELETE SET NULL,
  deadline    DATE,
  position    INTEGER NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_tasks" ON tasks FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Customers can read tasks that belong to their company
CREATE POLICY "customers_select_tasks" ON tasks FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'customer'
    AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Customers can update tasks for their company (API enforces field whitelist)
CREATE POLICY "customers_update_tasks" ON tasks FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'customer'
    AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================================
-- subtasks (each has its own deadline per design)
-- ============================================================
CREATE TABLE subtasks (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  is_done    BOOLEAN NOT NULL DEFAULT false,
  deadline   DATE,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_subtasks" ON subtasks FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "customers_select_subtasks" ON subtasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = subtasks.task_id
        AND t.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'customer'
    )
  );

CREATE POLICY "customers_update_subtasks" ON subtasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = subtasks.task_id
        AND t.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'customer'
    )
  );

-- ============================================================
-- task_attachments: links and material references
-- ============================================================
CREATE TABLE task_attachments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  url         TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'link' CHECK (type IN ('link', 'material')),
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_task_attachments" ON task_attachments FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "customers_select_task_attachments" ON task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_attachments.task_id
        AND t.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'customer'
    )
  );

-- ============================================================
-- task_comments
-- ============================================================
CREATE TABLE task_comments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES auth.users(id),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_task_comments" ON task_comments FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "customers_select_task_comments" ON task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_comments.task_id
        AND t.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'customer'
    )
  );

-- Customers can post comments on their own company's tasks
CREATE POLICY "customers_insert_task_comments" ON task_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_comments.task_id
        AND t.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'customer'
    )
  );

-- ============================================================
-- task_templates: admin-only, payload = array of TaskTemplateTaskDef
-- ============================================================
CREATE TABLE task_templates (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  tag_id       UUID REFERENCES task_tags(id) ON DELETE SET NULL,
  created_by   UUID REFERENCES auth.users(id),
  last_used_at TIMESTAMPTZ,
  payload      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_task_templates" ON task_templates FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_tasks_company_status_pos ON tasks (company_id, status, position);
CREATE INDEX idx_subtasks_task_id         ON subtasks (task_id);
CREATE INDEX idx_task_attachments_task_id ON task_attachments (task_id);
CREATE INDEX idx_task_comments_task_id    ON task_comments (task_id);

-- ============================================================
-- Triggers — reuse set_updated_at() from migration 003
-- ============================================================
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER subtasks_updated_at
  BEFORE UPDATE ON subtasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
