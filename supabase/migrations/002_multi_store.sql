-- ============================================================
-- Migration 002: Multi-store support + user roles
-- ============================================================

-- 1. Add columns to tenant_profiles missing from 001
-- (display_name, lease_identifiers were used by the app but not in 001)
alter table documents add column if not exists display_name text;
alter table documents add column if not exists lease_identifiers jsonb;

-- Drop old document_type constraint and add expanded set
alter table documents drop constraint if exists documents_document_type_check;
alter table documents add constraint documents_document_type_check
  check (document_type in ('base_lease', 'amendment', 'commencement_letter', 'exhibit', 'side_letter'));

-- 2. User role system
alter table tenant_profiles
  add column if not exists role text not null default 'individual'
  check (role in ('individual', 'tenant_admin', 'property_manager', 'super_admin'));

-- language_preference was used by the app but not in 001
alter table tenant_profiles add column if not exists language_preference text default 'en';

-- 3. Stores / locations table
create table if not exists stores (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references auth.users(id) on delete cascade not null,
  store_name    text not null,
  shopping_center_name text,
  suite_number  text,
  address       text,
  created_at    timestamptz default now()
);

-- 4. Link documents to a store
alter table documents add column if not exists store_id uuid references stores(id) on delete set null;

-- 5. Link document_chunks to a store (denormalised for fast queries)
alter table document_chunks add column if not exists store_id uuid references stores(id) on delete set null;

-- 6. Link conversations to a store
alter table conversations add column if not exists store_id uuid references stores(id) on delete set null;

-- 7. Critical dates table (used by app but not in 001)
create table if not exists critical_dates (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid references documents(id) on delete cascade,
  tenant_id       uuid references auth.users(id) not null,
  store_id        uuid references stores(id) on delete cascade,
  date_type       text not null,
  date_value      date,
  description     text,
  alert_days_before int default 30,
  created_at      timestamptz default now()
);

-- 8. Index on store_id for fast per-store queries
create index if not exists documents_store_id_idx        on documents (store_id);
create index if not exists document_chunks_store_id_idx  on document_chunks (store_id);
create index if not exists conversations_store_id_idx    on conversations (store_id);
create index if not exists critical_dates_store_id_idx   on critical_dates (store_id);
create index if not exists critical_dates_tenant_id_idx  on critical_dates (tenant_id);

-- 9. RLS on new tables
alter table stores         enable row level security;
alter table critical_dates enable row level security;

create policy "Tenants see own stores"
  on stores for all using (auth.uid() = tenant_id);

create policy "Tenants see own critical dates"
  on critical_dates for all using (auth.uid() = tenant_id);

-- 10. Updated vector search function — supports optional store_id filter
create or replace function match_document_chunks(
  query_embedding   vector(1536),
  match_tenant_id   uuid,
  match_count       int     default 8,
  match_threshold   float   default 0.4,
  match_store_id    uuid    default null
)
returns table (
  id          uuid,
  content     text,
  metadata    jsonb,
  document_id uuid,
  store_id    uuid,
  similarity  float
)
language sql stable
as $$
  select
    dc.id,
    dc.content,
    dc.metadata,
    dc.document_id,
    dc.store_id,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where dc.tenant_id = match_tenant_id
    and (match_store_id is null or dc.store_id = match_store_id)
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
