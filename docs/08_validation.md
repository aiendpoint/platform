# 검증 로직 정의 — /api/validate

## 개요
`/ai` 엔드포인트가 스펙을 얼마나 잘 구현했는지 자동으로 판단한다.
등록 시 자동 실행되고, `/api/validate` API로 독립적으로도 호출 가능하다.

---

## 점수 체계

총 100점 만점. 오류/경고/통과 세 단계.

```
오류 (Error)   — 스펙 필수 요건 미충족. 등록 거부.
경고 (Warning) — 권장 사항 미충족. 등록은 되지만 점수 감점.
통과 (Pass)    — 조건 충족. 점수 획득.
```

---

## 검증 항목 전체

### 그룹 1: 연결성 (20점)

| 항목 | 종류 | 점수 | 설명 |
|------|------|------|------|
| `/ai` 엔드포인트 응답 | **필수** | +10 | HTTP 200 응답 |
| 응답 시간 3초 이내 | **필수** | +5 | 3초 초과 시 오류 |
| Content-Type: application/json | 경고 | +5 | 없으면 -5 |

### 그룹 2: 필수 필드 (40점)

| 항목 | 종류 | 점수 | 설명 |
|------|------|------|------|
| `aiendpoint` 버전 필드 존재 | **필수** | +10 | 없으면 등록 거부 |
| `service.name` 존재 | **필수** | +10 | 없으면 등록 거부 |
| `service.description` 존재 | **필수** | +10 | 없으면 등록 거부 |
| `capabilities` 배열 존재 | **필수** | +5 | 없으면 등록 거부 |
| `capabilities` 최소 1개 이상 | **필수** | +5 | 빈 배열이면 등록 거부 |

### 그룹 3: capability 품질 (20점)

각 capability당 최대 점수를 전체 평균으로 계산.

| 항목 | 종류 | 점수 | 설명 |
|------|------|------|------|
| `id` 필드 존재 | **필수** | - | 없으면 해당 capability 무효 |
| `description` 존재 | **필수** | - | 없으면 해당 capability 무효 |
| `endpoint` 존재 | **필수** | - | 없으면 해당 capability 무효 |
| `method` 존재 및 유효 | 경고 | +5 | GET/POST/PUT/DELETE/PATCH |
| `params` 설명 충실도 | 경고 | +5 | 파라미터가 있는데 설명 없으면 감점 |
| `returns` 필드 존재 | 경고 | +5 | 없으면 -5 |
| endpoint가 실제로 응답 | 경고 | +5 | 404/500이면 경고 |

### 그룹 4: 권장 필드 (20점)

| 항목 | 종류 | 점수 | 설명 |
|------|------|------|------|
| `service.category` 존재 | 경고 | +5 | 없으면 검색에서 불리 |
| `auth` 필드 존재 | 경고 | +5 | 없으면 "인증 방식 불명확" 경고 |
| `token_hints` 존재 | 경고 | +5 | 토큰 효율 정보 없음 |
| `meta.last_updated` 존재 | 경고 | +5 | 없으면 최신성 판단 불가 |

---

## 점수 등급

| 점수 | 등급 | 배지 |
|------|------|------|
| 90~100 | Excellent | ✅ AI-Ready (Gold) |
| 70~89 | Good | ✅ AI-Ready |
| 50~69 | Basic | ⚡ AI-Compatible |
| 0~49 | Poor | 등록은 되지만 배지 없음 |
| 오류 있음 | — | 등록 거부 |

---

## 검증 실행 흐름 (코드 구조)

