"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Images } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ArloNurseryDay, ArloNurseryPhoto } from "@/lib/arloNurseryPhotos";

function photoUrl(photo: ArloNurseryPhoto): string {
  return `/api/arlo-nursery/image?monthDir=${encodeURIComponent(
    photo.monthDir
  )}&file=${encodeURIComponent(photo.file)}`;
}

function formatPhotoCount(n: number): string {
  return `${n} ${n === 1 ? "photo" : "photos"}`;
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
  return date.slice(0, 7); // YYYY-MM
}

function formatMonthHeading(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// Same sliding-track, seamless-infinite-loop carousel as
// components/MiloNurseryGallery.tsx's DayCarousel — see the comments there
// for how the clone-slide technique avoids the "huge jump" when wrapping
// from last photo back to first.
function DayCarousel({ photos }: { photos: ArloNurseryPhoto[] }) {
  const n = photos.length;
  const hasMultiple = n > 1;

  const slides = hasMultiple ? [photos[n - 1], ...photos, photos[0]] : photos;
  const [pos, setPos] = useState(hasMultiple ? 1 : 0);
  const [withTransition, setWithTransition] = useState(true);
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

  useEffect(() => {
    if (!hasMultiple) return;
    const id = setInterval(() => step(1), 3500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultiple, n]);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-white sm:aspect-[16/9]">
      <div
        className={`flex h-full ${
          withTransition ? "transition-transform duration-700 ease-in-out" : ""
        }`}
        style={{ transform: `translateX(-${pos * 100}%)` }}
        onTransitionEnd={handleTransitionEnd}
      >
        {slides.map((p, i) => (
          <div key={`${p.id}-${i}`} className="h-full w-full shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl(p)}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          </div>
        ))}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => jumpTo(i)}
                aria-label={`Go to photo ${i + 1}`}
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

// The nursery-app update text for a day (meals/naps/nappies + teacher
// observations, see lib/arloNurseryPhotos.ts) can run long, so it's
// collapsed to a fixed height by default with a fade-out + toggle, same
// "read more" idea as the news feed excerpts.
function UpdateText({ markdown }: { markdown: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="px-4 py-3">
      <div className={`relative ${expanded ? "" : "max-h-48 overflow-hidden"}`}>
        <div className="prose-arlo-update text-xs leading-relaxed text-slate-600">
          <ReactMarkdown
            components={{
              p: (props) => <p className="mb-1.5 last:mb-0" {...props} />,
              ul: (props) => <ul className="mb-1.5 list-disc space-y-0.5 pl-4" {...props} />,
              li: (props) => <li {...props} />,
              strong: (props) => <strong className="font-semibold text-slate-800" {...props} />,
              em: (props) => <em className="text-slate-500" {...props} />,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white" />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-1 text-xs font-medium text-blue-600 hover:underline"
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

function DayCard({ day }: { day: ArloNurseryDay }) {
  const hasPhotos = day.photos.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col md:flex-row">
        {hasPhotos && (
          <div className="md:w-[45%] md:shrink-0">
            <DayCarousel photos={day.photos} />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{formatDayHeading(day.date)}</p>
            {hasPhotos && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                <Images className="h-3.5 w-3.5" />
                {formatPhotoCount(day.photos.length)}
              </span>
            )}
          </div>

          {day.updateMarkdown ? (
            <UpdateText markdown={day.updateMarkdown} />
          ) : (
            <p className="px-4 py-3 text-xs text-slate-400">No nursery-app update logged.</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface MonthGroup {
  key: string;
  days: ArloNurseryDay[];
}

function groupByMonth(days: ArloNurseryDay[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const day of days) {
    const key = monthKey(day.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.days.push(day);
    } else {
      groups.push({ key, days: [day] });
    }
  }
  return groups;
}

export function ArloNurseryGallery({ days }: { days: ArloNurseryDay[] }) {
  // `days` comes in oldest-first. Reverse before grouping so the most
  // recent month lands first and, within it, the most recent day is first
  // too — most-recent-on-top throughout, same as the other galleries.
  const groups = useMemo(() => groupByMonth([...days].reverse()), [days]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.key, true]))
  );

  const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  if (days.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No updates found yet. Check that ARLO_NURSERY_PHOTOS_DIR points at the nursery photos
        folder.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.key] ?? true;
        const monthPhotoCount = group.days.reduce((sum, d) => sum + d.photos.length, 0);
        return (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className="flex w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-slate-50"
            >
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                  isCollapsed ? "-rotate-90" : ""
                }`}
              />
              <h2 className="text-lg font-bold text-slate-900">{formatMonthHeading(group.key)}</h2>
              <span className="text-sm text-slate-400">
                {group.days.length} {group.days.length === 1 ? "day" : "days"} ·{" "}
                {formatPhotoCount(monthPhotoCount)}
              </span>
            </button>

            {!isCollapsed && (
              <div className="mt-4 space-y-5">
                {group.days.map((day) => (
                  <DayCard key={day.date} day={day} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
