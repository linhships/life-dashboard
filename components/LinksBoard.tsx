"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Link2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import type { LinkEntry } from "@/lib/links";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatAddedAt(addedAt: string): string {
  const date = new Date(addedAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Proxy preview images through our own server (see app/api/links/image) —
// some sites block direct cross-origin <img> requests via hotlink
// protection, which a same-origin proxied request with a proper referer
// gets past.
function proxiedImage(url: string): string {
  return `/api/links/image?url=${encodeURIComponent(url)}`;
}

function CopyLinkButton({
  url,
  className,
  showLabel = false,
}: {
  url: string;
  className?: string;
  showLabel?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API can fail (e.g. no permission) — nothing more we can
      // do here, so just skip the "copied" feedback.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied!" : "Copy link"}
      className={className}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {showLabel && <span>{copied ? "Copied!" : "Copy link"}</span>}
    </button>
  );
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
  return Array.from(map.entries()).map(([category, items]) => ({ category, links: items }));
}

type CategorySort = "count-desc" | "count-asc" | "alpha-asc" | "alpha-desc";

const SORT_OPTIONS: { value: CategorySort; label: string }[] = [
  { value: "count-desc", label: "Most links first" },
  { value: "count-asc", label: "Fewest links first" },
  { value: "alpha-asc", label: "A → Z" },
  { value: "alpha-desc", label: "Z → A" },
];

function sortGroups(groups: GroupedCategory[], sort: CategorySort): GroupedCategory[] {
  const sorted = [...groups];
  switch (sort) {
    case "count-desc":
      sorted.sort((a, b) => b.links.length - a.links.length);
      break;
    case "count-asc":
      sorted.sort((a, b) => a.links.length - b.links.length);
      break;
    case "alpha-asc":
      sorted.sort((a, b) => a.category.localeCompare(b.category));
      break;
    case "alpha-desc":
      sorted.sort((a, b) => b.category.localeCompare(a.category));
      break;
  }
  return sorted;
}

function LinkCard({
  link,
  categories,
  onDelete,
  onRefresh,
  onRecategorize,
  onNotesChange,
  onOpen,
}: {
  link: LinkEntry;
  categories: string[];
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onRecategorize: (id: string, category: string) => void;
  onNotesChange: (id: string, notes: string) => void;
  onOpen: (id: string) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [notes, setNotes] = useState(link.notes ?? "");

  useEffect(() => {
    setNotes(link.notes ?? "");
  }, [link.notes]);

  // Reset the broken-image fallback if a refresh brings in a new URL.
  useEffect(() => {
    setImageFailed(false);
  }, [link.image]);

  const showImage = Boolean(link.image) && !imageFailed;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <button type="button" onClick={() => onOpen(link.id)} className="block w-full text-left">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxiedImage(link.image!)}
            alt=""
            className="h-36 w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-slate-100 text-slate-300">
            <Link2 className="h-8 w-8" />
          </div>
        )}
      </button>
      <div className="flex flex-1 flex-col p-4">
        <button
          type="button"
          onClick={() => onOpen(link.id)}
          className="line-clamp-2 text-left text-sm font-semibold text-slate-900 hover:underline"
        >
          {link.title}
        </button>
        {link.description && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{link.description}</p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          {hostname(link.url)}
          {link.addedAt && <span> · Added {formatAddedAt(link.addedAt)}</span>}
        </p>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== (link.notes ?? "")) onNotesChange(link.id, notes);
          }}
          placeholder="Add a note…"
          rows={2}
          className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
        />

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
            <CopyLinkButton
              url={link.url}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            />
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

function LinkModal({
  link,
  onClose,
  onNotesChange,
}: {
  link: LinkEntry;
  onClose: () => void;
  onNotesChange: (id: string, notes: string) => void;
}) {
  const [notes, setNotes] = useState(link.notes ?? "");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setNotes(link.notes ?? "");
    setImageFailed(false);
  }, [link.id, link.notes, link.image]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const showImage = Boolean(link.image) && !imageFailed;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proxiedImage(link.image!)}
              alt=""
              className="max-h-80 w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-slate-100 text-slate-300">
              <Link2 className="h-10 w-10" />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow hover:bg-white hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-bold text-slate-900 hover:underline"
          >
            {link.title}
          </a>
          <p className="mt-1 text-xs text-slate-400">
            {hostname(link.url)}
            {link.addedAt && <span> · Added {formatAddedAt(link.addedAt)}</span>}
            {" · "}
            {link.category}
          </p>

          {link.description && (
            <p className="mt-3 text-sm text-slate-600">{link.description}</p>
          )}

          <label className="mt-5 block text-xs font-medium text-slate-500">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== (link.notes ?? "")) onNotesChange(link.id, notes);
            }}
            placeholder="Add a note…"
            rows={5}
            className="mt-1.5 w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
          />

          <div className="mt-5 flex justify-end gap-2">
            <CopyLinkButton
              url={link.url}
              showLabel
              className="flex items-center gap-1.5 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            />
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Visit link
            </a>
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
  const [openLinkId, setOpenLinkId] = useState<string | null>(null);
  const [categorySort, setCategorySort] = useState<CategorySort>("count-desc");

  const categories = useMemo(() => {
    const set = new Set(links.map((l) => l.category));
    if (category) set.add(category);
    return Array.from(set).sort();
  }, [links, category]);

  const grouped = useMemo(
    () => sortGroups(groupByCategory(links), categorySort),
    [links, categorySort]
  );

  const openLink = openLinkId ? links.find((l) => l.id === openLinkId) ?? null : null;

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

  const handleNotesChange = async (id: string, notes: string) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, notes } : l)));
    fetch("/api/links", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notes }),
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

      {grouped.length > 1 && (
        <div className="flex items-center justify-end gap-2">
          <label htmlFor="category-sort" className="text-xs text-slate-500">
            Sort categories
          </label>
          <select
            id="category-sort"
            value={categorySort}
            onChange={(e) => setCategorySort(e.target.value as CategorySort)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
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
                onNotesChange={handleNotesChange}
                onOpen={setOpenLinkId}
              />
            ))}
          </div>
        </div>
      ))}

      {openLink && (
        <LinkModal link={openLink} onClose={() => setOpenLinkId(null)} onNotesChange={handleNotesChange} />
      )}
    </div>
  );
}
