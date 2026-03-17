"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getService, type ServiceDetail } from "@/lib/api";
import { CapabilityCard } from "@/components/CapabilityCard";

type Tab = "capabilities" | "details" | "badge" | "raw";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const AUTH_COLORS: Record<string, string> = {
  none:   "text-success",
  apikey: "text-warning",
  bearer: "text-warning",
  oauth2: "text-muted",
};

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("capabilities");

  useEffect(() => {
    if (!id) return;
    getService(id)
      .then(setService)
      .catch((e) => setError(e instanceof Error ? e.message : "Service not found"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="h-8 w-64 bg-canvas rounded animate-pulse mb-4" />
        <div className="h-4 w-48 bg-canvas rounded animate-pulse" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="text-error mb-4">{error ?? "Service not found"}</p>
        <Link href="/services" className="text-sm text-accent hover:text-accent-soft transition-colors">
          ← Back to services
        </Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "capabilities", label: `Capabilities (${service.capabilities.length})` },
    { id: "details",      label: "Details" },
    { id: "badge",        label: "Badge" },
    { id: "raw",          label: "Raw spec" },
  ];

  const badgeUrl = `${API_URL}/api/badge/${id}.svg`;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <div className="text-sm text-subtle mb-6">
        <Link href="/services" className="hover:text-muted transition-colors">Services</Link>
        <span className="mx-2">›</span>
        <span className="text-muted">{service.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-bold text-fg">{service.name}</h1>
            {service.is_verified && (
              <span className="text-xs bg-success/10 text-success border border-success/20 px-2.5 py-1 rounded-full">
                ✓ AI-Ready
              </span>
            )}
            {service.is_official && (
              <span className="text-xs bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-full">
                ★ Official
              </span>
            )}
          </div>
          <p className="text-muted leading-relaxed">{service.description}</p>
        </div>
        <a
          href={service.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm border border-line text-muted hover:text-fg hover:border-line-dim px-4 py-2 rounded-lg transition-colors"
        >
          Visit site ↗
        </a>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mb-8 pb-8 border-b border-line">
        <span className="font-mono text-subtle text-xs">{service.url}</span>
        <span className={AUTH_COLORS[service.auth_type] ?? "text-muted"}>
          {service.auth_type === "none" ? "No auth required" : service.auth_type}
        </span>
        {service.categories.map((c) => (
          <span key={c} className="text-xs bg-canvas border border-line text-muted px-2 py-0.5 rounded">
            {c}
          </span>
        ))}
        <span className="text-subtle text-xs">spec v{service.spec_version}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm rounded-t transition-colors ${
              tab === t.id
                ? "text-fg border-b-2 border-accent -mb-px bg-code"
                : "text-subtle hover:text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "capabilities" && (
        <div className="space-y-4">
          {service.capabilities.length === 0 ? (
            <p className="text-subtle text-sm">No capabilities listed.</p>
          ) : (
            service.capabilities.map((cap) => (
              <CapabilityCard key={cap.capability_id} cap={cap} />
            ))
          )}
        </div>
      )}

      {tab === "details" && (
        <div className="space-y-6">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-surface">
              {[
                { label: "URL",           value: service.url },
                { label: "AI endpoint",   value: service.ai_url },
                { label: "Auth type",     value: service.auth_type },
                { label: "Auth docs",     value: service.auth_docs_url ?? "—" },
                { label: "Languages",     value: service.language?.join(", ") ?? "en" },
                { label: "Tags",          value: service.tags?.join(", ") || "—" },
                { label: "Status",        value: service.status },
                { label: "Spec version",  value: service.spec_version },
                { label: "Registered",    value: new Date(service.created_at).toLocaleDateString() },
                { label: "Updated",       value: new Date(service.updated_at).toLocaleDateString() },
              ].map(({ label, value }) => (
                <tr key={label}>
                  <td className="py-3 text-subtle w-36 pr-4">{label}</td>
                  <td className="py-3 text-muted font-mono text-xs break-all">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {service.token_hints && Object.keys(service.token_hints).length > 0 && (
            <div>
              <p className="text-xs text-subtle uppercase tracking-wider mb-3">Token hints</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(service.token_hints).map(([k, v]) => (
                  <span key={k} className={`text-xs px-2 py-1 rounded border ${v ? "border-success/20 text-success bg-success/5" : "border-line text-subtle"}`}>
                    {k}: {String(v)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "badge" && (
        <div className="space-y-6">
          <div className="bg-canvas border border-line rounded-lg p-6">
            <p className="text-xs text-subtle uppercase tracking-wider mb-4">Preview</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badgeUrl} alt="AI-Ready badge" className="mb-6" />

            <p className="text-xs text-subtle uppercase tracking-wider mb-3">Embed</p>
            <div className="space-y-3">
              {[
                { label: "Markdown", code: `[![AI-Ready](${badgeUrl})](https://aiendpoint.dev/services/${id})` },
                { label: "HTML",     code: `<a href="https://aiendpoint.dev/services/${id}"><img src="${badgeUrl}" alt="AI-Ready" /></a>` },
                { label: "Direct",   code: badgeUrl },
              ].map(({ label, code }) => (
                <div key={label}>
                  <p className="text-xs text-subtle mb-1">{label}</p>
                  <code className="block text-xs font-mono text-muted bg-code border border-line rounded p-3 break-all">
                    {code}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "raw" && (
        <div className="bg-code border border-line rounded-lg overflow-hidden">
          <div className="flex items-center px-4 py-3 border-b border-line">
            <span className="text-xs text-subtle font-mono">
              GET {service.ai_url}
            </span>
          </div>
          <pre className="p-6 text-xs font-mono text-muted overflow-x-auto leading-relaxed whitespace-pre">
            {JSON.stringify(service, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
