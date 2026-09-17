import fs from "fs";
import path from "path";
import { hashId } from "./hash";

// Days the boys spent with Chiarline (their nanny). Two sources, split by
// what each is good at:
//
//   Notes — CHIARLINE_DIR/updates.md, a hand-curated file. Deciding
//   whether a message is a report on the boys or just arranging hours is
//   a judgement call ("I am happy to drop Milo off to nursery with Arlo so
//   we can go straight to the playground" mentions both boys, nursery and
//   the playground, and still says nothing about how they were), and
//   judgement calls don't belong in a regex. So the picking is done once,
//   by reading the chat, and the result is written down. This file is the
//   record; edit it freely, the app renders it as-is.
//
//   Photos/videos — straight from the WhatsApp export in the same folder.
//   Attributing a picture to whoever sent it and dating it from its
//   filename is mechanical, not a judgement, so it stays automatic and a
//   re-export picks up new pictures with no curation step.
//
// Point CHIARLINE_DIR at the folder holding both. WhatsApp names each
// export folder with the date it was taken ("2026-09-11 WhatsApp Chat -
// Chiarline - Milo - Arlo") and a re-export makes a new one, so export
// folders are discovered by looking for a _chat.txt inside rather than
// being hardcoded.

function chiarlineDir(): string | null {
  const dir = process.env.CHIARLINE_DIR?.trim();
  return dir || null;
}

const UPDATES_FILE = "updates.md";

// Day headings come in two shapes: "## 2026-05-18", which this file used
// to be written as, and "### Monday, May 18, 2026", which is what the task
// writes now (matching the nursery updates.md). Both are accepted so an
// older hand-edited file keeps working.
const ISO_HEADING_RE = /^#{2,3}\s+(\d{4}-\d{2}-\d{2})\s*$/;
const LONG_HEADING_RE = /^#{2,3}\s+\w+,\s+(\w+)\s+(\d{1,2}),\s+(\d{4})\s*$/;

// "**Photos:** 13 (00000887-00000903) - first day at nursery" is the
// task's own bookkeeping. The count and the id range are both derivable
// from the files on disk, and the line isn't a message she sent, so it is
// skipped rather than glued onto the note above it.
const PHOTO_COUNT_RE = /^\*\*Photos:\*\*/;

