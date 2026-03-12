-- AIEndpoint Registry — Initial Schema
-- Run this in Supabase SQL Editor (Project → SQL Editor → New Query)
-- https://supabase.com/dashboard/project/oxenqcipllukzastrval/sql

-- ─────────────────────────────────────────────────────────────────────────────
-- Table 1: services
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists services (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  -- Basic info
  name          text not null,
  description   text not null,
  url           text not null unique,
  ai_url        text not null,

  -- Classification
  categories    text[] not null default '{}',
  language      text[] not null default '{"en"}',
  tags          text[] not null default '{}',

  -- Spec
  spec_version  text not null default '1.0',
  raw_spec      jsonb not null,

  -- Auth
  auth_type     text not null default 'none'
                  check (auth_type in ('none','apikey','oauth2','bearer')),
  auth_docs_url text,

  -- Status
  status        text not null default 'pending'
                  check (status in ('pending','active','invalid','suspended')),
  is_verified   boolean not null default false,
  verified_at   timestamptz,

  -- Stats
  view_count    integer not null default 0,
  check_count   integer not null default 0,

  -- Ownership
  owner_email   text,
  is_official   boolean not null default false
);

create index if not exists services_status_idx      on services (status);
create index if not exists services_categories_idx  on services using gin (categories);
create index if not exists services_tags_idx        on services using gin (tags);
create index if not exists services_fts_idx         on services
  using gin (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'')));

-- ─────────────────────────────────────────────────────────────────────────────
-- Table 2: capabilities
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists capabilities (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),

  service_id     uuid not null references services(id) on delete cascade,

  capability_id  text not null,
  description    text not null,
  endpoint       text not null,
  method         text not null default 'GET'
                   check (method in ('GET','POST','PUT','DELETE','PATCH')),
  params         jsonb not null default '{}',
  returns        text,

  search_vector  tsvector generated always as (
    to_tsvector('english', capability_id || ' ' || description)
  ) stored
);

create index if not exists capabilities_service_id_idx on capabilities (service_id);
create index if not exists capabilities_search_idx     on capabilities using gin (search_vector);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table 3: validations
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists validations (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  service_id   uuid references services(id) on delete set null,
  url          text not null,

  passed       boolean not null,
  score        integer not null default 0 check (score between 0 and 100),

  errors       jsonb not null default '[]',
  warnings     jsonb not null default '[]',

  response_ms  integer,
  spec_version text,
  raw_response jsonb
);

create index if not exists validations_service_id_idx on validations (service_id);
create index if not exists validations_url_idx        on validations (url);
create index if not exists validations_created_at_idx on validations (created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table 4: badges
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists badges (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  service_id   uuid not null references services(id) on delete cascade,

  badge_type   text not null default 'verified'
                 check (badge_type in ('verified','partner','official')),
  embed_token  text not null unique default gen_random_uuid()::text,

  impression_count integer not null default 0,
  last_seen_at     timestamptz
);

create index if not exists badges_service_id_idx  on badges (service_id);
create index if not exists badges_embed_token_idx on badges (embed_token);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table 5: search_logs
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists search_logs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  query        text,
  category     text,
  result_ids   uuid[] not null default '{}',
  result_count integer not null default 0,

  source       text default 'web' check (source in ('web','api','agent'))
);

create index if not exists search_logs_created_at_idx on search_logs (created_at desc);
create index if not exists search_logs_query_idx      on search_logs (query);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at auto-trigger
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists services_updated_at on services;
create trigger services_updated_at
  before update on services
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table services    enable row level security;
alter table capabilities enable row level security;
alter table validations  enable row level security;
alter table badges       enable row level security;
alter table search_logs  enable row level security;

-- services: public read (non-deleted, active), public insert (open registration)
create policy "services_public_read"   on services for select using (deleted_at is null);
create policy "services_public_insert" on services for insert with check (true);
create policy "services_public_update" on services for update using (true);

-- capabilities: public read/write
create policy "capabilities_public_read"   on capabilities for select using (true);
create policy "capabilities_public_insert" on capabilities for insert with check (true);

-- validations: public read/write (검증은 공개)
create policy "validations_public" on validations using (true) with check (true);

-- badges: public read
create policy "badges_public_read" on badges for select using (true);
create policy "badges_public_insert" on badges for insert with check (true);

-- search_logs: insert only (보안상 읽기 제한)
create policy "search_logs_insert" on search_logs for insert with check (true);
