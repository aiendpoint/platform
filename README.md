# AIEndpoint — The `/ai` Standard

**The web was built for human browsers. AI agents are a fundamentally different client.**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Spec](https://img.shields.io/badge/spec-v1.0-green.svg)](spec/v1/schema.json)
[![npm](https://img.shields.io/npm/v/@aiendpoint/mcp-server?label=mcp-server)](https://www.npmjs.com/package/@aiendpoint/mcp-server)

Every time an AI agent visits your site, it processes tens of thousands of tokens — HTML, scripts, styles, ads — just to find the few hundred tokens it actually needed. `/ai` ends that.

```
AI agent reads a webpage  →  ~50,000 tokens  (95% noise)
AI agent reads /ai        →     ~800 tokens  (0% noise)
```

---

## The problem

When an AI agent needs to use a web service today, it has three bad options:

- **Scrape HTML** — loads everything, understands little. Token-heavy, fragile, noisy.
- **Hardcode the API** — read the docs manually, write a custom integration, watch it break.
- **Hope there's an MCP server** — exists for fewer than 1% of services.

None of these scale. The web needs a machine-readable interface layer designed for AI agents.

## The convention

The web already solves similar problems with simple file conventions:

```
robots.txt   (1994)  →  tells crawlers what NOT to do
sitemap.xml  (2005)  →  tells crawlers where pages are
/ai          (2026)  →  tells AI agents what you CAN DO  ← this project
```

Any service that exposes `GET /ai` returns a compact JSON description of its capabilities.
AI agents read it directly — no scraping, no guessing, no documentation parsing.

→ **[Full story: aiendpoint.dev/why](https://aiendpoint.dev/why)**

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

## Use with AI agents

### MCP Server — search the registry from Claude or Cursor

```bash
npx -y @aiendpoint/mcp-server
```

Add to `claude_desktop_config.json` or `.cursor/mcp.json`:

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

Tools available: `aiendpoint_search_services` · `aiendpoint_fetch_ai_spec` · `aiendpoint_validate_service`

### Skill — add `/ai` to your own service

```bash
npx skills add aiendpoint/platform --skill aiendpoint
```

Then in Claude Code: *"add /ai endpoint to my service"* — detects your framework, generates the spec, inserts the code, validates it.

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
- [x] Vercel + Railway deployment
- [x] OpenAPI/Swagger → `/ai` converter
- [x] MCP server (`@aiendpoint/mcp-server` on npm)
- [x] Claude Code skill (skills.sh)
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
