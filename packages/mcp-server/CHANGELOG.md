# Changelog

## 0.3.0 (2026-03-21)

### New tools

- **`aiendpoint_discover`** — Auto-discover `/ai` spec for any website via 3-step fallback:
  1. Direct `/ai` endpoint fetch
  2. Community registry cache lookup
  3. Site metadata collection for agent-side spec generation
- **`aiendpoint_submit_community_spec`** — Submit agent-generated `/ai` specs to the community registry so future agents benefit from cached results

### Existing tools (unchanged)

- `aiendpoint_search_services`
- `aiendpoint_fetch_ai_spec`
- `aiendpoint_validate_service`

## 0.2.0 (2026-03-17)

- Initial public release
- Three tools: search, fetch, validate
- stdio transport for Claude Desktop, Cursor, Claude Code
