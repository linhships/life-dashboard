import fs from "fs";
import path from "path";
import { hashId } from "./hash";

// Reads Arlo's nursery folder and builds a day-by-day gallery, same idea as
// lib/miloNurseryPhotos.ts, but this source has two things Milo's doesn't:
//
//  1. A nested <dir>/<year>/<month name>/ tree (one folder per month) rather
//     than a single flat folder, and filenames that already carry their date
//     ("2026-09-04_IMG_1972.jpeg") — so no EXIF read is needed, the date is
//     just the filename prefix.
//  2. An `updates.md` per month folder — Bright Horizons nursery-app data
//     (meals, naps, nappies, sign-in/out times, teacher observations)
//     compiled per day under "### <Weekday, Mon DD, YYYY>" headers. Each
//     month's raw app screenshots (the source updates.md was compiled from)
//     get moved into that month's completed/ subfolder — those are
//     screenshots of app text, not photos of Arlo, so completed/ is
//     deliberately skipped when collecting photos.
//
// A day can have photos with no update (nothing notable logged that day),
// an update with no photos (e.g. a sick day), or both — all three are kept.

function arloNurseryPhotosDir(): string | null {
  const dir = process.env.ARLO_NURSERY_PHOTOS_DIR?.trim();
  return dir || null;
}

// "2026-09-04_IMG_1972.jpeg" -> date "2026-09-04". No " (1)"-style
// duplicate-suffix handling needed here (unlike Milo's folder) — this
// export hasn't hit that collision yet, but the pattern would just fail to
// match and the file would be silently skipped if it ever does.
const PHOTO_FILENAME_RE = /^(\d{4}-\d{2}-\d{2})_IMG_\d+\.jpe?g$/i;

// A month folder as the rest of this file expects it: "<year>/<month
// name>", e.g. "2026/9 September" — matches how the folders are actually
// named on disk (a leading month number keeps them in sorted order in
// Finder). Used both to discover month folders and, in
// resolveArloNurseryPhotoPath, as a path-traversal guard: because this
// only ever allows exactly two path segments in this fixed shape, there's
// no way to smuggle in a "completed" segment or a "..".
const MONTH_DIR_RE = /^\d{4}\/\d{1,2} [^/]+$/;

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

// Matches "### Tuesday, Aug 11, 2026" day headers in updates.md.
const DAY_HEADING_RE = /^###\s+\w+,\s+(\w{3})\w*\s+(\d{1,2}),\s+(\d{4})\s*$/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export interface ArloNurseryPhoto {
  id: string;
  monthDir: string; // e.g. "2026/9 September"
  file: string;
  date: string; // YYYY-MM-DD
}

export interface ArloNurseryDay {
  date: string; // YYYY-MM-DD
  photos: ArloNurseryPhoto[];
  updateMarkdown: string | null;
}

// Splits one month's updates.md into { date, body } blocks, one per "### "
// day heading. The file has some boilerplate outside any day heading — an
// intro paragraph before the first heading, and a "This file was compiled
// automatically..." footer after the last one, both preceded by a bare
// "---" line — so anything from the last "\n---" onward is dropped before
// splitting, and content before the first heading is simply never matched.
function parseUpdatesFile(content: string): Map<string, string> {
  const lastDivider = content.lastIndexOf("\n---");
  const trimmed = lastDivider === -1 ? content : content.slice(0, lastDivider);

  const lines = trimmed.split(/\r?\n/);
  const byDate = new Map<string, string>();
  let currentDate: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentDate && currentLines.length > 0) {
      const body = currentLines.join("\n").trim();
      if (body) byDate.set(currentDate, body);
    }
    currentLines = [];
  };

  for (const line of lines) {
    const m = line.match(DAY_HEADING_RE);
    if (m) {
      flush();
      const [, monAbbr, day, year] = m;
      const month = MONTHS[monAbbr.toLowerCase()];
      currentDate = month ? `${year}-${pad(month)}-${pad(Number(day))}` : null;
      continue;
    }
    if (currentDate) currentLines.push(line);
  }
  flush();

  return byDate;
}

// Not cached, same rationale as lib/toriPhotos.ts/lib/miloNurseryPhotos.ts —
// small personal folder, re-reading keeps it in sync if it's ever refreshed.
export function getArloNurseryDays(): ArloNurseryDay[] {
  const dir = arloNurseryPhotosDir();
  if (!dir || !fs.existsSync(dir)) return [];

  const photosByDate = new Map<string, ArloNurseryPhoto[]>();
  const updatesByDate = new Map<string, string>();

  let years: fs.Dirent[];
  try {
    years = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const year of years) {
    if (!year.isDirectory() || !/^\d{4}$/.test(year.name)) continue;
    const yearPath = path.join(dir, year.name);

    let months: fs.Dirent[];
    try {
      months = fs.readdirSync(yearPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const month of months) {
      if (!month.isDirectory()) continue;
      const monthDir = `${year.name}/${month.name}`;
      if (!MONTH_DIR_RE.test(monthDir)) continue;
      const monthPath = path.join(yearPath, month.name);

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(monthPath, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isFile()) continue; // skips the completed/ subfolder

        const photoMatch = entry.name.match(PHOTO_FILENAME_RE);
        if (photoMatch) {
          const date = photoMatch[1];
          const photo: ArloNurseryPhoto = {
            id: hashId(`${monthDir}|${entry.name}`),
            monthDir,
            file: entry.name,
            date,
          };
          const bucket = photosByDate.get(date);
          if (bucket) bucket.push(photo);
          else photosByDate.set(date, [photo]);
          continue;
        }

        if (entry.name === "updates.md") {
          let content: string;
          try {
            content = fs.readFileSync(path.join(monthPath, entry.name), "utf-8");
          } catch {
            continue;
          }
          for (const [date, body] of parseUpdatesFile(content)) {
            updatesByDate.set(date, body);
          }
        }
      }
    }
  }

  const allDates = new Set<string>([...photosByDate.keys(), ...updatesByDate.keys()]);
  const days: ArloNurseryDay[] = Array.from(allDates).map((date) => ({
    date,
    // Filename has no time component, so photos within a day fall back to
    // their IMG number (which is chronological on export) for ordering.
    photos: (photosByDate.get(date) ?? []).sort((a, b) => a.file.localeCompare(b.file)),
    updateMarkdown: updatesByDate.get(date) ?? null,
  }));

  // Chronological — oldest first, same convention as the Tori/Milo
  // galleries; the gallery component reverses this for display.
  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

// Resolves a (monthDir, file) pair to an absolute path on disk for the
// media API route, guarding against path traversal: monthDir must match the
// fixed "<year>/<month name>" shape (so it can't reach into a completed/
// subfolder or use ".."), and file must match the expected date-prefixed
// photo filename shape.
export function resolveArloNurseryPhotoPath(monthDir: string, file: string): string | null {
  const dir = arloNurseryPhotosDir();
  if (!dir) return null;
  if (!MONTH_DIR_RE.test(monthDir)) return null;
  if (!PHOTO_FILENAME_RE.test(file)) return null;
  const resolved = path.join(dir, monthDir, file);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}
