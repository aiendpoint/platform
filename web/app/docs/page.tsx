import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 bg-[#111] border border-[#222] text-[#555] text-xs px-3 py-1 rounded-full mb-6">
          Spec v1.0 · Apache 2.0
        </div>
        <h1 className="text-4xl font-bold text-[#e5e5e5] mb-4">
          The <code className="text-[#3b82f6]">/ai</code> Spec
        </h1>
        <p className="text-[#888] text-lg leading-relaxed">
          A standard endpoint every web service can implement so AI agents can discover
          and use it — without scraping, guessing, or reading documentation.
        </p>
      </div>

      {/* Overview */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-[#e5e5e5] mb-4">Overview</h2>
        <p className="text-[#888] mb-4">
          Any service exposes <code className="text-[#888] bg-[#111] border border-[#222] px-1.5 py-0.5 rounded text-xs">GET /ai</code> returning
          a structured JSON object. AI agents query this to understand what the service does and how to call it.
        </p>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          {[
            { label: "robots.txt", desc: "Tells crawlers what NOT to do" },
            { label: "sitemap.xml", desc: "Tells crawlers where pages are" },
            { label: "/ai", desc: "Tells AI agents what you can DO", accent: true },
          ].map(({ label, desc, accent }) => (
            <div key={label} className={`rounded-lg p-4 border ${accent ? "bg-[#3b82f6]/5 border-[#3b82f6]/20" : "bg-[#111] border-[#222]"}`}>
              <code className={`text-xs font-mono ${accent ? "text-[#3b82f6]" : "text-[#888]"}`}>{label}</code>
              <p className="text-[#555] text-xs mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Full example */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-[#e5e5e5] mb-4">Full example</h2>
        <div className="bg-[#0d0d0d] border border-[#222] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#222]">
            <span className="text-xs font-mono text-[#555]">GET /ai → 200 OK · Content-Type: application/json</span>
          </div>
          <pre className="p-6 text-sm font-mono text-[#888] overflow-x-auto leading-relaxed whitespace-pre">{`{
  "aiendpoint": "1.0",
  "service": {
    "name": "Acme Store",
    "description": "E-commerce API for products, cart, and orders",
    "language": ["en"],
    "category": ["ecommerce"]
  },
  "capabilities": [
    {
      "id": "search_products",
      "description": "Search for products by keyword or category",
      "endpoint": "/api/products/search",
      "method": "GET",
      "params": {
        "q":        "search keyword (string, required)",
        "category": "filter by category (string, optional)",
        "limit":    "max results (integer, optional, default: 20, max: 100)"
      },
      "returns": "products[] with id, name, price, stock, image_url"
    },
    {
      "id": "get_product",
      "description": "Get full details for a product",
      "endpoint": "/api/products/:id",
      "method": "GET",
      "params": {
        "id": "product ID (string, required, path param)"
      },
      "returns": "product with full spec, variants, reviews"
    }
  ],
  "auth": {
    "type": "apikey",
    "docs": "https://acme.com/docs/auth"
  },
  "token_hints": {
    "compact_mode": true,
    "field_filtering": true,
    "delta_support": false
  },
  "rate_limits": {
    "requests_per_minute": 60,
    "agent_tier_available": true
  },
  "meta": {
    "last_updated": "2026-03-12",
    "spec_url": "https://acme.com/ai"
  }
}`}</pre>
        </div>
      </section>

      {/* Required fields */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-[#e5e5e5] mb-6">Required fields</h2>
        <div className="space-y-4">
          <Field
            name="aiendpoint"
            type="string"
            required
            desc={<>Version string. Must be <code className="text-[#888] text-xs">&quot;1.0&quot;</code>.</>}
            example={`"aiendpoint": "1.0"`}
          />
          <Field
            name="service.name"
            type="string"
            required
            desc="Human-readable service name."
            example={`"name": "Acme Store"`}
          />
          <Field
            name="service.description"
            type="string"
            required
            desc="Concise description for AI agents. Keep it under 200 chars. No marketing fluff."
            example={`"description": "E-commerce API for products, cart, and orders"`}
          />
          <Field
            name="capabilities"
            type="array"
            required
            desc="One or more capability objects describing what the service can do."
          />
        </div>
      </section>

      {/* Capability fields */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-[#e5e5e5] mb-2">Capability object</h2>
        <p className="text-[#888] text-sm mb-6">Each item in the <code className="text-[#888]">capabilities</code> array describes one action an AI agent can take.</p>
        <div className="space-y-4">
          <Field name="id"          type="string" required desc={<>Snake_case identifier. Must match <code className="text-[#888] text-xs">^[a-z][a-z0-9_]*$</code></>} example={`"id": "search_products"`} />
          <Field name="description" type="string" required desc="What this capability does. One sentence." example={`"description": "Search for products by keyword"`} />
          <Field name="endpoint"    type="string" required desc="Relative URL path. Use :id notation for path params." example={`"endpoint": "/api/products/search"`} />
          <Field name="method"      type="string" required desc={<>HTTP method: <code className="text-[#888] text-xs">GET</code>, <code className="text-[#888] text-xs">POST</code>, <code className="text-[#888] text-xs">PUT</code>, <code className="text-[#888] text-xs">DELETE</code>, <code className="text-[#888] text-xs">PATCH</code></>} example={`"method": "GET"`} />
          <Field name="params"      type="object" desc="Map of param names to descriptions. Include type, required/optional, default." example={`"params": {\n  "q": "keyword (string, required)",\n  "limit": "max results (integer, optional, default: 20)"\n}`} />
          <Field name="returns"     type="string" desc="Describe the response shape. Helps AI know what data to expect." example={`"returns": "products[] with id, name, price, stock"`} />
        </div>
      </section>

      {/* Optional fields */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-[#e5e5e5] mb-6">Optional fields</h2>
        <div className="space-y-4">
          <Field
            name="service.language"
            type="string[]"
            desc={<>BCP-47 language codes. Defaults to <code className="text-[#888] text-xs">[&quot;en&quot;]</code>.</>}
            example={`"language": ["en", "ko", "ja"]`}
          />
          <Field
            name="service.category"
            type="string[]"
            desc="Service categories. See list below."
            example={`"category": ["ecommerce", "productivity"]`}
          />
          <Field
            name="auth"
            type="object"
            desc={<>Auth info. <code className="text-[#888] text-xs">type</code>: <code className="text-[#888] text-xs">none | apikey | oauth2 | bearer</code>. <code className="text-[#888] text-xs">docs</code>: URL to auth docs.</>}
            example={`"auth": {\n  "type": "apikey",\n  "docs": "https://example.com/auth"\n}`}
          />
          <Field
            name="token_hints"
            type="object"
            desc="Tell agents how to reduce token usage. compact_mode, field_filtering, delta_support."
            example={`"token_hints": {\n  "compact_mode": true,\n  "field_filtering": true\n}`}
          />
          <Field
            name="rate_limits"
            type="object"
            desc="Rate limit info for agents to plan requests."
            example={`"rate_limits": {\n  "requests_per_minute": 60,\n  "agent_tier_available": true\n}`}
          />
          <Field
            name="meta"
            type="object"
            desc="Metadata: last_updated (YYYY-MM-DD), spec_url."
            example={`"meta": {\n  "last_updated": "2026-03-12",\n  "spec_url": "https://example.com/ai"\n}`}
          />
        </div>
      </section>

      {/* Categories */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-[#e5e5e5] mb-4">Category values</h2>
        <div className="flex flex-wrap gap-2">
          {["productivity","ecommerce","finance","news","weather","maps","search","data","communication","calendar","storage","media","health","education","travel","food","government","developer"].map((cat) => (
            <code key={cat} className="text-xs bg-[#111] border border-[#222] text-[#888] px-2 py-1 rounded">{cat}</code>
          ))}
        </div>
      </section>

      {/* Implementation */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-[#e5e5e5] mb-4">Quick implementation</h2>
        <div className="space-y-4">
          {[
            {
              label: "Express (Node.js)",
              code: `app.get('/ai', (req, res) => {
  res.json({
    aiendpoint: '1.0',
    service: { name: 'My Service', description: '...' },
    capabilities: [{ id: 'do_thing', description: '...', endpoint: '/api/thing', method: 'GET' }]
  })
})`,
            },
            {
              label: "FastAPI (Python)",
              code: `@app.get("/ai")
def ai_spec():
    return {
        "aiendpoint": "1.0",
        "service": {"name": "My Service", "description": "..."},
        "capabilities": [{"id": "do_thing", "description": "...", "endpoint": "/api/thing", "method": "GET"}]
    }`,
            },
          ].map(({ label, code }) => (
            <div key={label}>
              <p className="text-xs text-[#555] mb-2">{label}</p>
              <pre className="bg-[#0d0d0d] border border-[#222] rounded-lg p-4 text-xs font-mono text-[#888] overflow-x-auto whitespace-pre">{code}</pre>
            </div>
          ))}
        </div>
      </section>

      {/* Rules */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-[#e5e5e5] mb-4">Rules</h2>
        <ul className="space-y-2 text-sm text-[#888]">
          {[
            "GET /ai must return HTTP 200",
            "Content-Type must be application/json (or JSON body)",
            "Response must be valid JSON (no trailing commas, no comments)",
            "aiendpoint field must equal \"1.0\"",
            "capabilities must have at least one item",
            "capability id must be snake_case",
            "No authentication required to access /ai itself",
            "Keep response under 10KB for token efficiency",
          ].map((rule) => (
            <li key={rule} className="flex items-start gap-2">
              <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
              {rule}
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <div className="border-t border-[#222] pt-8 flex items-center gap-4">
        <Link
          href="/validate"
          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          Validate your /ai
        </Link>
        <Link
          href="/register"
          className="border border-[#222] hover:border-[#333] text-[#888] hover:text-[#e5e5e5] font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          Register your service
        </Link>
        <a
          href="https://github.com/aiendpoint/platform"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#555] hover:text-[#888] transition-colors ml-auto"
        >
          GitHub ↗
        </a>
      </div>
    </div>
  );
}

function Field({
  name,
  type,
  required,
  desc,
  example,
}: {
  name: string;
  type: string;
  required?: boolean;
  desc: React.ReactNode;
  example?: string;
}) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <code className="text-sm font-mono text-[#e5e5e5]">{name}</code>
        <span className="text-xs text-[#555]">{type}</span>
        {required && (
          <span className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 px-1.5 py-0.5 rounded">
            required
          </span>
        )}
      </div>
      <p className="text-sm text-[#888] mb-3">{desc}</p>
      {example && (
        <pre className="text-xs font-mono text-[#555] bg-[#0d0d0d] border border-[#1a1a1a] rounded p-3 overflow-x-auto whitespace-pre">{example}</pre>
      )}
    </div>
  );
}
