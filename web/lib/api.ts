const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ServiceListItem {
  id: string;
  name: string;
  description: string;
  url: string;
  ai_url: string;
  categories: string[];
  auth_type: string;
  is_verified: boolean;
  spec_version: string;
  created_at: string;
}

export interface ServiceDetail extends ServiceListItem {
  language: string[];
  tags: string[];
  auth_docs_url: string | null;
  is_official: boolean;
  status: string;
  capabilities: Capability[];
  token_hints: Record<string, boolean> | null;
  rate_limits: Record<string, unknown> | null;
  meta: Record<string, string> | null;
  updated_at: string;
}

export interface Capability {
  capability_id: string;
  description: string;
  endpoint: string;
  method: string;
  params: Record<string, string>;
  returns: string | null;
}

export interface ServicesResponse {
  total: number;
  page: number;
  limit: number;
  services: ServiceListItem[];
}

export interface ValidationResult {
  url: string;
  ai_url: string | null;
  passed: boolean;
  score: number;
  grade: string;
  spec_version: string | null;
  response_ms: number | null;
  capability_count: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  passes: ValidationIssue[];
  checked_at: string;
  /** true when this response was served from Redis cache */
  cached: boolean;
  /** ISO timestamp — when the cached result expires and a fresh check will run */
  cache_expires_at: string;
}

export interface ValidationIssue {
  field: string;
  message: string;
  code: string;
}

export interface Category {
  id: string;
  label: string;
  count: number;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function getServices(params?: {
  q?: string;
  category?: string;
  auth_type?: string;
  verified?: boolean;
  page?: number;
  limit?: number;
}): Promise<ServicesResponse> {
  const qs = new URLSearchParams();
  if (params?.q)         qs.set("q", params.q);
  if (params?.category)  qs.set("category", params.category);
  if (params?.auth_type) qs.set("auth_type", params.auth_type);
  if (params?.verified)  qs.set("verified", "true");
  if (params?.page)      qs.set("page", String(params.page));
  if (params?.limit)     qs.set("limit", String(params.limit));

  const res = await fetch(`${API_URL}/api/services?${qs}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error("Failed to fetch services");
  return res.json();
}

export async function getService(id: string): Promise<ServiceDetail> {
  const res = await fetch(`${API_URL}/api/services/${id}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error("Service not found");
  return res.json();
}

export async function validateUrl(url: string): Promise<ValidationResult> {
  const res = await fetch(`${API_URL}/api/validate?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error("Validation request failed");
  return res.json();
}

export async function registerService(url: string, owner_email?: string) {
  const res = await fetch(`${API_URL}/api/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, owner_email }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error), { data, status: res.status });
  return data;
}

export async function getCategories(): Promise<{ categories: Category[] }> {
  const res = await fetch(`${API_URL}/api/categories`, { next: { revalidate: 60 } });
  if (!res.ok) return { categories: [] };
  return res.json();
}

export async function getStats(): Promise<{ total: number; verified: number; capabilities: number }> {
  try {
    const data = await getServices({ limit: 1 });
    return { total: data.total, verified: 0, capabilities: 0 };
  } catch {
    return { total: 0, verified: 0, capabilities: 0 };
  }
}
