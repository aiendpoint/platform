# AIEndpoint Case Studies

How much does an AI agent save by reading `/ai` instead of scraping HTML or parsing raw OpenAPI specs?

We took real APIs with public OpenAPI specs, ran `npx @aiendpoint/cli init --openapi`, and measured the token difference.

## Results

| Service | HTML tokens | OpenAPI tokens | /ai tokens | Capabilities | Savings vs HTML |
|---------|------------|---------------|-----------|-------------|----------------|
| GitHub REST API | ~141,502 | ~3,010,194 | **~1,567** | 20 | **99%** |
| Stripe API | ~143,103 | ~1,915,868 | **~2,120** | 20 | **99%** |
| Twilio API | ~165,752 | ~467,603 | **~3,732** | 20 | **98%** |
| Slack Web API | ~56,488 | ~309,333 | **~2,223** | 20 | **96%** |

**Average savings: 98% fewer tokens vs HTML scraping.**

The OpenAPI specs for these services range from 300KB to 12MB. The `/ai` spec captures the top 20 capabilities in under 4,000 tokens every time.

## What this means

An AI agent calling Stripe's API today either:
- Scrapes stripe.com → **143,103 tokens** of HTML noise
- Parses the OpenAPI spec → **1,915,868 tokens** (7.6 MB of JSON Schema)
- Reads `/ai` → **2,120 tokens** with 20 actionable capabilities

That's the difference between burning $0.30 and $0.004 per discovery call (at typical LLM pricing).

## Try it yourself

```bash
npx @aiendpoint/cli init --openapi https://petstore3.swagger.io/api/v3/openapi.json
```

## Generated specs

Each directory contains the generated `ai.json` spec:

- [github/ai.json](github/ai.json)
- [stripe/ai.json](stripe/ai.json)
- [slack/ai.json](slack/ai.json)
- [twilio/ai.json](twilio/ai.json)
- [petstore/ai.json](petstore/ai.json) (demo API)

## Methodology

- HTML tokens: fetched homepage with `fetch()`, counted via char/4 estimation
- OpenAPI tokens: fetched raw spec JSON, counted via char/4 estimation
- /ai tokens: generated via `convertOpenApiToAi()` (rule-based, max 20 capabilities), counted via char/4
- All measurements taken on 2026-03-29

Regenerate: `node scripts/generate-case-studies.mjs`
