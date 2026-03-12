# Why `/ai`? — The Missing Standard for AI-Ready Services

> **TL;DR**: `robots.txt` told crawlers where not to go. `sitemap.xml` told them where to go.
> `/ai` tells AI agents what your service *can do* — and how to do it efficiently.

---

## The Problem Nobody Is Talking About

Every time an AI agent tries to use your service, this happens:

```
1. Agent fetches your homepage          → 80KB of HTML, ads, nav, footer
2. Agent reads your docs                → scattered across 12 pages
3. Agent tries your API                 → wrong endpoint, wrong format
4. Agent hallucinates a workaround      → breaks in production
```

**The result**: AI agents waste thousands of tokens just to understand what your service does.
Users get wrong answers. Developers get frustrated. Your service gets excluded from AI workflows.

This is not an AI problem. It's a **missing standard** problem.

---

## What Already Exists (And Why It's Not Enough)

| Standard | Purpose | Problem for AI |
|----------|---------|----------------|
| `robots.txt` | Tell crawlers what NOT to index | Only says "no", not "here's what I do" |
| `sitemap.xml` | Tell crawlers where pages are | Lists URLs, not capabilities |
| `llms.txt` | Give AI a plain text summary | Unstructured, not queryable, no actions |
| `OpenAPI/Swagger` | Describe REST APIs | Built for humans, not token-efficient |
| `MCP` | Connect AI to tools | Too heavy, requires custom server setup |

None of these answer the core question an AI agent asks:

> **"What can this service DO, and how do I call it — right now, with minimal overhead?"**

---

## Introducing `/ai`

A single, lightweight endpoint. Every service that implements it becomes instantly AI-readable.

```bash
curl https://yourservice.com/ai
```

```json
{
  "aiendpoint": "1.0",
  "service": {
    "name": "YourService",
    "description": "One sentence. What you do. For machines, not marketing.",
    "category": ["ecommerce", "search"]
  },
  "capabilities": [
    {
      "id": "search",
      "description": "Search products by keyword",
      "endpoint": "/api/ai/search",
      "method": "GET",
      "params": {
        "q": "string, required",
        "limit": "integer, optional, default 10"
      },
      "returns": "products[] {id, name, price, stock}"
    }
  ],
  "auth": { "type": "apikey", "header": "X-API-Key" },
  "token_hints": { "compact_mode": true, "field_filtering": true }
}
```

That's it. No SDK. No special protocol. Just a JSON response at a predictable URL.

---

## Why This Works

### 1. Token efficiency
A well-formed `/ai` response is **200~500 tokens**.
Reading a documentation page to extract the same information costs **3,000~15,000 tokens**.
That's a **10x–30x reduction** in cost per service discovery.

### 2. Zero new infrastructure
You don't need a new server. You don't need to install anything.
Add one route to your existing backend. Done.

```javascript
// Express.js — 10 minutes to implement
app.get('/ai', (req, res) => {
  res.json(yourAiEndpointSpec);
});
```

### 3. Works with everything
- Claude, GPT, Gemini — any LLM
- MCP clients — `/ai` can be wrapped as an MCP tool trivially
- Direct agent calls — no middleware required
- Future standards — `/ai` is a stable base, not a moving target

### 4. Opt-in capability exposure
You control exactly what AI agents can see and do.
Expose read-only capabilities. Keep sensitive endpoints out.
Use `token_hints` to tell agents how to be efficient with your API.

---

## Comparison: Before and After

### Before `/ai`
```
Agent task: "Find cheapest laptop under $800 on ShopX"

1. GET https://shopx.com                          [8,200 tokens]
2. Parse nav, find search                         [1,100 tokens]
3. GET https://shopx.com/search?q=laptop          [12,400 tokens]
4. Parse HTML results, extract prices             [2,300 tokens]
5. Filter under $800                              [agent reasoning]

Total: ~24,000 tokens. Often fails or hallucinates.
```

### After `/ai`
```
Agent task: "Find cheapest laptop under $800 on ShopX"

1. GET https://shopx.com/ai                       [312 tokens]
2. Read capabilities, find search endpoint        [agent reasoning]
3. GET https://shopx.com/api/ai/search
      ?q=laptop&max_price=800&sort=price_asc      [890 tokens]

Total: ~1,200 tokens. Structured result. No hallucination.
```

**20x token reduction. Deterministic result.**

---

## The `/ai` Spec — Full Reference

### Required Fields

