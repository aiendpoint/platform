import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { ServiceDetailContent } from "@/components/ServiceDetailContent";
import type { ServiceDetail, CommunityServiceDetail } from "@/lib/api";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // Try owner service
  const { data: service } = await db
    .from("services")
    .select("name, description, url")
    .eq("id", id)
    .single();

  if (service) {
    return {
      title: `${service.name} — AIEndpoint`,
      description: service.description,
      alternates: { canonical: `/services/${id}` },
    };
  }

  // Try community spec
  const { data: community } = await db
    .from("community_specs")
    .select("domain, ai_spec")
    .eq("id", id)
    .single();

  if (community) {
    const spec = community.ai_spec as Record<string, unknown>;
    const svc = spec?.["service"] as Record<string, unknown> | undefined;
    return {
      title: `${(svc?.["name"] as string) ?? community.domain} — AIEndpoint`,
      description: (svc?.["description"] as string) ?? "",
      alternates: { canonical: `/services/${id}` },
    };
  }

  return { title: "Service — AIEndpoint" };
}

async function loadService(id: string): Promise<(ServiceDetail & { source: string }) | CommunityServiceDetail | null> {
  // Try owner service
  const { data: service } = await db
    .from("services")
    .select("*, capabilities(*)")
    .eq("id", id)
    .eq("status", "active")
    .is("deleted_at", null)
    .single();

  if (service) {
    return {
      ...service,
      source: "owner",
    } as ServiceDetail & { source: string };
  }

  // Try community spec
  const { data: community } = await db
    .from("community_specs")
    .select("*")
    .eq("id", id)
    .single();

  if (!community) return null;

  const spec = community.ai_spec as Record<string, unknown>;
  const svc = spec?.["service"] as Record<string, unknown> | undefined;
  const caps = (spec?.["capabilities"] ?? []) as Array<Record<string, unknown>>;
  const auth = spec?.["auth"] as Record<string, unknown> | undefined;

  return {
    id: community.id,
    name: (svc?.["name"] as string) ?? community.domain,
    description: (svc?.["description"] as string) ?? "",
    url: community.url,
    domain: community.domain,
    categories: (svc?.["category"] as string[]) ?? [],
    language: (svc?.["language"] as string[]) ?? ["en"],
    auth_type: (auth?.["type"] as string) ?? "none",
    auth_docs_url: (auth?.["docs"] as string) ?? null,
    confidence: community.confidence,
    contributors: community.contributors,
    discover_count: community.discover_count ?? 0,
    source: "community" as const,
    status: community.status,
    claimed: community.claimed,
    created_at: community.created_at,
    updated_at: community.updated_at,
    ttl: community.ttl,
    capabilities: caps.map((c) => ({
      capability_id: (c["id"] as string) ?? "",
      description: (c["description"] as string) ?? "",
      endpoint: (c["endpoint"] as string) ?? "",
      method: (c["method"] as string) ?? "GET",
      params: (c["params"] as Record<string, string>) ?? {},
      returns: (c["returns"] as string) ?? null,
    })),
    token_hints: (spec?.["token_hints"] as Record<string, boolean>) ?? null,
    rate_limits: (spec?.["rate_limits"] as Record<string, unknown>) ?? null,
    meta: (spec?.["meta"] as Record<string, string>) ?? null,
    raw_spec: community.ai_spec as Record<string, unknown>,
  } satisfies CommunityServiceDetail;
}

export default async function ServiceDetailPage({ params }: Props) {
  const { id } = await params;
  const service = await loadService(id);

  if (!service) {
    notFound();
  }

  return <ServiceDetailContent service={service} />;
}
