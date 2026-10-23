"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Images } from "lucide-react";
import type { ToriCareDay, ToriPhoto } from "@/lib/toriPhotos";
import { PhotoCarousel } from "./PhotoCarousel";

// The route that serves the photo/video bytes — configurable for the same
// reason as in MiloNurseryGallery.tsx (the /family view goes through
// /api/family/tori-image instead).
const DEFAULT_MEDIA_ENDPOINT = "/api/tori-photos/image";

function mediaUrl(photo: ToriPhoto, endpoint: string): string {
  return `${endpoint}?chat=${encodeURIComponent(photo.chat)}&file=${encodeURIComponent(
    photo.file
  )}`;
}

// "3 photos" / "3 photos · 1 video" — days can now mix both.
function formatMediaCount(photos: ToriPhoto[]): string {
  const videos = photos.filter((p) => p.type === "video").length;
  const stills = photos.length - videos;
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
// The day's card: the pager (now components/PhotoCarousel.tsx, shared with
// the other galleries and carrying the drag/flick gesture layer) plus the
// date and count footer.
function DayCarousel({ day, mediaEndpoint }: { day: ToriCareDay; mediaEndpoint: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <PhotoCarousel
        slides={day.photos.map((p) => ({
          id: p.id,
          src: mediaUrl(p, mediaEndpoint),
          type: p.type === "video" ? ("video" as const) : ("photo" as const),
        }))}
        className="relative aspect-[4/3] w-full overflow-hidden bg-white sm:aspect-[16/9]"
        ariaLabel={`Photos and videos from ${formatDayHeading(day.date)}`}
      />

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{formatDayHeading(day.date)}</p>
        <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
          <Images className="h-3.5 w-3.5" />
          {formatMediaCount(day.photos)}
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

export function ToriPhotosGallery({
  days,
  mediaEndpoint = DEFAULT_MEDIA_ENDPOINT,
}: {
  days: ToriCareDay[];
  mediaEndpoint?: string;
}) {
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
        const monthMedia = group.days.flatMap((d) => d.photos);
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
                {formatMediaCount(monthMedia)}
              </span>
            </button>

            {!isCollapsed && (
              <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                {group.days.map((day) => (
                  <DayCarousel key={day.date} day={day} mediaEndpoint={mediaEndpoint} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
