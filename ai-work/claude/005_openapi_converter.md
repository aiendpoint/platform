# 005 — OpenAPI → /ai 변환기 (Phase 2-1)

**날짜**: 2026-03-13
**상태**: 완료 ✅

---

## 작업 목표

OpenAPI 2.x (Swagger) / 3.x 스펙을 `/ai` 형식으로 자동 변환하는 기능.
- 백엔드: `POST /api/convert/openapi`
- 프론트: `/convert` 페이지 (URL 입력 탭 + JSON 붙여넣기 탭)

---

## 백엔드: `registry/src/routes/convert.ts`

### 입력 형식
```json
{ "spec_url": "https://petstore3.swagger.io/api/v3/openapi.json" }
// 또는
{ "spec": { "openapi": "3.0.0", ... } }
```

### 출력 형식
```json
{
  "converted": { /* AiEndpointSpec */ },
  "capability_count": 8,
  "source_url": "https://petstore3.swagger.io"
}
```

### 변환 로직

**OpenAPI 3.x 처리**
- `info.title` → `service.name`
- `info.description` → `service.description`
- `servers[0].url` → base URL
- `tags` → `service.category` (매핑 테이블 사용)
- `components.securitySchemes` → `auth.type` 추론
- `paths` → `capabilities[]` (최대 20개)

**Swagger 2.x 처리**
- `info.title/description` 동일
- `host + basePath` → base URL 조합
- `securityDefinitions` → `auth.type`
- `paths` → `capabilities[]`

**카테고리 매핑**
```typescript
const TAG_TO_CATEGORY: Record<string, string> = {
  pet: 'data', store: 'ecommerce', user: 'productivity',
  payment: 'finance', auth: 'developer', search: 'search', ...
}
```

**params 추출**
- `parameters[]` (path/query) → params 객체
- `requestBody` → params에 body 필드 추가
- 각 파라미터: `"type (required|optional) — description"` 형식

---

## 프론트엔드: `web/app/convert/page.tsx`

### 탭 구성 (초기 2탭, 나중에 3탭으로 확장)
| 탭 | 입력 | API 호출 |
|----|------|---------|
| OpenAPI URL | URL input | `convertOpenApi({ spec_url })` |
| Paste JSON | textarea | `convertOpenApi({ spec: parsed })` |

### 결과 화면
- **Summary bar**: capability 수 + Copy JSON 버튼 + Register 버튼
- **JSON preview**: `<pre>` 코드 블록 (max-height 520px, 스크롤)
- **CapabilityTable**: HTTP 메서드 색상 배지 + id + endpoint + description

### CapabilityTable 컴포넌트
```tsx
// GET    → 초록 bg
// POST   → 파랑 bg
// DELETE → 빨강 bg
// 기타   → 황색 bg
```

---

## 추가된 타입/함수 (`web/lib/api.ts`)

```typescript
interface ConvertResult {
  converted: AiEndpointSpec
  capability_count: number
  source_url?: string
}
async function convertOpenApi(input: { spec_url?: string; spec?: unknown }): Promise<ConvertResult>
```

---

## Navbar 업데이트

`web/components/Navbar.tsx` — Convert 링크 추가:
```
Services | Convert | Validate | Docs
```

---

## 테스트 결과

| 스펙 | 결과 |
|------|------|
| Petstore OAS 3 | 20개 capabilities 추출 ✓ |
| Petstore Swagger 2 | 15개 capabilities 추출 ✓ |
| Stripe OpenAPI | 20개 capabilities (상한 적용) ✓ |
| 잘못된 JSON | "Invalid JSON" 에러 표시 ✓ |
| 404 URL | "Failed to fetch spec" 에러 표시 ✓ |
