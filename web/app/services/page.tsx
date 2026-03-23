import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Services — AIEndpoint",
  description: "Browse and search AI-ready web services indexed by the AIEndpoint registry. Filter by category, auth type, and more.",
  alternates: { canonical: "/services" },
};
import { ServiceCard } from "@/components/ServiceCard";
import { ServicesFilter } from "@/components/ServicesFilter";
import { getServicesSSR, getCategoriesSSR } from "@/lib/services";
import { formatCount } from "@/lib/numbers";

interface Props {
  searchParams: Promise<{
    q?: string;
    category?: string;
    auth_type?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function ServicesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);

  const [{ services, total, totalPages }, categories] = await Promise.all([
    getServicesSSR({
      q: params.q,
      category: params.category,
      auth_type: params.auth_type,
      sort: params.sort,
      page,
    }),
    getCategoriesSSR(),
  ]);

  const hasFilters = !!(params.q || params.category || params.auth_type || (params.sort && params.sort !== "newest"));

  // Build pagination URLs
  function pageUrl(p: number): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.category) sp.set("category", params.category);
    if (params.auth_type) sp.set("auth_type", params.auth_type);
    if (params.sort && params.sort !== "newest") sp.set("sort", params.sort);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/services${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-fg">Services</h1>
          <p className="text-muted mt-1">
            {formatCount(total)} indexed service{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/register"
          className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Register
        </Link>
      </div>

      {/* Filters (client component) */}
      <Suspense fallback={null}>
        <ServicesFilter categories={categories} />
      </Suspense>

      {/* Grid */}
      {services.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-subtle text-lg mb-2">No services found</p>
          {hasFilters && (
            <Link
              href="/services"
              className="text-sm text-accent hover:text-accent-soft transition-colors mt-1"
            >
              Clear filters
            </Link>
          )}
          {!hasFilters && (
            <Link href="/register" className="inline-block mt-4 text-sm text-accent hover:text-accent-soft transition-colors">
              Register the first service →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-10">
          {page > 1 ? (
            <Link
              href={pageUrl(page - 1)}
              className="px-4 py-2 text-sm border border-line rounded-lg text-muted hover:text-fg hover:border-line-dim transition-colors"
            >
              ← Prev
            </Link>
          ) : (
            <span className="px-4 py-2 text-sm border border-line rounded-lg text-muted opacity-30">
              ← Prev
            </span>
          )}
          <span className="text-sm text-subtle tabular-nums">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={pageUrl(page + 1)}
              className="px-4 py-2 text-sm border border-line rounded-lg text-muted hover:text-fg hover:border-line-dim transition-colors"
            >
              Next →
            </Link>
          ) : (
            <span className="px-4 py-2 text-sm border border-line rounded-lg text-muted opacity-30">
              Next →
            </span>
          )}
        </div>
      )}
    </div>
  );
}
