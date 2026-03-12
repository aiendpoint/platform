"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getServices, getCategories, type ServiceListItem, type Category } from "@/lib/api";
import { ServiceCard } from "@/components/ServiceCard";

const LIMIT = 12;

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
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
    getServices({ q: q || undefined, category: category || undefined, page, limit: LIMIT })
      .then((data) => {
        if (!cancelled) {
          setServices(data.services);
          setTotal(data.total);
        }
      })
      .catch(() => { if (!cancelled) setServices([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q, category, page]);

  const handleCategory = (cat: string) => {
    setCategory(cat === category ? "" : cat);
    setPage(1);
  };

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

      {/* Category filters */}
      {categories.filter((c) => c.count > 0).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
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
              {cat.count > 0 && (
                <span className="ml-1 opacity-60">({cat.count})</span>
              )}
            </button>
          ))}
          {category && (
            <button
              onClick={() => { setCategory(""); setPage(1); }}
              className="text-xs px-3 py-1.5 text-[#888] hover:text-[#e5e5e5] transition-colors"
            >
              × Clear
            </button>
          )}
        </div>
      )}

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
          {(q || category) && (
            <button
              onClick={() => { setQ(""); setCategory(""); setPage(1); }}
              className="text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors mt-1"
            >
              Clear filters
            </button>
          )}
          {!q && !category && (
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
