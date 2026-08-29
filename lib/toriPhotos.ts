import fs from "fs";
import path from "path";
import { hashId } from "./hash";

// Reads the raw WhatsApp chat exports for the "Tori" nanny threads and
// builds a day-by-day photo gallery of moments from her time caring for
// Milo & Arlo. Point TORI_PHOTOS_DIR (in .env.local, gitignored) at the
// folder containing the three exported chat subfolders below — the export
// produced by WhatsApp's own "Export Chat" > "Attach Media" feature,
// unzipped, with each original chat thread kept as its own subfolder
// exactly as WhatsApp named it.
//
// Photos are only included if the chat's _chat.txt shows Tori herself as
// the sender of that attachment — not just any photo present in these
// threads. The threads also carry logistics messages/documents/photos
// from parents (contracts, screenshots, forms), which don't represent an
// actual moment of her caring for the boys. Filtering to her own
// attachments turned out to reliably exclude all of that on its own: the
// only two device-screenshot-resolution images found anywhere in these
// exports were both sent by a parent, not Tori, so they're already
// excluded by this rule alone — no separate content-based filtering
// needed.
function toriPhotosDir(): string | null {
  const dir = process.env.TORI_PHOTOS_DIR?.trim();
  return dir || null;
}

const CHAT_FOLDERS = [
  "WhatsApp Chat - Tori (Nanny)",
  "WhatsApp Chat - Tori - Charlie - Milo",
  "WhatsApp Chat - Tori-Milo-Arlo",
] as const;
type ChatFolder = (typeof CHAT_FOLDERS)[number];

const TORI_SENDER = "Tori (Nanny)";

// Matches a chat line like:
//   [21/08/2026, 2:18:25 pm] Tori (Nanny): ‎<attached: 00001024-PHOTO-2026-08-21-14-18-26.jpg>
// WhatsApp sometimes prefixes attachment/system lines with an invisible
// left-to-right mark (U+200E) — the leading `‎?` strips that.
const LINE_RE = /^‎?\[\d{2}\/\d{2}\/\d{4}, [\d:]+\s?[ap]m\]\s([^:]+):\s(.*)$/;
const ATTACH_RE = /<attached:\s*([^>]+)>/;
const PHOTO_FILENAME_RE = /^\d+-PHOTO-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.jpg$/i;

export interface ToriPhoto {
  id: string;
  chat: ChatFolder;
  file: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
}

export interface ToriCareDay {
  date: string; // YYYY-MM-DD
  photos: ToriPhoto[];
}

function parseSendersByFilename(chatDir: string): Map<string, string> {
  const chatFile = path.join(chatDir, "_chat.txt");
  const map = new Map<string, string>();
  if (!fs.existsSync(chatFile)) return map;
  // The export uses CRLF line endings — split on \r?\n (not just \n) so a
  // trailing \r doesn't get left dangling at the end of each line, which
  // would otherwise break LINE_RE's trailing `$` match on every line.
  const lines = fs.readFileSync(chatFile, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(LINE_RE);
    if (!m) continue;
    const sender = m[1];
    const body = m[2];
    const am = body.match(ATTACH_RE);
    if (!am) continue;
    const filename = am[1].trim().replace(/‎/g, "");
    map.set(filename, sender);
  }
  return map;
}

// Not cached — these files are small (well under 1MB combined) and this
// mirrors the rest of the app's read-fresh-from-disk-per-request approach
// (lib/news.ts, lib/links.ts, etc.), which is plenty fast for a personal,
// single-user dashboard and keeps this in sync if the export is ever
// refreshed.
export function getToriCareDays(): ToriCareDay[] {
  const dir = toriPhotosDir();
  if (!dir || !fs.existsSync(dir)) return [];

  const photosByDate = new Map<string, ToriPhoto[]>();

  for (const chat of CHAT_FOLDERS) {
    const chatDir = path.join(dir, chat);
    if (!fs.existsSync(chatDir)) continue;
    const senderByFile = parseSendersByFilename(chatDir);
    const files = fs.readdirSync(/* turbopackIgnore: true */ chatDir);
    for (const file of files) {
      if (!file.toLowerCase().endsWith(".jpg")) continue;
      if (senderByFile.get(file) !== TORI_SENDER) continue;
      const m = file.match(PHOTO_FILENAME_RE);
      if (!m) continue;
      const [, y, mo, da, h, mi, se] = m;
      const date = `${y}-${mo}-${da}`;
      const time = `${h}:${mi}:${se}`;
      const photo: ToriPhoto = {
        id: hashId(`${chat}|${file}`),
        chat,
        file,
        date,
        time,
      };
      const bucket = photosByDate.get(date);
      if (bucket) bucket.push(photo);
      else photosByDate.set(date, [photo]);
    }
  }

  const days: ToriCareDay[] = Array.from(photosByDate.entries()).map(([date, photos]) => ({
    date,
    photos: photos.sort((a, b) => a.time.localeCompare(b.time)),
  }));

  // Chronological — oldest first, ending on her last day — reads like the
  // story of her time with the boys rather than a reverse-chron feed.
  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

// Resolves a (chat, file) pair to an absolute path on disk for the image
// API route, guarding against path traversal: chat must be one of the
// three known folder names (a fixed allowlist, not attacker-controlled
// beyond that) and file must match the expected WhatsApp photo filename
// shape.
export function resolveToriPhotoPath(chat: string, file: string): string | null {
  const dir = toriPhotosDir();
  if (!dir) return null;
  if (!CHAT_FOLDERS.includes(chat as ChatFolder)) return null;
  if (!PHOTO_FILENAME_RE.test(file)) return null;
  const resolved = path.join(dir, chat, file);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}
