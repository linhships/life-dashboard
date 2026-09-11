import fs from "fs";
import path from "path";
import { hashId } from "./hash";

// Days the boys spent with Chiarline (their nanny), built from the
// WhatsApp export of the "Chiarline - Milo - Arlo" group — same source
// shape as lib/toriPhotos.ts, but this one keeps her *words* as well as
// her photos, so each day reads like the nursery reports do: what
// happened, alongside the pictures.
//
// Point CHIARLINE_DIR at the folder holding the unzipped export. WhatsApp
// names each export folder with the date it was taken ("2026-09-11
// WhatsApp Chat - Chiarline - Milo - Arlo"), and a re-export makes a new
// one, so the export folder is discovered by looking for subfolders that
// contain a _chat.txt rather than being hardcoded.
//
// One wrinkle specific to this export: it mixes both of WhatsApp's media
// conventions. Older messages were exported without media and read
// "image omitted"; newer ones carry "<attached: 00000061-PHOTO-....jpg>"
// with the file alongside. Only the attached ones can be shown — the
// omitted ones simply have no file to point at — but the text of those
// older messages is still perfectly good, so a day can have notes with no
// photos.

function chiarlineDir(): string | null {
  const dir = process.env.CHIARLINE_DIR?.trim();
  return dir || null;
}

// "[07/07/2025, 15:03:42] Chiarline Madrigal: Hellooo:) Milo fell asleep…"
// This export uses 24-hour times with no am/pm (unlike the Tori one), and
// WhatsApp prefixes some lines with an invisible left-to-right mark, which
// is stripped before matching.
const LINE_RE = /^\[(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2})(?::(\d{2}))?\]\s([^:]+):\s?(.*)$/;
const ATTACH_RE = /<attached:\s*([^>]+)>/;

// Media filenames carry their own timestamp, which is what days are keyed
// off. The leading counter is usually positive but the export numbers a
// few of the oldest items negatively ("-0000001-PHOTO-…"), hence the
// optional sign.
const PHOTO_FILENAME_RE = /^-?\d+-PHOTO-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.jpg$/i;
const VIDEO_FILENAME_RE = /^-?\d+-VIDEO-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.mp4$/i;

// Her messages come from two sender names (the export switched part-way
// through), and the group itself appears as a "sender" for system lines
// like "You changed the group description", which are not notes.
const GROUP_SENDER = "Chiarline - Milo - Arlo";

function isChiarline(sender: string): boolean {
  return sender.startsWith("Chiarline") && sender !== GROUP_SENDER;
}

// Acknowledgements ("Ok", "👍", "Thank you!") are most of the short
// messages in a two-way chat and add nothing to a day's write-up, so
// anything this short is dropped. Long enough to keep real one-liners
// like "He napped 12:30-2" .
const MIN_NOTE_LENGTH = 14;

// The export reaches back to July 2025, but only the current arrangement
// is wanted here — everything before this date is skipped, photos and
// notes alike. (The chat itself marks the changeover: the group was
// renamed "Chiarline - Milo - Arlo" on 18 May 2026.) Widen or narrow the
// report by moving this one date.
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

// Every subfolder of CHIARLINE_DIR that looks like a WhatsApp export.
function exportDirs(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(dir, e.name))
      .filter((p) => fs.existsSync(path.join(p, "_chat.txt")));
  } catch {
    return [];
  }
}

function stripMediaMarkers(body: string): string {
  return body
    .replace(ATTACH_RE, "")
    .replace(/\b(?:image|video|audio|document|sticker|GIF)\s+omitted\b/gi, "")
    .replace(/‎/g, "")
    .trim();
}

// Emoji-only reactions shouldn't survive the length check by virtue of
// being multi-byte, so they're removed before measuring.
function isSubstantive(text: string): boolean {
  const letters = text.replace(/[^\p{L}\p{N}]/gu, "");
  return letters.length >= MIN_NOTE_LENGTH;
}

interface ParsedMessage {
  date: string;
  time: string; // HH:MM
  sender: string;
  body: string;
}

// WhatsApp wraps a multi-line message by continuing on the next line
// without a new "[date] sender:" prefix, so continuation lines are folded
// back into the message they belong to.
function parseChat(chatFile: string): ParsedMessage[] {
  let raw: string;
  try {
    raw = fs.readFileSync(chatFile, "utf-8");
  } catch {
    return [];
  }

  const messages: ParsedMessage[] = [];
  for (const line of raw.replace(/‎/g, "").split(/\r?\n/)) {
    const m = line.match(LINE_RE);
    if (!m) {
      if (messages.length > 0 && line.trim()) {
        messages[messages.length - 1].body += `\n${line.trim()}`;
      }
      continue;
    }
    const [, dd, mm, yyyy, hh, min, , sender, body] = m;
    messages.push({
      date: `${yyyy}-${mm}-${dd}`,
      time: `${hh.padStart(2, "0")}:${min}`,
      sender: sender.trim(),
      body,
    });
  }
  return messages;
}

// Not cached — same read-fresh-per-request convention as the other local
// folder readers, so a re-export shows up on the next page load.
export function getChiarlineDays(): ChiarlineDay[] {
  const dir = chiarlineDir();
  if (!dir || !fs.existsSync(dir)) return [];

  const mediaByDate = new Map<string, ChiarlineMedia[]>();
  const notesByDate = new Map<string, ChiarlineNote[]>();

  for (const exportDir of exportDirs(dir)) {
    // Photos/videos she sent: the chat log says who attached what, so the
    // file list alone isn't enough — Linh sent pictures into this group
    // too, and those aren't part of her write-up of the day.
    const senderByFile = new Map<string, string>();
    const messages = parseChat(path.join(exportDir, "_chat.txt"));
    for (const msg of messages) {
      const am = msg.body.match(ATTACH_RE);
      if (am) senderByFile.set(am[1].trim(), msg.sender);

      if (!isChiarline(msg.sender) || !isInRange(msg.date)) continue;
      const text = stripMediaMarkers(msg.body);
      if (!text || !isSubstantive(text)) continue;
      const bucket = notesByDate.get(msg.date);
      const note = { time: msg.time, text };
      if (bucket) bucket.push(note);
      else notesByDate.set(msg.date, [note]);
    }

    let files: string[];
    try {
      files = fs.readdirSync(exportDir);
    } catch {
      continue;
    }
    for (const file of files) {
      const photo = file.match(PHOTO_FILENAME_RE);
      const video = photo ? null : file.match(VIDEO_FILENAME_RE);
      const match = photo ?? video;
      if (!match) continue;
      const sender = senderByFile.get(file);
      if (!sender || !isChiarline(sender)) continue;

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
    notes: (notesByDate.get(date) ?? []).sort((a, b) => a.time.localeCompare(b.time)),
  }));

  // Chronological, oldest first — the gallery reverses for display, same
  // as the nursery ones.
  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

// Resolves a media filename to a path on disk for the API route. The
// filename must match one of the two expected shapes (which rules out
// "../" and any other path segment), and is then looked up inside the
// discovered export folders only.
export function resolveChiarlineMediaPath(file: string): string | null {
  const dir = chiarlineDir();
  if (!dir) return null;
  const match = file.match(PHOTO_FILENAME_RE) ?? file.match(VIDEO_FILENAME_RE);
  if (!match) return null;
  // Same cutoff the report uses, so an older file can't be fetched by
  // guessing its name even though nothing links to it.
  const [, y, mo, da] = match;
  if (!isInRange(`${y}-${mo}-${da}`)) return null;
  for (const exportDir of exportDirs(dir)) {
    const resolved = path.join(exportDir, file);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
  }
  return null;
}
