# Contributing to AIEndpoint

Thanks for your interest in contributing. Every contribution — from implementing `/ai` on your own service to improving the spec itself — helps grow the standard.

---

## Ways to contribute

### 1. Implement `/ai` on your service (highest impact)

The best contribution is adding `/ai` support to a real web service and registering it.

- Follow the [spec](spec/v1/schema.json) or the [10-minute guide](https://aiendpoint.dev/docs/quick-start)
- Register at [aiendpoint.dev/register](https://aiendpoint.dev/register)
- Open a PR adding your service to [`spec/examples/`](spec/examples/) if you'd like it featured

### 2. Improve the spec

The spec is the foundation — changes here affect everyone.

- **Discuss first**: open a [GitHub Discussion](https://github.com/aiendpoint/platform/discussions) before writing code
- Breaking changes to v1 are not accepted; propose as v2
- Schema changes must include updated examples and validator logic

### 3. Add demo servers

Demo servers in [`demos/`](demos/) show how to implement `/ai` in different languages and frameworks. We'd love more:

- Go, Ruby, PHP, Java, .NET, Rust
- Framework-specific: Django, Rails, Laravel, Spring Boot, Axum, …

Each demo should be self-contained, runnable with one command, and include a README.

### 4. Fix bugs or improve the registry / frontend

See open [Issues](https://github.com/aiendpoint/platform/issues). Issues labeled `good first issue` are a good starting point.

---

## Development setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- Python 3.10+ (weather demo only)

### Install

```bash
git clone https://github.com/aiendpoint/platform.git
cd platform
pnpm install
```

### Environment variables

```bash
# registry/.env.local
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Run locally

```bash
# Registry API — http://localhost:4000
cd registry && npm run dev

# Web frontend — http://localhost:3000
cd web && npm run dev
```

### Type check & build

```bash
cd registry && npm run typecheck && npm run build
cd web && npm run build
```

---

## Pull request guidelines

- **One PR, one concern** — keep changes focused
- **Test manually** before opening a PR: run the registry and web locally, exercise the changed code path
- **Update docs** if your change affects behavior visible to users or implementors
- **Spec changes** require a corresponding update to `spec/v1/schema.json` and the validator in `registry/src/services/validator.ts`

### Commit style

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(registry): add min_score filter to services list
fix(web): correct grade colour for score = 70
docs(spec): clarify token_hints field semantics
refactor(validator): extract token efficiency scoring
```

Scopes: `registry`, `web`, `spec`, `mcp-server`, `skill`, `demos`

---

## Questions?

Open a [Discussion](https://github.com/aiendpoint/platform/discussions) or file an [Issue](https://github.com/aiendpoint/platform/issues).