const HEADING_MONTHS: Record<string, number> = {
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// The YYYY-MM-DD a heading line refers to, or null if it isn't a heading.
function headingDate(line: string): string | null {
  const iso = line.match(ISO_HEADING_RE);
  if (iso) return iso[1];
  const long = line.match(LONG_HEADING_RE);
  if (!long) return null;
  const month = HEADING_MONTHS[long[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return `${long[3]}-${pad2(month)}-${pad2(Number(long[2]))}`;
}

// The chat log names every attachment as WhatsApp exported it, so a photo
// the task has since renamed has to be looked up under its original name.
// Used for the sender lookup only — never for locating the file on disk.
function originalExportName(file: string): string {
  return file.replace(/^\d{4}-\d{2}-\d{2}_/, "");
}

// "[07/07/2025, 15:03:42] Chiarline Madrigal: …" or
// "[26/07/2024, 12:35:19 pm] Chiarline Madrigal: …"
//
// WhatsApp's timestamp format is not stable between exports of the *same*
// chat — one export of this group came out 24-hour, a later one 12-hour
// with am/pm — so both are accepted. The space before "pm" is a narrow
// no-break space (U+202F) in practice, not a plain one. Only used for
// working out who attached which file; the message text itself comes from
// updates.md.
const LINE_RE =
  /^\[(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2})(?::(\d{2}))?(?:[\s  ]*([ap])\.?m\.?)?\]\s([^:]+):\s?(.*)$/i;
const ATTACH_RE = /<attached:\s*([^>]+)>/;

// Media filenames carry their own timestamp, which is what days are keyed
// off. The leading counter is usually positive but the export numbers a
// few of the oldest items negatively ("-0000001-PHOTO-…"), hence the
// optional sign.
// Kept photos are now renamed by the task with a "YYYY-MM-DD_" prefix so
// they sort by day in Finder; videos keep their original export names. So
// the prefix is optional, and non-capturing — the timestamp *inside* the
// name stays the single source of truth for the day, since the prefix is
// the task's convenience and the embedded one is WhatsApp's own record.
export const PHOTO_FILENAME_RE =
  /^(?:\d{4}-\d{2}-\d{2}_)?-?\d+-PHOTO-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.jpg$/i;
export const VIDEO_FILENAME_RE = /^-?\d+-VIDEO-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.mp4$/i;

// Her messages come from two sender names (the export switched part-way
// through), and the group itself appears as a "sender" for system lines
// like "You changed the group description".
const GROUP_SENDER = "Chiarline - Milo - Arlo";

function isChiarline(sender: string): boolean {
  return sender.startsWith("Chiarline") && sender !== GROUP_SENDER;
}

// Only the current arrangement is wanted. updates.md starts here already;
// this bound applies the same cutoff to the photos, and to anything a
// future edit adds above it.
const EARLIEST_DATE = "2026-05-01";

function isInRange(date: string): boolean {
  return date >= EARLIEST_DATE;
}

export interface ChiarlineMedia {
  id: string;
  file: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  type: "photo" | "video";
}

export interface ChiarlineNote {
  time: string; // HH:MM
  text: string;
}

export interface ChiarlineDay {
  date: string; // YYYY-MM-DD
  media: ChiarlineMedia[];
  notes: ChiarlineNote[];
}

// Media, the chat log and updates.md no longer necessarily live in the
// same folder. The curated photos and updates.md were moved into their own
// folder ("Milo & Arlo updates") alongside the raw WhatsApp export, which
// kept _chat.txt and the videos. Assuming one folder held all three is
// what made the page go blank, so each is now looked up on its own:
// mediaDirs for files, chatLogDirs for attribution, updatesFilePath for
// the notes.
//
// Deliberately one level deep and never recursive. The folders that sit
// *inside* these ("archive", "not relevant") hold the pictures that were
// reviewed and rejected — not recursing is exactly what keeps them out,
// so this shallowness is load-bearing, not laziness.
function mediaDirs(dir: string): string[] {
  const out = [dir];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) out.push(path.join(dir, entry.name));
    }
  } catch {
    // Unreadable folder — the root alone is still worth trying.
  }
  return out;
}

// Wherever a WhatsApp export's _chat.txt has ended up. More than one is
// fine: their sender maps merge, so an older export sitting alongside a
// newer one still explains who sent what.
function chatLogDirs(dir: string): string[] {
  return mediaDirs(dir).filter((d) => fs.existsSync(path.join(d, "_chat.txt")));
}

// updates.md, at CHIARLINE_DIR or in any one of its immediate subfolders.
function updatesFilePath(dir: string): string | null {
  for (const d of mediaDirs(dir)) {
    const file = path.join(d, UPDATES_FILE);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

// updates.md: "## YYYY-MM-DD" day headings, then one entry per
// "**HH:MM** text", where the text may run over several lines until the
// next entry or heading. Anything else (the frontmatter, the explanatory
// preamble, HTML comments) is ignored, so the file can carry notes for a
// human reader without confusing this.
function parseUpdates(dir: string): Map<string, ChiarlineNote[]> {
  const byDate = new Map<string, ChiarlineNote[]>();
  const file = updatesFilePath(dir);
  if (!file) return byDate;

  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf-8");
  } catch {
    return byDate;
  }

  let date: string | null = null;
  let current: ChiarlineNote | null = null;

  const flush = () => {
    if (!date || !current) return;
    const text = current.text.trim();
    if (!text) return;
    const bucket = byDate.get(date);
    if (bucket) bucket.push({ ...current, text });
    else byDate.set(date, [{ ...current, text }]);
  };

  for (const line of raw.split(/\r?\n/)) {
    const heading = headingDate(line);
    if (heading) {
      flush();
      current = null;
      date = heading;
      continue;
    }
    const entry = line.match(/^\*\*(\d{1,2}:\d{2})\*\*\s*(.*)$/);
    if (entry) {
      flush();
      current = { time: entry[1].padStart(5, "0"), text: entry[2] };
      continue;
    }
    if (line.startsWith("<!--")) continue;
    // Ends the current note as well as being skipped itself, so nothing
    // written after it can be appended to a message it doesn't belong to.
    if (PHOTO_COUNT_RE.test(line)) {
      flush();
      current = null;
      continue;
    }
    if (current) current.text += `\n${line}`;
  }
  flush();

  for (const [d, notes] of byDate) {
    if (!isInRange(d)) byDate.delete(d);
    else notes.sort((a, b) => a.time.localeCompare(b.time));
  }
  return byDate;
}

// Which files she sent, from the chat log — the file list alone isn't
// enough, since Linh sent pictures into the same group and those aren't
// part of Chiarline's record of the day.
function sendersByFile(exportDir: string): Map<string, string> {
  const map = new Map<string, string>();
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(exportDir, "_chat.txt"), "utf-8");
  } catch {
    return map;
  }
  // A message can carry its text and its attachment on separate lines, so
  // a line without a "[date] sender:" prefix still belongs to the message
  // above it — skipping those loses roughly one attachment in ten.
  let sender: string | null = null;
  for (const line of raw.replace(/‎/g, "").split(/\r?\n/)) {
    const m = line.match(LINE_RE);
    if (m) sender = m[8].trim();
    if (!sender) continue;
    const attached = (m ? m[9] : line).match(ATTACH_RE);
    if (attached) map.set(attached[1].trim(), sender);
  }
  return map;
}

