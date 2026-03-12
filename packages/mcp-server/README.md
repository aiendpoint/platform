# @aiendpoint/mcp-server

MCP server for the [AIEndpoint](https://aiendpoint.dev) registry.

Lets AI agents (Claude, Cursor, etc.) **search and discover web services** that expose a `/ai` endpoint — a machine-readable spec describing what the service can do and how to use it.

## Tools

| Tool | Description |
|------|-------------|
| `aiendpoint_search_services` | Search registered services by keyword, category, or auth type |
| `aiendpoint_fetch_ai_spec` | Fetch the `/ai` spec from any URL directly |
| `aiendpoint_validate_service` | Check if a service correctly implements the `/ai` standard |

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

Restart Claude Desktop. You can now ask:
> "Find me a free weather API" → Claude calls `aiendpoint_search_services`
> "What can stripe.com do?" → Claude calls `aiendpoint_fetch_ai_spec`

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

### Local install (faster startup)

```bash
npm install -g @aiendpoint/mcp-server
```

Then use `aiendpoint-mcp` as the command instead of `npx -y @aiendpoint/mcp-server`.

## Usage Examples

Once connected, you can ask your AI assistant:

- *"Find payment APIs that don't require auth"*
- *"Search for Korean e-commerce services"*
- *"What endpoints does news-demo.aiendpoint.dev expose?"*
- *"Is github.com's /ai endpoint valid?"*
- *"Find developer tools in the registry"*

## Registry

The registry is at [aiendpoint.dev](https://aiendpoint.dev).
Register your service's `/ai` endpoint at [aiendpoint.dev/register](https://aiendpoint.dev/register).

## License

MIT
