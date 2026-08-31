# Devpost submission text (draft - paste into the form)

## Project name

AIEndpoint - Service Discovery for the Agentic Web

## Elevator pitch

AIEndpoint finds the right website. WebMCP operates it. An open standard and
live registry that lets browser agents discover which service can do the job
before they ever navigate.

## About the project (long description)

### Why WebMCP is a good fit

WebMCP gives an agent structured tools for the page it is already on. It
deliberately does not answer the question that comes right before it: *which
page should the agent open?* An agent that needs weather data, a currency
rate, or a product search still has to guess URLs or scrape search results.

AIEndpoint is that missing step. Any website publishes a small JSON
capability manifest at `/.well-known/ai` (specified in an IETF
Internet-Draft, Apache-2.0, with a JSON Schema), and our live registry
indexes thousands of them. This submission makes the two layers meet in the
browser: discovery itself becomes a WebMCP tool, and a discovered site's
manifest becomes its WebMCP tools.

### The experience

1. On **aiendpoint.dev**, the agent calls `find_services` ("a weather service
   with no auth") - and the human-visible page renders exactly the results
   the agent received. `select_service` opens the detail view with a live
   "Open service" link.
2. One click later, on **DemoWeather**, the agent calls `current_weather` and
   the weather card in front of the user updates with live Open-Meteo data.

Human and agent share one screen at every step. Nothing happens in a hidden
console: every tool call has a visible consequence on the page.

### What's new for human-agent collaboration

Before WebMCP, a "service directory for AI agents" could only be an HTTP API
for server-side agents. In the browser it was unreachable exactly where users
actually work. With WebMCP, the directory, the selection, and the execution
all happen inside one browsing session, visibly shared between the user and
the agent - discovery stops being a backend concern and becomes part of the
web page.

### How it's implemented

- **`@aiendpoint/webmcp`** (new package, ESM + IIFE): promotes a site's
  `/.well-known/ai` manifest into WebMCP tools. Tool names, descriptions and
  JSON input schemas are derived from the manifest - the spec's compact
  parameter notation (`"string, required -- city name"`) is parsed into
  schema types and required lists. Execution stays in explicit
  per-capability handlers, so a site never exposes anything it didn't wire
  up. Registration probes `navigator.modelContext`, `document.modelContext`,
  `window.modelContext` and `window.agent`, preferring `registerTool` with
  `AbortSignal` cleanup and falling back to `provideContext`.
- **aiendpoint.dev** registers `find_services` / `select_service` on every
  page (Next.js client component); tool calls navigate the visible UI so the
  human sees what the agent found. A `/webmcp/ping` diagnostics page reports
  the browser's actual WebMCP surface.
- **DemoWeather** (FastAPI) serves its manifest at `/.well-known/ai`, loads
  the adapter's IIFE bundle, and wires three handlers that drive the page's
  weather card - backed by live Open-Meteo data with a stale-cache fallback
  that is always labeled.
- Platform-wide, `/.well-known/ai` is now the authoritative manifest
  location (draft-01), with `/ai` kept as a legacy alias.

### What was built during the hackathon vs. before

The `/ai` spec, registry and demo API servers predate the hackathon. All
WebMCP work - the adapter package, every registered tool, the DemoWeather
page, and the live-data switch - was built during the submission period
(timestamped commits on the submission branch).

### Limitations and what's next

Cross-page agent continuity varies by runtime, so the demo keeps one human
click between discovery and execution. The adapter currently promotes
read-only, no-auth capabilities; schema-typed params (spec v1.1), mutations
with confirmation UI, and auth-scoped tools are next. The registry's
verification badge will gain a "WebMCP-ready" tier so agents can filter for
sites that are operable, not just discoverable.

## Built with

typescript, next.js, react, fastify, fastapi, python, esbuild, supabase,
redis, vercel, cloudflare, open-meteo, webmcp

## Testing notes for judges

Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled (or the
ChatGPT desktop browser). No login required anywhere. Diagnostics page:
https://www.aiendpoint.dev/webmcp/ping - shows the detected API surface and
a visible call counter. Demo prompts:

1. "Find me a weather service that needs no authentication." (on aiendpoint.dev)
2. "Open the weather one."
3. "What's the weather in Seoul right now?" (on the DemoWeather site)

<!-- TODO morning: replace DemoWeather URL placeholder once the permanent
     domain (weather.aiendpoint.dev) is connected; add YouTube link and
     repo/branch link before submitting. -->
