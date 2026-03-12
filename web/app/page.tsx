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
        <div className="inline-flex items-center gap-2 bg-[#111] border border-[#222] text-[#888] text-xs px-3 py-1 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full" />
          Open Standard · Apache 2.0
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-[#e5e5e5] mb-4">
          The <code className="text-[#3b82f6]">/ai</code> Standard
        </h1>
        <p className="text-xl text-[#888] max-w-2xl mx-auto mb-10">
          Make your service instantly readable by AI agents.
          <br />
          <span className="italic font-bold">
          One endpoint. Pure JSON. No HTML noise.
          </span>
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/register"
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Register your service
          </Link>
          <Link
            href="/docs"
            className="bg-[#111] hover:bg-[#1a1a1a] text-[#e5e5e5] border border-[#222] font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Read the spec
          </Link>
        </div>
      </section>

      {/* Stats */}
      <div className="border-t border-b border-[#222] bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-3 divide-x divide-[#222] text-center">
          <div className="px-8">
            <p className="text-3xl font-bold font-mono text-[#e5e5e5]">{total}</p>
            <p className="text-sm text-[#888] mt-1">Registered services</p>
          </div>
          <div className="px-8">
            <p className="text-3xl font-bold font-mono text-[#e5e5e5]">1.0</p>
            <p className="text-sm text-[#888] mt-1">Spec version</p>
          </div>
          <div className="px-8">
            <p className="text-3xl font-bold font-mono text-[#e5e5e5]">10min</p>
            <p className="text-sm text-[#888] mt-1">To implement</p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-[#e5e5e5] text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: "01", title: "Implement /ai", desc: "Add GET /ai to your service returning structured JSON with your capabilities. 10 lines of code." },
            { step: "02", title: "Register & validate", desc: "Submit your URL. We fetch and validate your spec, scoring it 0–100. Pass to get an AI-Ready badge." },
            { step: "03", title: "AI agents connect", desc: "Any agent queries the registry, discovers your service, and instantly knows how to call it." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-[#111] border border-[#222] rounded-lg p-6">
              <p className="text-xs font-mono text-[#444] mb-3">{step}</p>
              <h3 className="font-semibold text-[#e5e5e5] mb-2">{title}</h3>
              <p className="text-sm text-[#888] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Code example */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-[#e5e5e5] text-center mb-8">
          Minimal <code className="text-[#3b82f6]">/ai</code> response
        </h2>
        <div className="bg-[#0d0d0d] border border-[#222] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
            <span className="text-xs text-[#555] font-mono">GET /ai → 200 OK · application/json</span>
            <Link href="/validate" className="text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              Validate your /ai →
            </Link>
          </div>
          <pre className="p-6 text-sm font-mono text-[#888] overflow-x-auto leading-relaxed whitespace-pre">{`{
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
        <div className="border border-[#222] rounded-xl p-8 bg-[#0d0d0d]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
            <div>
              <h2 className="text-lg font-bold text-[#e5e5e5]">Use with your AI agent</h2>
              <p className="text-sm text-[#555] mt-1">
                Discover registered services from Claude, Cursor, or Claude Code.
              </p>
            </div>
            <Link
              href="/docs#mcp"
              className="text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors whitespace-nowrap shrink-0"
            >
              Full setup guide →
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {/* Claude Desktop */}
            <div className="bg-[#111] border border-[#222] rounded-lg p-4">
              <p className="text-xs font-semibold text-[#888] mb-3">Claude Desktop</p>
              <pre className="text-[10px] font-mono text-[#555] leading-relaxed whitespace-pre overflow-x-auto">{`{
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
            <div className="bg-[#111] border border-[#222] rounded-lg p-4">
              <p className="text-xs font-semibold text-[#888] mb-3">Cursor</p>
              <pre className="text-[10px] font-mono text-[#555] leading-relaxed whitespace-pre overflow-x-auto">{`{
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
            <div className="bg-[#111] border border-[#222] rounded-lg p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[#888]">Claude Code</p>
                <a
                  href="https://skills.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#3b82f6] hover:underline"
                >
                  skills.sh ↗
                </a>
              </div>
              <pre className="text-[10px] font-mono text-[#555] leading-relaxed whitespace-pre-wrap break-all">{`npx skills add aiendpoint/platform --skill aiendpoint`}</pre>
              <p className="text-[10px] text-[#444] mt-3 leading-relaxed">
                Adds /ai to your own service from inside Claude Code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent services */}
      {services.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#e5e5e5]">Recent services</h2>
            <Link href="/services" className="text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
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
