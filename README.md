# AIEndpoint — The `/ai` Standard

> A standard endpoint for AI agents to discover and use any web service — without scraping, guessing, or reading documentation.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Spec](https://img.shields.io/badge/spec-v1.0-green.svg)](spec/v1/schema.json)

---

## What is this?

**AIEndpoint** defines a simple convention: any web service exposes `GET /ai` returning a structured JSON description of its capabilities.

```
robots.txt  → tells crawlers what NOT to do
sitemap.xml → tells crawlers where pages are
/ai         → tells AI agents what you CAN DO  ← this project
```

AI agents query the **AIEndpoint Registry** to discover services, then use the `/ai` spec to call them directly — no scraping, no documentation parsing.

---

## Quick Example

```bash
curl https://yourservice.com/ai
```

```json
{
  "aiendpoint": "1.0",
  "service": {
    "name": "My Service",
    "description": "Concise description for AI agents",
    "category": ["productivity"]
  },
  "capabilities": [
    {
      "id": "search_items",
      "description": "Search items by keyword",
      "endpoint": "/api/search",
      "method": "GET",
      "params": { "q": "keyword (string, required)" },
      "returns": "items[] with id, name, price"
    }
  ]
}
```

**Implement in 10 minutes.** See the [spec docs](docs/01_spec.md) or the [live documentation](https://aiendpoint.dev/docs).

---

## Repository Structure

```
aiendpoint/platform (monorepo)
├── spec/
│   ├── v1/schema.json          # JSON Schema (the canonical spec)
│   └── examples/               # Reference implementations
├── demos/
│   ├── news/                   # Node.js + Express demo (port 3001)
│   ├── weather/                # Python + FastAPI demo (port 3002)
│   └── fx/                     # Cloudflare Workers demo (port 3003)
├── registry/                   # Fastify API backend (port 4000)
├── web/                        # Next.js 16 frontend
├── supabase/
│   └── migrations/             # PostgreSQL schema
└── docs/                       # Architecture & planning docs
```

---

## Tech Stack

| Component | Stack |
|-----------|-------|
| Monorepo  | pnpm + Turborepo |
| Registry API | Node.js + Fastify 4 + TypeScript |
| Frontend | Next.js 16 + Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Cache | Upstash Redis |
| Deployment | Vercel (web) + Railway (registry) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Python 3.10+ (for weather demo)

### 1. Clone & install

```bash
git clone https://github.com/aiendpoint/platform.git
cd platform
pnpm install
```

### 2. Set up environment variables

```bash
# registry/.env.local
cp .env.example registry/.env.local
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, UPSTASH_* values

# web/.env.local
cp .env.example web/.env.local
# Fill in NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3. Run the database migration

Execute `supabase/migrations/20260312_initial.sql` in your Supabase SQL Editor.

### 4. Start the services

```bash
# Registry API (port 4000)
cd registry && npm run dev

# Web frontend (port 3000)
cd web && npm run dev

# Demo servers (optional)
cd demos/news && node index.js          # port 3001
cd demos/weather && uvicorn main:app --port 3002
cd demos/fx && npx wrangler dev --port 3003
```

---

## The `/ai` Spec

Full spec: [`spec/v1/schema.json`](spec/v1/schema.json) · [Documentation](docs/01_spec.md)

### Required fields

| Field | Description |
|-------|-------------|
| `aiendpoint` | Spec version — must be `"1.0"` |
| `service.name` | Service name |
| `service.description` | Concise AI-readable description |
| `capabilities[]` | Array of capability objects (min 1) |

### Capability object

| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✓ | snake_case identifier |
| `description` | ✓ | One-sentence description |
| `endpoint` | ✓ | Relative URL path |
| `method` | ✓ | HTTP method (GET/POST/PUT/DELETE/PATCH) |
| `params` | — | Map of param name → description |
| `returns` | — | Response description |

### Validation scoring (0–100)

| Range | Grade | Badge |
|-------|-------|-------|
| 90–100 | Excellent | AI-Ready Gold |
| 70–89  | Good      | AI-Ready |
| 50–69  | Basic     | AI-Compatible |
| 0–49   | Poor      | — |

---

## Registry API

Base URL: `https://api.aiendpoint.dev` (self-hosted: `http://localhost:4000`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/ai` | Registry's own `/ai` spec |
| `GET`  | `/health` | Health check |
| `GET`  | `/api/services` | List & search services |
| `GET`  | `/api/services/:id` | Service detail |
| `POST` | `/api/services` | Register a service |
| `GET`  | `/api/validate?url=` | Validate a `/ai` endpoint |
| `GET`  | `/api/categories` | List categories |
| `GET`  | `/api/badge/:id.svg` | SVG badge |

### Register a service

```bash
curl -X POST https://api.aiendpoint.dev/api/services \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourservice.com"}'
```

### Validate a service

```bash
curl "https://api.aiendpoint.dev/api/validate?url=https://yourservice.com"
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

### Ways to contribute

- **Implement `/ai`** on your service and register it
- **Improve the spec** — open a discussion issue first
- **Add demo servers** in other languages/frameworks
- **Fix bugs or improve the registry/frontend**

### Development workflow

```bash
# Run type checks
cd registry && npm run typecheck

# Build for production
cd registry && npm run build
cd web && npm run build
```

---

## Roadmap

- [x] Spec v1.0 definition
- [x] Demo servers (Node.js, Python, Cloudflare Workers)
- [x] Registry API (Fastify + Supabase)
- [x] Web frontend (Next.js 16)
- [ ] Vercel + Railway deployment
- [ ] OpenAPI/Swagger → `/ai` converter
- [ ] Claude / GPT MCP server
- [ ] npm + pip SDK
- [ ] Stripe billing (Pro/Business plans)

---

## License

[Apache 2.0](LICENSE)

---

<p align="center">
  <a href="https://aiendpoint.dev">aiendpoint.dev</a> ·
  <a href="https://github.com/aiendpoint/platform/issues">Issues</a> ·
  <a href="https://github.com/aiendpoint/platform/discussions">Discussions</a>
</p>
