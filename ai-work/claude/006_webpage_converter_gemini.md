# 006 — 웹페이지 → /ai 변환기 (Gemini Flash, Phase 2-2)

**날짜**: 2026-03-13
**상태**: 완료 ✅

---

## 작업 목표

웹페이지 URL을 입력하면 해당 페이지를 분석해 `/ai` 스펙을 자동 생성.
Claude API 대신 **Google Gemini Flash Lite** 사용 (무료 15 RPM).

---

## 아키텍처: 2-Layer

```
Layer 1 (항상 실행): HTML 메타 추출
  → og:title, og:description, meta description
  → <script>/<style>/<nav>/<footer> 제거 후 텍스트 최대 3000자

Layer 2 (GEMINI_API_KEY 설정 시): Gemini AI 강화
  → Layer 1 결과를 컨텍스트로 Gemini에 전달
  → capabilities 최대 10개 추론
  → category, auth, language 자동 판별
```

---

## 백엔드

### `registry/src/services/gemini.ts` (신규)

**Gemini 클라이언트 초기화**
```typescript
// 환경변수 없으면 null (graceful degradation)
let geminiModel: ReturnType<...> | null = null
if (process.env.GEMINI_API_KEY) {
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  geminiModel = genai.getGenerativeModel({
    model: 'gemini-flash-lite-latest',  // = Gemini 3.1 Flash Lite
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  })
}
export const geminiAvailable = () => geminiModel !== null
```

**모델 선정 과정** (시행착오):
| 모델 | 결과 |
|------|------|
| `gemini-1.5-flash` | 404 Not Found (v1beta에 없음) |
| `gemini-2.0-flash` | 429 limit:0 (무료 할당량 0) |
| `gemini-2.0-flash-lite` | 429 limit:0 (동일) |
| `gemini-flash-lite-latest` | ✅ 작동 (Gemini 3.1 Flash Lite, 15 RPM 무료) |

**주의**: Google AI Studio 키로 발급해야 함. Google Cloud Console 키는 무료 할당량 0.

**프롬프트 설계**
```
You are an API documentation expert. Analyze this web service and generate a /ai endpoint spec for AI agents.

Service URL: {url}
Page title: {title}
Page description: {description}
Page content (excerpt):
---
{text (3000자)}
---

Output ONLY valid JSON matching this exact schema (no markdown, no explanation):
{ ... SPEC_SCHEMA ... }

Rules:
- max 10 capabilities — infer logical API endpoints even if not explicitly listed
- descriptions must be concise and AI-optimized (no fluff)
- if auth cannot be determined, use "none"
- if language cannot be determined, use ["en"]
- category must be one or more from the allowed list
```

### `registry/src/routes/convert-webpage.ts` (신규)

**엔드포인트**:
- `GET  /api/convert/webpage/status` → `{ ai_available: boolean }`
- `POST /api/convert/webpage` → `{ converted, capability_count, source_url, ai_enhanced, method }`

**요청 흐름**:
1. URL 유효성 검사 (http/https만 허용)
2. `fetch(url, { signal: AbortSignal.timeout(10_000) })` 로 HTML 가져오기
3. `analyzeWebpage(url, html)` 호출 → Gemini 실패 시 Layer 1으로 fallback

---

## 프론트엔드

### `/convert` 페이지 — 3탭으로 확장

| 탭 | 설명 |
|----|------|
| Webpage URL | URL → Gemini AI 분석 |
| OpenAPI URL | OpenAPI/Swagger URL 입력 |
| Paste JSON | JSON 직접 붙여넣기 |

**Gemini 상태 배지** (페이지 로드 시 `/api/convert/webpage/status` 조회):
```
✦ Gemini AI enabled — capabilities will be inferred from page content  (보라색)
○ Basic mode — meta tags only (GEMINI_API_KEY not set)                 (회색)
```

**결과 배지**:
```
✦ Gemini AI  (보라색)   ← ai_enhanced: true
meta only    (회색)     ← ai_enhanced: false
```

**로딩 메시지** (모드에 따라 다름):
```
"Fetching page · analyzing with Gemini AI…"
"Fetching and extracting metadata…"
"Parsing OpenAPI spec…"
```

---

## 추가된 타입/함수 (`web/lib/api.ts`)

```typescript
interface WebpageConvertResult {
  converted: AiEndpointSpec
  capability_count: number
  source_url: string
  ai_enhanced: boolean
  method: 'ai' | 'meta'
}
async function convertWebpage(url: string): Promise<WebpageConvertResult>
async function getWebpageConverterStatus(): Promise<{ ai_available: boolean }>
```

---

## 추가된 패키지

```bash
pnpm add @google/generative-ai  # registry (v0.24.1)
```

---

## 환경변수

```env
GEMINI_API_KEY=AIza...  # Google AI Studio에서 발급
```
Railway + `.env.local` 양쪽에 추가.

---

## 테스트 결과

| URL | 결과 |
|-----|------|
| `https://stripe.com` | ai_enhanced: true, 8 capabilities 추론 ✓ |
| `https://github.com` | ai_enhanced: true, 10 capabilities 추론 ✓ |
| GEMINI_API_KEY 없음 | meta only 모드, title/description 추출 ✓ |
| 404 URL | "Webpage returned HTTP 404" 에러 ✓ |
| 타임아웃 | "Failed to fetch webpage: The operation was aborted" ✓ |
