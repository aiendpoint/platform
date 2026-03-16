---
name: aiendpoint
description: Add a /ai endpoint to any web service so AI agents can discover and use it. Generates spec, validates compliance, and registers with the AIEndpoint registry at aiendpoint.dev. Use when asked to "make my service AI-ready", "add /ai endpoint", "implement aiendpoint standard", or "register on aiendpoint.dev".
---

# AIEndpoint — Add /ai to Your Service

This skill helps you implement the `/ai` endpoint standard on any web service.
The `/ai` endpoint is a machine-readable JSON spec that tells AI agents what your service can do and how to use it — like `robots.txt`, but for AI agents.

## What You'll Do

1. **Analyze** the current codebase to identify API endpoints and capabilities
2. **Generate** a `/ai` endpoint implementation for the detected framework
3. **Validate** the spec against the official schema at `https://api.aiendpoint.dev/api/validate`
4. **Register** the service on the AIEndpoint registry (optional)

---

## Step 1 — Detect Framework

Look at the project files to identify the framework:

- `package.json` with `express` → Express (Node.js)
- `package.json` with `fastify` → Fastify (Node.js)
- `package.json` with `next` → Next.js (add `app/ai/route.ts`)
- `requirements.txt` or `pyproject.toml` with `fastapi` → FastAPI (Python)
- `requirements.txt` or `pyproject.toml` with `flask` → Flask (Python)
- `Cargo.toml` with `axum` or `actix-web` → Rust
- Other → generate a generic JSON handler

Also look for existing API routes to understand what capabilities to expose.

---

## Step 2 — Generate the /ai Spec

Based on the codebase analysis, create an `AiEndpointSpec` JSON object:

```json
{
  "aiendpoint": "1.0",
  "service": {
    "name": "<service name from package.json/pyproject.toml/README>",
    "description": "<concise AI-optimized description, max 200 chars, no marketing fluff>",
    "language": ["<detected language codes, default: en>"],
    "category": ["<one or more: ecommerce|productivity|data|finance|media|communication|developer|ai|search|maps|weather|news>"]
  },
  "capabilities": [
    {
      "id": "<snake_case_name>",
      "description": "<one sentence, what this does for AI agents>",
      "endpoint": "<relative path, e.g. /api/products/search>",
      "method": "<GET|POST|PUT|DELETE|PATCH>",
      "params": {
        "<param_name>": "<type> (<required|optional>) — <short description>"
      },
      "returns": "<short description of response shape>"
    }
  ],
  "auth": {
    "type": "<none|apikey|oauth2|bearer>"
  },
  "token_hints": {
    "compact_mode": true,
    "field_filtering": true
  },
  "meta": {
    "last_updated": "<today's date YYYY-MM-DD>"
  }
}
```

**Rules for the spec:**
- `aiendpoint` must be `"1.0"` (string, not number)
- `capabilities` must have at least 1 item, maximum 20
- `capability.id` must be `snake_case`
- `description` fields: concise, AI-optimized, no adjectives like "powerful" or "amazing"
- `auth.type`: if unknown, use `"none"`

---

## Step 3 — Generate Framework Code

### Express / Fastify (Node.js / TypeScript)

Add to the main server file:

```typescript
app.get('/ai', (req, res) => {
  res.json({
    aiendpoint: '1.0',
    service: {
      name: '<name>',
      description: '<description>',
      language: ['en'],
      category: ['<category>'],
    },
    capabilities: [
      // ... generated capabilities
    ],
    auth: { type: '<type>' },
    meta: { last_updated: '<date>' },
  })
})
```

### Next.js (App Router)

Create `app/ai/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    aiendpoint: '1.0',
    service: {
      name: '<name>',
      description: '<description>',
      language: ['en'],
      category: ['<category>'],
    },
    capabilities: [
      // ... generated capabilities
    ],
    auth: { type: '<type>' },
    meta: { last_updated: '<date>' },
  })
}
```

### FastAPI (Python)

Add to the main `main.py`:

```python
@app.get("/ai")
def ai_spec():
    return {
        "aiendpoint": "1.0",
        "service": {
            "name": "<name>",
            "description": "<description>",
            "language": ["en"],
            "category": ["<category>"],
        },
        "capabilities": [
            # ... generated capabilities
        ],
        "auth": {"type": "<type>"},
        "meta": {"last_updated": "<date>"},
    }
```

### Flask (Python)

```python
@app.route('/ai')
def ai_spec():
    return jsonify({
        "aiendpoint": "1.0",
        # ...
    })
```

---

## Step 4 — Validate

After adding the `/ai` endpoint, validate it against the official schema.

If the server is running locally, run:
```bash
curl -s "https://api.aiendpoint.dev/api/validate?url=http://localhost:<port>" | jq '{passed: .passed, score: .score, grade: .grade, errors: .errors}'
```

If validation fails, read the `errors[]` array in the response and fix the issues. Each error has `field`, `message`, and `code`.

**Common issues:**
- `MISSING_VERSION` → `aiendpoint` field missing or not `"1.0"` (must be a string, not number)
- `EMPTY_CAPABILITIES` → `capabilities` array must have at least one item
- `INCOMPLETE_CAPABILITY` → Each capability needs `id`, `description`, `endpoint`, `method`
- `MISSING_RETURNS` → Add a `returns` field to each capability (e.g. `"products[] with id, name, price"`)

**Scoring guide (0–100):**
- Connectivity (15pt): `/ai` reachable within 3s
- Required fields (35pt): `aiendpoint`, `service.name`, `service.description`, `capabilities`
- Capability quality (20pt): each capability has `id`, `description`, `endpoint`, `method`, `returns`
- Recommended (15pt): `service.category`, `auth`, `meta.last_updated`
- Token efficiency (15pt): description length 20–150 chars, `token_hints` present, concise `returns`

---

## Step 5 — Register (Optional)

If the user wants to register on the AIEndpoint registry, make a POST request:

```bash
curl -X POST https://api.aiendpoint.dev/api/services \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<your-domain.com>"}'
```

Or direct the user to: `https://aiendpoint.dev/register`

---

## Tips

- If the project has many API routes, focus on the most commonly used ones (max 10–15 capabilities)
- For internal/admin endpoints, skip them — only expose public-facing capabilities
- `params` values should be short: `"string (required) — product ID"` not `"This parameter is a string type and is required..."`
- The whole `/ai` response should stay under 10KB for token efficiency