// Not cached — same read-fresh-per-request convention as the other local
// folder readers, so an edit to updates.md or a re-export shows up on the
// next page load.
export function getChiarlineDays(): ChiarlineDay[] {
  const dir = chiarlineDir();
  if (!dir || !fs.existsSync(dir)) return [];

  const notesByDate = parseUpdates(dir);
  const mediaByDate = new Map<string, ChiarlineMedia[]>();

  // Attribution is global: a photo is Chiarline's because the chat log
  // says she sent it, wherever the file has since been filed.
  const senders = new Map<string, string>();
  for (const logDir of chatLogDirs(dir)) {
    for (const [name, sender] of sendersByFile(logDir)) senders.set(name, sender);
  }

  // A file could turn up in two scanned folders; keep the first, so one
  // picture can't become two cards with the same id.
  const seen = new Set<string>();

  for (const mediaDir of mediaDirs(dir)) {
    let files: string[];
    try {
      files = fs.readdirSync(mediaDir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (seen.has(file)) continue;
      const photo = file.match(PHOTO_FILENAME_RE);
      const video = photo ? null : file.match(VIDEO_FILENAME_RE);
      const match = photo ?? video;
      if (!match) continue;
      const sender = senders.get(file) ?? senders.get(originalExportName(file));
      if (!sender || !isChiarline(sender)) continue;
      seen.add(file);

      const [, y, mo, da, h, mi, se] = match;
      const date = `${y}-${mo}-${da}`;
      if (!isInRange(date)) continue;
      const entry: ChiarlineMedia = {
        id: hashId(`chiarline|${file}`),
        file,
        date,
        time: `${h}:${mi}:${se}`,
        type: photo ? "photo" : "video",
      };
      const bucket = mediaByDate.get(date);
      if (bucket) bucket.push(entry);
      else mediaByDate.set(date, [entry]);
    }
  }

  const allDates = new Set<string>([...mediaByDate.keys(), ...notesByDate.keys()]);
  const days: ChiarlineDay[] = Array.from(allDates).map((date) => ({
    date,
    media: (mediaByDate.get(date) ?? []).sort((a, b) => a.time.localeCompare(b.time)),
    notes: notesByDate.get(date) ?? [],
  }));

  // Chronological, oldest first — the gallery reverses for display, same
  // as the nursery ones.
  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

// Resolves a media filename to a path on disk for the API route. The
// filename must match one of the two expected shapes (which rules out
// "../" and any other path segment), is checked against the same date
// cutoff as the report, and is then looked up inside the discovered
// export folders only.
export function resolveChiarlineMediaPath(file: string): string | null {
  const dir = chiarlineDir();
  if (!dir) return null;
  const match = file.match(PHOTO_FILENAME_RE) ?? file.match(VIDEO_FILENAME_RE);
  if (!match) return null;
  const [, y, mo, da] = match;
  if (!isInRange(`${y}-${mo}-${da}`)) return null;
  for (const mediaDir of mediaDirs(dir)) {
    const resolved = path.join(mediaDir, file);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
  }
  return null;
}
