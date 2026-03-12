# 007 — MCP 서버 (@aiendpoint/mcp-server, Phase 2-3)

**날짜**: 2026-03-13
**상태**: 완료 ✅ (npm 배포 완료)

---

## 작업 배경

**Chicken-and-egg 문제 해결**:

> "/ai 뱃지를 붙여준다고 해서, 정말 AI agent들이 탐색하는건 아니잖아?"

AI 에이전트가 실제로 레지스트리를 **쿼리**하는 경로가 없으면, 서비스 오너 입장에서 등록할 이유가 없다.
MCP 서버를 통해 Claude/Cursor가 레지스트리를 직접 조회하게 만들어 이 루프를 완성.

```
[이전] 서비스 등록 → 뱃지 (여기서 끝)
[이후] 서비스 등록 → AI 에이전트 조회 → 트래픽 → 서비스 오너 가치 체감
```

---

## 패키지 정보

| 항목 | 값 |
|------|---|
| 패키지명 | `@aiendpoint/mcp-server` |
| 버전 | `0.1.0` |
| npm | https://www.npmjs.com/package/@aiendpoint/mcp-server |
| 위치 | `packages/mcp-server/` |
| transport | stdio |
| 배포 방법 | `npx @aiendpoint/mcp-server` |

---

## 구현한 도구 (3개)

### 1. `aiendpoint_search_services`
레지스트리에서 서비스 검색.

```typescript
// 입력
{ query?, category?, auth_type?, limit (1-50), offset }

// 내부 호출
GET https://api.aiendpoint.dev/api/services?q=...&category=...

// 출력 (Markdown)
## AIEndpoint Registry — Search Results
Found **3** services
**DemoWeather** [✓ verified]
  URL: https://...
  Category: weather, data
  ...
```

### 2. `aiendpoint_fetch_ai_spec`
임의 URL의 `/ai` 스펙 직접 조회.

```typescript
// 입력
{ url: string }  // /ai 자동 append

// 내부 호출
GET {url}/ai

// 출력 (Markdown)
## DemoWeather
Get current weather...
- Auth: none
- Capabilities: 3
### Capabilities
  **current_weather** [GET /api/weather/current]
  ...
```

### 3. `aiendpoint_validate_service`
서비스의 `/ai` 엔드포인트 유효성 검증.

```typescript
// 입력
{ url: string }

// 내부 호출
GET https://api.aiendpoint.dev/api/validate?url=...

// 출력 (Markdown)
## Validation Result for https://...
✅ Valid — Score: 85/100  ·  Badge: verified
### Checks (5/5 passed)
✓ /ai endpoint reachable
✓ aiendpoint field present
...
```

---

## 프로젝트 구조

```
packages/mcp-server/
├── src/
│   └── index.ts      # 서버 전체 (단일 파일)
├── dist/             # 빌드 결과물 (gitignore)
├── package.json
├── tsconfig.json
├── README.md
└── .gitignore
```

---

## 기술 스택

```json
{
  "@modelcontextprotocol/sdk": "^1.6.1",
  "zod": "^3.23.8"
}
```

Node.js 18+ 필수 (native fetch 사용).

---

## 설치 방법

### Claude Desktop
`~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "aiendpoint": {
      "command": "npx",
      "args": ["-y", "@aiendpoint/mcp-server"]
    }
  }
}
```

### Cursor
`.cursor/mcp.json` 또는 `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "aiendpoint": {
      "command": "npx",
      "args": ["-y", "@aiendpoint/mcp-server"]
    }
  }
}
```

---

## 구현 상세 노트

### API 응답 구조 (실제와 다름 주의)
처음 가정한 필드명과 실제 API 응답이 달랐음:
```
// 가정 (틀림)        // 실제
data[]            → services[]
base_url          → url
category          → categories
badge_level       → is_verified (boolean)
```
빌드 후 live API 테스트로 발견, 수정.

### TypeScript structuredContent 타입 이슈
```typescript
// AiSpec 인터페이스가 index signature 없어서 타입 에러
structuredContent: spec as unknown as Record<string, unknown>
```

### pnpm workspace 추가
`pnpm-workspace.yaml`에 `packages/*` 추가.

---

## npm 배포 과정

1. `publishConfig: { access: "public" }` 설정
2. `files: ["dist", "README.md"]` 설정
3. `prepublishOnly: "npm run build"` 스크립트 추가
4. npm.js.com에서 `aiendpoint` org 생성
5. Granular Access Token 발급 (bypass 2FA)
6. `npm config set //registry.npmjs.org/:_authToken TOKEN`
7. `npm publish --access public`

---

## 검증 결과

```bash
# MCP 프로토콜 테스트
printf '{"jsonrpc":"2.0",...}\n{"jsonrpc":"2.0","method":"tools/list",...}\n' \
  | node dist/index.js 2>/dev/null
# → 3개 툴 정상 반환 ✓

# 실제 API 호출 테스트
# → "Found 3 services" (DemoWeather, DemoFX, DemoNews) 반환 ✓
# → DemoWeather /ai 스펙 3개 capability 정상 파싱 ✓
```

---

## 다음 단계

→ `008_first_10_services.md` — 첫 10개 서비스 등록
→ `009_show_hn.md` — HN/Reddit 포스팅
