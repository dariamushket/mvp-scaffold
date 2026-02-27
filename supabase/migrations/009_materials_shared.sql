-- Make company_id nullable for shared (cross-company) materials
ALTER TABLE materials ALTER COLUMN company_id DROP NOT NULL;

-- Update customer RLS: also expose shared (company_id IS NULL) published materials
DROP POLICY IF EXISTS "customers_read" ON materials;
CREATE POLICY "customers_read" ON materials FOR SELECT
  USING (
    is_published = true
    AND (
      company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
      OR company_id IS NULL
    )
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'customer'
  );
