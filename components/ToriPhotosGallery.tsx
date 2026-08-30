"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Images } from "lucide-react";
import type { ToriCareDay, ToriPhoto } from "@/lib/toriPhotos";

function photoUrl(photo: ToriPhoto): string {
  return `/api/tori-photos/image?chat=${encodeURIComponent(photo.chat)}&file=${encodeURIComponent(
    photo.file
  )}`;
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

// Carousel "with controls and indicators": arrow buttons overlaid on the
// image for prev/next, plus a row of dot indicators along the bottom that
// jump straight to a given slide — the reference layout this was asked to
// match (TailAdmin's carousel demo).
function DayCarousel({ day }: { day: ToriCareDay }) {
  const photos = day.photos;
  const n = photos.length;
  const hasMultiple = n > 1;

  // Looping from the last photo back to the first (or back the other way)
  // used to be a straight index wrap — translateX jumping from -(n-1)*100%
  // back to 0% in one frame, which reads as a huge backward snap instead
  // of a continuation of the slide. To make the loop itself feel like a
  // slide, a clone of the last photo is placed before the real ones and a
  // clone of the first is placed after them, so sliding "past the end"
  // moves into a clone that looks identical to the real next slide. Once
  // that slide finishes, we snap (no transition) back to the matching real
  // slide — invisible to the eye since it looks the same either way. This
  // is the standard infinite-carousel technique, same idea TailAdmin's
  // demo carousel uses.
  const slides = hasMultiple ? [photos[n - 1], ...photos, photos[0]] : photos;
  // `pos` indexes into `slides`; real photo i lives at pos i+1.
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

  // After sliding into a clone, snap back to the real slide it matches —
  // done with the transition switched off for one frame, then switched
  // back on so the *next* slide still animates normally.
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

  // Auto-play: this component only ever exists in the DOM while its month
  // is expanded (the parent conditionally renders it), so mounting is the
  // same as becoming visible — advance to the next photo every few
  // seconds for as long as that's true, no separate "is this on screen"
  // check needed. Stops on unmount (month collapsed again).
  useEffect(() => {
    if (!hasMultiple) return;
    const id = setInterval(() => step(1), 3500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultiple, n]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white sm:aspect-[16/9]">
        {/* All of the day's photos sit side by side in one track; sliding
            between them is a CSS transform transition rather than swapping
            the img's src, which is what made the old version feel like a
            hard cut (a whole new element mounting, network permitting)
            instead of an actual slide — this is the same technique behind
            the TailAdmin carousel demo this was modeled on. */}
        <div
          className={`flex h-full ${
            withTransition ? "transition-transform duration-700 ease-in-out" : ""
          }`}
          style={{ transform: `translateX(-${pos * 100}%)` }}
          onTransitionEnd={handleTransitionEnd}
        >
          {slides.map((p, i) => (
            <div key={`${p.id}-${i}`} className="h-full w-full shrink-0">
              {/* object-contain (not cover) so a portrait photo is shown in
                  full, letterboxed with white margins, rather than cropped
                  to fill a landscape-ish frame — most of these WhatsApp
                  photos are tall portrait shots that cover was cutting the
                  tops/bottoms off. */}
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

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{formatDayHeading(day.date)}</p>
        <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
          <Images className="h-3.5 w-3.5" />
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </span>
      </div>
    </div>
  );
}

interface MonthGroup {
  key: string;
  days: ToriCareDay[];
}

function groupByMonth(days: ToriCareDay[]): MonthGroup[] {
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

export function ToriPhotosGallery({ days }: { days: ToriCareDay[] }) {
  // `days` comes in oldest-first. Reverse before grouping so the most
  // recent month lands first and, within it, the most recent day is first
  // too — most-recent-on-top throughout.
  const groups = useMemo(() => groupByMonth([...days].reverse()), [days]);

  // Collapsed by default — 292 days' worth of carousels all expanded at
  // once would be an enormous scroll. Keyed by month, initialized once
  // from the first render's groups so every month starts closed.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.key, true]))
  );

  const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  if (days.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No photos found yet. Check that TORI_PHOTOS_DIR points at the exported WhatsApp chat
        folders.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.key] ?? true;
        const photoCount = group.days.reduce((sum, d) => sum + d.photos.length, 0);
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
                {group.days.length} {group.days.length === 1 ? "day" : "days"} · {photoCount}{" "}
                {photoCount === 1 ? "photo" : "photos"}
              </span>
            </button>

            {!isCollapsed && (
              <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                {group.days.map((day) => (
                  <DayCarousel key={day.date} day={day} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
