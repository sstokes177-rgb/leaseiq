-- Enable vector extension
create extension if not exists vector;

-- Tenant profiles (extra info beyond Supabase Auth)
create table tenant_profiles (
  id uuid primary key references auth.users(id),
  company_name text,
  space_number text,
  property_name text,
  created_at timestamptz default now()
);

-- Uploaded lease documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references auth.users(id) not null,
  file_name text not null,
  file_path text not null,
  document_type text not null check (document_type in ('base_lease', 'amendment', 'exhibit')),
  uploaded_at timestamptz default now()
);

-- Chunked and embedded lease sections
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  tenant_id uuid references auth.users(id) not null,
  content text not null,
  metadata jsonb,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Chat conversations
create table conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references auth.users(id) not null,
  title text,
  created_at timestamptz default now()
);

-- Chat messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb,
  created_at timestamptz default now()
);

-- Vector similarity search index
create index on document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Row Level Security
alter table tenant_profiles enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

create policy "Tenants see own profile"
  on tenant_profiles for all using (auth.uid() = id);

create policy "Tenants see own documents"
  on documents for all using (auth.uid() = tenant_id);

create policy "Tenants see own chunks"
  on document_chunks for all using (auth.uid() = tenant_id);

create policy "Tenants see own conversations"
  on conversations for all using (auth.uid() = tenant_id);

create policy "Tenants see own messages"
  on messages for all using (
    conversation_id in (
      select id from conversations where tenant_id = auth.uid()
    )
  );

-- Helper function for vector similarity search (called from API)
create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_tenant_id uuid,
  match_count int default 8,
  match_threshold float default 0.5
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
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
