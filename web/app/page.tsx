import Link from "next/link";
import { ServiceCard } from "@/components/ServiceCard";
import { getServices } from "@/lib/api";

async function loadRecentServices() {
  try {
    return await getServices({ limit: 6 });
  } catch {
    return { total: 0, services: [] };
  }
}

export default async function Home() {
  const { total, services } = await loadRecentServices();

  return (
    <div>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-canvas border border-line text-muted text-xs px-3 py-1 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-success rounded-full" />
          Open Standard · Apache 2.0
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-fg mb-6">
          The <code className="text-accent">/ai</code> Standard
        </h1>
        <p className="text-xl text-muted max-w-2xl mx-auto mb-4">
          The web was built for human browsers.
          <br />
          <span className="text-dim">AI agents are a fundamentally different client.</span>
        </p>
        <p className="text-sm text-subtle max-w-xl mx-auto mb-8">
          Every time an AI agent visits your site, it processes 10,000–50,000 tokens —
          HTML, scripts, styles, ads — just to find the few hundred tokens it actually needed.
          <code className="text-accent mx-1">/ai</code> ends that.
        </p>

        {/* Evolution timeline */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-10 select-none">
          {(
            [
              { name: "robots.txt", label: "don't go" },
              { name: "sitemap.xml", label: "go here" },
              { name: "llms.txt", label: "context" },
              { name: "/ai", label: "do this", accent: true },
            ] as Array<{ name: string; label: string; accent?: boolean }>
          ).map((item, i) => (
            <div key={item.name} className="flex items-center gap-2">
              {i > 0 && <span className="text-line-dim text-xs">→</span>}
              <div
                className={`px-3 py-1.5 rounded-lg border text-xs ${
                  item.accent
                    ? "border-accent/40 bg-accent/5 text-accent"
                    : "border-line bg-canvas text-subtle"
                }`}
              >
                <code className="font-mono">{item.name}</code>
                <span className={`ml-1.5 text-[10px] ${item.accent ? "text-accent/70" : "text-faint"}`}>
                  · {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
          <Link
            href="/register"
            className="bg-accent hover:bg-accent-hover text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Register your service
          </Link>
          <Link
            href="/docs"
            className="bg-canvas hover:bg-surface text-fg border border-line font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Read the spec
          </Link>
        </div>
        <Link href="/why" className="text-sm text-subtle hover:text-muted transition-colors">
          Why we built this →
        </Link>
      </section>

      {/* The problem — aha moment */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Before */}
          <div className="bg-code border border-line rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-error" />
              <span className="text-xs font-semibold text-subtle uppercase tracking-wider">AI agent reads a webpage</span>
            </div>
            <div className="space-y-2 mb-5">
              {[
                { label: "HTML structure + content", pct: 18 },
                { label: "JavaScript bundles", pct: 42 },
                { label: "CSS & styles", pct: 20 },
                { label: "Ads, trackers, widgets", pct: 12 },
                { label: "Useful information", pct: 5, accent: true },
              ].map(({ label, pct, accent }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex-1 bg-surface rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${accent ? "bg-accent" : "bg-line-dim"}`}
                      style={{ width: `${pct * 2}%` }}
                    />
                  </div>
                  <span className={`text-xs w-52 shrink-0 ${accent ? "text-accent" : "text-faint"}`}>
                    {pct}% {label}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-3xl font-bold font-mono text-error">10k–50k<span className="text-base text-subtle ml-1">tokens</span></p>
            <p className="text-xs text-faint mt-1">varies by page complexity · mostly noise</p>
          </div>

          {/* After */}
          <div className="bg-code border border-accent/20 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-xs font-semibold text-subtle uppercase tracking-wider">AI agent reads /ai</span>
            </div>
            <div className="space-y-2 mb-5">
              {[
                { label: "Service name & description", pct: 20 },
                { label: "Capabilities & endpoints", pct: 55 },
                { label: "Auth & rate limits", pct: 15 },
                { label: "Token hints", pct: 10 },
              ].map(({ label, pct }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex-1 bg-surface rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-accent/60" style={{ width: `${pct * 2}%` }} />
                  </div>
                  <span className="text-xs text-subtle w-52 shrink-0">{pct}% {label}</span>
                </div>
              ))}
            </div>
            <p className="text-3xl font-bold font-mono text-success">~800<span className="text-base text-subtle ml-1">tokens</span></p>
            <p className="text-xs text-faint mt-1">pure signal · 0% noise</p>
          </div>
        </div>
        <p className="text-center text-xs text-faint mt-4">
          60× fewer tokens. Zero parsing. Instant, reliable access to exactly what the agent needs.{" "}
          <Link href="/why" className="text-accent hover:underline">Full story →</Link>
        </p>
      </section>

      {/* Stats */}
      <div className="border-t border-b border-line bg-code">
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-3 divide-x divide-line text-center">
          <div className="px-8">
            <p className="text-3xl font-bold font-mono text-fg">{total}</p>
            <p className="text-sm text-muted mt-1">Registered services</p>
          </div>
          <div className="px-8">
            <p className="text-3xl font-bold font-mono text-fg">1.0</p>
            <p className="text-sm text-muted mt-1">Spec version</p>
          </div>
          <div className="px-8">
            <p className="text-3xl font-bold font-mono text-fg">10min</p>
            <p className="text-sm text-muted mt-1">To implement</p>
          </div>
        </div>
      </div>

      {/* Start here — persona cards */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-fg text-center mb-3">Start here</h2>
        <p className="text-sm text-subtle text-center mb-10">Choose what fits you best</p>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/docs/quick-start"
            className="bg-canvas border border-line hover:border-accent/40 rounded-xl p-6 transition-colors group"
          >
            <p className="text-xs font-mono text-faint mb-3">I have a web service</p>
            <h3 className="font-semibold text-fg mb-2 group-hover:text-accent transition-colors">
              Add /ai in 10 minutes →
            </h3>
            <p className="text-sm text-subtle leading-relaxed">
              Return structured JSON from <code className="text-muted">/ai</code>. Register. Get a badge. AI agents can find and call you instantly.
            </p>
          </Link>
          <Link
            href="/docs/mcp-server"
            className="bg-canvas border border-line hover:border-accent/40 rounded-xl p-6 transition-colors group"
          >
            <p className="text-xs font-mono text-faint mb-3">I'm building an AI agent</p>
            <h3 className="font-semibold text-fg mb-2 group-hover:text-accent transition-colors">
              Install MCP &amp; auto-discover →
            </h3>
            <p className="text-sm text-subtle leading-relaxed">
              Your agent checks <code className="text-muted">/ai</code> first, falls back to the registry, and auto-generates specs for unknown sites. Zero config.
            </p>
          </Link>
          <Link
            href="/why"
            className="bg-canvas border border-line hover:border-accent/40 rounded-xl p-6 transition-colors group"
          >
            <p className="text-xs font-mono text-faint mb-3">I want to understand</p>
            <h3 className="font-semibold text-fg mb-2 group-hover:text-accent transition-colors">
              Read why →
            </h3>
            <p className="text-sm text-subtle leading-relaxed">
              Why a new standard? How does it compare to MCP, OpenAPI, llms.txt? What problem does it actually solve?
            </p>
          </Link>
        </div>
      </section>

      {/* Code example */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-fg text-center mb-8">
          Minimal <code className="text-accent">/ai</code> response
        </h2>
        <div className="bg-code border border-line rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="text-xs text-subtle font-mono">GET /ai → 200 OK · application/json</span>
            <Link href="/validate" className="text-xs text-accent hover:text-accent-soft transition-colors">
              Validate your /ai →
            </Link>
          </div>
          <pre className="p-6 text-sm font-mono text-muted overflow-x-auto leading-relaxed whitespace-pre">{`{
  "aiendpoint": "1.0",
  "service": {
    "name": "My Service",
    "description": "Concise description for AI agents",
    "category": ["productivity"]
  },
  "capabilities": [
    {
      "id": "search_items",
      "description": "Search items by keyword",
      "endpoint": "/api/search",
      "method": "GET",
      "params": { "q": "keyword (string, required)" },
      "returns": "items[] with id, name, price"
    }
  ]
}`}</pre>
        </div>
      </section>

      {/* Install strip */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="border border-line rounded-xl p-8 bg-code">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
            <div>
              <h2 className="text-lg font-bold text-fg">Use with your AI agent</h2>
              <p className="text-sm text-subtle mt-1">
                Auto-discover any website's capabilities from Claude, Cursor, or Claude Code.
              </p>
            </div>
            <Link
              href="/docs#mcp"
              className="text-xs text-accent hover:text-accent-soft transition-colors whitespace-nowrap shrink-0"
            >
              Full setup guide →
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {/* Claude Desktop */}
            <div className="bg-canvas border border-line rounded-lg p-4">
              <p className="text-xs font-semibold text-muted mb-3">Claude Desktop</p>
              <pre className="text-[10px] font-mono text-subtle leading-relaxed whitespace-pre overflow-x-auto">{`{
  "mcpServers": {
    "aiendpoint": {
      "command": "npx",
      "args": ["-y",
        "@aiendpoint/mcp-server"]
    }
  }
}`}</pre>
            </div>
            {/* Cursor */}
            <div className="bg-canvas border border-line rounded-lg p-4">
              <p className="text-xs font-semibold text-muted mb-3">Cursor</p>
              <pre className="text-[10px] font-mono text-subtle leading-relaxed whitespace-pre overflow-x-auto">{`{
  "mcpServers": {
    "aiendpoint": {
      "command": "npx",
      "args": ["-y",
        "@aiendpoint/mcp-server"]
    }
  }
}`}</pre>
            </div>
            {/* Claude Code */}
            <div className="bg-canvas border border-line rounded-lg p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted">Claude Code</p>
                <a
                  href="https://skills.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-accent hover:underline"
                >
                  skills.sh ↗
                </a>
              </div>
              <pre className="text-[10px] font-mono text-subtle leading-relaxed whitespace-pre-wrap break-all">{`npx skills add aiendpoint/platform --skill aiendpoint`}</pre>
              <p className="text-[10px] text-faint mt-3 leading-relaxed">
                Adds /ai to your own service from inside Claude Code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Join the movement */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="border border-accent/20 bg-accent/5 rounded-xl p-10 text-center">
          <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-4">Open standard · Apache 2.0</p>
          <h2 className="text-2xl font-bold text-fg mb-4">
            The web got better when everyone added <code className="text-muted">robots.txt</code>.<br />
            It's happening again.
          </h2>
          <p className="text-ghost max-w-lg mx-auto mb-8 leading-relaxed">
            Every service that implements <code className="text-accent">/ai</code> reduces wasted tokens
            across the entire AI ecosystem — not for one company, but for everyone building with AI.
            The spec is open. Implementation takes 10 minutes.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/register"
              className="bg-accent hover:bg-accent-hover text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Add /ai to your service
            </Link>
            <a
              href="https://github.com/aiendpoint/platform"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-canvas hover:bg-surface text-fg border border-line font-medium px-6 py-3 rounded-lg transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              Star on GitHub
            </a>
          </div>
          <p className="mt-6 text-xs text-faint">
            <Link href="/why" className="hover:text-muted transition-colors">Why this matters →</Link>
          </p>
        </div>
      </section>

      {/* Recent services */}
      {services.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-fg">Recent services</h2>
            <Link href="/services" className="text-sm text-accent hover:text-accent-soft transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
