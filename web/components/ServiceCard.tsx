import Link from "next/link";
import type { ServiceListItem } from "@/lib/api";

const AUTH_LABELS: Record<string, { label: string; color: string }> = {
  none:    { label: "No Auth",  color: "text-success" },
  apikey:  { label: "API Key",  color: "text-warning" },
  bearer:  { label: "Bearer",   color: "text-warning" },
  oauth2:  { label: "OAuth2",   color: "text-muted" },
};

export function ServiceCard({ service }: { service: ServiceListItem }) {
  const auth = AUTH_LABELS[service.auth_type] ?? { label: service.auth_type, color: "text-muted" };

  return (
    <Link
      href={`/services/${service.id}`}
      className="block bg-canvas border border-line rounded-lg p-5 hover:border-line-dim hover:bg-surface transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-fg group-hover:text-white transition-colors truncate">
          {service.name}
        </h3>
        {service.is_verified && (
          <span className="shrink-0 text-xs bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full">
            ✓ verified
          </span>
        )}
      </div>

      <p className="text-sm text-muted line-clamp-2 mb-3">{service.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {service.categories.slice(0, 3).map((cat) => (
          <span key={cat} className="text-xs bg-surface text-muted border border-[line-dim] px-2 py-0.5 rounded">
            {cat}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-ghost">
        <span className={auth.color}>{auth.label}</span>
        <span className="font-mono truncate max-w-[140px]">{new URL(service.url).hostname}</span>
      </div>
    </Link>
  );
}
