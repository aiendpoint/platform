# API 라우트 정의 — registry 백엔드

## 기본 원칙
- 모든 응답: `Content-Type: application/json`
- 에러 형식 통일: `{ "error": "message", "code": "ERROR_CODE" }`
- 페이지네이션: `?page=1&limit=20` (기본 limit: 20, 최대: 100)
- 버전 prefix 없음 — 스펙 변경 시 필드 추가만, 제거 없음

---

## 베이스 URL
```
개발: http://localhost:4000
프로덕션: https://api.aiendpoint.dev
```

---

## 라우트 목록

### 1. 서비스 검색
```
GET /api/services
```

**Query Parameters**
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| q | string | - | 전문 검색 (name, description) |
| category | string | - | 카테고리 필터 (복수: `category=news&category=search`) |
| auth_type | string | - | `none\|apikey\|oauth2\|bearer` |
| language | string | - | `ko\|en\|ja` 등 |
| verified | boolean | - | `true`이면 검증된 서비스만 |
| page | integer | 1 | 페이지 번호 |
| limit | integer | 20 | 페이지당 결과 수 (max 100) |

**Response 200**
```json
{
  "total": 42,
  "page": 1,
  "limit": 20,
  "services": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "url": "string",
      "ai_url": "string",
      "categories": ["string"],
      "auth_type": "none",
      "is_verified": true,
      "spec_version": "1.0",
      "created_at": "ISO8601"
    }
  ]
}
```

---

### 2. 서비스 상세 조회
```
GET /api/services/:id
```

**Response 200**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "url": "string",
  "ai_url": "string",
  "categories": ["string"],
  "language": ["string"],
  "tags": ["string"],
  "spec_version": "1.0",
  "auth_type": "none",
  "auth_docs_url": "string|null",
  "is_verified": true,
  "verified_at": "ISO8601|null",
  "is_official": false,
  "capabilities": [
    {
      "capability_id": "string",
      "description": "string",
      "endpoint": "string",
      "method": "GET",
      "params": {},
      "returns": "string"
    }
  ],
  "token_hints": {},
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

**Response 404**
```json
{ "error": "Service not found", "code": "NOT_FOUND" }
```

---

### 3. 서비스 등록
```
POST /api/services
```

**Request Body**
```json
{
  "url": "https://yourservice.com"
}
```
URL만 받는다 — 나머지는 `/ai` 엔드포인트에서 자동 파싱.

**동작 흐름**
```
1. url 유효성 검사
2. {url}/ai 또는 {url}/.well-known/ai 요청
3. 응답 파싱 → 스펙 검증
4. services 테이블 저장
5. capabilities 파싱 후 capabilities 테이블 저장
6. 검증 결과 validations 테이블 저장
7. 등록된 서비스 반환
```

**Response 201**
```json
{
  "id": "uuid",
  "name": "string",
  "url": "string",
  "ai_url": "string",
  "status": "active",
  "is_verified": true,
  "validation": {
    "passed": true,
    "score": 95,
    "warnings": []
  }
}
```

**Response 400 — /ai 응답 없음**
```json
{
  "error": "No /ai endpoint found at this URL",
  "code": "NO_AI_ENDPOINT",
  "tried": ["https://example.com/ai", "https://example.com/.well-known/ai"]
}
```

**Response 422 — 스펙 검증 실패**
```json
{
  "error": "Spec validation failed",
  "code": "INVALID_SPEC",
  "errors": [
    { "field": "aiendpoint", "message": "Required field missing" },
    { "field": "capabilities", "message": "Must have at least one capability" }
  ]
}
```

**Response 409 — 이미 등록된 URL**
```json
{
  "error": "Service already registered",
  "code": "DUPLICATE",
  "existing_id": "uuid"
}
```

---

### 4. 스펙 검증 (등록 없이)
```
GET /api/validate?url=https://yourservice.com
```

등록하지 않고 `/ai` 엔드포인트가 스펙을 준수하는지만 확인.

**Response 200**
```json
{
  "url": "https://yourservice.com",
  "ai_url": "https://yourservice.com/ai",
  "passed": true,
  "score": 88,
  "spec_version": "1.0",
  "response_ms": 234,
  "service_name": "string",
  "capability_count": 3,
  "errors": [],
  "warnings": [
    { "field": "auth", "message": "auth field not present — recommended for paid services" },
    { "field": "token_hints", "message": "token_hints not present — recommended for token efficiency" }
  ],
  "checked_at": "ISO8601"
}
```

