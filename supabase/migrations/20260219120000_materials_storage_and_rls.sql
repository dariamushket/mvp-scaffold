-- Materials storage + RLS hardening
-- Assumes profiles.id = auth.users.id and profiles includes (role, company_id)

-- 1) Private storage bucket
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do update
set public = excluded.public;

-- 2) Materials domain tables
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  title text not null,
  description text,
  object_path text not null unique,
  is_published boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.material_assignments (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  company_id uuid not null,
  assigned_at timestamptz not null default now(),
  unique (material_id, company_id)
);

-- Deterministic object path: company/{company_id}/{material_id}/{filename}
alter table public.materials
  drop constraint if exists materials_object_path_format;

alter table public.materials
  add constraint materials_object_path_format
  check (object_path ~ '^company/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/[^/]+$');

-- 3) Enable RLS
alter table public.materials enable row level security;
alter table public.material_assignments enable row level security;

-- Clean replacements so migration can be rerun safely
DROP POLICY if exists "Admins manage materials" on public.materials;
DROP POLICY if exists "Customers can view company published materials" on public.materials;
DROP POLICY if exists "Admins manage material assignments" on public.material_assignments;
DROP POLICY if exists "Customers can view company published assignments" on public.material_assignments;

-- Admins can upload/update/delete (and read) company materials rows
create policy "Admins manage materials"
  on public.materials
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Customers can only SELECT published records for their own company
create policy "Customers can view company published materials"
  on public.materials
  for select
  using (
    is_published = true
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'customer'
        and p.company_id = materials.company_id
    )
  );

-- Optional table: same company-bound + published visibility for customers
create policy "Admins manage material assignments"
  on public.material_assignments
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "Customers can view company published assignments"
  on public.material_assignments
  for select
  using (
    exists (
      select 1
      from public.profiles p
      join public.materials m
        on m.id = material_assignments.material_id
      where p.id = auth.uid()
        and p.role = 'customer'
        and p.company_id = material_assignments.company_id
        and m.company_id = p.company_id
        and m.is_published = true
    )
  );

-- 4) Storage object policies
DROP POLICY if exists "Admins manage materials bucket objects" on storage.objects;
DROP POLICY if exists "Customers read own-company materials objects" on storage.objects;

-- Deterministic key and admin write/delete access
create policy "Admins manage materials bucket objects"
  on storage.objects
  for all
  using (
    bucket_id = 'materials'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    bucket_id = 'materials'
    and split_part(name, '/', 1) = 'company'
    and split_part(name, '/', 2) ~ '^[0-9a-fA-F-]{36}$'
    and split_part(name, '/', 3) ~ '^[0-9a-fA-F-]{36}$'
    and split_part(name, '/', 4) <> ''
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Customer read only under their company path
create policy "Customers read own-company materials objects"
  on storage.objects
  for select
  using (
    bucket_id = 'materials'
    and split_part(name, '/', 1) = 'company'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'customer'
        and split_part(name, '/', 2) = p.company_id::text
    )
  );
