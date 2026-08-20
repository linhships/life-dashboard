"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Link2, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { LinkEntry } from "@/lib/links";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface GroupedCategory {
  category: string;
  links: LinkEntry[];
}

function groupByCategory(links: LinkEntry[]): GroupedCategory[] {
  const map = new Map<string, LinkEntry[]>();
  for (const link of links) {
    const list = map.get(link.category) ?? [];
    list.push(link);
    map.set(link.category, list);
  }
  return Array.from(map.entries())
    .map(([category, items]) => ({ category, links: items }))
    .sort((a, b) => b.links.length - a.links.length);
}

function LinkCard({
  link,
  categories,
  onDelete,
  onRefresh,
  onRecategorize,
}: {
  link: LinkEntry;
  categories: string[];
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onRecategorize: (id: string, category: string) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Reset the broken-image fallback if a refresh brings in a new URL.
  useEffect(() => {
    setImageFailed(false);
  }, [link.image]);

  const showImage = Boolean(link.image) && !imageFailed;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <a href={link.url} target="_blank" rel="noopener noreferrer" className="block">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={link.image!}
            alt=""
            className="h-36 w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-slate-100 text-slate-300">
            <Link2 className="h-8 w-8" />
          </div>
        )}
      </a>
      <div className="flex flex-1 flex-col p-4">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 text-sm font-semibold text-slate-900 hover:underline"
        >
          {link.title}
        </a>
        {link.description && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{link.description}</p>
        )}
        <p className="mt-2 text-xs text-slate-400">{hostname(link.url)}</p>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <select
            value={link.category}
            onChange={(e) => onRecategorize(link.id, e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              title="Refresh preview"
              onClick={async () => {
                setRefreshing(true);
                await onRefresh(link.id);
                setRefreshing(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              title="Delete"
              onClick={() => onDelete(link.id)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LinksBoard({ initialLinks }: { initialLinks: LinkEntry[] }) {
  const [links, setLinks] = useState<LinkEntry[]>(initialLinks);
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(links.map((l) => l.category));
    if (category) set.add(category);
    return Array.from(set).sort();
  }, [links, category]);

  const grouped = useMemo(() => groupByCategory(links), [links]);

  const effectiveCategory = category === "__new__" ? newCategory.trim() : category;

  const handleAdd = async () => {
    if (!url.trim() || !effectiveCategory) {
      setError("Add a URL and pick (or type) a category.");
      return;
    }
    setError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), category: effectiveCategory }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add link");
      }
      const entry = (await res.json()) as LinkEntry;
      setLinks((prev) => [...prev, entry]);
      setUrl("");
      setNewCategory("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add link");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    fetch(`/api/links?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  };

  const handleRecategorize = async (id: string, newCat: string) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, category: newCat } : l)));
    fetch("/api/links", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, category: newCat }),
    }).catch(() => {});
  };

  const handleRefresh = async (id: string) => {
    const link = links.find((l) => l.id === id);
    if (!link) return;
    try {
      const res = await fetch("/api/links/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.url }),
      });
      const meta = await res.json();
      const updates = {
        title: meta.title || link.title,
        description: meta.description ?? link.description,
        image: meta.image ?? link.image,
      };
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
      fetch("/api/links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      }).catch(() => {});
    } catch {
      // Best-effort — leave existing preview in place on failure.
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a link…"
            className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-2 text-sm"
          >
            <option value="">Category…</option>
            {Array.from(new Set(links.map((l) => l.category)))
              .sort()
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            <option value="__new__">+ New category</option>
          </select>
          {category === "__new__" && (
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      </div>

      {grouped.length === 0 && (
        <p className="text-sm text-slate-500">No links saved yet — add one above.</p>
      )}

      {grouped.map((group) => (
        <div key={group.category}>
          <h2 className="mb-3 text-base font-bold text-slate-900">
            {group.category}{" "}
            <span className="text-sm font-normal text-slate-400">({group.links.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {group.links.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                categories={categories}
                onDelete={handleDelete}
                onRefresh={handleRefresh}
                onRecategorize={handleRecategorize}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
