"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { validateUrl, type ValidationResult } from "@/lib/api";
import { ValidateBadge } from "@/components/ValidateBadge";

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ValidatePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Countdown timer — ticks every second while cache_expires_at is set
  useEffect(() => {
    if (!result?.cache_expires_at) {
      setCountdown(null);
      return;
    }
    const computeSecs = () =>
      Math.max(0, Math.floor((new Date(result.cache_expires_at).getTime() - Date.now()) / 1000));

    setCountdown(computeSecs());
    const timer = setInterval(() => {
      const secs = computeSecs();
      setCountdown(secs);
      if (secs === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [result?.cache_expires_at]);

  const handleValidate = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCountdown(null);
    try {
      const r = await validateUrl(url.trim());
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#e5e5e5] mb-2">Validator</h1>
      <p className="text-[#888] mb-8">
        Check if a service implements the{" "}
        <code className="text-[#888] bg-[#111] border border-[#222] px-1.5 py-0.5 rounded text-xs">/ai</code>
        {" "}spec correctly. Scores from 0–100.
      </p>

      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleValidate()}
          placeholder="https://yourservice.com"
          className="flex-1 bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#e5e5e5] placeholder-[#444] focus:outline-none focus:border-[#444] font-mono text-sm transition-colors"
        />
        <button
          onClick={handleValidate}
          disabled={!url.trim() || loading}
          className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? "Checking…" : "Validate"}
        </button>
      </div>

      {/* Cache expiry notice — shown below input after any successful validation */}
      {result && countdown !== null && countdown > 0 && (
        <p className="mt-2 text-xs text-[#555]">
          {result.cached ? "Cached result" : "Result cached"} · refreshes in{" "}
          <span className="font-mono text-[#666]">{formatCountdown(countdown)}</span>
        </p>
      )}

      <div className="mt-6">
        {error && (
          <div className="bg-[#111] border border-[#ef4444]/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-[#ef4444]">{error}</p>
          </div>
        )}

        {loading && (
          <div className="bg-[#111] border border-[#222] rounded-lg p-8 text-center">
            <p className="text-[#555] text-sm">Fetching and analyzing <code className="text-[#555]">/ai</code>…</p>
          </div>
        )}

        {result && !loading && (
          <>
            <ValidateBadge result={result} />

            {result.passed && (
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/register?url=${encodeURIComponent(url)}`}
                  className="flex-1 text-center bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  Register this service →
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* Scoring guide */}
      <div className="mt-12 border-t border-[#222] pt-8">
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Scoring guide</h2>
        <div className="space-y-2 text-sm">
          {[
            { range: "90–100", grade: "Excellent", badge: "AI-Ready Gold", color: "text-[#22c55e]" },
            { range: "70–89",  grade: "Good",      badge: "AI-Ready",      color: "text-[#3b82f6]" },
            { range: "50–69",  grade: "Basic",     badge: "AI-Compatible", color: "text-[#f59e0b]" },
            { range: "0–49",   grade: "Poor",      badge: "No badge",      color: "text-[#ef4444]" },
          ].map(({ range, grade, badge, color }) => (
            <div key={range} className="flex items-center gap-3">
              <span className={`font-mono text-xs w-16 ${color}`}>{range}</span>
              <span className={`font-medium ${color}`}>{grade}</span>
              <span className="text-[#555]">·</span>
              <span className="text-[#555]">{badge}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-2">
          <p className="text-xs text-[#555] font-semibold uppercase tracking-wider">Score breakdown</p>
          {[
            { pts: "20", label: "Connectivity", desc: "/ai returns 200 OK within 3s" },
            { pts: "40", label: "Required fields", desc: "aiendpoint, name, description, capabilities" },
            { pts: "20", label: "Capability quality", desc: "id, description, endpoint, method, returns" },
            { pts: "20", label: "Recommended", desc: "category, auth, token_hints, meta.last_updated" },
          ].map(({ pts, label, desc }) => (
            <div key={label} className="flex items-baseline gap-3 text-sm">
              <span className="text-[#3b82f6] font-mono text-xs w-6 shrink-0">{pts}pt</span>
              <span className="text-[#888]">{label}</span>
              <span className="text-[#555] text-xs">— {desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
