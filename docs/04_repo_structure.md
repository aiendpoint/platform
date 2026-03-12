# 레포 구조 — github.com/aiendpoint/platform

## 결정 사항

- **GitHub Organization**: `aiendpoint` (대시 없음)
- **레포 이름**: `platform` (모노레포)
- **패키지 매니저**: `pnpm` + `turborepo`

---

## 디렉토리 구조

```
platform/
├── spec/
│   ├── v1/
│   │   ├── schema.json          # /ai 응답 JSON Schema
│   │   └── README.md            # 스펙 설명
│   └── examples/
│       ├── news.json            # 뉴스 서비스 예시
│       ├── weather.json         # 날씨 서비스 예시
│       └── fx.json              # 환율 서비스 예시
├── registry/                    # Fastify 백엔드
│   ├── src/
│   │   ├── routes/
│   │   │   ├── register.ts      # 서비스 등록
│   │   │   ├── search.ts        # 서비스 검색
│   │   │   └── validate.ts      # /ai 스펙 검증
│   │   ├── db/
│   │   │   └── index.ts         # Supabase 클라이언트
│   │   └── index.ts             # 서버 엔트리포인트
│   ├── package.json
│   └── tsconfig.json
├── web/                         # Next.js 14 프론트엔드
│   ├── app/
│   │   ├── page.tsx             # 랜딩페이지
│   │   ├── register/
│   │   │   └── page.tsx         # 서비스 등록 페이지
│   │   └── services/
│   │       └── page.tsx         # 서비스 목록/검색
│   ├── package.json
│   └── tsconfig.json
├── demos/
│   ├── news/                    # Node.js + Express (데모 1)
│   │   ├── index.js
│   │   ├── data/articles.json
│   │   └── package.json
│   ├── weather/                 # Python + FastAPI (데모 2)
│   │   ├── main.py
│   │   └── requirements.txt
│   └── fx/                      # Cloudflare Workers (데모 3)
│       ├── worker.js
│       └── wrangler.toml
├── sdk/
│   └── js/                      # 나중에 추가
├── CLAUDE.md                    # 프로젝트 전체 컨텍스트
├── README.md                    # GitHub 공개용
├── package.json                 # pnpm workspaces 루트
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 초기 설정 순서

### 1. 루트 설정

**`package.json`**
```json
{
  "name": "aiendpoint-platform",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=18",
    "pnpm": ">=8"
  }
}
```

**`pnpm-workspace.yaml`**
```yaml
packages:
  - 'registry'
  - 'web'
  - 'demos/*'
  - 'sdk/*'
```

**`turbo.json`**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "persistent": true,
      "cache": false
    },
    "build": {
      "outputs": [".next/**", "dist/**"]
    }
  }
}
```

---

### 2. 첫 커밋 목표

```bash
# 이것만 되면 첫 커밋 완료
curl http://localhost:3001/ai   # 데모 뉴스 서버
curl http://localhost:3002/ai   # 데모 날씨 서버
curl http://localhost:3003/ai   # 데모 환율 서버
```

구조만 잡고 데모 서버 3개가 `/ai` 응답을 리턴하면 된다.
registry와 web은 그 다음 단계.

---

### 3. 스택 결정

| 파트 | 스택 | 이유 |
|------|------|------|
| registry 백엔드 | Node.js + Fastify + TypeScript | 빠른 JSON 처리, 타입 안전 |
| web 프론트 | Next.js 16 (App Router) | Vercel 무료 배포 |
| DB | Supabase (PostgreSQL) | 무료 플랜, REST API 자동 생성 |
| 캐시 | Upstash Redis | 무료 플랜, edge 친화적 |
| 배포 | Vercel (web) + Railway (registry) | 둘 다 무료 시작 |
| 모노레포 | pnpm + turborepo | 무료, 모노레포 표준 |

---

### 4. 환경변수 구조

```
platform/
├── .env.example          # 커밋용 (실제 값 없음)
├── registry/.env.local   # gitignore
└── web/.env.local        # gitignore
```

