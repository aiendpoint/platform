# AIEndpoint × WebMCP - The WebMCP Challenge submission

> **AIEndpoint finds the right website. WebMCP operates it.**
> `/.well-known/ai` is the pre-navigation capability manifest; WebMCP is its in-page executable form.

## What this is

AIEndpoint is a live, open-standard service directory for AI agents: any website
can publish a small JSON capability manifest at `/.well-known/ai`
([IETF Internet-Draft](https://datatracker.ietf.org/doc/draft-aiendpoint-ai-discovery/)),
and the registry at [aiendpoint.dev](https://www.aiendpoint.dev) lets agents
search those services before they ever navigate.

WebMCP answers *"what can I do on the page I'm looking at?"*.
It cannot answer *"which website should I open in the first place?"*.
This submission wires the two together:

1. **Discovery (registry):** aiendpoint.dev registers WebMCP tools
   (`find_services`, `select_service`) on every page. An in-browser agent can
   search 3,600+ indexed services and open one - and the results it gets are
   the same cards the human sees appear on screen.
2. **Execution (service):** the discovered service (DemoWeather) registers its
   own WebMCP tools - generated from its `/.well-known/ai` manifest by our
   `@aiendpoint/webmcp` adapter - and tool calls update the page UI the human
   is watching (live Open-Meteo weather).

One manifest, two layers, shared on-screen state between human and agent.

## Quick test (about 90 seconds)

1. Use Google Chrome 149+ and enable `chrome://flags/#enable-webmcp-testing`,
   then restart Chrome (or use the ChatGPT desktop app browser).
2. Open **https://www.aiendpoint.dev** and ask the agent:
   > *Find me a weather service that needs no authentication.*
   The agent calls `find_services` - watch the result cards render on the page.
3. Ask:
   > *Open the weather one.*
   The agent calls `select_service` - the detail view opens with an
   "Open service" link.
4. Follow the link to https://weather.aiendpoint.dev and ask:
   > *What's the weather in Seoul right now?*
   The agent calls the page's `current_weather` tool - the weather card
   updates in front of you with live Open-Meteo data.

Diagnostics: `https://www.aiendpoint.dev/webmcp/ping` registers a single
`ping` tool and shows exactly which WebMCP API surface the browser exposes,
plus a visible call counter.

## Where the WebMCP code lives

| What | Where |
|---|---|
| Adapter: manifest → WebMCP tools | [`packages/webmcp/src/index.ts`](../../packages/webmcp/src/index.ts) |
| Registry tools (find/select, UI-coupled) | [`web/components/webmcp/RegistryTools.tsx`](../../web/components/webmcp/RegistryTools.tsx) |
| Registration helper used by the site | [`web/lib/webmcp-client.ts`](../../web/lib/webmcp-client.ts) |
| Smoke-test page (`ping`) | [`web/components/webmcp/PingTool.tsx`](../../web/components/webmcp/PingTool.tsx) |
| DemoWeather page + tool handlers | [`demos/weather/static/index.html`](../../demos/weather/static/index.html) |
| DemoWeather serving the manifest + IIFE bundle | [`demos/weather/main.py`](../../demos/weather/main.py) |

The adapter derives tool names, descriptions **and JSON input schemas** from
the manifest (the spec's compact parameter notation - `"string, required --
city name"` - is parsed into schema types and required lists). Execution stays
in explicit per-capability handlers, so a page never exposes anything it did
not consciously wire up.

## What was built during the hackathon

The `/ai` spec, registry, and demo API servers predate the hackathon. All
WebMCP work was built during the submission period (see commit history on
this branch):

- `@aiendpoint/webmcp` adapter package (ESM + IIFE builds)
- WebMCP tools on aiendpoint.dev (`find_services`, `select_service`, `ping`)
- The DemoWeather web page, its WebMCP tools, and its switch from synthetic
  data to live Open-Meteo data with a stale-cache fallback
- `/.well-known/ai` as the authoritative manifest location across the whole
  platform (registry, web, demos, serve adapters, validator, CLI), matching
  draft-01 of the Internet-Draft

## Known limitations

- The WebMCP API surface differs across runtimes; registration probes
  `navigator.modelContext`, `document.modelContext`, `window.modelContext`
  and `window.agent`, preferring `registerTool` and falling back to
  `provideContext`. The `/webmcp/ping` page reports what your browser exposes.
- Cross-page agent continuity (agent navigates to the discovered site and
  keeps working) depends on the runtime; the demo flow works with the human
  clicking "Open service" once.
- The adapter currently promotes read-only (GET, no-auth) capabilities;
  mutations and authenticated flows are future work.

## License

Apache 2.0 - see [LICENSE](../../LICENSE) at the repository root.
