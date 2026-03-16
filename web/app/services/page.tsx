"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getServices, getCategories, type ServiceListItem, type Category } from "@/lib/api";
import { ServiceCard } from "@/components/ServiceCard";

const LIMIT = 12;

const AUTH_FILTERS = [
  { id: "none",   label: "No auth" },
  { id: "apikey", label: "API Key" },
  { id: "bearer", label: "Bearer" },
  { id: "oauth2", label: "OAuth2" },
];

const SORT_OPTIONS = [
  { id: "newest", label: "Newest" },
  { id: "score",  label: "Best score" },
  { id: "name",   label: "A–Z" },
] as const;

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [authType, setAuthType] = useState("");
  const [sort, setSort] = useState<"newest" | "score" | "name">("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Load categories once
  useEffect(() => {
    getCategories()
      .then(({ categories }) => setCategories(categories))
      .catch(() => {});
  }, []);

  // Load services whenever filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getServices({
      q: q || undefined,
      category: category || undefined,
      auth_type: authType || undefined,
      sort,
      page,
      limit: LIMIT,
    })
      .then((data) => {
        if (!cancelled) {
          setServices(data.services);
          setTotal(data.total);
        }
      })
      .catch(() => { if (!cancelled) setServices([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q, category, authType, sort, page]);

  const handleCategory = (cat: string) => {
    setCategory(cat === category ? "" : cat);
    setPage(1);
  };

  const handleAuthType = (auth: string) => {
    setAuthType(auth === authType ? "" : auth);
    setPage(1);
  };

  const handleSort = (s: "newest" | "score" | "name") => {
    setSort(s);
    setPage(1);
  };

  const hasFilters = !!(q || category || authType || sort !== "newest");

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#e5e5e5]">Services</h1>
          <p className="text-[#888] mt-1">
            {loading ? "Loading…" : `${total} AI-ready service${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/register"
          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Register
        </Link>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search services…"
          className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#e5e5e5] placeholder-[#444] focus:outline-none focus:border-[#444] text-sm transition-colors"
        />
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-8">
        {/* Category */}
        {categories.filter((c) => c.count > 0).length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-[#444] w-14 shrink-0">Category</span>
            {categories.filter((c) => c.count > 0).map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategory(cat.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  category === cat.id
                    ? "bg-[#3b82f6] border-[#3b82f6] text-white"
                    : "bg-[#111] border-[#222] text-[#888] hover:border-[#333] hover:text-[#e5e5e5]"
                }`}
              >
                {cat.label}
                <span className="ml-1 opacity-50">({cat.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Auth type */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-[#444] w-14 shrink-0">Auth</span>
          {AUTH_FILTERS.map((a) => (
            <button
              key={a.id}
              onClick={() => handleAuthType(a.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                authType === a.id
                  ? "bg-[#3b82f6] border-[#3b82f6] text-white"
                  : "bg-[#111] border-[#222] text-[#888] hover:border-[#333] hover:text-[#e5e5e5]"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Sort + clear */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 items-center">
            <span className="text-xs text-[#444] w-14 shrink-0">Sort</span>
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSort(s.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  sort === s.id
                    ? "bg-[#222] border-[#444] text-[#e5e5e5]"
                    : "bg-[#111] border-[#222] text-[#555] hover:border-[#333] hover:text-[#888]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button
              onClick={() => { setQ(""); setCategory(""); setAuthType(""); setSort("newest"); setPage(1); }}
              className="text-xs text-[#555] hover:text-[#888] transition-colors"
            >
              × Clear all
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#111] border border-[#222] rounded-lg p-5 h-40 animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-[#555] text-lg mb-2">No services found</p>
          {(q || category || authType || sort !== "newest") && (
            <button
              onClick={() => { setQ(""); setCategory(""); setAuthType(""); setSort("newest"); setPage(1); }}
              className="text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors mt-1"
            >
              Clear filters
            </button>
          )}
          {!q && !category && !authType && (
            <Link href="/register" className="inline-block mt-4 text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
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
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border border-[#222] rounded-lg text-[#888] hover:text-[#e5e5e5] hover:border-[#333] disabled:opacity-30 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-[#555] tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm border border-[#222] rounded-lg text-[#888] hover:text-[#e5e5e5] hover:border-[#333] disabled:opacity-30 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
