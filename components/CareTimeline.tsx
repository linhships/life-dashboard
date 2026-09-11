"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Images } from "lucide-react";
import type { ArloNurseryDay } from "@/lib/arloNurseryPhotos";
import type { ChiarlineDay } from "@/lib/chiarlineDays";
import { DayFacts, UpdateText } from "./ArloNurseryGallery";

// One timeline for Arlo's days, whichever kind of day it was: at nursery
// (Bright Horizons app data + their photos) or with Chiarline (her photos
// and what she wrote). They used to be two separate lists, which meant
// scrolling two places to answer "what happened last Tuesday" — and some
// days are both, so they'd appear twice.
//
// Each day is one card. Inside it, one block per source that has anything
// that day: media on the left, words on the right.

const DEFAULT_NURSERY_ENDPOINT = "/api/arlo-nursery/image";
const DEFAULT_CHIARLINE_ENDPOINT = "/api/chiarline/image";

// Both sources reduce to this before rendering, so the carousel doesn't
// need to know where a picture came from.
interface Slide {
  id: string;
  src: string;
  type: "photo" | "video";
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

function formatSlideCount(slides: Slide[]): string {
  const videos = slides.filter((s) => s.type === "video").length;
  const stills = slides.length - videos;
  const parts: string[] = [];
  if (stills > 0) parts.push(`${stills} ${stills === 1 ? "photo" : "photos"}`);
  if (videos > 0) parts.push(`${videos} ${videos === 1 ? "video" : "videos"}`);
  return parts.join(" · ");
}

// Sliding-track carousel with clone slides at each end, so wrapping from
// the last picture to the first doesn't visibly rewind the whole strip.
function MediaCarousel({ slides }: { slides: Slide[] }) {
  const n = slides.length;
  const hasMultiple = n > 1;

  const track = hasMultiple ? [slides[n - 1], ...slides, slides[0]] : slides;
  const [pos, setPos] = useState(hasMultiple ? 1 : 0);
  const [withTransition, setWithTransition] = useState(true);
  const [paused, setPaused] = useState(false);
  const index = hasMultiple ? (((pos - 1) % n) + n) % n : 0;

  const step = (delta: number) => {
    setWithTransition(true);
    setPos((p) => p + delta);
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

  // Autoplay, but not while a video is playing — sliding away mid-video is
  // the one thing that makes these annoying.
  useEffect(() => {
    if (!hasMultiple || paused) return;
    const id = setInterval(() => step(1), 3500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultiple, n, paused]);

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  return (
    // Fixed aspect ratio on mobile, where it sits above the text and has
    // nothing to match; on desktop it stretches to the text column's
    // height via md:h-full plus the row's default align-items: stretch.
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-white sm:aspect-[16/9] md:aspect-auto md:h-full">
      <div
        className={`flex h-full ${
          withTransition ? "transition-transform duration-700 ease-in-out" : ""
        }`}
        style={{ transform: `translateX(-${pos * 100}%)` }}
        onTransitionEnd={handleTransitionEnd}
      >
        {track.map((s, i) => (
          <div key={`${s.id}-${i}`} className="h-full w-full shrink-0">
            {s.type === "video" ? (
              <video
                ref={(el) => {
                  videoRefs.current[`${s.id}-${i}`] = el;
                }}
                src={s.src}
                controls
                playsInline
                preload="metadata"
                onPlay={() => setPaused(true)}
                onPause={() => setPaused(false)}
                onEnded={() => setPaused(false)}
                className="h-full w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.src}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain"
              />
            )}
          </div>
        ))}
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
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setWithTransition(true);
                  setPos(i + 1);
                }}
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

// One source's half of a day: its pictures beside its words.
function SourceBlock({
  label,
  tint,
  slides,
  children,
}: {
  label: string;
  tint: string;
  slides: Slide[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row">
      {slides.length > 0 && (
        <div className="md:w-[45%] md:shrink-0">
          <MediaCarousel slides={slides} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tint}`}
          >
            {label}
          </span>
          {slides.length > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
              <Images className="h-3.5 w-3.5" />
              {formatSlideCount(slides)}
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

interface CareDay {
  date: string;
  nursery: ArloNurseryDay | null;
  chiarline: ChiarlineDay | null;
}

function DayCard({
  day,
  nurseryEndpoint,
  chiarlineEndpoint,
}: {
  day: CareDay;
  nurseryEndpoint: string;
  chiarlineEndpoint: string;
}) {
  const nurserySlides: Slide[] = (day.nursery?.photos ?? []).map((p) => ({
    id: p.id,
    src: `${nurseryEndpoint}?monthDir=${encodeURIComponent(p.monthDir)}&file=${encodeURIComponent(
      p.file
    )}`,
    type: "photo",
  }));
  const chiarlineSlides: Slide[] = (day.chiarline?.media ?? []).map((m) => ({
    id: m.id,
    src: `${chiarlineEndpoint}?file=${encodeURIComponent(m.file)}`,
    type: m.type,
  }));

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{formatDayHeading(day.date)}</p>
      </div>

      {day.nursery && (
        <SourceBlock label="Nursery" tint="bg-blue-50 text-blue-700" slides={nurserySlides}>
          {day.nursery.facts && <DayFacts facts={day.nursery.facts} />}
          {day.nursery.observationsMarkdown && (
            <UpdateText
              markdown={day.nursery.observationsMarkdown}
              bordered={Boolean(day.nursery.facts)}
            />
          )}
          {!day.nursery.facts && !day.nursery.observationsMarkdown && (
            <p className="px-4 pb-3 text-xs text-slate-400">Photos only — nothing written.</p>
          )}
        </SourceBlock>
      )}

      {day.chiarline && (
        <div className={day.nursery ? "border-t border-slate-100" : ""}>
          <SourceBlock
            label="With Chiarline"
            tint="bg-emerald-50 text-emerald-700"
            slides={chiarlineSlides}
          >
            {day.chiarline.notes.length > 0 ? (
              <div className="space-y-2.5 px-4 pb-3">
                {day.chiarline.notes.map((note, i) => (
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
              <p className="px-4 pb-3 text-xs text-slate-400">Photos only — nothing written.</p>
            )}
          </SourceBlock>
        </div>
      )}
    </article>
  );
}

interface MonthGroup {
  key: string;
  days: CareDay[];
}

// Both sources, keyed by date, newest first.
function mergeDays(nursery: ArloNurseryDay[], chiarline: ChiarlineDay[]): CareDay[] {
  const byDate = new Map<string, CareDay>();
  const get = (date: string): CareDay => {
    const existing = byDate.get(date);
    if (existing) return existing;
    const created: CareDay = { date, nursery: null, chiarline: null };
    byDate.set(date, created);
    return created;
  };
  for (const d of nursery) get(d.date).nursery = d;
  for (const d of chiarline) get(d.date).chiarline = d;
  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function groupByMonth(days: CareDay[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const day of days) {
    const key = monthKey(day.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.days.push(day);
    else groups.push({ key, days: [day] });
  }
  return groups;
}

export function CareTimeline({
  nurseryDays,
  chiarlineDays,
  nurseryEndpoint = DEFAULT_NURSERY_ENDPOINT,
  chiarlineEndpoint = DEFAULT_CHIARLINE_ENDPOINT,
}: {
  nurseryDays: ArloNurseryDay[];
  chiarlineDays: ChiarlineDay[];
  nurseryEndpoint?: string;
  chiarlineEndpoint?: string;
}) {
  const groups = useMemo(
    () => groupByMonth(mergeDays(nurseryDays, chiarlineDays)),
    [nurseryDays, chiarlineDays]
  );

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.key, true]))
  );

  const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  if (groups.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nothing here yet. Check that ARLO_NURSERY_PHOTOS_DIR and CHIARLINE_DIR point at the right
        folders.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.key] ?? true;
        const mediaCount = group.days.reduce(
          (sum, d) => sum + (d.nursery?.photos.length ?? 0) + (d.chiarline?.media.length ?? 0),
          0
        );
        const nurseryCount = group.days.filter((d) => d.nursery).length;
        const chiarlineCount = group.days.filter((d) => d.chiarline).length;
        return (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg py-2 text-left hover:bg-slate-100"
            >
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                  isCollapsed ? "-rotate-90" : ""
                }`}
              />
              <h3 className="text-lg font-bold text-slate-900">{formatMonthHeading(group.key)}</h3>
              <span className="text-sm text-slate-400">
                {group.days.length} {group.days.length === 1 ? "day" : "days"}
                {nurseryCount > 0 ? ` · ${nurseryCount} nursery` : ""}
                {chiarlineCount > 0 ? ` · ${chiarlineCount} with Chiarline` : ""}
                {mediaCount > 0 ? ` · ${mediaCount} photos` : ""}
              </span>
            </button>

            {!isCollapsed && (
              <div className="mt-4 space-y-5">
                {group.days.map((day) => (
                  <DayCard
                    key={day.date}
                    day={day}
                    nurseryEndpoint={nurseryEndpoint}
                    chiarlineEndpoint={chiarlineEndpoint}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
