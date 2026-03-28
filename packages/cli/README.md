# @aiendpoint/cli

**Make your service AI-readable in minutes.** Generate a `/ai` endpoint spec from OpenAPI, or build one interactively.

```
AI reads a webpage  ->  10,000-50,000 tokens  (mostly noise)
AI reads /ai        ->          ~800 tokens  (0% noise)
```

## Quick Start

```bash
# From an OpenAPI spec (local file or URL)
npx @aiendpoint/cli init --openapi https://petstore3.swagger.io/api/v3/openapi.json

# Interactive wizard
npx @aiendpoint/cli init

# Validate a live /ai endpoint
npx @aiendpoint/cli validate https://api.aiendpoint.dev
```

## Commands

### `init`

Generate a `/ai` spec for your service.

```bash
npx @aiendpoint/cli init [options]
```

| Option | Description |
|--------|-------------|
| `--openapi <url\|file>` | Generate from OpenAPI/Swagger spec |
| `--framework <type>` | Target framework: `nextjs`, `fastify` (auto-detected if omitted) |
| `--output <dir>` | Output directory (default: current directory) |
| `--json-only` | Only output `ai.json`, skip route handler generation |
| `--force` | Overwrite existing files |

**What it does:**

1. Converts your OpenAPI spec to `/ai` format (or walks you through a wizard)
2. Validates and scores the result (0-100)
3. Auto-detects your framework (Next.js or Fastify)
4. Generates `ai.json` + a route handler file

```
$ npx @aiendpoint/cli init --openapi ./openapi.json

  Converted: 19 capabilities extracted

  Score: 75/100 (Good (AI-Ready))
  Capabilities: 19
  Token estimate: ~1462 tokens

  Framework: nextjs

  Files:
    + ai.json
    + app/ai/route.ts

  Done! Your service now has a /ai endpoint.
```

### `validate`

Check if a live `/ai` endpoint is valid.

```bash
npx @aiendpoint/cli validate <url>
```

```
$ npx @aiendpoint/cli validate https://api.aiendpoint.dev

  Found: https://api.aiendpoint.dev/ai (415ms)
  Score: 85/100 (Good (AI-Ready))
  Capabilities: 6
  Token estimate: ~832 tokens
```

## Framework Middleware

For serving `/ai` in production, use the framework-specific packages:

```bash
# Next.js
npm install @aiendpoint/next

# Fastify
npm install @aiendpoint/fastify
```

See [@aiendpoint/next](https://www.npmjs.com/package/@aiendpoint/next) and [@aiendpoint/fastify](https://www.npmjs.com/package/@aiendpoint/fastify).

## Links

- [aiendpoint.dev](https://aiendpoint.dev) - Registry & documentation
- [Spec docs](https://aiendpoint.dev/docs) - The /ai standard
- [MCP server](https://www.npmjs.com/package/@aiendpoint/mcp-server) - For AI agents
- [GitHub](https://github.com/aiendpoint/platform)
