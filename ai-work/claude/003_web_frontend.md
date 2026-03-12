# 003 — Web Frontend (Next.js 16 + Tailwind v4)

**날짜**: 2026-03-12
**상태**: 완료 ✅

---

## 작업 목표

Phase 1 — 웹 프론트엔드 구현.
레지스트리 UI (랜딩, 서비스 목록/상세, 등록, 검증, 문서).

---

## 스택

| 항목 | 버전 |
|------|------|
| Next.js | 16.1.6 (App Router) |
| React | 19.2.3 |
| Tailwind CSS | v4 (no config file) |
| 폰트 | Geist Sans + Geist Mono |
| 배포 타겟 | Vercel |

### Tailwind v4 특이사항
- `tailwind.config.js` 불필요
- `globals.css`에 `@import "tailwindcss"` 한 줄
- 디자인 토큰은 `@theme inline {}` 블록에 CSS 변수로 정의

---

## 디자인 시스템

다크 테마 전용 (`color-scheme: dark`).

```css
--color-background: #0a0a0a   /* 페이지 배경 */
--color-card:       #111111   /* 카드 배경 */
--color-border:     #222222   /* 기본 보더 */
--color-text:       #e5e5e5   /* 기본 텍스트 */
--color-muted:      #888888   /* 보조 텍스트 */
--color-accent:     #3b82f6   /* 파랑 (주요 액션) */
--color-success:    #22c55e   /* 초록 (검증 통과) */
--color-warning:    #f59e0b   /* 황색 (경고) */
--color-error:      #ef4444   /* 빨강 (에러) */
```

---

## 생성한 파일

```
web/
├── app/
│   ├── globals.css              ← Tailwind v4 + 디자인 토큰
│   ├── layout.tsx               ← Navbar + footer
│   ├── page.tsx                 ← 랜딩 페이지
│   ├── register/
│   │   └── page.tsx             ← 서비스 등록
│   ├── services/
│   │   ├── page.tsx             ← 서비스 목록 + 검색
│   │   └── [id]/
│   │       └── page.tsx         ← 서비스 상세
│   ├── validate/
│   │   └── page.tsx             ← 검증 도구
│   └── docs/
│       └── page.tsx             ← /ai 스펙 문서
├── components/
│   ├── Navbar.tsx               ← 스티키 네비게이션
│   ├── ServiceCard.tsx          ← 서비스 목록 카드
│   ├── CapabilityCard.tsx       ← capability 표시
│   └── ValidateBadge.tsx        ← 검증 결과 (점수 + 상세)
└── lib/
    └── api.ts                   ← API 클라이언트 함수들
```

---

## 페이지별 구현 상세

### / — 랜딩 (Server Component)
- 비동기 서버 컴포넌트: `getServices({ limit: 6 })` 호출
- Hero: "The /ai Standard" + CTA 버튼 2개
- Stats bar: 등록 서비스 수 / Spec 버전 / 구현 시간
- "How it works" 3단계 카드
- 코드 예시 블록 (GET /ai 응답 미리보기)
- 최근 등록 서비스 그리드 (ServiceCard × 6)

### /register — 등록 (Client Component)
상태 머신: `input → validating → validated → registering → done | error`

1. URL 입력 + Validate 버튼
2. `GET /api/validate?url=` 호출 → ValidateBadge 표시
3. 통과 시 이메일 입력 필드 + Register 버튼 노출
4. `POST /api/services` 호출 → 성공 시 서비스 페이지로 링크

### /services — 목록 (Client Component)
- 검색 input: `q` 파라미터로 FTS
- 카테고리 필터: 버튼 토글 (선택 시 파랑 강조)
- 12개씩 페이지네이션
- 로딩 중: skeleton 카드 (animate-pulse)
- 빈 상태: "Register the first service →" CTA

### /services/[id] — 상세 (Client Component)
탭 4개:
- **Capabilities**: CapabilityCard 목록
- **Details**: 메타 정보 테이블 + token_hints
- **Badge**: SVG 미리보기 + Markdown/HTML/URL 임베드 코드
- **Raw spec**: 서비스 JSON 전체 표시

### /validate — 검증 도구 (Client Component)
- URL 입력 → `GET /api/validate?url=` → ValidateBadge 표시
- 통과 시 "Register this service →" 버튼
- 하단에 채점 기준표 (90+/70+/50+/<50) + 점수 분류 설명

### /docs — 문서 (Server Component)
정적 스펙 문서. 섹션:
- Overview: robots.txt vs sitemap.xml vs /ai 비교
- Full example JSON
- Required fields (Field 컴포넌트로 표시)
- Capability object 필드
- Optional fields (auth, token_hints, rate_limits, meta)
- Category 값 목록
- 빠른 구현 (Express / FastAPI 코드 예시)
- Rules (8가지 준수 사항)

---

## 컴포넌트 설계

### Navbar.tsx
```tsx
// 현재 경로에 따라 활성 링크 강조 (usePathname)
// 링크: Services / Docs / Validate + Register 버튼 (파랑)
```

### ServiceCard.tsx
```tsx
// auth_type별 색상: none=초록, apikey/bearer=황색, oauth2=회색
// 카테고리 태그 (최대 3개)
// is_verified 배지
// Link → /services/:id
```

### CapabilityCard.tsx
```tsx
// HTTP 메서드 배지 (색상 코딩)
// endpoint (font-mono)
// params 테이블: name / type / required / desc
// returns 문자열
```

### ValidateBadge.tsx
```tsx
// 점수 (대형 숫자) + 등급 + 응답시간
// 진행 막대 (색상은 등급에 따라)
// Errors / Warnings / Passes 섹션 (조건부 렌더링)
```

---

## API 클라이언트 (lib/api.ts)

```typescript
getServices(params?)     → ServicesResponse
getService(id)           → ServiceDetail
validateUrl(url)         → ValidationResult
registerService(url, email?) → { id, is_verified, ... }
getCategories()          → { categories: Category[] }
```

서버 컴포넌트: `{ next: { revalidate: 30 } }` ISR 적용
클라이언트 요청: 캐시 없음 (실시간)

---

## 환경 변수

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 실행

```bash
cd web
npm run dev    # http://localhost:3000
npm run build  # 프로덕션 빌드
```

---

## 검증 결과 (로컬 확인)

- `/` — 랜딩 페이지 정상 렌더링 (API 없으면 0 services, 빈 그리드 생략)
- `/register` — 폼 동작, 빈 상태 정상
- `/services` — "No services found" 빈 상태 정상
- `/validate` — 채점 기준표 정상 표시
- `/docs` — 전체 스펙 문서 정상 렌더링
- 콘솔 에러 없음 ✓

---

## 다음 단계

→ `004_demo_services_registration.md` — 데모 서버 3개를 실제 레지스트리에 등록
→ `005_deployment.md` — Vercel (web) + Railway (registry) 배포
