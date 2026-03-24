import { unstable_cache } from "next/cache";
import { db } from "./supabase";
import type { ServiceListItem } from "./api";

const PAGE_SIZE = 12;

// Cache TTL in seconds. Set SERVICES_CACHE_TTL=0 to disable caching.
const CACHE_TTL = parseInt(process.env.SERVICES_CACHE_TTL ?? "300", 10); // default 5 min

export interface ServicesParams {
  q?: string;
  category?: string;
  auth_type?: string;
  sort?: string;
  page?: number;
}

export interface ServicesResult {
  services: ServiceListItem[];
  total: number;
  page: number;
  totalPages: number;
}

async function _getServicesSSR(params: ServicesParams): Promise<ServicesResult> {
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  // ── Count totals (with same filters as data queries) ────────────
  let ownerCountQ = db.from("services").select("id", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null);
  let communityCountQ = db.from("community_specs").select("id", { count: "exact", head: true }).eq("status", "active");

  if (params.q) {
    // description 검색은 노이즈가 많아 제외 (필요 시 복원: description.ilike.%${params.q}%)
    ownerCountQ = ownerCountQ.or(`name.ilike.${params.q}%,url.ilike.${params.q}%`);
    communityCountQ = communityCountQ.or(`url.ilike.%${params.q}%,domain.ilike.${params.q}%`);
  }
  if (params.category) ownerCountQ = ownerCountQ.overlaps("categories", [params.category]);
  if (params.auth_type) ownerCountQ = ownerCountQ.eq("auth_type", params.auth_type);

  const [{ count: ownerCount }, { count: communityCount }] = await Promise.all([ownerCountQ, communityCountQ]);

  const totalOwner = ownerCount ?? 0;
  // Exclude community from count when auth_type filter is active
  const totalCommunity = params.auth_type ? 0 : (communityCount ?? 0);
  const total = totalOwner + totalCommunity;

  // ── Owner services query ──────────────────────────────────────────
  let ownerQuery = db
    .from("services")
    .select("id, name, description, url, ai_url, categories, auth_type, is_verified, score, spec_version, created_at")
    .eq("status", "active")
    .is("deleted_at", null);

  if (params.q) ownerQuery = ownerQuery.or(`name.ilike.${params.q}%,url.ilike.${params.q}%`);
  if (params.category) ownerQuery = ownerQuery.overlaps("categories", [params.category]);
  if (params.auth_type) ownerQuery = ownerQuery.eq("auth_type", params.auth_type);

  if (params.sort === "score") {
    ownerQuery = ownerQuery.order("score", { ascending: false });
  } else if (params.sort === "name") {
    ownerQuery = ownerQuery.order("name", { ascending: true });
  } else {
    ownerQuery = ownerQuery.order("created_at", { ascending: false });
  }

  const { data: ownerData } = await ownerQuery.range(offset, offset + PAGE_SIZE - 1);

  const services: ServiceListItem[] = (ownerData ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    url: row.url,
    ai_url: row.ai_url,
    categories: row.categories,
    auth_type: row.auth_type,
    is_verified: row.is_verified,
    score: row.score ?? 0,
    spec_version: row.spec_version,
    created_at: row.created_at,
    source: "owner" as const,
    discover_count: 0,
  }));

  // ── Fill remaining with community specs ──────────────────────────
  // Skip community if auth_type filter is set (can't filter JSONB efficiently)
  const remaining = params.auth_type ? 0 : PAGE_SIZE - services.length;

  if (remaining > 0) {
    const communityOffset = Math.max(0, offset - totalOwner);

    let communityQuery = db
      .from("community_specs")
      .select("id, url, domain, ai_spec, confidence, contributors, discover_count, created_at")
      .eq("status", "active");

    if (params.q) communityQuery = communityQuery.or(`url.ilike.%${params.q}%,domain.ilike.${params.q}%`);

    // Apply sort to community query
    if (params.sort === "score") {
      communityQuery = communityQuery.order("confidence", { ascending: false });
    } else if (params.sort === "name") {
      communityQuery = communityQuery.order("domain", { ascending: true });
    } else {
      communityQuery = communityQuery.order("created_at", { ascending: false });
    }

    const { data: communityData } = await communityQuery
      .range(communityOffset, communityOffset + remaining - 1);

    for (const row of communityData ?? []) {
      const spec = row.ai_spec as Record<string, unknown>;
      const svc = spec?.["service"] as Record<string, unknown> | undefined;
      services.push({
        id: row.id,
        name: (svc?.["name"] as string) ?? row.domain,
        description: (svc?.["description"] as string) ?? "",
        url: row.url,
        ai_url: "",
        categories: (svc?.["category"] as string[]) ?? [],
        auth_type: ((spec?.["auth"] as Record<string, unknown>)?.["type"] as string) ?? "none",
        is_verified: false,
        score: row.confidence ?? 0,
        spec_version: (spec?.["aiendpoint"] as string) ?? "1.0",
        created_at: row.created_at,
        source: "community" as const,
        discover_count: row.discover_count ?? 0,
      });
    }
  }

  return {
    services,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

/**
 * Cached wrapper for getServicesSSR.
 * Cache key includes all params so each filter+page combo is cached separately.
 * Set SERVICES_CACHE_TTL=0 in env to disable caching (instant rollback).
 */
export async function getServicesSSR(params: ServicesParams): Promise<ServicesResult> {
  if (CACHE_TTL <= 0) return _getServicesSSR(params);

  const cacheKey = `services:${params.q ?? ""}:${params.category ?? ""}:${params.auth_type ?? ""}:${params.sort ?? ""}:${params.page ?? 1}`;

  const cached = unstable_cache(
    () => _getServicesSSR(params),
    [cacheKey],
    { revalidate: CACHE_TTL, tags: ["services"] }
  );

  return cached();
}

async function _getCategoriesSSR(): Promise<{ id: string; label: string; count: number }[]> {
  const { data } = await db
    .from("services")
    .select("categories")
    .eq("status", "active")
    .is("deleted_at", null);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const cat of row.categories ?? []) {
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: id, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getCategoriesSSR(): Promise<{ id: string; label: string; count: number }[]> {
  if (CACHE_TTL <= 0) return _getCategoriesSSR();

  const cached = unstable_cache(
    () => _getCategoriesSSR(),
    ["categories"],
    { revalidate: CACHE_TTL, tags: ["categories"] }
  );

  return cached();
}
