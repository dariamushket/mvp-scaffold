-- Product Templates
CREATE TABLE product_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tag_id UUID REFERENCES task_tags(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'active' | 'archived'
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{"tasks":[],"sessions":[],"materials":[]}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE product_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access" ON product_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lead-Product Assignments
CREATE TABLE lead_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  product_template_id UUID NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'announced', -- 'announced' | 'activated'
  announced_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id, product_template_id)
);

ALTER TABLE lead_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access" ON lead_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Customers read own" ON lead_products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND company_id = lead_id)
  );

-- Add placeholder flag to materials
ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN NOT NULL DEFAULT false;
