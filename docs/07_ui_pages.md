# UI 페이지 정의 — Next.js 14 (App Router)

## 기본 원칙
- 디자인 톤: 개발자 친화적, 미니멀, 다크모드 우선
- 참고: `readme.com`, `pkg.go.dev`, `npmjs.com` 같은 개발자 도구 미학
- Tailwind CSS + shadcn/ui 사용
- 모바일 대응은 나중에 — 초기 타겟은 데스크탑 개발자

---

## 페이지 목록

```
/                  — 랜딩
/register          — 서비스 등록
/services          — 서비스 목록/검색
/services/[id]     — 서비스 상세
/validate          — 빠른 검증 도구
/docs              — 스펙 문서 (01_spec.md 내용)
```

---

## 페이지 1: `/` 랜딩

### 레이아웃
```
[Navbar] — 로고(aiendpoint) | Services | Docs | Register →

[Hero Section]
  헤드라인:  "The /ai Standard"
  서브:      "What robots.txt did for crawlers, /ai does for AI agents."
  CTA 버튼:  [Register Your Service] [View Services]
  코드 예시: 터미널 스타일로
             $ curl https://yourservice.com/ai
             → { "aiendpoint": "1.0", "capabilities": [...] }

[Stats Bar]
  등록된 서비스: N개 | 검증 완료: N개 | 총 Capabilities: N개

[How It Works — 3단계]
  1. Add /ai to your service (30 min)
  2. Register at aiendpoint.dev (5 min)
  3. AI agents discover and use your service automatically

[최근 등록 서비스 — 카드 그리드]
  최신 6개, 카드마다: 이름, 설명, 카테고리 배지, verified 여부

[Footer]
  GitHub | Spec | Docs | @aiendpoint
```

### 핵심 요소
- Hero의 코드 블록은 타이핑 애니메이션 (간단하게)
- Stats는 API에서 실시간 조회
- "30 min"이 눈에 띄어야 함 — 진입장벽 낮음을 강조

---

## 페이지 2: `/register`

### 레이아웃
```
[헤더]
  "Register Your Service"
  "Add your /ai endpoint and join the registry"

[Step 1 — URL 입력]
  입력창: "https://yourservice.com"
  버튼: [Check & Register]
  
  → 로딩 중: "Fetching /ai endpoint..."

[Step 2 — 파싱 결과 미리보기] (URL 입력 후 자동 표시)
  ✓ /ai endpoint found
  ✓ Spec version: 1.0
  ✓ 3 capabilities detected
  
  파싱된 내용 미리보기:
  - 서비스명: OOO
  - 설명: OOO
  - 카테고리: [ecommerce] [search]
  - Capabilities: search_products, get_product, list_categories
  
  경고 (있을 경우):
  ⚠ auth field not present — recommended
  ⚠ token_hints not present

[Step 3 — 확인 및 등록]
  이메일 입력 (optional): "Notify me of validation issues"
  버튼: [Register]

[등록 완료]
  ✓ Registered successfully!
  
  배지 코드:
  [Markdown 탭] [HTML 탭]
  복사 버튼
  
  [View Service Page →]
```

### UX 포인트
- Step이 명확히 구분되어야 함 (stepper UI)
- 파싱 실패 시 친절한 안내: "No /ai endpoint found. Here's how to add one →"
- 이미 등록된 경우: "Already registered — view it here →"

---

## 페이지 3: `/services`

### 레이아웃
```
[검색바]
  플레이스홀더: "Search services... (e.g. weather, korean news, finance)"
  
[필터 바]
  카테고리: [All] [ecommerce] [news] [weather] [finance] [developer] ...
  인증: [All] [No Auth Required] [API Key] [OAuth]
  언어: [All] [Korean] [English] [Japanese]
  정렬: [Newest] [Most Viewed] [Verified First]

[결과 카운트]
  "42 services found"

[서비스 카드 그리드 — 3열]
  각 카드:
  ┌─────────────────────────┐
  │ [verified badge] 이름    │
  │ 설명 (2줄 clamp)         │
  │ [ecommerce] [search]    │
  │ 🔓 No Auth  · 3 caps    │
  │ aiendpoint.dev/ai       │
  └─────────────────────────┘

[페이지네이션]
  ← 1 2 3 ... →
```

### UX 포인트
- 검색은 타이핑 즉시 반응 (debounce 300ms)
- 카드 클릭 → 서비스 상세로 이동
- "No Auth Required" 필터가 개발자들이 자주 씀 — 눈에 띄게

