-- Materials are canonical file/link metadata owned by a company.
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('document', 'video', 'link')),
  file_name TEXT,
  storage_path TEXT,
  external_url TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT materials_payload_by_kind CHECK (
    (kind = 'link' AND external_url IS NOT NULL)
    OR (kind IN ('document', 'video') AND storage_path IS NOT NULL)
  )
);

-- A material can be assigned to multiple companies while keeping materials
-- as canonical metadata.
CREATE TABLE IF NOT EXISTS public.material_assignments (
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (material_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_materials_company_id
  ON public.materials (company_id);

CREATE INDEX IF NOT EXISTS idx_materials_created_at
  ON public.materials (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_materials_is_published
  ON public.materials (is_published);
