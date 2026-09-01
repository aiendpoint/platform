# Devpost submission text (final - pasted into the form 2026-09-01)

## Project name

AIEndpoint - Service Discovery for the Agentic Web

## Elevator pitch

AIEndpoint finds the right website. WebMCP operates it. An open standard and
live registry that lets browser agents discover which service can do the job
before they ever navigate.

## About the project (Project Story field)

### Inspiration

WebMCP gives an agent structured tools for the page it is already on. But
watching agents work, we kept hitting the step that comes *before* that:
**which page should the agent open in the first place?** An agent that needs
weather data or a currency rate still guesses URLs or scrapes search results.

We had been building that missing step for months: AIEndpoint, an open
standard where any site publishes a capability manifest at `/.well-known/ai`
(an IETF Internet-Draft), plus a live registry indexing thousands of
services. When WebMCP appeared, the two ideas snapped together:

> **AIEndpoint finds the right website. WebMCP operates it.**

We are honest with ourselves: an independent project like this may never
become *the* standard. The giants are drafting their own, and there is only
so far one person can push. But robots.txt also started with one individual
and an idea the web happened to need. We simply wanted to cut the traffic
LLM agents waste crawling site after site just to figure out what each one
can do - and we entered this challenge hoping more people will join us.

### What it does

1. On **aiendpoint.dev**, an in-browser agent calls `find_services` ("a
   weather service with no auth"). The results the agent receives render as
   cards on the page the human is looking at. `select_service` opens the
   detail view with a live "Open service" link.
2. One click later, on **weather.aiendpoint.dev**, the agent calls
   `current_weather` and the weather card in front of the user updates with
   live Open-Meteo data.

Human and agent share one screen at every step. Nothing happens in a hidden
console: every tool call has a visible consequence on the page. Before
WebMCP, a service directory for agents could only be a server-side HTTP API,
unreachable exactly where users work. Now discovery, selection, and
execution all happen inside one browsing session, visibly shared between the
user and the agent.

### How we built it

- **`@aiendpoint/webmcp`** (new package, ESM + IIFE): promotes a site's
  `/.well-known/ai` manifest into WebMCP tools. Tool names, descriptions,
  and JSON input schemas are derived from the manifest: the spec's compact
  parameter notation (`"string, required -- city name"`) is parsed into
  schema types and required lists. Execution stays in explicit
  per-capability handlers, so a site never exposes anything it did not
  consciously wire up.
- **aiendpoint.dev** (Next.js) registers `find_services` / `select_service`
  on every page; tool calls navigate the visible UI. A `/webmcp/ping`
  diagnostics page reports the browser's actual WebMCP surface and shows a
  live call counter.
- **DemoWeather** (FastAPI) serves its manifest, loads the adapter's IIFE
  bundle, and wires three handlers that drive the page's weather card,
  backed by live Open-Meteo data with a labeled stale-cache fallback.

### Challenges we ran into

- **The API surface is still moving.** Registration probes
  `document.modelContext`, `navigator.modelContext` (now deprecated), and
  older entry points, preferring `registerTool` with `AbortSignal` cleanup.
  We learned by experiment that `executeTool` takes the registered tool
  object plus a JSON *string*, so our handlers normalize both parsed objects
  and raw strings.
- **`provideContext` replaces the whole tool set on every call**, so
  independent components clobbered each other until we kept a page-wide
  union of registered tools.
- **React Strict Mode** silently unregistered tools in development via the
  register/cleanup/register cycle until we made registration fully
  idempotent.
- Making discovery honest: we rewrote our registry search to match
  capability keywords against descriptions, and fixed count/filter bugs the
  new browser-driven usage exposed.

### What we learned

Dogfooding an open spec against a second standard is the fastest way to find
its weak points. Migrating `/ai` to `/.well-known/ai` (draft-01), parsing
our own compact notation into JSON Schema, and watching a real browser call
our tools taught us more in three days than months of design.

### What's next

Schema-typed params in spec v1.1, mutations with confirmation UI,
auth-scoped tools, and a "WebMCP-ready" tier on the registry's verification
badge, so agents can filter for sites that are *operable*, not just
discoverable.

## Built with

typescript, next.js, react, fastify, fastapi, python, esbuild, supabase,
redis, vercel, cloudflare, open-meteo, webmcp

## Testing notes for judges

Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled (or the
ChatGPT desktop browser). No login required anywhere. Diagnostics page:
https://www.aiendpoint.dev/webmcp/ping - shows the detected API surface and
a visible call counter. Demo prompts:

1. "Find me a weather service that needs no authentication." (on https://www.aiendpoint.dev)
2. "Open the weather one." (DemoWeather - verified, score 100 - tops the results)
3. "What's the weather in Seoul right now?" (on https://weather.aiendpoint.dev)

<!-- TODO before submitting: add YouTube link and repo/branch link. -->