---

## 페이지 4: `/services/[id]`

### 레이아웃
```
[헤더]
  서비스명 (크게)
  [verified badge]  [official badge if applicable]
  설명
  [ecommerce] [search] 카테고리 배지
  
  외부 링크: [Visit Service ↗] [View /ai Endpoint ↗]

[탭 네비게이션]
  [Capabilities] [Details] [Badge] [Raw Spec]

--- Capabilities 탭 ---
[Capability 목록]
  각 capability 카드:
  
  GET  /api/products/search
  "Search products by keyword"
  
  Parameters:
  q        string  required  Search keyword
  limit    integer optional  Max results (default: 10)
  category string  optional  Filter by category
  
  Returns: products[] {id, name, price, stock}

--- Details 탭 ---
  Auth Type: No Authentication Required
  Spec Version: 1.0
  Languages: English, Korean
  Registered: 2026-03-10
  Last Validated: 2 hours ago
  Validation Score: 95/100
  
  Validation Details:
  ✓ aiendpoint field present
  ✓ service.name present
  ✓ service.description present
  ✓ capabilities (3) present
  ⚠ token_hints not present

--- Badge 탭 ---
  미리보기:
  [AI-Ready ✓]  ← 실제 SVG 렌더링
  
  Markdown:
  ![AI-Ready](https://api.aiendpoint.dev/api/badge/{id}.svg)
  [Copy]
  
  HTML:
  <img src="https://api.aiendpoint.dev/api/badge/{id}.svg" alt="AI-Ready">
  [Copy]

--- Raw Spec 탭 ---
  JSON 코드 블록 (전체 /ai 응답)
  [Copy] [Open in new tab ↗]
```

---

## 페이지 5: `/validate`

### 레이아웃
```
[헤더]
  "Validate Your /ai Endpoint"
  "Check if your implementation is spec-compliant before registering"

[입력]
  URL 입력창
  버튼: [Validate]

[결과]
  Score: 88/100
  
  상태 바 (시각적):
  ████████░░  88%
  
  ✓ Pass (4)
    ✓ aiendpoint version present
    ✓ service fields complete  
    ✓ at least one capability
    ✓ endpoint reachable (234ms)
    
  ⚠ Warnings (2)
    ⚠ auth field missing
    ⚠ token_hints missing
    
  ✗ Errors (0)
  
  [Register This Service →]
```

---

## 페이지 6: `/docs`

### 레이아웃
```
[사이드바]
  - Why /ai?
  - Quick Start
  - Full Spec Reference
  - Examples
  - FAQ

[메인 콘텐츠]
  01_spec.md 내용을 마크다운 렌더링
  코드 블록에 복사 버튼
  앵커 링크 지원
```

---

## 컴포넌트 목록

```
components/
├── ui/                    — shadcn 기본 컴포넌트
├── ServiceCard.tsx        — 서비스 카드 (목록용)
├── CapabilityCard.tsx     — capability 상세 카드
├── ValidateBadge.tsx      — verified/score 배지
├── SpecViewer.tsx         — Raw JSON 코드 뷰어
├── BadgeEmbed.tsx         — 배지 코드 생성기
├── SearchBar.tsx          — 검색 + 필터 통합
├── CategoryFilter.tsx     — 카테고리 필터 버튼 그룹
├── StepRegister.tsx       — 등록 스텝퍼
└── Navbar.tsx             — 상단 네비게이션
```

---

## 색상 / 스타일 가이드

```
배경:    #0a0a0a (거의 검정)
카드:    #111111
보더:    #222222
텍스트:  #e5e5e5
서브:    #888888
강조:    #3b82f6 (파랑 — verified, CTA)
성공:    #22c55e (초록 — pass)
경고:    #f59e0b (노랑 — warning)
에러:    #ef4444 (빨강 — error)

폰트:    Inter (본문) + JetBrains Mono (코드)
```

---

## Next.js 파일 구조

```
web/app/
├── layout.tsx             — 루트 레이아웃 (Navbar, 전역 스타일)
├── page.tsx               — / 랜딩
├── register/
│   └── page.tsx           — /register
├── services/
│   ├── page.tsx           — /services
│   └── [id]/
│       └── page.tsx       — /services/:id
├── validate/
│   └── page.tsx           — /validate
└── docs/
    └── page.tsx           — /docs

web/app/api/               — Next.js API routes (프록시용)
├── services/route.ts      — → registry /api/services
└── validate/route.ts      — → registry /api/validate
```
