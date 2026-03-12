# 환경변수 설정 가이드

## 파일 위치

```
platform/
├── .env.example          — 이 파일을 기반으로 복사
├── registry/.env.local   — registry 서버용 (gitignore)
└── web/.env.local        — Next.js 프론트용 (gitignore)
```

---

## registry/.env.local

### Supabase

```bash
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_KEY=eyJh...
```

**어디서 가져오는가**
```
Supabase 대시보드
→ 프로젝트 선택
→ Project Settings
→ API
→ Project URL          → SUPABASE_URL
→ anon public          → SUPABASE_ANON_KEY
→ service_role secret  → SUPABASE_SERVICE_KEY
```

> ⚠️ `SUPABASE_SERVICE_KEY`는 RLS를 우회한다. registry 서버에서만 사용. 절대 프론트엔드에 노출 금지.

---

### Upstash Redis

```bash
UPSTASH_REDIS_URL=rediss://default:xxxx@xxx.upstash.io:6379
UPSTASH_REDIS_TOKEN=xxxx
```

**어디서 가져오는가**
```
Upstash 대시보드
→ Redis 데이터베이스 선택
→ Details 탭
→ UPSTASH_REDIS_URL    → UPSTASH_REDIS_URL
→ UPSTASH_REDIS_TOKEN  → UPSTASH_REDIS_TOKEN
```

---

### Anthropic (변환 레이어용)

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

**어디서 가져오는가**
```
console.anthropic.com
→ API Keys
→ Create Key
→ 복사 (한 번만 보여줌 — 바로 저장할 것)
```

> Phase 2 변환 레이어 작업 전까지는 없어도 된다.

---

### 서버 설정

```bash
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**프로덕션에서는**
```bash
NODE_ENV=production
CORS_ORIGIN=https://aiendpoint.dev
```

---

## web/.env.local

```bash
# registry API 주소
NEXT_PUBLIC_API_URL=http://localhost:4000

# Supabase (프론트에서 직접 쿼리할 경우)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
```

> `NEXT_PUBLIC_` 접두사가 붙은 변수는 브라우저에 노출된다.
> `SUPABASE_SERVICE_KEY`는 절대 `NEXT_PUBLIC_`으로 쓰지 말 것.

**프로덕션에서는**
```bash
NEXT_PUBLIC_API_URL=https://api.aiendpoint.dev
```

---

## Railway 환경변수 설정

배포 시 Railway 대시보드에서 직접 입력:

```
Railway 대시보드
→ 프로젝트 선택
→ registry 서비스
→ Variables 탭
→ 아래 변수들 입력
```

```bash
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
ANTHROPIC_API_KEY=
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://aiendpoint.dev
```

---

## Vercel 환경변수 설정

```
Vercel 대시보드
→ 프로젝트 선택
→ Settings
→ Environment Variables
→ 아래 변수들 입력
```

```bash
NEXT_PUBLIC_API_URL=https://api.aiendpoint.dev
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## .env.example (루트 — 커밋용)

```bash
# ================================
# registry/.env.local 복사해서 사용
# ================================

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Upstash Redis
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Anthropic (Phase 2 변환 레이어)
ANTHROPIC_API_KEY=

# Server
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# ================================
# web/.env.local 복사해서 사용
# ================================

NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 보안 주의사항

```
✅ .env.local      — gitignore에 포함 (커밋 금지)
✅ .env.example    — 커밋 가능 (실제 값 없음)
❌ SUPABASE_SERVICE_KEY — 프론트엔드 노출 절대 금지
❌ ANTHROPIC_API_KEY   — 프론트엔드 노출 절대 금지
❌ 실제 키값을 코드에 하드코딩 금지
```
