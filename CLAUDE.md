# 프로젝트: AIEndpoint — AI-first 서비스 디렉토리 & 표준

> **한 줄 요약**: AI 에이전트가 어떤 웹서비스든 즉시 이해하고 연결할 수 있도록,
> `yoursite.com/ai` 표준 엔드포인트 스펙을 정의하고, 이를 등록/검색하는 레지스트리를 운영한다.

---

## 작업 시작 전 반드시 읽을 것

- docs/01_spec.md                — /ai 스펙 정의 (공개용 문서)
- docs/02_demo_servers.md        — 데모 서버 3개 구현 코드
- docs/03_first_10_services.md   — 첫 10개 서비스 등록 전략
- docs/04_repo_structure.md      — 레포 구조 및 스택 (모노레포 기준)
- docs/05_database.md            — DB 스키마
- docs/06_api_routes.md          — API 라우트
- docs/07_ui_pages.md            — UI 페이지 정의
- docs/08_validation.md          — 검증 로직

## 첫 작업 순서

1. `spec/v1/schema.json` 작성 — 모든 것의 기준, 여기서 시작
2. `demos/news`, `demos/weather`, `demos/fx` 구현 및 curl 테스트
3. `registry/` 백엔드 라우트
4. `web/` 프론트엔드

> 레포 구조와 스택은 docs/04_repo_structure.md 기준을 따른다.
> 구조가 애매하면 docs를 먼저 읽고 판단하라.

---

## 1. 왜 지금인가 — 배경과 문제 정의

### 현재 AI 에이전트의 구조적 문제
- AI가 웹페이지를 읽으면 HTML 태그, 광고, 네비게이션 등 **노이즈가 80% 이상**
- 서비스가 뭘 할 수 있는지 파악하려면 문서를 읽고, API를 탐색하고, 시행착오를 거침
- MCP는 너무 무겁고 개발자 전용, llms.txt는 너무 단순한 텍스트 덩어리
- OpenAPI/Swagger는 AI를 위해 설계된 게 아님 — 사람이 읽는 문서에 가까움

### 구글이 증명한 방향
- `@googleworkspace/cli`: "agents-first" 설계 철학 — 모든 응답이 structured JSON
- Google Cloud MCP 서버: 자사 서비스를 AI가 바로 연결할 수 있게 공식화
- 핵심 통찰: **서비스의 1차 고객이 인간에서 AI 에이전트로 전환되고 있다**

### 채워지지 않은 공백
```
robots.txt  → 크롤러에게 "여기 오지 마"를 알려주는 표준
sitemap.xml → 크롤러에게 "여기 있어"를 알려주는 표준
llms.txt    → AI에게 "우리 서비스 요약"을 주는 관례 (비표준)

/ai         → AI에게 "우리가 뭘 할 수 있고 어떻게 쓰는지"를 알려주는 표준 (없음) ← 우리가 만들 것
```

---

## 2. 만들려는 것 — 제품 정의

### 2-1. `/ai` 엔드포인트 스펙 (오픈 표준)

모든 웹서비스가 `https://yoursite.com/ai` 를 구현하면 다음을 리턴:

```json
{
  "aiendpoint": "1.0",
  "service": {
    "name": "서비스명",
    "description": "AI가 이해할 수 있는 간결한 설명 (토큰 최적화)",
    "language": ["ko", "en"],
    "category": ["ecommerce", "productivity", "data"]
  },
  "capabilities": [
    {
      "id": "search_product",
      "description": "상품 검색",
      "endpoint": "/api/ai/products/search",
      "method": "GET",
      "params": {
        "q": "검색어 (string, required)",
        "limit": "결과 수 (integer, optional, default: 10, max: 50)"
      },
      "returns": "products[] with id, name, price, stock"
    }
  ],
  "auth": {
    "type": "oauth2 | apikey | none",
    "docs": "https://yoursite.com/ai/auth"
  },
  "token_hints": {
    "compact_mode": true,
    "field_filtering": true,
    "delta_support": false
  },
  "rate_limits": {
    "requests_per_minute": 60,
    "agent_tier_available": true
  }
}
```

### 2-2. AIEndpoint 레지스트리 (우리 서비스)

`aiendpoint.dev` (가칭) — AI 에이전트를 위한 서비스 디렉토리

**기능:**
- 서비스 등록: `/ai` 엔드포인트를 가진 서비스를 등록
- 검색 API: AI 에이전트가 "쇼핑 서비스 찾아줘" → 레지스트리 쿼리 → 바로 연결
- 검증 배지: `/ai` 스펙을 제대로 구현했는지 자동 검증 후 배지 발급
- 모니터링: 각 서비스의 AI 엔드포인트 가동률, 응답속도 실시간 추적

### 2-3. 변환 레이어 (수익 핵심)

기존 서비스가 `/ai`를 직접 구현 못 할 경우, 우리가 프록시 역할:
```
기존 REST API / 웹페이지
        ↓
  AIEndpoint 변환 레이어 (우리 서버)
        ↓
  토큰 최적화된 /ai 응답
```

---

## 3. 수익 구조

### 단계별 수익 모델

