"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Images } from "lucide-react";
import type { MiloNurseryDay, MiloNurseryPhoto } from "@/lib/miloNurseryPhotos";
import { PhotoCarousel } from "./PhotoCarousel";

// The route that serves the photo bytes. Configurable because the
// grandparent-facing /family view reuses this gallery but has to go
// through /api/family/milo-image (its own passcode, and the only API
// prefix the tailnet proxy forwards) — see FAMILY-ACCESS.md.
const DEFAULT_IMAGE_ENDPOINT = "/api/milo-nursery/image";

function photoUrl(photo: MiloNurseryPhoto, endpoint: string): string {
  return `${endpoint}?file=${encodeURIComponent(photo.file)}`;
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
// components/ToriPhotosGallery.tsx's DayCarousel — see the comments there
// for how the clone-slide technique avoids the "huge jump" when wrapping
// from last photo back to first. This version drops all the video-specific
// bits (refs, autoplay, onPause) since this folder is photos only.
// The day's card: the pager (now components/PhotoCarousel.tsx, shared with
// the other galleries and carrying the drag/flick gesture layer) plus the
// date and count footer.
function DayCarousel({ day, imageEndpoint }: { day: MiloNurseryDay; imageEndpoint: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <PhotoCarousel
        slides={day.photos.map((p) => ({
          id: p.id,
          src: photoUrl(p, imageEndpoint),
          type: "photo" as const,
        }))}
        className="relative aspect-[4/3] w-full overflow-hidden bg-white sm:aspect-[16/9]"
        ariaLabel={`Nursery photos from ${formatDayHeading(day.date)}`}
      />

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{formatDayHeading(day.date)}</p>
        <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
          <Images className="h-3.5 w-3.5" />
          {formatPhotoCount(day.photos.length)}
        </span>
      </div>
    </div>
  );
}

interface MonthGroup {
  key: string;
  days: MiloNurseryDay[];
}

function groupByMonth(days: MiloNurseryDay[]): MonthGroup[] {
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

export function MiloNurseryGallery({
  days,
  imageEndpoint = DEFAULT_IMAGE_ENDPOINT,
}: {
  days: MiloNurseryDay[];
  imageEndpoint?: string;
}) {
  // `days` comes in oldest-first. Reverse before grouping so the most
  // recent month lands first and, within it, the most recent day is first
  // too — most-recent-on-top throughout, same as the Tori gallery.
  const groups = useMemo(() => groupByMonth([...days].reverse()), [days]);

  // Collapsed by default, keyed by month, initialized once from the first
  // render's groups so every month starts closed.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.key, true]))
  );

  const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  if (days.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No photos found yet. Check that MILO_NURSERY_PHOTOS_DIR points at the nursery photos
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
              <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                {group.days.map((day) => (
                  <DayCarousel key={day.date} day={day} imageEndpoint={imageEndpoint} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
