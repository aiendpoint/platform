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
        <div className="bg-canvas border border-success/30 rounded-lg p-8 text-center">
          <p className="text-4xl mb-4">✓</p>
          <h2 className="text-xl font-bold text-success mb-2">Registered!</h2>
          <p className="text-muted text-sm mb-6">Your service is now in the registry.</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/services/${registeredId}`}
              className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              View service page →
            </Link>
            <Link href="/services" className="text-sm text-muted hover:text-fg transition-colors">
              Browse all services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-fg mb-2">Register your service</h1>
      <p className="text-muted mb-8">
        Enter your service URL. We&apos;ll fetch{" "}
        <code className="text-muted bg-canvas border border-line px-1.5 py-0.5 rounded text-xs">/ai</code>
        {" "}and validate it automatically.
      </p>

      <div className="space-y-5">
        {/* URL input */}
        <div>
          <label className="block text-sm text-muted mb-1.5">Service URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); reset(); }}
              onKeyDown={(e) => e.key === "Enter" && handleValidate()}
              placeholder="https://yourservice.com"
              className="flex-1 bg-canvas border border-line rounded-lg px-4 py-2.5 text-fg placeholder-faint focus:outline-none focus:border-faint font-mono text-sm transition-colors"
            />
            <button
              onClick={handleValidate}
              disabled={!url.trim() || step === "validating"}
              className="bg-surface hover:bg-line disabled:opacity-40 border border-line text-fg text-sm font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              {step === "validating" ? "Checking…" : "Validate"}
            </button>
          </div>
          <p className="text-xs text-subtle mt-1.5">
            We&apos;ll check <code className="text-subtle">{(() => { try { return new URL(url.startsWith("http") ? url : `https://${url}`).origin + "/ai"; } catch { return "https://yoursite.com/ai"; } })()}</code>
          </p>
        </div>

        {/* Validation result */}
        {result && (step === "validated" || step === "registering") && (
          <>
            <ValidateBadge result={result} />

            {result.passed ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted mb-1.5">Email <span className="text-subtle">(optional)</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-canvas border border-line rounded-lg px-4 py-2.5 text-fg placeholder-faint focus:outline-none focus:border-faint text-sm transition-colors"
                  />
                  <p className="text-xs text-subtle mt-1">For ownership verification and update notifications</p>
                </div>
                <button
                  onClick={handleRegister}
                  disabled={step === "registering"}
                  className="w-full bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {step === "registering" ? "Registering…" : "Register service"}
                </button>
              </div>
            ) : (
              <div className="bg-canvas border border-warning/20 rounded-lg p-4">
                <p className="text-sm text-warning mb-1">Validation did not pass</p>
                <p className="text-xs text-muted">Fix the errors above, then validate again.</p>
              </div>
            )}
          </>
        )}

        {/* Error state */}
        {step === "error" && error && (
          <div className="bg-canvas border border-error/30 rounded-lg p-4">
            <p className="text-sm text-error mb-2">{error}</p>
            <button
              onClick={reset}
              className="text-xs text-muted hover:text-fg transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Help */}
      <div className="mt-12 border-t border-line pt-8">
        <p className="text-sm text-subtle mb-3">Don&apos;t have a <code className="text-subtle">/ai</code> endpoint yet?</p>
        <Link href="/docs" className="text-sm text-accent hover:text-accent-soft transition-colors">
          Read the implementation guide →
        </Link>
      </div>
    </div>
  );
}
