# Demo video script (target 2:20, hard cap 3:00)

Setup before recording: Chrome 149+ with the WebMCP flag enabled, window at
1440×900, dark theme. Tabs ready: (1) aiendpoint.dev home, (2) the repo's
`RegistryTools.tsx` in an editor, (3) DemoWeather (not yet opened in agent).
English narration, no background music (contest rule: no third-party
copyrighted audio).

## 0:00–0:20 - The problem

*Screen: aiendpoint.dev home.*

> "WebMCP lets an agent use the page it's already on. But which page should
> it open in the first place? An agent that needs weather data still has to
> guess a URL. That missing step is service discovery - and it's what
> AIEndpoint does."

## 0:20–0:45 - Discovery is a WebMCP tool

*Screen: open the in-browser agent on aiendpoint.dev. Prompt:*
**"Find me a weather service that needs no authentication."**

> "aiendpoint.dev registers WebMCP tools on every page. The agent just called
> find_services against a registry of thousands of services - and notice the
> page: the same results the agent got are rendering as cards in front of me.
> Human and agent share one screen."

*Point at the result cards appearing.*

## 0:45–1:05 - Selecting a service

*Prompt:* **"Open the weather one."**

> "select_service opens the detail view: capabilities, auth, a live URL. The
> agent reads the same capability manifest the site publishes at
> slash-dot-well-known-slash-ai - an open spec, an IETF Internet-Draft."

*Click "Open service".*

## 1:05–1:50 - The discovered site executes

*Screen: DemoWeather page. Prompt:*
**"What's the weather in Seoul right now?"**

> "Now we're on the discovered service. Its page registered its own WebMCP
> tools - current_weather just ran, and the card updated with live
> Open-Meteo data. The key: these tools weren't handwritten. They were
> generated from the site's slash-ai manifest by our adapter."

*Prompt:* **"And the 5-day forecast for Tokyo?"** *(card switches to Tokyo,
flash highlight visible).*

## 1:50–2:15 - The code

*Screen: editor, `packages/webmcp/src/index.ts` (registerAiEndpointTools),
then `demos/weather/static/index.html` handlers section.*

> "One call: registerAiEndpointTools. The adapter parses the manifest's
> compact parameter notation into JSON schemas, registers the tools, and the
> site supplies explicit handlers that drive its own UI. Declare capabilities
> once - agents can find you before navigation and operate you after it."

## 2:15–2:30 - Close

*Screen: back to aiendpoint.dev home.*

> "AIEndpoint finds the right website. WebMCP operates it. The spec is open,
> the registry is live, the adapter is on npm. Thanks for watching."

## Fallback plan

If the in-browser agent can't drive tools in the recording environment, use
the `/webmcp/ping` diagnostics page and DevTools/Lighthouse to show tools
registering and executing, and narrate the same flow over manual clicks.
Record the happy path at least twice; keep the best take.