**Phase 1 (0~6개월): 무료로 표준 확산**
- 레지스트리 등록 무료
- 스펙 문서 오픈소스
- 검증 배지 무료
- 목표: 등록 서비스 1,000개, GitHub Star 3,000+

**Phase 2 (6~12개월): Freemium 전환**

| 플랜 | 가격 | 내용 |
|------|------|------|
| Free | $0 | 레지스트리 등록, 기본 배지 |
| Pro | $29/월 | 우선 검색 노출, 상세 분석, 커스텀 배지 |
| Business | $199/월 | 변환 레이어 이용 (기존 API → /ai 자동 변환), SLA 보장 |
| Enterprise | 협의 | 온프레미스 레지스트리, 화이트라벨 |

**Phase 3 (12개월~): 플랫폼 수익**

- **AI 에이전트 트래픽 과금**: 레지스트리를 통해 연결된 API 호출량 기반 과금
- **우선 라우팅**: 에이전트가 서비스 탐색 시 유료 서비스 우선 노출
- **데이터 인사이트**: "어떤 AI 에이전트가 어떤 서비스를 얼마나 쓰는지" 익명 분석 데이터 판매
- **인증 브로커**: OAuth/API키 관리를 우리가 대행 (Stripe처럼)

### 수익 시나리오 (보수적)
```
12개월 시점:
- Pro 플랜 500개 서비스 × $29 = $14,500/월
- Business 플랜 50개 서비스 × $199 = $9,950/월
- 합계: ~$24,000/월 ($288,000/년)

24개월 시점 (트래픽 과금 추가):
- 구독 수익: $80,000/월
- 트래픽 과금: $40,000/월
- 합계: ~$120,000/월 ($1.4M/년)
```

---

## 4. 기술 스택

> 상세 구조는 docs/04_repo_structure.md 를 따른다.

```
모노레포:  pnpm + turborepo
registry: Node.js + Fastify + TypeScript
web:      Next.js 14 (App Router)
DB:       Supabase (PostgreSQL)
캐시:     Upstash Redis
배포:     Vercel (web) + Railway (registry)
```

---

## 5. 개발 단계 로드맵

### Phase 0: 스펙 정의 (1~2주)
- [ ] `spec/v1/schema.json` 작성
- [ ] 데모 서버 3개 구현 (news, weather, fx)
- [ ] README 작성 후 GitHub 공개

### Phase 1: MVP 레지스트리 (3~4주)
- [ ] 서비스 등록 (URL 입력 → /ai 자동 파싱)
- [ ] 등록된 서비스 목록 + 검색
- [ ] 스펙 자동 검증 + 배지 발급
- [ ] 레지스트리 자체 /ai 엔드포인트 구현

### Phase 2: 변환 레이어 베타 (5~8주)
- [ ] OpenAPI/Swagger → /ai 자동 변환기
- [ ] 기존 웹페이지 → /ai 변환기 (Claude API 활용)
- [ ] Business 플랜 결제 연동 (Stripe)

### Phase 3: 에코시스템 확장 (3~6개월)
- [ ] Claude, GPT, Gemini용 공식 MCP 서버
- [ ] SDK 배포 (npm, pip)
- [ ] 한국 시장 집중 공략 (카카오, 네이버 계열 서비스 등록 유도)

---

## 6. 차별화 전략과 리스크

### 차별화
- **표준 선점**: robots.txt처럼 먼저 만들고 채택시키면 이긴다
- **한국 시장 먼저**: 글로벌 플레이어들이 한국 서비스는 신경 안 씀
- **개발자 친화**: 스펙을 오픈소스로 공개해서 커뮤니티 기반 확산

### 리스크와 대응

| 리스크 | 대응 |
|--------|------|
| Anthropic/Google이 자체 표준 만듦 | 스펙 오픈소스화 + 채택률 먼저 확보. 흡수되더라도 기여자로 남음 |
| 서비스 등록이 안 됨 | 직접 주요 서비스 /ai 구현해서 PR 날리기 |
| 수익화 시점이 늦음 | 변환 레이어 B2B를 Phase 1부터 병행 |

---

## 7. 레퍼런스

- [llms.txt 스펙](https://llmstxt.org)
- [Google Workspace CLI](https://github.com/googleworkspace/cli)
- [MCP 공식 문서](https://modelcontextprotocol.io)
- [robots.txt 역사](https://en.wikipedia.org/wiki/Robots_exclusion_standard)
- [OpenAPI Initiative](https://www.openapis.org)

---

## 8. 이 프로젝트를 시작하는 Claude에게

이 프로젝트의 본질은 **AI 에이전트 시대의 인프라 표준**을 만드는 것이다.
단순한 SaaS가 아니라, 웹의 새로운 레이어를 정의하는 작업이다.

코딩 시 우선순위:
1. 스펙의 단순함 유지 — 복잡하면 채택이 안 됨
2. 토큰 효율 최우선 — 모든 응답은 최소한의 토큰으로 최대한의 정보
3. 하위 호환성 — 스펙이 바뀌어도 v1 구현체는 계속 작동해야 함
4. 개발자 경험 — 10분 안에 /ai 구현할 수 있어야 함

판단이 필요한 순간엔 "토큰 효율"과 "채택 용이성" 두 기준으로 결정하라.
