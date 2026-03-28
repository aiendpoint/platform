# @aiendpoint/mcp-server

**Install once, and your AI agent can understand any website.**

When your AI agent needs to use a web service, it normally scrapes HTML (10,000-50,000 tokens of noise) or hopes there's documentation. This MCP server gives it a shortcut: structured, machine-readable specs at ~800 tokens.

```
AI reads a webpage  ->  10,000-50,000 tokens  (mostly noise)
AI reads /ai        ->          ~800 tokens  (0% noise)
```

100+ popular services (GitHub, Stripe, Spotify, Notion, etc.) are already indexed in the community registry.

## How it works

When your agent asks "What can github.com do?", the MCP server runs a 3-step fallback:

```
1. Check github.com/ai directly
   -> found? Use it. (~800 tokens, 100% accurate)

2. Check the community registry
   -> found? Use the cached spec.

3. No spec exists anywhere
   -> Your agent generates one from site metadata,
      and submits it for all future agents.
```

Step 3 is the key insight: your AI agent generates the spec (no extra server cost), then shares it with the community. Every future agent gets a cache hit at step 2.

## Tools

| Tool | Description |
|------|-------------|
| `aiendpoint_discover` | Auto-discover any website (3-step fallback) |
| `aiendpoint_search_services` | Search the registry by keyword or category |
| `aiendpoint_fetch_ai_spec` | Fetch a site's `/ai` spec directly |
| `aiendpoint_validate_service` | Validate `/ai` compliance (0-100 score) |
| `aiendpoint_submit_community_spec` | Submit a generated spec to the registry |

## Quick Start

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aiendpoint": {
      "command": "npx",
      "args": ["-y", "@aiendpoint/mcp-server"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project (or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "aiendpoint": {
      "command": "npx",
      "args": ["-y", "@aiendpoint/mcp-server"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add aiendpoint -- npx -y @aiendpoint/mcp-server
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "aiendpoint": {
      "command": "npx",
      "args": ["-y", "@aiendpoint/mcp-server"]
    }
  }
}
```

<details>
<summary>Using pnpm / bun / yarn</summary>

Replace the command and args:

```bash
# pnpm
"command": "pnpm", "args": ["dlx", "@aiendpoint/mcp-server"]

# bun (fastest startup)
"command": "bunx", "args": ["@aiendpoint/mcp-server"]

# yarn
"command": "yarn", "args": ["dlx", "@aiendpoint/mcp-server"]
```

For Claude Code:
```bash
claude mcp add aiendpoint -- pnpm dlx @aiendpoint/mcp-server
claude mcp add aiendpoint -- bunx @aiendpoint/mcp-server
```

</details>

### Global install (skip download on every run)

```bash
npm install -g @aiendpoint/mcp-server
```

Then use `aiendpoint-mcp` as the command in any config above.

## Usage Examples

Once connected, ask your AI assistant:

- *"What can github.com do?"* - discovers /ai spec via 3-step fallback
- *"Find payment APIs that don't require auth"* - searches the registry
- *"Search for Korean e-commerce services"* - category + language filter
- *"Is stripe.com's /ai endpoint valid?"* - validates compliance

## Add /ai to your own service

```bash
npx @aiendpoint/cli init
```

See [@aiendpoint/cli](https://www.npmjs.com/package/@aiendpoint/cli) for details.

## Links

- [aiendpoint.dev](https://aiendpoint.dev) - Registry & documentation
- [Spec docs](https://aiendpoint.dev/docs) - The /ai standard
- [GitHub](https://github.com/aiendpoint/platform) - Source code

## License

MIT
