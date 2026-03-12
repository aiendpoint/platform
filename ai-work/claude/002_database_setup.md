# 002 — Database Setup (Supabase SQL Migration)

**날짜**: 2026-03-12
**상태**: 완료 ✅

---

## 작업 목표

Supabase PostgreSQL DB 스키마 생성.
레지스트리 백엔드가 사용할 5개 테이블 + RLS 정책 + 트리거.

---

## 생성한 파일

```
supabase/
└── migrations/
    └── 20260312_initial.sql    ← 전체 스키마 (단일 파일)
```

---

## 테이블 구조

### services
핵심 테이블. 등록된 모든 서비스.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | gen_random_uuid() |
| name, description, url, ai_url | text | 기본 정보 |
| categories, language, tags | text[] | GIN 인덱스 |
| spec_version | text | default '1.0' |
| raw_spec | jsonb | 원본 /ai 응답 전체 |
| auth_type | text | none/apikey/oauth2/bearer |
| status | text | pending/active/invalid/suspended |
| is_verified | boolean | 검증 통과 여부 |
| owner_email | text | 소유자 이메일 (optional) |
| is_official | boolean | 공식 파트너 여부 |

### capabilities
services에 연결된 capability 목록. 각 capability를 개별 row로 저장.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| service_id | uuid FK | services.id (cascade delete) |
| capability_id | text | snake_case ID |
| description, endpoint, method | text | |
| params | jsonb | 파라미터 맵 |
| search_vector | tsvector GENERATED | 풀텍스트 검색용 |

### validations
검증 이력. 매번 /api/validate 호출 시 기록.

| 컬럼 | 설명 |
|------|------|
| service_id | nullable FK (비등록 서비스도 검증 가능) |
| passed, score (0-100) | 검증 결과 |
| errors, warnings (jsonb[]) | 상세 결과 |
| response_ms | 응답 시간 |

### badges
발급된 배지. embed_token으로 SVG 조회.

| 컬럼 | 설명 |
|------|------|
| service_id | FK |
| badge_type | verified/partner/official |
| embed_token | unique, gen_random_uuid()::text |
| impression_count | 배지 노출 횟수 |

### search_logs
검색 쿼리 로그. 읽기 제한 (insert only RLS).

---

## 인덱스

```sql
-- services
services_status_idx      on services (status)
services_categories_idx  on services USING GIN (categories)
services_tags_idx        on services USING GIN (tags)
services_fts_idx         on services USING GIN (to_tsvector(name||description))

-- capabilities
capabilities_service_id_idx on capabilities (service_id)
capabilities_search_idx     on capabilities USING GIN (search_vector)

-- validations
validations_service_id_idx on validations (service_id)
validations_url_idx        on validations (url)
validations_created_at_idx on validations (created_at desc)

-- badges
badges_service_id_idx  on badges (service_id)
badges_embed_token_idx on badges (embed_token)

-- search_logs
search_logs_created_at_idx on search_logs (created_at desc)
search_logs_query_idx      on search_logs (query)
```

---

## RLS 정책

| 테이블 | 정책 |
|--------|------|
| services | public read (deleted_at IS NULL), public insert, public update |
| capabilities | public read, public insert |
| validations | public read/write |
| badges | public read, public insert |
| search_logs | insert only |

---

## 트리거

```sql
-- services.updated_at 자동 업데이트
create trigger services_updated_at
  before update on services
  for each row execute function update_updated_at();
```

---

## 실행 방법

Supabase SQL Editor에서 전체 파일 실행:
```
https://supabase.com/dashboard/project/oxenqcipllukzastrval/sql
```

또는 Supabase CLI:
```bash
supabase db push
```

---

## 다음 단계

→ `003_web_frontend.md` — Next.js 16 프론트엔드 구현
