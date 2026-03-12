import Link from "next/link";
import type { ServiceListItem } from "@/lib/api";

const AUTH_LABELS: Record<string, { label: string; color: string }> = {
  none:    { label: "No Auth",  color: "text-[#22c55e]" },
  apikey:  { label: "API Key",  color: "text-[#f59e0b]" },
  bearer:  { label: "Bearer",   color: "text-[#f59e0b]" },
  oauth2:  { label: "OAuth2",   color: "text-[#888]" },
};

export function ServiceCard({ service }: { service: ServiceListItem }) {
  const auth = AUTH_LABELS[service.auth_type] ?? { label: service.auth_type, color: "text-[#888]" };

  return (
    <Link
      href={`/services/${service.id}`}
      className="block bg-[#111] border border-[#222] rounded-lg p-5 hover:border-[#333] hover:bg-[#161616] transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-[#e5e5e5] group-hover:text-white transition-colors truncate">
          {service.name}
        </h3>
        {service.is_verified && (
          <span className="shrink-0 text-xs bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 px-2 py-0.5 rounded-full">
            ✓ verified
          </span>
        )}
      </div>

      <p className="text-sm text-[#888] line-clamp-2 mb-3">{service.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {service.categories.slice(0, 3).map((cat) => (
          <span key={cat} className="text-xs bg-[#1a1a1a] text-[#888] border border-[#2a2a2a] px-2 py-0.5 rounded">
            {cat}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-[#666]">
        <span className={auth.color}>{auth.label}</span>
        <span className="font-mono truncate max-w-[140px]">{new URL(service.url).hostname}</span>
      </div>
    </Link>
  );
}
