# DB 스키마 — Supabase (PostgreSQL)

## 설계 원칙
- 모든 테이블에 `id`, `created_at` 기본 포함
- 서비스 등록과 capability는 분리 — 1:N 관계
- 검증 이력은 별도 테이블로 추적
- 소프트 삭제 (`deleted_at`) 사용 — 실제 삭제 없음

---

## 테이블 1: `services`
등록된 서비스 목록

```sql
create table services (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  -- 기본 정보
  name          text not null,
  description   text not null,
  url           text not null unique,          -- 서비스 베이스 URL
  ai_url        text not null,                 -- /ai 엔드포인트 전체 URL
  
  -- 분류
  categories    text[] not null default '{}',  -- ['ecommerce', 'search']
  language      text[] not null default '{"en"}',
  tags          text[] not null default '{}',

  -- 스펙 정보
  spec_version  text not null default '1.0',
  raw_spec      jsonb not null,                -- /ai 응답 전체를 그대로 저장
  
  -- 인증
  auth_type     text not null default 'none',  -- none|apikey|oauth2|bearer
  auth_docs_url text,

  -- 상태
  status        text not null default 'pending', -- pending|active|invalid|suspended
  is_verified   boolean not null default false,
  verified_at   timestamptz,
  
  -- 통계
  view_count    integer not null default 0,
  check_count   integer not null default 0,    -- 검증 실행 횟수

  -- 소유자 (나중에 유료화 시 필요)
  owner_email   text,
  is_official   boolean not null default false  -- 서비스 측이 직접 등록했는지
);

-- 인덱스
create index on services (status);
create index on services (categories) using gin;
create index on services (tags) using gin;
create index on services using gin (to_tsvector('english', name || ' ' || description));
```

---

## 테이블 2: `capabilities`
각 서비스의 capability 목록 (services에서 파싱해서 저장)

```sql
create table capabilities (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  
  service_id     uuid not null references services(id) on delete cascade,
  
  -- 스펙 그대로
  capability_id  text not null,               -- spec의 id 필드
  description    text not null,
  endpoint       text not null,
  method         text not null default 'GET', -- GET|POST|PUT|DELETE
  params         jsonb not null default '{}',
  returns        text,
  
  -- 검색용
  search_vector  tsvector generated always as (
    to_tsvector('english', capability_id || ' ' || description)
  ) stored
);

create index on capabilities (service_id);
create index on capabilities using gin (search_vector);
```

---

## 테이블 3: `validations`
서비스 검증 이력

```sql
create table validations (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  
  service_id   uuid references services(id) on delete set null,
  url          text not null,                 -- 검증 요청한 URL
  
  -- 결과
  passed       boolean not null,
  score        integer not null default 0,    -- 0~100
  
  -- 상세 결과
  errors       jsonb not null default '[]',   -- [{field, message}]
  warnings     jsonb not null default '[]',
  
  -- 메타
  response_ms  integer,                       -- 응답 시간 (ms)
  spec_version text,                          -- 감지된 스펙 버전
  raw_response jsonb                          -- /ai 응답 원본
);

create index on validations (service_id);
create index on validations (url);
create index on validations (created_at desc);
```

---

## 테이블 4: `badges`
검증 배지 발급 이력

```sql
create table badges (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  
  service_id   uuid not null references services(id) on delete cascade,
  
  badge_type   text not null default 'verified', -- verified|partner|official
  embed_token  text not null unique default gen_random_uuid()::text,
  
  -- 배지 노출 통계
  impression_count integer not null default 0,
  last_seen_at     timestamptz
);

create index on badges (service_id);
create index on badges (embed_token);
```

---

## 테이블 5: `search_logs`
어떤 쿼리로 어떤 서비스가 검색됐는지 추적 (나중에 수익화 인사이트용)

```sql
create table search_logs (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  
  query      text,
  category   text,
  result_ids uuid[] not null default '{}',
  result_count integer not null default 0,
  
  -- 출처
  source     text default 'web'  -- web|api|agent
);

create index on search_logs (created_at desc);
create index on search_logs (query);
```

---

## Supabase 초기 설정 순서

```sql
-- 1. 테이블 생성 (위 순서대로)
-- 2. RLS(Row Level Security) 설정

-- services: 누구나 읽기, 등록은 인증 필요 (초기엔 오픈)
alter table services enable row level security;
create policy "public read" on services for select using (deleted_at is null);
create policy "public insert" on services for insert with check (true); -- 초기엔 오픈

-- validations: 누구나 읽기/쓰기 (검증은 공개)
alter table validations enable row level security;
create policy "public all" on validations using (true) with check (true);

-- 3. updated_at 자동 갱신 트리거
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger services_updated_at
  before update on services
  for each row execute function update_updated_at();
```

---

## 타입 정의 (TypeScript — registry에서 사용)

```typescript
// types/db.ts

export type ServiceStatus = 'pending' | 'active' | 'invalid' | 'suspended'
export type AuthType = 'none' | 'apikey' | 'oauth2' | 'bearer'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface Service {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  name: string
  description: string
  url: string
  ai_url: string
  categories: string[]
  language: string[]
  tags: string[]
  spec_version: string
  raw_spec: AiEndpointSpec
  auth_type: AuthType
  auth_docs_url: string | null
  status: ServiceStatus
  is_verified: boolean
  verified_at: string | null
  view_count: number
  check_count: number
  owner_email: string | null
  is_official: boolean
}

export interface Capability {
  id: string
  created_at: string
  service_id: string
  capability_id: string
  description: string
  endpoint: string
  method: HttpMethod
  params: Record<string, string>
  returns: string | null
}

export interface Validation {
  id: string
  created_at: string
  service_id: string | null
  url: string
  passed: boolean
  score: number
  errors: Array<{ field: string; message: string }>
  warnings: Array<{ field: string; message: string }>
  response_ms: number | null
  spec_version: string | null
  raw_response: AiEndpointSpec | null
}

// /ai 엔드포인트 응답 타입
export interface AiEndpointSpec {
  aiendpoint: string
  service: {
    name: string
    description: string
    category: string[]
    language?: string[]
  }
  capabilities: Array<{
    id: string
    description: string
    endpoint: string
    method: string
    params?: Record<string, string>
    returns?: string
  }>
  auth?: {
    type: string
    header?: string
    docs?: string
  }
  token_hints?: {
    compact_mode?: boolean
    field_filtering?: boolean
    delta_support?: boolean
  }
  rate_limits?: {
    requests_per_minute?: number
    agent_tier_available?: boolean
  }
  meta?: {
    last_updated?: string
    changelog?: string
    status?: string
  }
}
```
