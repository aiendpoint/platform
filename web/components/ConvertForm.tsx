"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  convertOpenApi,
  convertWebpage,
  getWebpageConverterStatus,
  type ConvertResult,
  type WebpageConvertResult,
} from "@/lib/api";

type InputMode = "webpage" | "url" | "json";
type AnyResult = ConvertResult | WebpageConvertResult;

function isWebpageResult(r: AnyResult): r is WebpageConvertResult {
  return "ai_enhanced" in r;
}

function CapabilityTable({ caps }: { caps: ConvertResult["converted"]["capabilities"] }) {
  return (
    <div className="bg-canvas border border-line rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-line">
        <span className="text-xs font-semibold text-subtle uppercase tracking-wider">Capabilities</span>
      </div>
      <div className="divide-y divide-surface">
        {caps.length === 0 ? (
          <p className="px-4 py-4 text-xs text-subtle">
            No capabilities inferred — edit the JSON above to add them manually.
          </p>
        ) : caps.map((cap) => (
          <div key={cap.id} className="px-4 py-3 flex items-start gap-4">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 mt-0.5 ${
              cap.method === "GET"    ? "bg-success/10 text-success" :
              cap.method === "POST"   ? "bg-accent/10 text-accent" :
              cap.method === "DELETE" ? "bg-error/10 text-error" :
                                       "bg-warning/10 text-warning"
            }`}>
              {cap.method}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-muted">{cap.id}</span>
                <span className="text-line-dim">·</span>
                <span className="text-xs font-mono text-subtle truncate">{cap.endpoint}</span>
              </div>
              <p className="text-xs text-ghost mt-0.5">{cap.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConvertForm() {
  const [mode, setMode]         = useState<InputMode>("webpage");
  const [webUrl, setWebUrl]     = useState("");
  const [specUrl, setSpecUrl]   = useState("");
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<AnyResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    getWebpageConverterStatus().then((s) => setAiAvailable(s.ai_available));
  }, []);

  const handleConvert = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (mode === "webpage") {
        if (!webUrl.trim()) return;
        setResult(await convertWebpage(webUrl.trim()));
      } else if (mode === "url") {
        if (!specUrl.trim()) return;
        setResult(await convertOpenApi({ spec_url: specUrl.trim() }));
      } else {
        let parsed: unknown;
        try { parsed = JSON.parse(jsonText); }
        catch { setError("Invalid JSON — check your spec and try again."); return; }
        setResult(await convertOpenApi({ spec: parsed }));
      }
    } catch (e: unknown) {
      const err = e as { message?: string; data?: { error?: string } };
      setError(err.data?.error ?? err.message ?? "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(JSON.stringify(result.converted, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const registerUrl = result?.source_url
    ? `/register?url=${encodeURIComponent(result.source_url)}`
    : "/register";

  const canConvert =
    mode === "webpage" ? !!webUrl.trim() :
    mode === "url"     ? !!specUrl.trim() :
    !!jsonText.trim();

  const TABS: { id: InputMode; label: string }[] = [
    { id: "webpage", label: "Webpage URL" },
    { id: "url",     label: "OpenAPI URL" },
    { id: "json",    label: "Paste JSON"  },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-fg mb-2">Converter</h1>
      <p className="text-muted mb-8">
        Turn any webpage or OpenAPI spec into a{" "}
        <code className="text-muted bg-canvas border border-line px-1.5 py-0.5 rounded text-xs">/ai</code>{" "}
        endpoint spec ready to register.
      </p>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 bg-canvas border border-line rounded-lg p-1 w-fit">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setMode(id); setError(null); setResult(null); }}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === id ? "bg-surface text-fg" : "text-subtle hover:text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Webpage tab ───────────────────────────────────────────────────── */}
      {mode === "webpage" && (
        <div className="space-y-3 mb-6">
          {aiAvailable !== null && (
            <p className={`flex items-center gap-2 text-xs px-3 py-2 rounded border ${
              aiAvailable
                ? "border-purple/25 bg-purple/5 text-purple"
                : "border-line-dim text-subtle"
            }`}>
              <span>{aiAvailable ? "✦" : "○"}</span>
              {aiAvailable
                ? "Gemini AI enabled — capabilities will be inferred from page content"
                : "Basic mode — meta tags only (GEMINI_API_KEY not set)"}
            </p>
          )}
          <div className="flex gap-2">
            <input
              type="url"
              value={webUrl}
              onChange={(e) => setWebUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canConvert && handleConvert()}
              placeholder="https://example.com"
              className="flex-1 bg-canvas border border-line rounded-lg px-4 py-2.5 text-fg placeholder-faint focus:outline-none focus:border-faint font-mono text-sm transition-colors"
            />
            <button
              onClick={handleConvert}
              disabled={!canConvert || loading}
              className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              {loading ? "Analyzing…" : "Convert →"}
            </button>
          </div>
        </div>
      )}

      {/* ── OpenAPI URL tab ────────────────────────────────────────────────── */}
      {mode === "url" && (
        <div className="flex gap-2 mb-6">
          <input
            type="url"
            value={specUrl}
            onChange={(e) => setSpecUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canConvert && handleConvert()}
            placeholder="https://petstore3.swagger.io/api/v3/openapi.json"
            className="flex-1 bg-canvas border border-line rounded-lg px-4 py-2.5 text-fg placeholder-faint focus:outline-none focus:border-faint font-mono text-sm transition-colors"
          />
          <button
            onClick={handleConvert}
            disabled={!canConvert || loading}
            className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            {loading ? "Converting…" : "Convert →"}
          </button>
        </div>
      )}

      {/* ── Paste JSON tab ─────────────────────────────────────────────────── */}
      {mode === "json" && (
        <div className="mb-6 space-y-2">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={'{\n  "openapi": "3.0.0",\n  "info": { "title": "My API", ... },\n  "paths": { ... }\n}'}
            rows={10}
            className="w-full bg-canvas border border-line rounded-lg px-4 py-3 text-fg placeholder-line-dim focus:outline-none focus:border-faint font-mono text-xs transition-colors resize-y"
          />
          <button
            onClick={handleConvert}
            disabled={!canConvert || loading}
            className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {loading ? "Converting…" : "Convert →"}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-canvas border border-error/30 rounded-lg p-4 mb-6">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-canvas border border-line rounded-lg p-8 text-center">
          <p className="text-subtle text-sm">
            {mode === "webpage" && aiAvailable
              ? "Fetching page · analyzing with Gemini AI…"
              : mode === "webpage"
              ? "Fetching and extracting metadata…"
              : "Parsing OpenAPI spec…"}
          </p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between bg-canvas border border-line rounded-lg px-4 py-3 flex-wrap gap-3">
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <span className="text-success font-medium">✓ Converted</span>
              <span className="text-subtle">·</span>
              <span className="text-muted">
                <span className="text-fg font-mono">{result.capability_count}</span> capabilities
              </span>
              {isWebpageResult(result) && (
                <>
                  <span className="text-subtle">·</span>
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    result.ai_enhanced
                      ? "border-purple/30 text-purple bg-purple/5"
                      : "border-faint text-subtle"
                  }`}>
                    {result.ai_enhanced ? "✦ Gemini AI" : "meta only"}
                  </span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="text-xs text-muted hover:text-fg border border-line-dim px-3 py-1.5 rounded transition-colors"
              >
                {copied ? "Copied!" : "Copy JSON"}
              </button>
              <Link
                href={registerUrl}
                className="text-xs bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded transition-colors"
              >
                Register service →
              </Link>
            </div>
          </div>

          {/* JSON preview */}
          <pre className="bg-code border border-line rounded-lg p-4 text-xs text-[#a3a3a3] font-mono overflow-auto max-h-[520px] leading-relaxed">
            {JSON.stringify(result.converted, null, 2)}
          </pre>

          {/* Capability table */}
          <CapabilityTable caps={result.converted.capabilities} />
        </div>
      )}

      {/* Examples */}
      {!result && !loading && !error && (
        <div className="mt-8 border-t border-line pt-8">
          <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">Try an example</p>
          <div className="flex flex-wrap gap-2">
            {mode === "webpage" && (
              [
                { label: "GitHub",  url: "https://github.com" },
                { label: "Stripe",  url: "https://stripe.com" },
                { label: "Notion",  url: "https://notion.so"  },
              ].map(({ label, url }) => (
                <button key={url} onClick={() => setWebUrl(url)}
                  className="text-xs text-subtle hover:text-muted border border-line hover:border-line-dim px-3 py-1.5 rounded transition-colors font-mono">
                  {label}
                </button>
              ))
            )}
            {mode === "url" && (
              [
                { label: "Petstore OAS 3",     url: "https://petstore3.swagger.io/api/v3/openapi.json" },
                { label: "Petstore Swagger 2",  url: "https://petstore.swagger.io/v2/swagger.json" },
              ].map(({ label, url }) => (
                <button key={url} onClick={() => setSpecUrl(url)}
                  className="text-xs text-subtle hover:text-muted border border-line hover:border-line-dim px-3 py-1.5 rounded transition-colors font-mono">
                  {label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
