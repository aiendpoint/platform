# 001 — Registry Backend (Fastify + TypeScript)

**날짜**: 2026-03-12
**상태**: 완료 ✅

---

## 작업 목표

Phase 1 — 레지스트리 백엔드 구현.
서비스 등록 / 검색 / 검증 / 배지 발급 API.

---

## 생성한 파일

```
registry/
├── src/
│   ├── index.ts                    ← Fastify 서버 엔트리포인트 (port 4000)
│   ├── types/index.ts              ← DB 타입, AiEndpointSpec, API 응답 타입
│   ├── db/index.ts                 ← Supabase createClient 래퍼
│   ├── services/
│   │   └── validator.ts            ← /ai 스펙 검증 로직 (100점 채점)
│   └── routes/
│       ├── health.ts               ← GET /health
│       ├── ai.ts                   ← GET /ai (레지스트리 자체 스펙)
│       ├── categories.ts           ← GET /api/categories
│       ├── validate.ts             ← GET /api/validate?url=
│       ├── badge.ts                ← GET /api/badge/:id.svg
│       └── services/
│           ├── index.ts            ← GET /api/services (목록+검색)
│           ├── detail.ts           ← GET /api/services/:id (상세)
│           └── register.ts         ← POST /api/services (등록)
├── package.json                    ← "type":"module", fastify, @supabase, zod
└── tsconfig.json                   ← NodeNext module, strict
```

---

## 주요 구현 내용

### validator.ts — 100점 채점 시스템
```
Group 1: 연결성 (20점)
  +10  /ai 엔드포인트 HTTP 200 응답
  +5   응답 시간 ≤ 3000ms
  +5   (Content-Type은 warn만)

Group 2: 필수 필드 (40점)
  +10  aiendpoint 필드 존재
  +10  service.name 존재
  +10  service.description 존재
  +10  capabilities 배열 (1개 이상)

Group 3: capability 품질 (20점)
  각 capability당 최대 10점 (id/description/endpoint/method +5, method valid +2, returns +3)
  전체 평균 → 최대 20점 cap

Group 4: 권장 필드 (20점)
  +5  service.category 존재
  +5  auth 존재
  +5  token_hints 존재
  +5  meta.last_updated 존재
```

등급 기준:
| 점수 | Grade | Badge |
|------|-------|-------|
| 90+ | Excellent | ai-ready-gold |
| 70+ | Good | ai-ready |
| 50+ | Basic | ai-compatible |
| <50 | Poor | none |

### 서비스 등록 흐름 (POST /api/services)
```
1. URL 정규화 (origin만 사용)
2. 중복 체크 (services 테이블)
3. validateAiEndpoint() 실행
4. 실패 시 422 반환 (errors 포함)
5. services 테이블 INSERT
6. capabilities 테이블 INSERT (각 capability별 row)
7. validations 테이블 INSERT (검증 이력)
8. 201 + {id, is_verified, validation{score, grade, warnings}}
```

### badge.ts — SVG 동적 생성
- flat / flat-square / for-the-badge 3가지 스타일 지원
- `is_verified && status=active` → 초록 "verified ✓"
- `status=active` → 파랑 "active"
- Cache-Control: public, max-age=3600

---

## 실제 테스트 결과

```bash
# /health — Supabase 연결 포함
curl http://localhost:4000/health
# → {"status":"ok","version":"0.1.0","db":"ok","uptime_seconds":2}

# /ai — 레지스트리 자체 스펙
curl http://localhost:4000/ai
# → aiendpoint:1.0, 4개 capability

# /api/validate — 데모 뉴스 서버 검증
curl "http://localhost:4000/api/validate?url=http://localhost:3001"
# → {"passed":true,"score":85,"grade":"Good","capability_count":3,...}
```

---

## 의존성

```json
{
  "fastify": "^4.26.0",
  "@fastify/cors": "^9.0.0",
  "@supabase/supabase-js": "^2.39.0",
  "zod": "^3.22.0"
}
```

---

## 남은 작업 (DB 연동 완성을 위해)

DB 테이블이 아직 Supabase에 생성되지 않았음.
`docs/05_database.md`의 SQL을 Supabase SQL Editor에서 실행해야 함:
- `services` 테이블
- `capabilities` 테이블
- `validations` 테이블
- `badges` 테이블
- `search_logs` 테이블
- RLS 정책 + `updated_at` 트리거

---

## 다음 단계

→ `002_database_setup.md` — Supabase 테이블 생성 SQL + 마이그레이션
→ `003_web_frontend.md` — Next.js 16 프론트엔드 (web/)
