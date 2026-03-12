# 000 — Spec v1 + Demo Servers

**날짜**: 2026-03-12
**상태**: 완료 ✅

---

## 작업 목표

Phase 0 — 스펙 정의 및 레퍼런스 구현체 3개 작성.
"코드가 설득한다" — curl 한 줄로 `/ai` 표준의 가치를 증명.

---

## 생성한 파일

### spec/
| 파일 | 설명 |
|------|------|
| `spec/v1/schema.json` | `/ai` 응답 JSON Schema (2020-12 draft) |
| `spec/examples/news.json` | 뉴스 서비스 예시 |
| `spec/examples/weather.json` | 날씨 서비스 예시 |
| `spec/examples/fx.json` | 환율 서비스 예시 |

### demos/news/ (Node.js + Express, port 3001)
| 파일 | 설명 |
|------|------|
| `index.js` | Express 서버 — `/ai`, search, latest, get article |
| `data/articles.json` | 더미 뉴스 8개 |
| `package.json` | express ^4.18, cors ^2.8.5 |

### demos/weather/ (Python + FastAPI, port 3002)
| 파일 | 설명 |
|------|------|
| `main.py` | FastAPI 서버 — `/ai`, current, forecast, cities |
| `requirements.txt` | fastapi==0.110.0, uvicorn==0.27.0 |

### demos/fx/ (Cloudflare Workers, port 3003)
| 파일 | 설명 |
|------|------|
| `worker.js` | CF Worker — `/ai`, rate, currencies, rates |
| `wrangler.toml` | name=demo-fx |

### 루트 모노레포
| 파일 | 설명 |
|------|------|
| `package.json` | pnpm 워크스페이스 루트, turbo dev/build scripts |
| `pnpm-workspace.yaml` | registry, web, demos/*, sdk/* |
| `turbo.json` | dev(persistent), build, lint tasks |
| `.gitignore` | node_modules, .env*, dist, .next, __pycache__, .wrangler |
| `.env.example` | 전체 환경변수 템플릿 (SUPABASE, REDIS, ANTHROPIC 등) |

---

## schema.json 핵심 결정사항

```
required 필드 (3개):
  aiendpoint   — "1.0" const
  service      — name(required), description(required), category(optional), language(optional)
  capabilities — minItems: 1, 각 item: id+description+endpoint+method(required)

optional 권장 필드:
  auth         — type(none|apikey|bearer|oauth2), header, docs
  token_hints  — compact_mode, field_filtering, delta_support
  rate_limits  — requests_per_minute, agent_tier_available
  meta         — last_updated, changelog, status

설계 원칙:
  - additionalProperties: false → 오탈자 필드 즉시 감지
  - category enum 18개 고정 (v1)
  - capability.id는 snake_case 패턴 강제 (^[a-z][a-z0-9_]*$)
```

---

## curl 테스트 결과

```bash
# 뉴스: keyword 검색
curl "http://localhost:3001/api/articles/search?q=agent&limit=2"
# → count:2, articles[{id,title,summary,...}]

# 뉴스: compact 모드 (토큰 절약 — summary 제거)
curl "http://localhost:3001/api/articles/latest?compact=true&limit=3"
# → articles[{id,title,category,published_at,source}]

# 뉴스: field filtering
curl "http://localhost:3001/api/articles/search?q=AI&fields=id,title,published_at"
# → articles[{id,title,published_at}]

# 날씨: 현재 날씨
curl "http://localhost:3002/api/weather/current?city=Seoul"
# → {city,country,condition,temp_c,humidity_pct,wind_kph,observed_at}

# 날씨: 3일 예보
curl "http://localhost:3002/api/weather/forecast?city=Tokyo&days=3"

# 날씨: compact
curl "http://localhost:3002/api/weather/current?city=London&compact=true"
# → {city,condition,temp_c,humidity_pct}

# 환율: USD→KRW 100달러
curl "http://localhost:3003/api/rate?from=USD&to=KRW&amount=100"
# → {from,to,rate:1342.5,amount:100,converted_amount:134250,...}

# 환율: KRW 기준 전체 환율
curl "http://localhost:3003/api/rates?base=KRW"
```

모두 통과 ✅

---

## 다음 단계

→ `001_registry_backend.md` — Fastify + TypeScript 백엔드 구현
