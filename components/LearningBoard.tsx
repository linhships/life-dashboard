"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Copy, ExternalLink, Plus, RefreshCw, Trash2, X } from "lucide-react";
import type { LearningResource } from "@/lib/learning";

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

// Proxy preview images through our own server (see app/api/learning/image)
// — some sites block direct cross-origin <img> requests via hotlink
// protection, which a same-origin proxied request with a proper referer
// gets past.
function proxiedImage(url: string): string {
  return `/api/learning/image?url=${encodeURIComponent(url)}`;
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

interface GroupedTopic {
  topic: string;
  resources: LearningResource[];
}

function groupByTopic(resources: LearningResource[]): GroupedTopic[] {
  const map = new Map<string, LearningResource[]>();
  for (const resource of resources) {
    const list = map.get(resource.topic) ?? [];
    list.push(resource);
    map.set(resource.topic, list);
  }
  return Array.from(map.entries()).map(([topic, items]) => ({ topic, resources: items }));
}

type TopicSort = "count-desc" | "count-asc" | "alpha-asc" | "alpha-desc";

const SORT_OPTIONS: { value: TopicSort; label: string }[] = [
  { value: "count-desc", label: "Most resources first" },
  { value: "count-asc", label: "Fewest resources first" },
  { value: "alpha-asc", label: "A → Z" },
  { value: "alpha-desc", label: "Z → A" },
];

function sortGroups(groups: GroupedTopic[], sort: TopicSort): GroupedTopic[] {
  const sorted = [...groups];
  switch (sort) {
    case "count-desc":
      sorted.sort((a, b) => b.resources.length - a.resources.length);
      break;
    case "count-asc":
      sorted.sort((a, b) => a.resources.length - b.resources.length);
      break;
    case "alpha-asc":
      sorted.sort((a, b) => a.topic.localeCompare(b.topic));
      break;
    case "alpha-desc":
      sorted.sort((a, b) => b.topic.localeCompare(a.topic));
      break;
  }
  return sorted;
}

function ResourceCard({
  resource,
  topics,
  onDelete,
  onRefresh,
  onRetopic,
  onNotesChange,
  onOpen,
}: {
  resource: LearningResource;
  topics: string[];
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onRetopic: (id: string, topic: string) => void;
  onNotesChange: (id: string, notes: string) => void;
  onOpen: (id: string) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [notes, setNotes] = useState(resource.notes ?? "");

  useEffect(() => {
    setNotes(resource.notes ?? "");
  }, [resource.notes]);

  // Reset the broken-image fallback if a refresh brings in a new URL.
  useEffect(() => {
    setImageFailed(false);
  }, [resource.image]);

  const showImage = Boolean(resource.image) && !imageFailed;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <button type="button" onClick={() => onOpen(resource.id)} className="block w-full text-left">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxiedImage(resource.image!)}
            alt=""
            className="h-36 w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-slate-100 text-slate-300">
            <BookOpen className="h-8 w-8" />
          </div>
        )}
      </button>
      <div className="flex flex-1 flex-col p-4">
        <button
          type="button"
          onClick={() => onOpen(resource.id)}
          className="line-clamp-2 text-left text-sm font-semibold text-slate-900 hover:underline"
        >
          {resource.title}
        </button>
        {resource.description && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{resource.description}</p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          {hostname(resource.url)}
          {resource.addedAt && <span> · Added {formatAddedAt(resource.addedAt)}</span>}
        </p>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== (resource.notes ?? "")) onNotesChange(resource.id, notes);
          }}
          placeholder="Add a note…"
          rows={2}
          className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
        />

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <select
            value={resource.topic}
            onChange={(e) => onRetopic(resource.id, e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600"
          >
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              title="Refresh preview"
              onClick={async () => {
                setRefreshing(true);
                await onRefresh(resource.id);
                setRefreshing(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <CopyLinkButton
              url={resource.url}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            />
            <a
              href={resource.url}
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
              onClick={() => onDelete(resource.id)}
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

function ResourceModal({
  resource,
  onClose,
  onNotesChange,
}: {
  resource: LearningResource;
  onClose: () => void;
  onNotesChange: (id: string, notes: string) => void;
}) {
  const [notes, setNotes] = useState(resource.notes ?? "");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setNotes(resource.notes ?? "");
    setImageFailed(false);
  }, [resource.id, resource.notes, resource.image]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const showImage = Boolean(resource.image) && !imageFailed;

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
              src={proxiedImage(resource.image!)}
              alt=""
              className="max-h-80 w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-slate-100 text-slate-300">
              <BookOpen className="h-10 w-10" />
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
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-bold text-slate-900 hover:underline"
          >
            {resource.title}
          </a>
          <p className="mt-1 text-xs text-slate-400">
            {hostname(resource.url)}
            {resource.addedAt && <span> · Added {formatAddedAt(resource.addedAt)}</span>}
            {" · "}
            {resource.topic}
          </p>

          {resource.description && (
            <p className="mt-3 text-sm text-slate-600">{resource.description}</p>
          )}

          <label className="mt-5 block text-xs font-medium text-slate-500">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== (resource.notes ?? "")) onNotesChange(resource.id, notes);
            }}
            placeholder="Add a note…"
            rows={5}
            className="mt-1.5 w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
          />

          <div className="mt-5 flex justify-end gap-2">
            <CopyLinkButton
              url={resource.url}
              showLabel
              className="flex items-center gap-1.5 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            />
            <a
              href={resource.url}
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

export function LearningBoard({ initialResources }: { initialResources: LearningResource[] }) {
  const [resources, setResources] = useState<LearningResource[]>(initialResources);
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openResourceId, setOpenResourceId] = useState<string | null>(null);
  const [topicSort, setTopicSort] = useState<TopicSort>("count-desc");

  const topics = useMemo(() => {
    const set = new Set(resources.map((r) => r.topic));
    if (topic) set.add(topic);
    return Array.from(set).sort();
  }, [resources, topic]);

  const grouped = useMemo(
    () => sortGroups(groupByTopic(resources), topicSort),
    [resources, topicSort]
  );

  const openResource = openResourceId
    ? resources.find((r) => r.id === openResourceId) ?? null
    : null;

  const effectiveTopic = topic === "__new__" ? newTopic.trim() : topic;

  const handleAdd = async () => {
    if (!url.trim() || !effectiveTopic) {
      setError("Add a URL and pick (or type) a topic.");
      return;
    }
    setError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), topic: effectiveTopic }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add resource");
      }
      const entry = (await res.json()) as LearningResource;
      setResources((prev) => [...prev, entry]);
      setUrl("");
      setNewTopic("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add resource");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    fetch(`/api/learning?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  };

  const handleRetopic = async (id: string, newTopicValue: string) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, topic: newTopicValue } : r)));
    fetch("/api/learning", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, topic: newTopicValue }),
    }).catch(() => {});
  };

  const handleNotesChange = async (id: string, notes: string) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, notes } : r)));
    fetch("/api/learning", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notes }),
    }).catch(() => {});
  };

  const handleRefresh = async (id: string) => {
    const resource = resources.find((r) => r.id === id);
    if (!resource) return;
    try {
      const res = await fetch("/api/learning/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: resource.url }),
      });
      const meta = await res.json();
      const updates = {
        title: meta.title || resource.title,
        description: meta.description ?? resource.description,
        image: meta.image ?? resource.image,
      };
      setResources((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
      fetch("/api/learning", {
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
            placeholder="Paste a link to an article, course, or video…"
            className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-2 text-sm"
          >
            <option value="">Topic…</option>
            {Array.from(new Set(resources.map((r) => r.topic)))
              .sort()
              .map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            <option value="__new__">+ New topic</option>
          </select>
          {topic === "__new__" && (
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="New topic name"
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
        <p className="text-sm text-slate-500">Nothing saved yet — add a resource above.</p>
      )}

      {grouped.length > 1 && (
        <div className="flex items-center justify-end gap-2">
          <label htmlFor="topic-sort" className="text-xs text-slate-500">
            Sort topics
          </label>
          <select
            id="topic-sort"
            value={topicSort}
            onChange={(e) => setTopicSort(e.target.value as TopicSort)}
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
        <div key={group.topic}>
          <h2 className="mb-3 text-base font-bold text-slate-900">
            {group.topic}{" "}
            <span className="text-sm font-normal text-slate-400">({group.resources.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {group.resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                topics={topics}
                onDelete={handleDelete}
                onRefresh={handleRefresh}
                onRetopic={handleRetopic}
                onNotesChange={handleNotesChange}
                onOpen={setOpenResourceId}
              />
            ))}
          </div>
        </div>
      ))}

      {openResource && (
        <ResourceModal
          resource={openResource}
          onClose={() => setOpenResourceId(null)}
          onNotesChange={handleNotesChange}
        />
      )}
    </div>
  );
}
