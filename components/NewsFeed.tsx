"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, Flame, ThumbsDown, ThumbsUp } from "lucide-react";
import type { NewsItem, Rating } from "@/lib/news";
import { avatarColor, parseNewsItemBody, rankSources, slugify } from "@/lib/newsItem";

interface FeedbackEntry {
  id: string;
  rating: Rating;
}

const TONE_CLASSES: Record<Rating, string> = {
  down: "bg-rose-50 text-rose-600 border-rose-200",
  up: "bg-emerald-50 text-emerald-600 border-emerald-200",
  love: "bg-amber-50 text-amber-600 border-amber-200",
};

function RateButton({
  active,
  tone,
  label,
  onClick,
  children,
}: {
  active: boolean;
  tone: Rating;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
        active
          ? TONE_CLASSES[tone]
          : "border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

// Magazine-style article card: category pill, bold headline, excerpt,
// then a byline row (source avatar + name, date, rating buttons). There's
// no article imagery in the source data (it's a text digest), so this
// leans on typography and the colored initial "avatar" instead of a photo.
function ArticleCard({
  item,
  rating,
  onRate,
}: {
  item: NewsItem;
  rating: Rating | undefined;
  onRate: (item: NewsItem, rating: Rating) => void;
}) {
  const { sources, excerpt } = useMemo(() => parseNewsItemBody(item.markdown), [item.markdown]);
  const primarySource = sources[0];
  const pillLabel = item.subheading || item.section;

  const excerptRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  // Only show the "More" button when the clamp is actually cutting text
  // off — re-checks on resize, since the same card goes from one column
  // (Top Stories) to two (everywhere else), which changes wrapping.
  useEffect(() => {
    const el = excerptRef.current;
    if (!el) return;
    const check = () => {
      if (expanded) return;
      setIsTruncated(el.scrollHeight > el.clientHeight + 1);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [excerpt, expanded]);

  const content = (
    <div className="p-5">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
        {pillLabel}
      </span>

      <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900 sm:text-xl">
        {item.headline}
      </h3>

      {excerpt && (
        <>
          <div
            ref={excerptRef}
            className={`mt-2 text-sm leading-relaxed text-slate-600 ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            <ReactMarkdown
              components={{
                p: ({ node: _node, ...props }) => <span {...props} />,
                strong: ({ node: _node, ...props }) => (
                  <strong className="font-semibold text-slate-800" {...props} />
                ),
                a: ({ node: _node, ...props }) => (
                  <a
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
              }}
            >
              {excerpt}
            </ReactMarkdown>
          </div>
          {(isTruncated || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs font-medium text-blue-600 hover:underline"
            >
              {expanded ? "Less" : "More"}
            </button>
          )}
        </>
      )}

      <div className="byline-row mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          {primarySource ? (
            <>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(
                  primarySource.name
                )}`}
              >
                {primarySource.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate text-sm text-slate-700">
                <a
                  href={primarySource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                >
                  {primarySource.name}
                </a>
                {sources.slice(1).map((s) => (
                  <span key={s.url}>
                    {", "}
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                    >
                      {s.name}
                    </a>
                  </span>
                ))}
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-400">Source not linked</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-slate-400">{item.date}</span>
          <div className="flex items-center gap-1.5">
            <RateButton
              active={rating === "love"}
              tone="love"
              label="Loved it"
              onClick={() => onRate(item, "love")}
            >
              <Flame className="h-3.5 w-3.5" />
            </RateButton>
            <RateButton
              active={rating === "up"}
              tone="up"
              label="Liked it"
              onClick={() => onRate(item, "up")}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </RateButton>
            <RateButton
              active={rating === "down"}
              tone="down"
              label="Not interested"
              onClick={() => onRate(item, "down")}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </RateButton>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {content}
    </article>
  );
}

interface Section {
  name: string;
  items: NewsItem[];
}

function groupBySection(items: NewsItem[]): Section[] {
  const sections: Section[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.name === item.section) {
      last.items.push(item);
    } else {
      sections.push({ name: item.section, items: [item] });
    }
  }
  return sections;
}

export function NewsFeed({
  items,
  initialFeedback,
}: {
  items: NewsItem[];
  initialFeedback: Record<string, FeedbackEntry>;
}) {
  const [feedback, setFeedback] = useState<Record<string, Rating>>(() =>
    Object.fromEntries(Object.entries(initialFeedback).map(([id, f]) => [id, f.rating]))
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const rate = (item: NewsItem, rating: Rating) => {
    setFeedback((prev) => ({ ...prev, [item.id]: rating }));
    fetch("/api/news/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        date: item.date,
        section: item.section,
        headline: item.headline,
        rating,
      }),
    }).catch(() => {
      // Best-effort — feedback is a nice-to-have log, not critical path.
    });
  };

  const toggleSection = (name: string) => {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const sections = groupBySection(items);
  const topSources = useMemo(() => rankSources(items), [items]);

  return (
    // Simple two-column layout: one "main" block containing every section
    // stacked (space-y-10), one "aside" block next to it. This is
    // deliberately the plain, boring structure — a fancier version that
    // gave each section header its own full-width grid row (so the dashed
    // rule could run edge-to-edge past the sidebar) broke badly: the aside
    // had to span every row via `grid-row: 1 / -1`, and CSS Grid's
    // track-sizing algorithm dumped all of the aside's extra height into
    // the very first row, pushing the entire feed down behind a huge empty
    // gap. Reverted to this single-row layout, which doesn't need any
    // row-spanning at all — aside is just position:sticky within the one
    // row it shares with main, which is exactly how "keep the sidebar
    // pinned while scrolling a much taller column" is normally done.
    //
    // The sidebar is a fixed 260px (not a 1/3-width grid track) so "main"
    // claims most of the page — this is what actually addresses "the rule
    // should be as wide as the page, not just the article column": it
    // can't run fully edge-to-edge without the fragile row-span trick
    // above, but a fixed narrow sidebar closes nearly all of that gap.
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="space-y-10">
        {sections.map((section, sectionIndex) => {
          const isCollapsed = collapsed[section.name];
          // The first section (Top Stories / Breaking News) stays a single
          // wide column, like a hero feed; every other section packs two
          // cards per row so the page doesn't get too long.
          const isFeatured = sectionIndex === 0;
          return (
            <div key={section.name} id={`section-${slugify(section.name)}`} className="scroll-mt-6">
              <div className="section-header mb-4 border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => toggleSection(section.name)}
                  className="flex items-center gap-2 text-left"
                >
                  <h2 className="text-lg font-bold text-slate-900">{section.name}</h2>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                      isCollapsed ? "-rotate-90" : ""
                    }`}
                  />
                </button>
              </div>

              {!isCollapsed && (
                <div className={isFeatured ? "space-y-5" : "grid grid-cols-1 gap-5 md:grid-cols-2"}>
                  {section.items.map((item) => (
                    <ArticleCard
                      key={item.id}
                      item={item}
                      rating={feedback[item.id]}
                      onRate={rate}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <aside className="space-y-8 lg:sticky lg:top-6 lg:self-start">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            In this briefing
          </p>
          <nav className="space-y-1">
            {sections.map((s) => (
              <a
                key={s.name}
                href={`#section-${slugify(s.name)}`}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <span className="truncate">{s.name}</span>
                <span className="shrink-0 text-xs text-slate-400">{s.items.length}</span>
              </a>
            ))}
          </nav>
        </div>

        {topSources.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Top sources today
            </p>
            <div className="space-y-3">
              {topSources.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-900 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-400">
                      {s.count} {s.count === 1 ? "story" : "stories"}
                    </p>
                  </div>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(
                      s.name
                    )}`}
                  >
                    {s.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
