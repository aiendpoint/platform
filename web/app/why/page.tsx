import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why /ai — AIEndpoint",
  description:
    "The web was built for human browsers. AI agents are a fundamentally different client. Here's why that changes everything.",
};

export default function WhyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-20">

      {/* Eyebrow */}
      <p className="text-xs font-semibold text-[#3b82f6] uppercase tracking-widest mb-4">Why we built this</p>

      {/* Opening */}
      <h1 className="text-4xl font-bold text-[#e5e5e5] leading-tight mb-6">
        The web wasn't built<br />for AI agents.
      </h1>
      <p className="text-lg text-[#888] leading-relaxed mb-16">
        And that gap — between how the web delivers information and how AI agents consume it —
        is costing everyone, every day.
      </p>

      <hr className="border-[#222] mb-16" />

      {/* Section 1 */}
      <section className="mb-16">
        <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-6">01 — A new kind of reader</h2>
        <p className="text-[#888] leading-relaxed mb-4">
          When a human opens a browser, they see a rendered page — layout, colors, fonts, images.
          The browser does an enormous amount of work to make raw HTML and CSS look like a product.
          That work is invisible to users, and that's the point.
        </p>
        <p className="text-[#888] leading-relaxed mb-4">
          AI agents don't see any of that. They receive raw text — tokens — and reason over it.
          They don't need a sidebar. They don't need a navigation menu. They don't need JavaScript
          that animates a hero section.
        </p>
        <p className="text-[#bbb] leading-relaxed font-medium">
          AI agents are a fundamentally different class of client, and the web was not designed with them in mind.
        </p>
      </section>

      {/* Section 2 */}
      <section className="mb-16">
        <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-6">02 — What really happens</h2>
        <p className="text-[#888] leading-relaxed mb-6">
          When an AI agent needs to use a web service — look up the weather, search a product catalog,
          check an exchange rate — here's what actually happens if there's no structured interface:
        </p>

        <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-6 mb-6 space-y-4">
          {[
            { n: "1", text: "The agent fetches the page. It receives HTML — the full document, including every script tag, every style block, every nav element, every ad placeholder." },
            { n: "2", text: "All of that becomes tokens. A typical modern webpage is 500KB–2MB. At roughly 4 characters per token, that's 125,000–500,000 tokens loaded into context." },
            { n: "3", text: "The agent has to parse and reason over this mess. Where's the actual data? Is that a price or a nav label? Is that an API endpoint or a marketing URL?" },
            { n: "4", text: "Maybe it finds what it needed. Maybe it hallucinated something from the noise. Maybe it hit a context limit and gave up." },
          ].map(({ n, text }) => (
            <div key={n} className="flex gap-4">
              <span className="text-xs font-mono text-[#333] shrink-0 mt-1">{n}</span>
              <p className="text-sm text-[#666] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <p className="text-[#888] leading-relaxed mb-4">
          This isn't a rare edge case. This is how most AI agents interact with most of the web, right now.
        </p>
        <p className="text-[#888] leading-relaxed">
          The cost isn't abstract. Token usage is directly billed by every major AI provider.
          Latency is real — fetching and processing a 2MB page takes seconds.
          Reliability is a problem — HTML structure changes constantly, and any hardcoded parsing breaks.
        </p>
      </section>

      {/* Section 3 — The three bad options */}
      <section className="mb-16">
        <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-6">03 — The three bad options</h2>
        <p className="text-[#888] leading-relaxed mb-6">
          Developers building AI agents have known about this problem. The workarounds they've reached for:
        </p>
        <div className="space-y-3 mb-6">
          {[
            {
              title: "Scrape HTML",
              desc: "Load the page, strip tags, hope the text is structured enough to reason over. Token-heavy, fragile, noisy.",
              bad: true,
            },
            {
              title: "Hardcode the API",
              desc: "Read the docs manually, write a custom integration, maintain it as the service changes. Doesn't scale. Breaks constantly.",
              bad: true,
            },
            {
              title: "Find an MCP server",
              desc: "Heavy infrastructure. Developer-only. Exists for fewer than 1% of services.",
              bad: true,
            },
          ].map(({ title, desc }) => (
            <div key={title} className="bg-[#0d0d0d] border border-[#222] rounded-lg p-4 flex gap-4">
              <span className="text-[#ef4444] text-sm mt-0.5 shrink-0">✕</span>
              <div>
                <p className="text-sm font-semibold text-[#555] mb-1">{title}</p>
                <p className="text-xs text-[#444] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[#bbb] leading-relaxed font-medium">
          None of these scale. None of them are the right foundation for an AI-native web.
        </p>
      </section>

      {/* Section 4 — We've solved this before */}
      <section className="mb-16">
        <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-6">04 — We've solved this before</h2>
        <p className="text-[#888] leading-relaxed mb-8">
          The web has a long history of creating thin, machine-readable layers alongside the human-facing web.
          None of them required changing the web itself — they just added a predictable convention.
        </p>

        <div className="space-y-0 border border-[#222] rounded-xl overflow-hidden">
          {[
            {
              year: "1994",
              name: "robots.txt",
              what: "A plain text file at /robots.txt",
              why: "Crawlers needed to know which pages to skip. No central authority required it — it just made sense, so everyone adopted it.",
            },
            {
              year: "2005",
              name: "sitemap.xml",
              what: "A structured XML file listing all pages",
              why: "Crawlers needed to find pages efficiently. Google proposed it. Within two years, every major CMS generated one automatically.",
            },
            {
              year: "2026",
              name: "/ai",
              what: "A JSON endpoint at /ai",
              why: "AI agents need to understand what a service can do and how to call it. Without this, they're left scraping noise.",
              accent: true,
            },
          ].map(({ year, name, what, why, accent }, i, arr) => (
            <div key={name} className={`p-5 ${i < arr.length - 1 ? "border-b border-[#222]" : ""} ${accent ? "bg-[#3b82f6]/5" : "bg-[#0d0d0d]"}`}>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-xs font-mono text-[#444]">{year}</span>
                <code className={`text-sm font-bold ${accent ? "text-[#3b82f6]" : "text-[#888]"}`}>{name}</code>
              </div>
              <p className="text-xs text-[#555] mb-1">{what}</p>
              <p className="text-xs text-[#444] leading-relaxed">{why}</p>
            </div>
          ))}
        </div>

        <p className="text-[#888] leading-relaxed mt-6">
          robots.txt didn't require a standards committee. sitemap.xml didn't require legislation.
          They spread because they were useful, simple, and easy to implement.
          That's exactly what <code className="text-[#3b82f6] text-sm">/ai</code> is designed to be.
        </p>
      </section>

      {/* Section 5 — What /ai is */}
      <section className="mb-16">
        <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-6">05 — What /ai actually is</h2>
        <p className="text-[#888] leading-relaxed mb-6">
          Simple: any service exposes <code className="text-[#3b82f6] text-sm">GET /ai</code> returning
          a structured JSON object that answers three questions:
        </p>
        <div className="space-y-3 mb-6">
          {[
            { q: "What is this service?", a: "Name, description, categories — token-optimized for AI." },
            { q: "What can it do?", a: "A list of capabilities: each with an endpoint, method, parameters, and return description." },
            { q: "How do I authenticate?", a: "Auth type and documentation link. Nothing more." },
          ].map(({ q, a }) => (
            <div key={q} className="bg-[#0d0d0d] border border-[#222] rounded-lg p-4">
              <p className="text-sm text-[#888] font-medium mb-1">{q}</p>
              <p className="text-xs text-[#555] leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
        <p className="text-[#888] leading-relaxed">
          That's it. No new infrastructure. No OAuth flows. No SDKs to install.
          Just a JSON endpoint at a predictable URL — implementable in under 10 minutes,
          in any language, on any framework.
        </p>
      </section>

      {/* Section 6 — Who benefits */}
      <section className="mb-16">
        <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-6">06 — Who this is for</h2>

        <div className="space-y-4">
          {[
            {
              who: "If you run an AI agent or build with LLM APIs",
              benefits: [
                "Dramatically lower token costs per task",
                "No more brittle HTML parsing",
                "Reliable, structured results — less hallucination risk",
                "Discover new services without reading documentation",
              ],
            },
            {
              who: "If you run a web service or API",
              benefits: [
                "AI agents can discover and use your service correctly",
                "No more agents scraping your site and calling wrong endpoints",
                "A single endpoint that describes everything you offer",
                "Get listed in the AIEndpoint registry — agent-driven traffic",
              ],
            },
            {
              who: "If you care about the web's direction",
              benefits: [
                "An open, vendor-neutral standard — Apache 2.0",
                "No lock-in to any AI provider",
                "The same convention model that made robots.txt universal",
                "A foundation for the AI-native web, built in public",
              ],
            },
          ].map(({ who, benefits }) => (
            <div key={who} className="bg-[#0d0d0d] border border-[#222] rounded-xl p-5">
              <p className="text-sm font-semibold text-[#bbb] mb-3">{who}</p>
              <ul className="space-y-1.5">
                {benefits.map((b) => (
                  <li key={b} className="flex gap-2 text-xs text-[#555]">
                    <span className="text-[#3b82f6] shrink-0">·</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7 — The vision */}
      <section className="mb-16">
        <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-6">07 — Where this goes</h2>
        <p className="text-[#888] leading-relaxed mb-4">
          Imagine a web where every service — every SaaS tool, every data API, every commerce platform —
          exposes <code className="text-[#3b82f6] text-sm">/ai</code>.
        </p>
        <p className="text-[#888] leading-relaxed mb-4">
          An AI agent building a travel itinerary can query the flight registry, the hotel API,
          and the weather service — each returning exactly what it needs, in under a second,
          for a few hundred tokens total.
        </p>
        <p className="text-[#888] leading-relaxed mb-4">
          An AI agent helping with research can discover and call ten specialized data services
          it's never encountered before — reading their capabilities, understanding their auth,
          and composing results — all without a single human in the loop.
        </p>
        <p className="text-[#bbb] leading-relaxed font-medium">
          That's not science fiction. It's a convention away.
          The same way the web became navigable with a 5-line text file in 1994.
        </p>
      </section>

      <hr className="border-[#222] mb-12" />

      {/* CTA */}
      <div className="text-center">
        <p className="text-xs font-semibold text-[#3b82f6] uppercase tracking-widest mb-4">Join the movement</p>
        <h2 className="text-2xl font-bold text-[#e5e5e5] mb-4">
          A convention away.
        </h2>
        <p className="text-[#666] leading-relaxed mb-2">
          robots.txt spread because it was useful, simple, and asked nothing of anyone but a single file.
        </p>
        <p className="text-[#888] leading-relaxed mb-8">
          <code className="text-[#3b82f6]">/ai</code> is the same idea.
          Open spec. 10 minutes to implement. No vendor lock-in.
          Every service that adds it makes the AI ecosystem a little less wasteful — for everyone.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/register"
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Add /ai to your service
          </Link>
          <a
            href="https://github.com/aiendpoint/platform"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#111] hover:bg-[#1a1a1a] text-[#e5e5e5] border border-[#222] font-medium px-6 py-3 rounded-lg transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Star on GitHub
          </a>
          <Link
            href="/docs"
            className="bg-[#111] hover:bg-[#1a1a1a] text-[#e5e5e5] border border-[#222] font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Read the spec
          </Link>
        </div>
        <p className="mt-6 text-xs text-[#444]">
          Apache 2.0 · No vendor lock-in ·{" "}
          <a href="https://github.com/aiendpoint/platform" className="text-[#3b82f6] hover:underline" target="_blank" rel="noopener noreferrer">
            Open source on GitHub
          </a>
        </p>
      </div>

    </div>
  );
}
