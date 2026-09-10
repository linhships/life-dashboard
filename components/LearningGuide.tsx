"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, CheckCircle2, Circle, ListChecks } from "lucide-react";
import type { LearningGuide as Guide, GuideSection } from "@/lib/learningGuides";

// Renders a study guide (lib/learningGuides.ts) as a stack of cards, one
// per "## " section, with the "Chunk n" sections getting a done-checkbox
// and a progress bar up top. Written with an AuDHD reader in mind, which
// mostly means: the whole plan is visible before any detail, every unit
// is small and looks the same, the current unit is easy to find, and
// finishing something produces a visible tick — none of which is exotic,
// it's just applied consistently.
//
// Done-state lives in localStorage (per guide slug) — it's a personal
// reading position, not data, so it doesn't need to round-trip to disk.

const STORAGE_PREFIX = "life-dashboard-guide-progress:";

function storageKey(slug: string): string {
  return `${STORAGE_PREFIX}${slug}`;
}

function readDone(slug: string): Set<number> {
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((n) => typeof n === "number") : []);
  } catch {
    return new Set();
  }
}

function writeDone(slug: string, done: Set<number>) {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(Array.from(done)));
  } catch {
    // localStorage unavailable — progress just won't persist.
  }
}

const markdownComponents = {
  p: (props: React.ComponentProps<"p">) => (
    <p className="mb-2 text-sm leading-relaxed text-slate-700 last:mb-0" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 text-sm text-slate-700 last:mb-0" {...props} />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm text-slate-700 last:mb-0" {...props} />
  ),
  li: (props: React.ComponentProps<"li">) => <li className="leading-relaxed" {...props} />,
  h3: (props: React.ComponentProps<"h3">) => (
    <h3
      className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 first:mt-0"
      {...props}
    />
  ),
  strong: (props: React.ComponentProps<"strong">) => (
    <strong className="font-semibold text-slate-900" {...props} />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a
      className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-600"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  blockquote: (props: React.ComponentProps<"blockquote">) => (
    <blockquote
      className="mb-2 border-l-2 border-amber-200 bg-amber-50 px-3 py-2 text-sm text-slate-700 last:mb-0"
      {...props}
    />
  ),
  code: (props: React.ComponentProps<"code">) => (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800" {...props} />
  ),
};

function Markdown({ children }: { children: string }) {
  return <ReactMarkdown components={markdownComponents}>{children}</ReactMarkdown>;
}

// Pull "· ~20 min" style time hints off the end of a chunk heading so they
// can be shown as a small pill instead of part of the title.
function splitTimeHint(title: string): { title: string; time: string | null } {
  const m = title.match(/^(.*?)\s*[·•|-]\s*(~?\s*\d+\s*(?:min|mins|minutes|h|hr|hrs|hours)\b.*)$/i);
  if (!m) return { title, time: null };
  return { title: m[1].trim(), time: m[2].trim() };
}

function stripChunkPrefix(title: string): string {
  return title.replace(/^chunk\s+\d+\s*[:.\-–—]\s*/i, "");
}

function SectionCard({
  section,
  done,
  onToggle,
  isNext,
}: {
  section: GuideSection;
  done: boolean;
  onToggle: (() => void) | null;
  isNext: boolean;
}) {
  const isChunk = section.chunkNumber !== null;
  const { title, time } = splitTimeHint(isChunk ? stripChunkPrefix(section.title) : section.title);

  return (
    <section
      id={isChunk ? `chunk-${section.chunkNumber}` : undefined}
      className={`scroll-mt-6 rounded-2xl border p-5 transition-colors ${
        done
          ? "border-emerald-200 bg-emerald-50/60"
          : isNext
            ? "border-blue-300 bg-white shadow-md"
            : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={done ? "Mark as not done" : "Mark as done"}
            className={`mt-0.5 shrink-0 ${done ? "text-emerald-600" : "text-slate-300 hover:text-slate-500"}`}
          >
            {done ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {isChunk && (
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Chunk {section.chunkNumber}
              </span>
            )}
            {isNext && !done && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Up next
              </span>
            )}
            {time && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {time}
              </span>
            )}
          </div>
          <h2 className={`mt-1 text-lg font-bold ${done ? "text-slate-500 line-through" : "text-slate-900"}`}>
            {title}
          </h2>
          <div className={`mt-3 ${done ? "opacity-60" : ""}`}>
            <Markdown>{section.markdown}</Markdown>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LearningGuideView({ guide }: { guide: Guide }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDone(readDone(guide.slug));
    setReady(true);
  }, [guide.slug]);

  const chunks = useMemo(
    () => guide.sections.filter((s) => s.chunkNumber !== null),
    [guide.sections]
  );
  const nextChunk = chunks.find((c) => !done.has(c.chunkNumber!)) ?? null;
  const doneCount = chunks.filter((c) => done.has(c.chunkNumber!)).length;
  const pct = chunks.length === 0 ? 0 : Math.round((doneCount / chunks.length) * 100);

  const toggle = (n: number) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      writeDone(guide.slug, next);
      return next;
    });
  };

  const resetAll = () => {
    const empty = new Set<number>();
    setDone(empty);
    writeDone(guide.slug, empty);
  };

  return (
    <div className="space-y-6">
      <Link
        href="/learning"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All topics
      </Link>

      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Study guide{guide.generated ? ` · ${guide.generated}` : ""}
        </p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">{guide.topic}</h1>
        {guide.intro && (
          <div className="mt-3 max-w-2xl">
            <Markdown>{guide.intro}</Markdown>
          </div>
        )}
      </header>

      {chunks.length > 0 && (
        <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${ready ? "" : "opacity-0"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ListChecks className="h-4 w-4 text-slate-400" />
              {doneCount} of {chunks.length} chunks done
            </p>
            <div className="flex items-center gap-3">
              {nextChunk && (
                <a
                  href={`#chunk-${nextChunk.chunkNumber}`}
                  className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Jump to chunk {nextChunk.chunkNumber}
                </a>
              )}
              {doneCount > 0 && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-xs font-medium text-slate-400 hover:text-slate-700"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {guide.sections.map((section, i) => {
          const n = section.chunkNumber;
          return (
            <SectionCard
              key={`${i}-${section.title}`}
              section={section}
              done={n !== null && done.has(n)}
              onToggle={n !== null ? () => toggle(n) : null}
              isNext={n !== null && nextChunk?.chunkNumber === n}
            />
          );
        })}
      </div>
    </div>
  );
}
