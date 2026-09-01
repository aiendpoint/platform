# Devpost submission text (draft - paste into the form)

## Project name

AIEndpoint - Service Discovery for the Agentic Web

## Elevator pitch

AIEndpoint finds the right website. WebMCP operates it. An open standard and
live registry that lets browser agents discover which service can do the job
before they ever navigate.

p='hackathon/webmcp/DEVPOST.md'
s=open(p).read()
marker='## About the project (long description)'
assert marker in s
head, rest = s.split(marker, 1)
# Keep everything after "## Built with" from the old body
tail_marker = '## Built with'
tail = rest[rest.index(tail_marker):]
story = open('/dev/stdin').read()
open(p,'w').write(head + story + '\n' + tail)
print('DEVPOST.md story replaced')

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
