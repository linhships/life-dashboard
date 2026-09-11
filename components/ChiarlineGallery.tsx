"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Images, MessageCircle } from "lucide-react";
import type { ChiarlineDay, ChiarlineMedia } from "@/lib/chiarlineDays";

// Days with Chiarline, laid out the same way as the Arlo nursery report:
// full-width day cards, media on the left, what she wrote on the right.
//
// This is the fourth carousel in the app (Tori, Milo, Arlo, here). They've
// deliberately not been merged: each has picked up behaviour the others
// don't want — Tori's pauses autoplay on a playing video, Arlo's stretches
// to the height of the text beside it, Milo's is photos-only — and the
// shared part is ~40 lines of transform maths. Worth revisiting if a fifth
// appears.

const DEFAULT_MEDIA_ENDPOINT = "/api/chiarline/image";

function mediaUrl(item: ChiarlineMedia, endpoint: string): string {
  return `${endpoint}?file=${encodeURIComponent(item.file)}`;
}

function formatMediaCount(items: ChiarlineMedia[]): string {
  const videos = items.filter((m) => m.type === "video").length;
  const stills = items.length - videos;
  const parts: string[] = [];
  if (stills > 0) parts.push(`${stills} ${stills === 1 ? "photo" : "photos"}`);
  if (videos > 0) parts.push(`${videos} ${videos === 1 ? "video" : "videos"}`);
  return parts.join(" · ") || "0 photos";
}

function formatDayHeading(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function formatMonthHeading(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function DayCarousel({
  items,
  mediaEndpoint,
}: {
  items: ChiarlineMedia[];
  mediaEndpoint: string;
}) {
  const n = items.length;
  const hasMultiple = n > 1;

  const slides = hasMultiple ? [items[n - 1], ...items, items[0]] : items;
  const [pos, setPos] = useState(hasMultiple ? 1 : 0);
  const [withTransition, setWithTransition] = useState(true);
  const [paused, setPaused] = useState(false);
  const index = hasMultiple ? (((pos - 1) % n) + n) % n : 0;

  const step = (delta: number) => {
    setWithTransition(true);
    setPos((p) => p + delta);
  };
  const jumpTo = (i: number) => {
    setWithTransition(true);
    setPos(i + 1);
  };

  const handleTransitionEnd = () => {
    if (!hasMultiple) return;
    if (pos === n + 1) {
      setWithTransition(false);
      setPos(1);
    } else if (pos === 0) {
      setWithTransition(false);
      setPos(n);
    }
  };
  useEffect(() => {
    if (withTransition) return;
    const raf = requestAnimationFrame(() => setWithTransition(true));
    return () => cancelAnimationFrame(raf);
  }, [withTransition]);

  // Autoplay, unless a video is playing — sliding away mid-video is the
  // one thing that makes these carousels annoying.
  useEffect(() => {
    if (!hasMultiple || paused) return;
    const id = setInterval(() => step(1), 3500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultiple, n, paused]);

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-white sm:aspect-[16/9] md:aspect-auto md:h-full">
      <div
        className={`flex h-full ${
          withTransition ? "transition-transform duration-700 ease-in-out" : ""
        }`}
        style={{ transform: `translateX(-${pos * 100}%)` }}
        onTransitionEnd={handleTransitionEnd}
      >
        {slides.map((p, i) =>
          p.type === "video" ? (
            <div key={`${p.id}-${i}`} className="h-full w-full shrink-0">
              <video
                ref={(el) => {
                  videoRefs.current[`${p.id}-${i}`] = el;
                }}
                src={mediaUrl(p, mediaEndpoint)}
                controls
                playsInline
                preload="metadata"
                onPlay={() => setPaused(true)}
                onPause={() => setPaused(false)}
                onEnded={() => setPaused(false)}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div key={`${p.id}-${i}`} className="h-full w-full shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(p, mediaEndpoint)}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain"
              />
            </div>
          )
        )}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous"
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {items.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => jumpTo(i)}
                aria-label={`Go to item ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DayCard({ day, mediaEndpoint }: { day: ChiarlineDay; mediaEndpoint: string }) {
  const hasMedia = day.media.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col md:flex-row">
        {hasMedia && (
          <div className="md:w-[45%] md:shrink-0">
            <DayCarousel items={day.media} mediaEndpoint={mediaEndpoint} />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{formatDayHeading(day.date)}</p>
            {hasMedia && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                <Images className="h-3.5 w-3.5" />
                {formatMediaCount(day.media)}
              </span>
            )}
          </div>

          {day.notes.length > 0 ? (
            <div className="space-y-2.5 px-4 py-3">
              {day.notes.map((note, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="w-11 shrink-0 pt-0.5 text-[11px] font-semibold tabular-nums text-slate-400">
                    {note.time}
                  </span>
                  {/* whitespace-pre-line keeps the line breaks she typed —
                      she often writes one thought per line. */}
                  <p className="min-w-0 whitespace-pre-line text-xs leading-relaxed text-slate-700">
                    {note.text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-3 text-xs text-slate-400">Photos only — nothing written.</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface MonthGroup {
  key: string;
  days: ChiarlineDay[];
}

function groupByMonth(days: ChiarlineDay[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const day of days) {
    const key = monthKey(day.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.days.push(day);
    else groups.push({ key, days: [day] });
  }
  return groups;
}

export function ChiarlineGallery({
  days,
  mediaEndpoint = DEFAULT_MEDIA_ENDPOINT,
}: {
  days: ChiarlineDay[];
  mediaEndpoint?: string;
}) {
  // `days` arrives oldest-first; reverse so the most recent month (and the
  // most recent day within it) is on top, same as the other galleries.
  const groups = useMemo(() => groupByMonth([...days].reverse()), [days]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.key, true]))
  );

  const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  if (days.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nothing here yet. Check that CHIARLINE_DIR points at the folder holding the WhatsApp
        export.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.key] ?? true;
        const mediaCount = group.days.reduce((sum, d) => sum + d.media.length, 0);
        const noteCount = group.days.reduce((sum, d) => sum + d.notes.length, 0);
        return (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className="flex w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-slate-100"
            >
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                  isCollapsed ? "-rotate-90" : ""
                }`}
              />
              <h3 className="text-lg font-bold text-slate-900">
                {formatMonthHeading(group.key)}
              </h3>
              <span className="flex items-center gap-3 text-sm text-slate-400">
                <span>
                  {group.days.length} {group.days.length === 1 ? "day" : "days"}
                </span>
                {mediaCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Images className="h-3.5 w-3.5" />
                    {mediaCount}
                  </span>
                )}
                {noteCount > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {noteCount}
                  </span>
                )}
              </span>
            </button>

            {!isCollapsed && (
              <div className="mt-4 space-y-5">
                {group.days.map((day) => (
                  <DayCard key={day.date} day={day} mediaEndpoint={mediaEndpoint} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
