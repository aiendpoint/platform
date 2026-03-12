# 008 — 홈페이지 & Docs 설치 섹션 (Phase 2-4)

**날짜**: 2026-03-13
**상태**: 완료 ✅

---

## 작업 목표

MCP 서버(007)와 skills.sh 스킬이 완성됐으나 사용자가 어떻게 설치하는지 알 수 없었음.

1. **홈페이지** — 랜딩 페이지 첫 화면에 설치 방법 표시
2. **Docs** — `/docs` 페이지에 MCP Server / Claude Code Skill 각각 독립 섹션 추가

---

## 1. 홈페이지 Install Strip (`web/app/page.tsx`)

Code example 섹션과 Recent services 섹션 사이에 새 섹션 추가:

```
┌────────────────────────────────────────────────────────┐
│  Use with your AI agent            Full setup guide → │
│                                                        │
│  Claude Desktop  │  Cursor         │  Claude Code     │
│  ─────────────── │  ─────────────── │  ─────────────── │
│  { mcpServers… } │  { mcpServers… } │  npx skills add  │
│                  │                  │  aiendpoint/...  │
└────────────────────────────────────────────────────────┘
```

**구현 포인트**:
- 3-column grid (`sm:grid-cols-3`)
- Claude Desktop / Cursor: 동일한 MCP JSON 설정 코드
- Claude Code: skills.sh `npx` 명령어 + `skills.sh ↗` 외부 링크
- 헤더에 `Full setup guide →` 링크 → `/docs#mcp` 앵커

---

## 2. Docs 페이지 MCP Server 섹션 (`web/app/docs/page.tsx`)

`<section id="mcp">` 추가.

### 내용 구성

| 항목 | 설명 |
|------|------|
| 소개 | MCP가 뭔지, Claude/Cursor에서 레지스트리 조회하는 용도 |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` 설정 코드 |
| Cursor | `~/.cursor/mcp.json` / `.cursor/mcp.json` 설정 코드 |
| 도구 목록 | 3개 tool 설명 테이블 |
| 사용 예시 | 프롬프트 예시 — "Find me a weather API that needs no auth key" |

### 도구 테이블

| 도구 | 설명 |
|------|------|
| `aiendpoint_search_services` | 카테고리/키워드로 레지스트리 검색 |
| `aiendpoint_fetch_ai_spec` | 임의 URL의 /ai 스펙 조회 |
| `aiendpoint_validate_service` | /ai 엔드포인트 유효성 검증 |

---

## 3. Docs 페이지 Claude Code Skill 섹션 (`web/app/docs/page.tsx`)

`<section id="skill">` 추가.

### 내용 구성

| 항목 | 설명 |
|------|------|
| 소개 | MCP와 다름 — 내 서비스에 /ai를 추가하는 용도 |
| 설치 | `npx skills add aiendpoint/platform --skill aiendpoint` |
| 스킬이 하는 것 | 5단계 리스트 |
| 트리거 문구 | 어떻게 요청하면 되는지 표 |

### 스킬 트리거 문구 테이블

| 문구 | 효과 |
|------|------|
| "make my service AI-ready" | 스킬 자동 실행 |
| "add /ai endpoint" | 스킬 자동 실행 |
| "implement aiendpoint standard" | 스킬 자동 실행 |
| "register on aiendpoint.dev" | 스킬 자동 실행 |

---

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `web/app/page.tsx` | Install strip 섹션 추가 (Code example 뒤) |
| `web/app/docs/page.tsx` | `#mcp`, `#skill` 섹션 추가 |

---

## 다음 단계

→ `009_show_hn.md` — HN/Reddit 포스팅 준비
