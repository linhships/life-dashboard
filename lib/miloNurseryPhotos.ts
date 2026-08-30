import fs from "fs";
import path from "path";
import exifr from "exifr";
import { hashId } from "./hash";

// Reads a flat folder of Milo's nursery photos (e.g. exported from Photos,
// or saved down from a nursery app) and builds a day-by-day gallery — same
// idea as lib/toriPhotos.ts, but this source has no WhatsApp _chat.txt
// alongside it, so there's no sender metadata or message timestamp to key
// off. Instead, each photo's own EXIF DateTimeOriginal is read directly
// off the file to determine which day it belongs to and how to order it
// within that day.
//
// Because there's no "sent by Tori" filter to lean on here, every photo in
// the folder is a candidate. The same near-white/desaturation heuristic
// used for the Tori photos was run over all of them; it flagged exactly
// one (a Bright Horizons app screenshot of a teacher's text update, not a
// photo of Milo) which was hand-confirmed and excluded below. As with the
// Tori gallery, this list is expected to grow if a bad photo is spotted
// later by eye.
const EXCLUDED_PHOTOS = new Set<string>([
  // Screenshot of a Bright Horizons nursery-app post (teacher's written
  // update + photos of the wider class, not a photo of Milo) — flagged by
  // the near-white heuristic and hand-confirmed.
  "IMG_1398.jpeg",
]);

function miloNurseryPhotosDir(): string | null {
  const dir = process.env.MILO_NURSERY_PHOTOS_DIR?.trim();
  return dir || null;
}

// Matches the folder's actual filenames (iPhone-style "IMG_0158.jpeg").
// 11 files in this folder carry a " (1)" suffix (e.g. "IMG_9523 (1).jpeg")
// — the macOS/Chrome auto-rename applied when a second, *different* photo
// happened to get saved under an IMG_ number already used by an earlier
// one. Confirmed by byte comparison that these aren't duplicates of their
// unsuffixed counterpart, so the pattern allows an optional " (<n>)" rather
// than dropping them. Used both to pick out which files to read and, in
// resolveMiloNurseryPhotoPath, as a path-traversal guard.
const PHOTO_FILENAME_RE = /^IMG_\d+(?: \(\d+\))?\.jpe?g$/i;

export interface MiloNurseryPhoto {
  id: string;
  file: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
}

export interface MiloNurseryDay {
  date: string; // YYYY-MM-DD
  photos: MiloNurseryPhoto[];
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Not cached, same rationale as lib/toriPhotos.ts — this folder is small
// and personal, and re-reading keeps it in sync if it's ever refreshed.
// exifr.parse is asked for only the DateTimeOriginal tag, which it can
// read from the file's header without pulling in the full image data.
export async function getMiloNurseryDays(): Promise<MiloNurseryDay[]> {
  const dir = miloNurseryPhotosDir();
  if (!dir || !fs.existsSync(dir)) return [];

  const photosByDate = new Map<string, MiloNurseryPhoto[]>();

  const files = fs.readdirSync(/* turbopackIgnore: true */ dir);
  for (const file of files) {
    if (!PHOTO_FILENAME_RE.test(file)) continue;
    if (EXCLUDED_PHOTOS.has(file)) continue;

    let dt: Date | undefined;
    try {
      const tags = await exifr.parse(path.join(dir, file), ["DateTimeOriginal"]);
      dt = tags?.DateTimeOriginal;
    } catch {
      // Unreadable/corrupt EXIF — skip rather than lose the whole gallery.
    }
    if (!dt || Number.isNaN(dt.getTime())) continue;

    const date = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    const time = `${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
    const photo: MiloNurseryPhoto = {
      id: hashId(file),
      file,
      date,
      time,
    };
    const bucket = photosByDate.get(date);
    if (bucket) bucket.push(photo);
    else photosByDate.set(date, [photo]);
  }

  const days: MiloNurseryDay[] = Array.from(photosByDate.entries()).map(([date, photos]) => ({
    date,
    photos: photos.sort((a, b) => a.time.localeCompare(b.time)),
  }));

  // Chronological — oldest first — same ordering convention as
  // lib/toriPhotos.ts; the gallery component reverses this for display.
  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

// Resolves a filename to an absolute path on disk for the media API route,
// guarding against path traversal: the filename must match the expected
// "IMG_<digits>.jpe?g" shape (a fixed pattern, not attacker-controlled
// beyond that), which also rules out "../" or any other path segment.
export function resolveMiloNurseryPhotoPath(file: string): string | null {
  const dir = miloNurseryPhotosDir();
  if (!dir) return null;
  if (!PHOTO_FILENAME_RE.test(file)) return null;
  const resolved = path.join(dir, file);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}
