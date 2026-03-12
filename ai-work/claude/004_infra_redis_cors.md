# 004 — 인프라: Redis 캐시 + CORS + 로컬 dev 환경

**날짜**: 2026-03-13
**상태**: 완료 ✅

---

## 작업 목표

1. Upstash Redis 캐시 레이어 추가 (validate 5분, services 1분)
2. CORS 다중 도메인 지원 (`aiendpoint.dev` + `www.aiendpoint.dev`)
3. 로컬 개발 서버가 `.env.local` 환경변수를 제대로 로드하도록 수정

---

## 1. Redis 캐시 레이어

### 파일: `registry/src/cache/index.ts` (신규)

```typescript
// @upstash/redis 패키지 사용
// 환경변수 없으면 no-op (graceful fallback)
export async function cacheGet<T>(key: string): Promise<T | null>
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void>
export async function cacheTtl(key: string): Promise<number>
```

**캐시 정책**:
| 엔드포인트 | TTL | 캐시 키 형식 |
|-----------|-----|------------|
| `GET /api/validate` | 300초 (5분) | `validate:v1:{url}` |
| `GET /api/services` | 60초 (1분) | `services:v1:{q}:{cats}:{auth}:...` |

### validate 응답에 캐시 정보 추가
```json
{
  "valid": true,
  "cached": true,
  "cache_expires_at": "2026-03-13T12:35:00Z"
}
```

### web/app/validate/page.tsx — 카운트다운 타이머
```tsx
// cache_expires_at 있으면 매초 갱신되는 카운트다운 표시
// "Result cached · refreshes in M:SS"
useEffect(() => {
  if (!result?.cache_expires_at) return
  const timer = setInterval(() => setCountdown(computeSecs()), 1000)
  return () => clearInterval(timer)
}, [result?.cache_expires_at])
```

---

## 2. CORS 다중 도메인

### 문제
`CORS_ORIGIN=https://aiendpoint.dev` 로 설정 시 `www.aiendpoint.dev` 에서 접근 시 차단됨.

### 해결: `registry/src/index.ts`
```typescript
const rawOrigin = process.env.CORS_ORIGIN
const corsOrigin = rawOrigin
  ? rawOrigin.includes(',')
    ? rawOrigin.split(',').map(o => o.trim())
    : rawOrigin
  : '*'
```

Railway 환경변수:
```
CORS_ORIGIN=https://aiendpoint.dev,https://www.aiendpoint.dev
```

---

## 3. 로컬 dev 서버 `.env.local` 로딩 문제

### 문제
`tsx watch src/index.ts` 는 `.env.local` 을 자동으로 로드하지 않음.

### 시도한 방법들
1. `tsx --env-file=.env.local watch src/index.ts` → tsx가 `watch`를 파일명으로 인식해서 실패
2. `NODE_OPTIONS='--env-file=.env.local' tsx watch src/index.ts` → NODE_OPTIONS에 --env-file 허용 안됨
3. ✅ POSIX sh source 방식

### 최종 해결: `registry/package.json`
```json
{
  "scripts": {
    "dev": "sh -c 'set -a; . ./.env.local; set +a; tsx watch src/index.ts'"
  }
}
```

`set -a` → 이후 정의되는 변수를 모두 export
`. ./.env.local` → POSIX source (bash의 `source` 와 동일)
`set +a` → export 모드 종료

---

## 추가된 패키지

```bash
pnpm add @upstash/redis  # registry
```

---

## 환경변수 (Railway + .env.local)

```env
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

---

## 검증

- 프로덕션: `GET /api/validate?url=https://aiendpoint-demo-weather.up.railway.app` 2회 호출 → 2번째에 `cached: true` 확인
- 로컬: `.env.local` 로드 후 Supabase 연결 성공 확인
- CORS: `www.aiendpoint.dev` → `api.aiendpoint.dev` 요청 정상
