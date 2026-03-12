"use client";

import { useState } from "react";
import Link from "next/link";
import { validateUrl, registerService, type ValidationResult } from "@/lib/api";
import { ValidateBadge } from "@/components/ValidateBadge";

type Step = "input" | "validating" | "validated" | "registering" | "done" | "error";

export default function RegisterPage() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [registeredId, setRegisteredId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!url.trim()) return;
    setStep("validating");
    setError(null);
    try {
      const r = await validateUrl(url.trim());
      setResult(r);
      setStep("validated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
      setStep("error");
    }
  };

  const handleRegister = async () => {
    if (!url.trim() || !result?.passed) return;
    setStep("registering");
    setError(null);
    try {
      const data = await registerService(url.trim(), email || undefined);
      setRegisteredId(data.id);
      setStep("done");
    } catch (e: unknown) {
      const err = e as { message: string; data?: { error: string } };
      setError(err.data?.error ?? err.message ?? "Registration failed");
      setStep("error");
    }
  };

  const reset = () => {
    setStep("input");
    setResult(null);
    setError(null);
  };

  if (step === "done") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="bg-[#111] border border-[#22c55e]/30 rounded-lg p-8 text-center">
          <p className="text-4xl mb-4">✓</p>
          <h2 className="text-xl font-bold text-[#22c55e] mb-2">Registered!</h2>
          <p className="text-[#888] text-sm mb-6">Your service is now in the registry.</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/services/${registeredId}`}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              View service page →
            </Link>
            <Link href="/services" className="text-sm text-[#888] hover:text-[#e5e5e5] transition-colors">
              Browse all services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#e5e5e5] mb-2">Register your service</h1>
      <p className="text-[#888] mb-8">
        Enter your service URL. We&apos;ll fetch{" "}
        <code className="text-[#888] bg-[#111] border border-[#222] px-1.5 py-0.5 rounded text-xs">/ai</code>
        {" "}and validate it automatically.
      </p>

      <div className="space-y-5">
        {/* URL input */}
        <div>
          <label className="block text-sm text-[#888] mb-1.5">Service URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); reset(); }}
              onKeyDown={(e) => e.key === "Enter" && handleValidate()}
              placeholder="https://yourservice.com"
              className="flex-1 bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#e5e5e5] placeholder-[#444] focus:outline-none focus:border-[#444] font-mono text-sm transition-colors"
            />
            <button
              onClick={handleValidate}
              disabled={!url.trim() || step === "validating"}
              className="bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-40 border border-[#222] text-[#e5e5e5] text-sm font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              {step === "validating" ? "Checking…" : "Validate"}
            </button>
          </div>
          <p className="text-xs text-[#555] mt-1.5">
            We&apos;ll check <code className="text-[#555]">{(() => { try { return new URL(url.startsWith("http") ? url : `https://${url}`).origin + "/ai"; } catch { return "https://yoursite.com/ai"; } })()}</code>
          </p>
        </div>

        {/* Validation result */}
        {result && (step === "validated" || step === "registering") && (
          <>
            <ValidateBadge result={result} />

            {result.passed ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1.5">Email <span className="text-[#555]">(optional)</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#e5e5e5] placeholder-[#444] focus:outline-none focus:border-[#444] text-sm transition-colors"
                  />
                  <p className="text-xs text-[#555] mt-1">For ownership verification and update notifications</p>
                </div>
                <button
                  onClick={handleRegister}
                  disabled={step === "registering"}
                  className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {step === "registering" ? "Registering…" : "Register service"}
                </button>
              </div>
            ) : (
              <div className="bg-[#111] border border-[#f59e0b]/20 rounded-lg p-4">
                <p className="text-sm text-[#f59e0b] mb-1">Validation did not pass</p>
                <p className="text-xs text-[#888]">Fix the errors above, then validate again.</p>
              </div>
            )}
          </>
        )}

        {/* Error state */}
        {step === "error" && error && (
          <div className="bg-[#111] border border-[#ef4444]/30 rounded-lg p-4">
            <p className="text-sm text-[#ef4444] mb-2">{error}</p>
            <button
              onClick={reset}
              className="text-xs text-[#888] hover:text-[#e5e5e5] transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Help */}
      <div className="mt-12 border-t border-[#222] pt-8">
        <p className="text-sm text-[#555] mb-3">Don&apos;t have a <code className="text-[#555]">/ai</code> endpoint yet?</p>
        <Link href="/docs" className="text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
          Read the implementation guide →
        </Link>
      </div>
    </div>
  );
}
