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
export const PHOTO_FILENAME_RE = /^(\d{4}-\d{2}-\d{2})_IMG_\d+\.jpe?g$/i;

// A month folder as the rest of this file expects it: "<year>/<month
// name>", e.g. "2026/9 September" — matches how the folders are actually
// named on disk (a leading month number keeps them in sorted order in
// Finder). Used both to discover month folders and, in
// resolveArloNurseryPhotoPath, as a path-traversal guard: because this
// only ever allows exactly two path segments in this fixed shape, there's
// no way to smuggle in a "completed" segment or a "..".
export const MONTH_DIR_RE = /^\d{4}\/\d{1,2} [^/]+$/;

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

// Matches "### Tuesday, August 11, 2026" day headers in updates.md (full
// month name, not the 3-letter abbreviation — MONTHS is keyed by the first
// 3 letters lowercased, so "August" and "Aug" both resolve the same way).
const DAY_HEADING_RE = /^###\s+\w+,\s+(\w+)\s+(\d{1,2}),\s+(\d{4})\s*$/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export interface ArloNurseryPhoto {
  id: string;
  monthDir: string; // e.g. "2026/9 September"
  file: string;
  date: string; // YYYY-MM-DD
}

// The Bright Horizons app data at the top of each day's block is a fixed
// set of "- Label: detail" bullets — split out into named fields (each an
// array, since a day can log several meals/nappies/sleeps) so the gallery
// can render them as a small emoji-labeled visualization instead of a wall
// of bullet text. Any bullet that doesn't match a known label (rare — e.g.
// "- Arlo-Minh was sick") lands in `other` verbatim, so nothing is silently
// dropped just because it doesn't fit the usual shape.
export interface ArloDayFacts {
  signedIn: string | null;
  signedOut: string | null;
  expectedPickup: string | null;
  meals: string[];
  nappy: string[];
  sleep: string[];
  activity: string[];
  notes: string[];
  other: string[];
}

export interface ArloNurseryDay {
  date: string; // YYYY-MM-DD
  photos: ArloNurseryPhoto[];
  facts: ArloDayFacts | null;
  // Free-text portion of the day's block that isn't one of the fixed
  // bullets above — mainly the teacher's own written observations (bold
  // "**Name — time**" paragraphs), rendered as markdown.
  observationsMarkdown: string | null;
}

function hasFacts(f: ArloDayFacts): boolean {
  return (
    f.signedIn !== null ||
    f.signedOut !== null ||
    f.expectedPickup !== null ||
    f.meals.length > 0 ||
    f.nappy.length > 0 ||
    f.sleep.length > 0 ||
    f.activity.length > 0 ||
    f.notes.length > 0 ||
    f.other.length > 0
  );
}

// A field paragraph looks like "**Label:** detail text." or, for a
// parenthesized variant, "**Label (extra):** detail text." — `extra` is the
// note's timestamp for "Note (16:19):" or the author for "Observation
// (Tanisha T):"/"Post (Name, time):". The "s" flag makes "." match
// newlines too, since an observation paragraph can carry a second line
// (e.g. a trailing "Tags: ..." line) with no blank line before it.
// A field label, with or without a colon inside the asterisks. Older
// exports wrote "**Meals:** ...", newer ones "**Meals**" followed by a
// bullet list; the colon is optional so both parse. The lazy (.+?) still
// stops at the real closing "**", so a label that contains a colon of its
// own ("**Note (16:19):**") is captured whole and handed to splitLabel.
const FIELD_RE = /^\*\*(.+?):?\*\*\s*([\s\S]*)$/;

// "13:03 Bottle – Soya Milk (All). 12:09 Bottle – Soya Milk (Little)."
// (meals/nappy changes), or "13:24–14:27 (1 hour 3 minutes). 12:24–13:18
// (54 minutes)." (sleep) — entries are period-separated, each one starting
// with a "H:MM" or "HH:MM" time, which is what the split looks ahead for
// (a plain ". " split would also break on any period inside a food name).
function splitTimedEntries(value: string): string[] {
  return value
    .split(/\.\s+(?=\d{1,2}:\d{2})/)
    .map((s) => s.trim().replace(/\.\s*$/, ""))
    .filter(Boolean);
}

// Bright Horizons has exported this section two ways. Older files put a
// field's entries in one prose paragraph, period-separated, which is what
// splitTimedEntries above handles. Newer files put one markdown bullet per
// entry. Prefer bullets when the body has any — a bullet body run through
// the period split comes back as a single blob with "- " still glued to
// each line — and fall back to the prose split otherwise.
function splitEntries(value: string): string[] {
  const bullets = value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
  if (bullets.length > 0) return bullets.map(stripTrailingPeriod);
  return splitTimedEntries(value);
}

function stripTrailingPeriod(value: string): string {
  return value.trim().replace(/\.\s*$/, "");
}

// Pulls the "(...)" suffix off a field label, e.g. "Note (16:19)" ->
// { base: "Note", extra: "16:19" }.
function splitLabel(label: string): { base: string; extra: string | null } {
  const m = label.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!m) return { base: label.trim(), extra: null };
  return { base: m[1].trim(), extra: m[2].trim() };
}