**`.env.example`**
```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Upstash Redis
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Claude API (변환 레이어용)
ANTHROPIC_API_KEY=

# 공공데이터포털
PUBLIC_DATA_API_KEY=

# Naver
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

---

### 5. .gitignore

```
node_modules/
.env.local
.env
dist/
.next/
__pycache__/
*.pyc
.turbo/
```

---

## 작업 우선순위

```
Phase 0 — 완료 ✅
  [x] Organization 생성: github.com/aiendpoint
  [x] 레포 생성: aiendpoint/platform
  [x] 루트 모노레포 구조 잡기 (package.json, pnpm-workspace.yaml, turbo.json)
  [x] spec/v1/schema.json 작성
  [x] demos/ 세 개 구현 및 실행 확인 (news/Express, weather/FastAPI, fx/Cloudflare Workers)

Phase 1 — 완료 ✅
  [x] registry 백엔드 기본 라우트 (등록, 검색, 검증, 배지)
  [x] Supabase 테이블 설계 및 연결
  [x] web 랜딩페이지 + 등록 폼 + 서비스 목록 + validate 페이지 + docs
  [x] aiendpoint.dev 자체 /ai 엔드포인트 (dogfooding)
  [x] Vercel (web) + Railway (registry + demos) 프로덕션 배포
  [x] DNS 설정 (aiendpoint.dev → Vercel, api.aiendpoint.dev → Railway)
  [x] Upstash Redis 캐시 레이어 (validate 5분, services 1분)
  [x] CORS 다중 도메인 지원 (comma-separated CORS_ORIGIN)
  [x] 검증 배지 UI (ValidateBadge 컴포넌트, 카운트다운 타이머)
  [x] README 완성 후 GitHub 공개

Phase 2 — 변환 레이어 & 에코시스템 (진행 중)
  [x] 1. OpenAPI/Swagger → /ai 변환기 (registry POST /api/convert/openapi + web UI)
  [x] 2. 웹페이지 URL → /ai 변환기 (Gemini Flash로 페이지 분석 → 스펙 생성)
  [x] 3. MCP 서버 — Claude/Cursor가 레지스트리를 실제로 쓰게 만드는 핵심
         - packages/mcp-server/ (@aiendpoint/mcp-server)
         - Tools: search_services, fetch_ai_spec, validate_service
         - npx @aiendpoint/mcp-server 로 즉시 사용 가능
         - npm publish 완료 → https://www.npmjs.com/package/@aiendpoint/mcp-server
  [ ] 4. 첫 10개 서비스 직접 등록 (docs/03_first_10_services.md 기준)
  [ ] 5. HackerNews Show HN / Reddit r/webdev 포스팅
         - MCP 서버 완성 후 포스팅 → 실제로 써볼 수 있는 것이 있어야 함
  ~~[ ] Stripe 결제 연동~~ → SKIP (개인 개발자, 한국 시장 집중 단계에서 불필요)

Phase 3 — 수익화 & 확장
  [ ] Stripe / 토스페이먼츠 결제 연동 (Pro/Business 플랜)
  [ ] SDK 배포 (npm: @aiendpoint/sdk, pip: aiendpoint)
  [ ] 한국 시장 집중 공략 (카카오, 네이버 계열 서비스 PR)
  [ ] 에이전트 트래픽 과금 인프라
```

---

## Claude Code 작업 지시

이 레포에서 작업을 시작할 때 순서:

1. `spec/v1/schema.json` 부터 만든다 — 모든 것의 기준
2. `demos/news/` → `demos/weather/` → `demos/fx/` 순으로 구현
3. 각 데모가 `/ai` 응답을 리턴하는지 `curl`로 확인
4. `registry/` 작업 시작

**절대 원칙**:
- 스펙을 단순하게 유지한다 — 필드 추가 전에 "정말 필요한가" 한 번 더 생각
- 모든 응답은 JSON — 예외 없음
- 에러도 JSON — `{ "error": "message" }` 형식 통일
- 토큰 효율 — 응답이 길어지면 compact 옵션 추가를 고려