```json
{
  "aiendpoint": "1.0",
  "service": {
    "name": "string — service name",
    "description": "string — one sentence, what it does",
    "category": ["string"] 
  },
  "capabilities": [
    {
      "id": "string — unique identifier",
      "description": "string — what this capability does",
      "endpoint": "string — relative path",
      "method": "GET | POST | PUT | DELETE",
      "params": {
        "param_name": "type, required|optional, description"
      },
      "returns": "string — what the response contains"
    }
  ]
}
```

### Optional Fields

```json
{
  "auth": {
    "type": "none | apikey | oauth2 | bearer",
    "header": "string — header name if apikey",
    "docs": "string — URL to auth documentation"
  },
  "token_hints": {
    "compact_mode": "boolean — supports ?compact=true for shorter responses",
    "field_filtering": "boolean — supports ?fields=id,name for partial responses",
    "delta_support": "boolean — supports ?since=timestamp for incremental updates"
  },
  "rate_limits": {
    "requests_per_minute": "integer",
    "agent_tier_available": "boolean — whether higher limits exist for agents"
  },
  "meta": {
    "last_updated": "ISO8601 date",
    "changelog": "URL to changelog",
    "status": "URL to status page"
  }
}
```

### Category Values (v1)

```
productivity, ecommerce, finance, news, weather, maps, 
search, data, communication, calendar, storage, media,
health, education, travel, food, government, developer
```

---

## Design Principles

**1. Simplicity over completeness**
If a developer can't implement `/ai` in under 30 minutes, the spec is too complex.
We'd rather have 10,000 simple implementations than 100 perfect ones.

**2. Token efficiency is a first-class concern**
Every field in the spec exists to reduce the tokens an agent needs to use your service.
If a field doesn't help an agent act more efficiently, it doesn't belong.

**3. No new protocols**
`/ai` runs over plain HTTPS. Returns plain JSON.
Any language, any framework, any hosting environment.

**4. Backward compatible**
v1 implementations will always work.
New spec versions add fields; they never remove or rename existing ones.

**5. Human-readable too**
A developer should be able to read a `/ai` response and immediately understand it.
If it's only machine-readable, it's too terse. If it reads like marketing copy, it's too verbose.

---

## Adoption Path

### For service owners
```
Week 1: Add GET /ai to your backend (30 min)
Week 1: Register at aiendpoint.dev (5 min)
Week 2: Display the "AI-Ready" badge on your docs
Week 3: Watch AI agent integrations appear without custom work
```

### For AI developers
```
Step 1: Query aiendpoint.dev/api/search?q=your-use-case
Step 2: Get list of /ai-compatible services
Step 3: Fetch service.com/ai to understand capabilities
Step 4: Call the structured endpoints directly
```

### For framework authors
```
- Add /ai auto-discovery to your agent framework
- Implement /ai response parsing as a built-in tool
- Contribute parsers to the open-source SDK
```

---

## FAQ

**Q: How is this different from OpenAPI?**
OpenAPI describes every endpoint of an API in exhaustive detail — it's a complete contract.
`/ai` describes only what an AI agent should know to take useful actions — it's a capability summary.
They complement each other. `/ai` can link to your OpenAPI spec for agents that need more detail.

**Q: How is this different from MCP?**
MCP requires running a server process and a custom transport layer.
`/ai` is a static JSON response at a URL. No server. No protocol. No SDK required.
MCP is a runtime protocol. `/ai` is a discovery standard. Both can coexist.

**Q: What if my service changes?**
Update your `/ai` response. The registry polls registered services and detects changes.
Version your capabilities with the `meta.last_updated` field.

**Q: Is this officially endorsed by Anthropic/Google/OpenAI?**
Not yet. But neither was `robots.txt` when Martijn Koster proposed it in 1994.
Standards get endorsed after adoption, not before.

**Q: What stops someone from implementing it wrong?**
Register at aiendpoint.dev and get your implementation automatically validated.
The validator checks schema compliance and endpoint reachability.

---

## Get Started

```bash
# 1. Copy the minimal spec
curl https://aiendpoint.dev/spec/v1/minimal.json

# 2. Add to your server
# (see examples at github.com/aiendpoint/spec/examples)

# 3. Validate your implementation
curl https://aiendpoint.dev/api/validate?url=https://yourservice.com/ai

# 4. Register and get your badge
# https://aiendpoint.dev/register
```

**The web became crawlable because of `robots.txt`.**
**The web became discoverable because of `sitemap.xml`.**
**The web becomes agent-ready with `/ai`.**

---

*AIEndpoint Spec v1.0 — Open Standard, Apache 2.0 License*
*github.com/aiendpoint/spec*
