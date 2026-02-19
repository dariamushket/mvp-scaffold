CREATE TABLE materials (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  file_name    TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  company_id   UUID NOT NULL,
  uploaded_by  UUID NOT NULL REFERENCES auth.users(id),
  is_published BOOLEAN DEFAULT false NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admins_all" ON materials FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Customers: read published materials for their company only
CREATE POLICY "customers_read" ON materials FOR SELECT
  USING (
    is_published = true
    AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'customer'
  );

-- Storage bucket + policies (apply via Supabase dashboard or CLI):
--
-- 1. Create bucket: materials (private, no public access)
--
-- 2. Storage INSERT policy (for admins):
--    bucket_id = 'materials'
--    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
--
-- 3. Storage SELECT policy:
--    bucket_id = 'materials'
--    USING (
--      (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
--      OR (storage.foldername(name))[1] = (
--           SELECT company_id::text FROM profiles WHERE id = auth.uid()
--         )
--    )
