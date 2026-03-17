import { PackageManagerTabs } from "./PackageManagerTabs";

// ── Install command tabs ────────────────────────────────────────────────────

const INSTALL_TABS = [
  { id: "npm", label: "npm", content: "npx -y @aiendpoint/mcp-server" },
  { id: "pnpm", label: "pnpm", content: "pnpm dlx @aiendpoint/mcp-server" },
  { id: "bun", label: "bun", content: "bunx @aiendpoint/mcp-server" },
  { id: "yarn", label: "yarn", content: "yarn dlx @aiendpoint/mcp-server" },
];

export function McpInstallTabs() {
  return <PackageManagerTabs tabs={INSTALL_TABS} />;
}

// ── MCP JSON config tabs ────────────────────────────────────────────────────

const npmConfig = `{
  "mcpServers": {
    "aiendpoint": {
      "command": "npx",
      "args": ["-y", "@aiendpoint/mcp-server"]
    }
  }
}`;

const pnpmConfig = `{
  "mcpServers": {
    "aiendpoint": {
      "command": "pnpm",
      "args": ["dlx", "@aiendpoint/mcp-server"]
    }
  }
}`;

const bunConfig = `{
  "mcpServers": {
    "aiendpoint": {
      "command": "bunx",
      "args": ["@aiendpoint/mcp-server"]
    }
  }
}`;

const yarnConfig = `{
  "mcpServers": {
    "aiendpoint": {
      "command": "yarn",
      "args": ["dlx", "@aiendpoint/mcp-server"]
    }
  }
}`;

const CONFIG_TABS = [
  { id: "npm", label: "npm", content: npmConfig },
  { id: "pnpm", label: "pnpm", content: pnpmConfig },
  { id: "bun", label: "bun", content: bunConfig },
  { id: "yarn", label: "yarn", content: yarnConfig },
];

export function McpConfigTabs() {
  return <PackageManagerTabs tabs={CONFIG_TABS} />;
}

// ── Claude Code CLI tabs ────────────────────────────────────────────────────

const CLAUDE_CODE_TABS = [
  {
    id: "npm",
    label: "npm",
    content: "claude mcp add aiendpoint -- npx -y @aiendpoint/mcp-server",
  },
  {
    id: "pnpm",
    label: "pnpm",
    content: "claude mcp add aiendpoint -- pnpm dlx @aiendpoint/mcp-server",
  },
  {
    id: "bun",
    label: "bun",
    content: "claude mcp add aiendpoint -- bunx @aiendpoint/mcp-server",
  },
  {
    id: "yarn",
    label: "yarn",
    content: "claude mcp add aiendpoint -- yarn dlx @aiendpoint/mcp-server",
  },
];

export function McpClaudeCodeTabs() {
  return <PackageManagerTabs tabs={CLAUDE_CODE_TABS} />;
}
