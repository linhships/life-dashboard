"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
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
  const [index, setIndex] = useState(0);
  const photos = day.photos;
  const hasMultiple = photos.length > 1;

  const goTo = (i: number) => setIndex((i + photos.length) % photos.length);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] w-full bg-slate-100 sm:aspect-[16/9]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photos[index].id}
          src={photoUrl(photos[index])}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
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
                  onClick={() => setIndex(i)}
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
  const groups = useMemo(() => groupByMonth(days), [days]);

  if (days.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No photos found yet. Check that TORI_PHOTOS_DIR points at the exported WhatsApp chat
        folders.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <div key={group.key}>
          <h2 className="mb-4 text-lg font-bold text-slate-900">{formatMonthHeading(group.key)}</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {group.days.map((day) => (
              <DayCarousel key={day.date} day={day} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
