-- ============================================================
-- Migration 002: Add store_id support + schema updates
-- Run this in the Supabase SQL editor after migration 001
-- ============================================================

-- ── 1. documents table additions ──────────────────────────────────────────────

alter table documents
  add column if not exists store_id uuid,
  add column if not exists display_name text,
  add column if not exists lease_identifiers jsonb;

-- Relax the document_type check to allow new types
alter table documents
  drop constraint if exists documents_document_type_check;

alter table documents
  add constraint documents_document_type_check
  check (document_type in (
    'base_lease', 'amendment', 'exhibit',
    'commencement_letter', 'side_letter'
  ));

-- ── 2. document_chunks: add store_id column ───────────────────────────────────

alter table document_chunks
  add column if not exists store_id uuid;

-- ── 3. conversations table additions ─────────────────────────────────────────

alter table conversations
  add column if not exists store_id uuid;

-- ── 4. critical_dates table (new) ────────────────────────────────────────────

create table if not exists critical_dates (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  tenant_id uuid references auth.users(id) not null,
  store_id uuid,
  date_type text not null,
  date_value text,
  description text not null,
  alert_days_before int not null default 30,
  created_at timestamptz default now()
);

alter table critical_dates enable row level security;

create policy "Tenants see own critical dates"
  on critical_dates for all using (auth.uid() = tenant_id);

-- ── 5. stores table (new — for multi-store tenants) ───────────────────────────

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references auth.users(id) not null,
  store_name text not null,
  shopping_center_name text,
  suite_number text,
  address text,
  created_at timestamptz default now()
);

alter table stores enable row level security;

create policy "Tenants see own stores"
  on stores for all using (auth.uid() = tenant_id);

-- ── 6. tenant_profiles updates ───────────────────────────────────────────────

alter table tenant_profiles
  add column if not exists language_preference text,
  add column if not exists role text not null default 'individual'
    check (role in ('individual', 'tenant_admin', 'property_manager', 'super_admin'));

-- ── 7. Backfill store_id for existing document_chunks ─────────────────────────
-- Copies store_id from the parent document row into each chunk.
-- Safe to run multiple times (only updates NULL rows).

update document_chunks dc
set store_id = d.store_id
from documents d
where dc.document_id = d.id
  and dc.store_id is null
  and d.store_id is not null;

-- ── 8. Update vector similarity search function ───────────────────────────────
-- Adds optional store_id filtering.
-- When match_store_id is NULL, returns results across all stores for the tenant.

create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_tenant_id uuid,
  match_count int default 8,
  match_threshold float default 0.35,
  match_store_id uuid default null
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  document_id uuid,
  similarity float
)
language sql stable
as $$
  select
    dc.id,
    dc.content,
    dc.metadata,
    dc.document_id,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where dc.tenant_id = match_tenant_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
    -- When match_store_id is provided, filter to that store.
    -- When NULL, return all chunks for the tenant (no store filter).
    and (match_store_id is null or dc.store_id = match_store_id)
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