**Response 400**
```json
{
  "error": "url parameter is required",
  "code": "MISSING_PARAM"
}
```

---

### 5. 배지 SVG
```
GET /api/badge/:id.svg
```

서비스 ID로 embed 가능한 SVG 배지 생성.

**Response 200** `Content-Type: image/svg+xml`
```svg
<!-- AI-Ready 배지 SVG -->
<svg ...>
  <rect .../>
  <text>AI-Ready ✓</text>
</svg>
```

**배지 타입 (query param)**
```
?style=flat          — 기본 (default)
?style=flat-square   — 각진 모서리
?style=for-the-badge — 큰 사이즈
?label=AI-Ready      — 커스텀 라벨
```

**embed 코드 예시 (서비스 상세 페이지에서 제공)**
```html
<img src="https://api.aiendpoint.dev/api/badge/{id}.svg" alt="AI-Ready">
```
```markdown
![AI-Ready](https://api.aiendpoint.dev/api/badge/{id}.svg)
```

---

### 6. 카테고리 목록
```
GET /api/categories
```

**Response 200**
```json
{
  "categories": [
    { "id": "ecommerce", "label": "E-Commerce", "count": 12 },
    { "id": "news", "label": "News", "count": 8 },
    { "id": "weather", "label": "Weather", "count": 3 }
  ]
}
```

---

### 7. 레지스트리 자체 /ai 엔드포인트
```
GET /ai
```

레지스트리 자체도 `/ai` 스펙을 구현한다 — 먹는 음식을 직접 먹는다(eat your own dog food).

**Response 200**
```json
{
  "aiendpoint": "1.0",
  "service": {
    "name": "AIEndpoint Registry",
    "description": "Search and discover AI-ready services. Find services that implement the /ai standard.",
    "category": ["search", "developer", "data"]
  },
  "capabilities": [
    {
      "id": "search_services",
      "description": "Search for services that implement the /ai standard",
      "endpoint": "https://api.aiendpoint.dev/api/services",
      "method": "GET",
      "params": {
        "q": "string, optional — keyword search",
        "category": "string, optional — filter by category",
        "verified": "boolean, optional — only verified services",
        "limit": "integer, optional, default 20"
      },
      "returns": "services[] {id, name, description, url, ai_url, categories, is_verified}"
    },
    {
      "id": "validate_endpoint",
      "description": "Validate if a URL implements the /ai spec correctly",
      "endpoint": "https://api.aiendpoint.dev/api/validate",
      "method": "GET",
      "params": {
        "url": "string, required — service URL to validate"
      },
      "returns": "passed, score, errors[], warnings[], response_ms"
    }
  ],
  "auth": { "type": "none" },
  "token_hints": { "compact_mode": true, "field_filtering": true }
}
```

---

### 8. 헬스체크
```
GET /health
```

**Response 200**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "db": "ok",
  "uptime_seconds": 3600
}
```

---

## 에러 코드 전체 목록

| 코드 | HTTP | 설명 |
|------|------|------|
| `NOT_FOUND` | 404 | 리소스 없음 |
| `DUPLICATE` | 409 | 이미 존재 |
| `MISSING_PARAM` | 400 | 필수 파라미터 누락 |
| `INVALID_URL` | 400 | URL 형식 오류 |
| `NO_AI_ENDPOINT` | 400 | /ai 엔드포인트 없음 |
| `INVALID_SPEC` | 422 | 스펙 검증 실패 |
| `FETCH_TIMEOUT` | 408 | /ai 응답 3초 초과 |
| `FETCH_ERROR` | 502 | /ai 요청 실패 |
| `RATE_LIMITED` | 429 | 요청 한도 초과 |
| `INTERNAL_ERROR` | 500 | 서버 오류 |

---

## Fastify 라우트 파일 구조

```
registry/src/routes/
├── services/
│   ├── index.ts       — GET /api/services (목록)
│   ├── detail.ts      — GET /api/services/:id
│   └── register.ts    — POST /api/services
├── validate.ts        — GET /api/validate
├── badge.ts           — GET /api/badge/:id.svg
├── categories.ts      — GET /api/categories
├── ai.ts              — GET /ai (자체 스펙)
└── health.ts          — GET /health
```
