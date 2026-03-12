"use client";

import { useState } from "react";
import Link from "next/link";
import { convertOpenApi, type ConvertResult } from "@/lib/api";

type InputMode = "url" | "json";

export default function ConvertPage() {
  const [mode, setMode] = useState<InputMode>("url");
  const [specUrl, setSpecUrl] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleConvert = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (mode === "url") {
        if (!specUrl.trim()) return;
        const r = await convertOpenApi({ spec_url: specUrl.trim() });
        setResult(r);
      } else {
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonText);
        } catch {
          setError("Invalid JSON — check your spec and try again.");
          return;
        }
        const r = await convertOpenApi({ spec: parsed });
        setResult(r);
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

  const canConvert = mode === "url" ? !!specUrl.trim() : !!jsonText.trim();

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#e5e5e5] mb-2">OpenAPI → /ai Converter</h1>
      <p className="text-[#888] mb-8">
        Paste your OpenAPI 2.x / 3.x spec URL or JSON and get a ready-to-use{" "}
        <code className="text-[#888] bg-[#111] border border-[#222] px-1.5 py-0.5 rounded text-xs">/ai</code>{" "}
        endpoint spec.
      </p>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 bg-[#111] border border-[#222] rounded-lg p-1 w-fit">
        {(["url", "json"] as InputMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(null); setResult(null); }}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === m
                ? "bg-[#1a1a1a] text-[#e5e5e5]"
                : "text-[#555] hover:text-[#888]"
            }`}
          >
            {m === "url" ? "Spec URL" : "Paste JSON"}
          </button>
        ))}
      </div>

      {/* Input */}
      {mode === "url" ? (
        <div className="flex gap-2 mb-6">
          <input
            type="url"
            value={specUrl}
            onChange={(e) => setSpecUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canConvert && handleConvert()}
            placeholder="https://petstore.swagger.io/v2/swagger.json"
            className="flex-1 bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#e5e5e5] placeholder-[#444] focus:outline-none focus:border-[#444] font-mono text-sm transition-colors"
          />
          <button
            onClick={handleConvert}
            disabled={!canConvert || loading}
            className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            {loading ? "Converting…" : "Convert →"}
          </button>
        </div>
      ) : (
        <div className="mb-6 space-y-2">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={'{\n  "openapi": "3.0.0",\n  "info": { "title": "My API", ... },\n  "paths": { ... }\n}'}
            rows={10}
            className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-3 text-[#e5e5e5] placeholder-[#333] focus:outline-none focus:border-[#444] font-mono text-xs transition-colors resize-y"
          />
          <button
            onClick={handleConvert}
            disabled={!canConvert || loading}
            className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {loading ? "Converting…" : "Convert →"}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-[#111] border border-[#ef4444]/30 rounded-lg p-4 mb-6">
          <p className="text-sm text-[#ef4444]">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between bg-[#111] border border-[#222] rounded-lg px-4 py-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#22c55e] font-medium">✓ Converted</span>
              <span className="text-[#555]">·</span>
              <span className="text-[#888]">
                <span className="text-[#e5e5e5] font-mono">{result.capability_count}</span> capabilities
              </span>
              {result.source_url && (
                <>
                  <span className="text-[#555]">·</span>
                  <span className="text-[#555] font-mono text-xs truncate max-w-[200px]">
                    {result.source_url}
                  </span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="text-xs text-[#888] hover:text-[#e5e5e5] border border-[#333] px-3 py-1.5 rounded transition-colors"
              >
                {copied ? "Copied!" : "Copy JSON"}
              </button>
              <Link
                href={registerUrl}
                className="text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white px-3 py-1.5 rounded transition-colors"
              >
                Register service →
              </Link>
            </div>
          </div>

          {/* JSON preview */}
          <div className="relative">
            <pre className="bg-[#0d0d0d] border border-[#222] rounded-lg p-4 text-xs text-[#a3a3a3] font-mono overflow-auto max-h-[560px] leading-relaxed">
              {JSON.stringify(result.converted, null, 2)}
            </pre>
          </div>

          {/* Capability table */}
          <div className="bg-[#111] border border-[#222] rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#222]">
              <span className="text-xs font-semibold text-[#555] uppercase tracking-wider">Capabilities</span>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {result.converted.capabilities.map((cap) => (
                <div key={cap.id} className="px-4 py-3 flex items-start gap-4">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 mt-0.5 ${
                    cap.method === "GET"    ? "bg-[#22c55e]/10 text-[#22c55e]" :
                    cap.method === "POST"   ? "bg-[#3b82f6]/10 text-[#3b82f6]" :
                    cap.method === "DELETE" ? "bg-[#ef4444]/10 text-[#ef4444]" :
                                             "bg-[#f59e0b]/10 text-[#f59e0b]"
                  }`}>
                    {cap.method}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#888]">{cap.id}</span>
                      <span className="text-[#333]">·</span>
                      <span className="text-xs font-mono text-[#555] truncate">{cap.endpoint}</span>
                    </div>
                    <p className="text-xs text-[#666] mt-0.5">{cap.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Example specs */}
      {!result && !loading && !error && (
        <div className="mt-8 border-t border-[#222] pt-8">
          <p className="text-xs font-semibold text-[#555] uppercase tracking-wider mb-3">Try an example</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Petstore (OAS 3)",   url: "https://petstore3.swagger.io/api/v3/openapi.json" },
              { label: "Petstore (Swagger 2)", url: "https://petstore.swagger.io/v2/swagger.json" },
            ].map(({ label, url }) => (
              <button
                key={url}
                onClick={() => { setMode("url"); setSpecUrl(url); }}
                className="text-xs text-[#555] hover:text-[#888] border border-[#222] hover:border-[#333] px-3 py-1.5 rounded transition-colors font-mono"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