// Splits one month's updates.md into a { facts, observationsMarkdown } pair
// per "### " day heading. Each day's block is a run of blank-line-separated
// "**Label:** ..." paragraphs — a fixed set of labels (Arrival & departure,
// Meals, Nappy changes, Sleep, Activity, Note, Health) are pulled out into
// ArloDayFacts; anything else (Observation/Post paragraphs — the teacher's
// own written updates, each headed by an author and/or time) is kept as
// markdown and concatenated into observationsMarkdown, in the order it
// appears.
function parseUpdatesFile(
  content: string
): Map<string, { facts: ArloDayFacts | null; observationsMarkdown: string | null }> {
  const byDate = new Map<
    string,
    { facts: ArloDayFacts | null; observationsMarkdown: string | null }
  >();

  // Split into day blocks: everything between one "### " heading and the
  // next (or end of file). content.split keeps the delimiter out, so pair
  // each heading match up with the text that follows it.
  const headingRe = new RegExp(DAY_HEADING_RE.source, "gm");
  const headings = [...content.matchAll(headingRe)];

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const [, monthName, day, year] = h;
    const month = MONTHS[monthName.slice(0, 3).toLowerCase()];
    if (!month) continue;
    const date = `${year}-${pad(month)}-${pad(Number(day))}`;

    const start = (h.index ?? 0) + h[0].length;
    const end = i + 1 < headings.length ? (headings[i + 1].index ?? content.length) : content.length;
    const body = content.slice(start, end).trim();
    if (!body) continue;

    const facts: ArloDayFacts = {
      signedIn: null,
      signedOut: null,
      expectedPickup: null,
      meals: [],
      nappy: [],
      sleep: [],
      activity: [],
      notes: [],
      other: [],
    };
    const observationParts: string[] = [];

    const paragraphs = body.split(/\n\s*\n/);
    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;
      const fm = trimmedPara.match(FIELD_RE);
      if (!fm) {
        observationParts.push(trimmedPara);
        continue;
      }
      const [, rawLabel, rest] = fm;
      const { base, extra } = splitLabel(rawLabel);
      const baseLower = base.toLowerCase();

      if (baseLower === "arrival & departure") {
        // The separator between "Baby Room" and the time varies by export
        // ("Baby Room 10:59", "Baby Room: 10:59"), and pickup is written
        // "Expected pick up - 15:45: ... picked up by Linh", so the time is
        // matched as a clock value rather than as "whatever follows a
        // space", and the name is picked up separately where present.
        // The room is deliberately not part of the pattern: it's whatever
        // room he's in that term ("Baby Room" now, "Toddler Room" next),
        // and the separator before the time varies between exports. So
        // match the phrase, then the first clock value on that line.
        const inM = rest.match(/Signed in(?:to)?\b[^\n]*?(\d{1,2}:\d{2})/i);
        if (inM) facts.signedIn = inM[1];
        const outM = rest.match(/Signed out(?: of)?\b[^\n]*?(\d{1,2}:\d{2})/i);
        if (outM) facts.signedOut = outM[1];
        const pickupM = rest.match(
          /Expected pick ?up\s*[:\u2013-]?\s*(\d{1,2}:\d{2})(?:[^\n]*?\bby\s+(\w+))?/i
        );
        if (pickupM) {
          facts.expectedPickup = pickupM[2] ? `${pickupM[1]} by ${pickupM[2]}` : pickupM[1];
        }
      } else if (baseLower === "meals") {
        facts.meals.push(...splitEntries(rest));
      } else if (baseLower === "nappy changes" || baseLower === "nappy") {
        facts.nappy.push(...splitEntries(rest));
      } else if (baseLower === "sleep") {
        facts.sleep.push(...splitEntries(rest));
      } else if (baseLower === "activity") {
        facts.activity.push(...splitEntries(rest));
      } else if (baseLower === "note") {
        for (const text of splitEntries(rest)) {
          facts.notes.push(extra ? `${extra}: ${text}` : text);
        }
      } else if (baseLower === "health") {
        facts.other.push(...splitEntries(rest));
      } else {
        // Observation (Name)/Post (Name, time)/anything unrecognized — a
        // free-text teacher update, kept as its own markdown paragraph
        // with the original bold header (name/time) preserved.
        observationParts.push(trimmedPara);
      }
    }

    const observationsMarkdown = observationParts.length > 0 ? observationParts.join("\n\n") : null;
    if (hasFacts(facts) || observationsMarkdown) {
      byDate.set(date, { facts: hasFacts(facts) ? facts : null, observationsMarkdown });
    }
  }

  return byDate;
}

// Not cached, same rationale as lib/toriPhotos.ts/lib/miloNurseryPhotos.ts —
// small personal folder, re-reading keeps it in sync if it's ever refreshed.
export function getArloNurseryDays(): ArloNurseryDay[] {
  const dir = arloNurseryPhotosDir();
  if (!dir || !fs.existsSync(dir)) return [];

  const photosByDate = new Map<string, ArloNurseryPhoto[]>();
  const updatesByDate = new Map<
    string,
    { facts: ArloDayFacts | null; observationsMarkdown: string | null }
  >();

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
          for (const [date, parsed] of parseUpdatesFile(content)) {
            updatesByDate.set(date, parsed);
          }
        }
      }
    }
  }

  const allDates = new Set<string>([...photosByDate.keys(), ...updatesByDate.keys()]);
  const days: ArloNurseryDay[] = Array.from(allDates).map((date) => {
    const update = updatesByDate.get(date);
    return {
      date,
      // Filename has no time component, so photos within a day fall back
      // to their IMG number (which is chronological on export) for
      // ordering.
      photos: (photosByDate.get(date) ?? []).sort((a, b) => a.file.localeCompare(b.file)),
      facts: update?.facts ?? null,
      observationsMarkdown: update?.observationsMarkdown ?? null,
    };
  });

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
