"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";

interface Category {
  id: string;
  label: string;
  count: number;
}

const AUTH_FILTERS = [
  { id: "none", label: "No auth" },
  { id: "apikey", label: "API Key" },
  { id: "bearer", label: "Bearer" },
  { id: "oauth2", label: "OAuth2" },
];

const SORT_OPTIONS = [
  { id: "newest", label: "Newest" },
  { id: "score", label: "Best score" },
  { id: "name", label: "A–Z" },
] as const;

export function ServicesFilter({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const selectedCategories = (searchParams.get("category") ?? "").split(",").filter(Boolean);
  const authType = searchParams.get("auth_type") ?? "";
  const sort = searchParams.get("sort") ?? "newest";

  const [searchInput, setSearchInput] = useState(q);
  const [categoryExpanded, setCategoryExpanded] = useState(false);

  const navigate = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      for (const [k, v] of Object.entries(updates)) {
        if (v) {
          params.set(k, v);
        } else {
          params.delete(k);
        }
      }
      // Avoid URLSearchParams encoding commas in category
      const qs = params.toString().replace(/%2C/gi, ",");
      router.push(`/services?${qs}`);
    },
    [router, searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ q: searchInput });
  };

  const toggleCategory = (cat: string) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat];
    navigate({ category: next.join(",") });
  };

  const toggleAuth = (auth: string) => {
    navigate({ auth_type: authType === auth ? "" : auth });
  };

  const setSort = (s: string) => {
    navigate({ sort: s === "newest" ? "" : s });
  };

  const hasFilters = !!(q || selectedCategories.length > 0 || authType || sort !== "newest");

  const clearAll = () => {
    setSearchInput("");
    router.push("/services");
  };

  return (
    <>
      {/* Search */}
      <form onSubmit={handleSearch} className="mb-5">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search services…"
          className="w-full bg-canvas border border-line rounded-lg px-4 py-2.5 text-fg placeholder-faint focus:outline-none focus:border-faint text-sm transition-colors"
        />
      </form>

      {/* Filters */}
      <div className="space-y-3 mb-8">
        {/* Category */}
        {categories.filter((c) => c.count > 0).length > 0 && (
          <div>
            <div className={`flex flex-wrap gap-2 items-start ${categoryExpanded ? "" : "max-h-[4.5rem] overflow-hidden"}`}>
              <span className="text-xs text-faint w-14 shrink-0 leading-[1.875rem]">Category</span>
              {categories.filter((c) => c.count > 0).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                    selectedCategories.includes(cat.id)
                      ? "bg-accent border-accent text-white"
                      : "bg-canvas border-line text-muted hover:border-line-dim hover:text-fg"
                  }`}
                >
                  {cat.label}
                  <span className="ml-1 opacity-50">({cat.count})</span>
                </button>
              ))}
            </div>
            {categories.filter((c) => c.count > 0).length > 10 && (
              <button
                type="button"
                onClick={() => setCategoryExpanded(!categoryExpanded)}
                className="mt-1.5 ml-14 text-xs text-subtle hover:text-muted transition-colors cursor-pointer flex items-center gap-1"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className={`transition-transform ${categoryExpanded ? "rotate-180" : ""}`}
                >
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {categoryExpanded ? "Show less" : `Show all ${categories.filter((c) => c.count > 0).length} categories`}
              </button>
            )}
          </div>
        )}

        {/* Auth type */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-faint w-14 shrink-0">Auth</span>
          {AUTH_FILTERS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => toggleAuth(a.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                authType === a.id
                  ? "bg-accent border-accent text-white"
                  : "bg-canvas border-line text-muted hover:border-line-dim hover:text-fg"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Sort + clear */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 items-center">
            <span className="text-xs text-faint w-14 shrink-0">Sort</span>
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                  sort === s.id
                    ? "bg-line border-faint text-fg"
                    : "bg-canvas border-line text-subtle hover:border-line-dim hover:text-muted"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
            >
              × Clear all
            </button>
          )}
        </div>
      </div>
    </>
  );
}