```typescript
// registry/src/services/validator.ts

export interface ValidationResult {
  passed: boolean
  score: number
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  passes: ValidationIssue[]
  response_ms: number | null
  spec_version: string | null
  ai_url: string | null
  raw_response: unknown
}

export interface ValidationIssue {
  field: string
  message: string
  code: string
}

export async function validateAiEndpoint(url: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: false,
    score: 0,
    errors: [],
    warnings: [],
    passes: [],
    response_ms: null,
    spec_version: null,
    ai_url: null,
    raw_response: null
  }

  // Step 1: /ai URL 결정
  const aiUrls = [
    `${url.replace(/\/$/, '')}/ai`,
    `${url.replace(/\/$/, '')}/.well-known/ai`
  ]

  // Step 2: 연결성 검사
  let spec: unknown = null
  let responseMs: number | null = null

  for (const aiUrl of aiUrls) {
    const fetchResult = await fetchWithTimeout(aiUrl, 3000)
    if (fetchResult.ok) {
      result.ai_url = aiUrl
      responseMs = fetchResult.ms
      spec = fetchResult.data
      break
    }
  }

  if (!spec) {
    result.errors.push({
      field: 'endpoint',
      message: `No /ai endpoint found. Tried: ${aiUrls.join(', ')}`,
      code: 'NO_AI_ENDPOINT'
    })
    return result // 여기서 중단
  }

  result.response_ms = responseMs
  result.raw_response = spec
  result.score += 10 // 연결 성공

  if (responseMs && responseMs <= 3000) result.score += 5
  
  // Step 3: JSON 구조 검사
  if (typeof spec !== 'object' || spec === null) {
    result.errors.push({
      field: 'response',
      message: 'Response is not a valid JSON object',
      code: 'INVALID_JSON'
    })
    return result
  }

  const s = spec as Record<string, unknown>

  // Step 4: 필수 필드 검사
  if (!s.aiendpoint) {
    result.errors.push({
      field: 'aiendpoint',
      message: 'Required field "aiendpoint" is missing',
      code: 'MISSING_VERSION'
    })
  } else {
    result.spec_version = String(s.aiendpoint)
    result.score += 10
    result.passes.push({ field: 'aiendpoint', message: 'Version field present', code: 'OK' })
  }

  const service = s.service as Record<string, unknown> | undefined

  if (!service?.name) {
    result.errors.push({
      field: 'service.name',
      message: 'Required field "service.name" is missing',
      code: 'MISSING_SERVICE_NAME'
    })
  } else {
    result.score += 10
    result.passes.push({ field: 'service.name', message: 'Service name present', code: 'OK' })
  }

  if (!service?.description) {
    result.errors.push({
      field: 'service.description',
      message: 'Required field "service.description" is missing',
      code: 'MISSING_DESCRIPTION'
    })
  } else {
    result.score += 10
    result.passes.push({ field: 'service.description', message: 'Description present', code: 'OK' })
  }

  const capabilities = s.capabilities
  if (!Array.isArray(capabilities)) {
    result.errors.push({
      field: 'capabilities',
      message: '"capabilities" must be an array',
      code: 'INVALID_CAPABILITIES'
    })
  } else if (capabilities.length === 0) {
    result.errors.push({
      field: 'capabilities',
      message: '"capabilities" must have at least one entry',
      code: 'EMPTY_CAPABILITIES'
    })
  } else {
    result.score += 10
    result.passes.push({
      field: 'capabilities',
      message: `${capabilities.length} capability/capabilities found`,
      code: 'OK'
    })

    // Step 5: capability 품질 검사
    let capScore = 0
    for (const cap of capabilities) {
      const c = cap as Record<string, unknown>
      if (c.id && c.description && c.endpoint) {
        capScore += 5
        if (!c.returns) {
          result.warnings.push({
            field: `capabilities[${c.id}].returns`,
            message: `Capability "${c.id}" has no "returns" description`,
            code: 'MISSING_RETURNS'
          })
        } else {
          capScore += 5
        }
      }
    }
    result.score += Math.min(20, Math.round(capScore / capabilities.length))
  }

  // Step 6: 권장 필드 검사
  if (!service?.category || !Array.isArray(service.category)) {
    result.warnings.push({
      field: 'service.category',
      message: '"service.category" not present — recommended for search discoverability',
      code: 'MISSING_CATEGORY'
    })
  } else {
    result.score += 5
  }

  if (!s.auth) {
    result.warnings.push({
      field: 'auth',
      message: '"auth" field not present — agents cannot determine authentication requirements',
      code: 'MISSING_AUTH'
    })
  } else {
    result.score += 5
  }

  if (!s.token_hints) {
    result.warnings.push({
      field: 'token_hints',
      message: '"token_hints" not present — recommended for token efficiency',
      code: 'MISSING_TOKEN_HINTS'
    })
  } else {
    result.score += 5
  }

  if (!(s.meta as Record<string, unknown>)?.last_updated) {
    result.warnings.push({
      field: 'meta.last_updated',
      message: '"meta.last_updated" not present — agents cannot determine freshness',
      code: 'MISSING_LAST_UPDATED'
    })
  } else {
    result.score += 5
  }

  // Step 7: 최종 판정
  result.score = Math.min(100, result.score)
  result.passed = result.errors.length === 0

  return result
}

// 타임아웃 있는 fetch 헬퍼
async function fetchWithTimeout(url: string, timeoutMs: number) {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    const ms = Date.now() - start

    if (!res.ok) return { ok: false, ms, data: null }
    const data = await res.json()
    return { ok: true, ms, data }
  } catch {
    return { ok: false, ms: Date.now() - start, data: null }
  }
}
```

---

## 검증 응답 예시

### 완벽한 구현 (100점)
```json
{
  "url": "https://example.com",
  "ai_url": "https://example.com/ai",
  "passed": true,
  "score": 100,
  "spec_version": "1.0",
  "response_ms": 187,
  "capability_count": 3,
  "errors": [],
  "warnings": [],
  "passes": [
    { "field": "endpoint", "message": "Endpoint reachable (187ms)", "code": "OK" },
    { "field": "aiendpoint", "message": "Version field present", "code": "OK" },
    { "field": "service.name", "message": "Service name present", "code": "OK" },
    { "field": "service.description", "message": "Description present", "code": "OK" },
    { "field": "capabilities", "message": "3 capabilities found", "code": "OK" },
    { "field": "auth", "message": "Auth field present", "code": "OK" },
    { "field": "token_hints", "message": "Token hints present", "code": "OK" }
  ]
}
```

### 최소 구현 (65점)
```json
{
  "passed": true,
  "score": 65,
  "errors": [],
  "warnings": [
    { "field": "auth", "message": "auth field not present", "code": "MISSING_AUTH" },
    { "field": "token_hints", "message": "token_hints not present", "code": "MISSING_TOKEN_HINTS" },
    { "field": "service.category", "message": "category not present", "code": "MISSING_CATEGORY" },
    { "field": "meta.last_updated", "message": "last_updated not present", "code": "MISSING_LAST_UPDATED" }
  ]
}
```

### 오류 (등록 거부)
```json
{
  "passed": false,
  "score": 0,
  "errors": [
    { "field": "endpoint", "message": "No /ai endpoint found", "code": "NO_AI_ENDPOINT" }
  ]
}
```

---

## 재검증 정책

```
등록 시:           즉시 1회 검증
등록 후:           24시간마다 자동 재검증
수동 재검증:       GET /api/validate?url= 로 언제든 가능
실패 시:           status → 'invalid', 소유자 이메일 알림 (이메일 있는 경우)
3회 연속 실패 시:  status → 'suspended', 목록에서 제외
복구 시:           수동 재등록 또는 /api/validate 통과 후 자동 복구
```
