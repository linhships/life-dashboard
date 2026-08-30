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
// threads. That rule alone isn't enough, though: Tori herself also sent
// screenshots, receipts, payment confirmations, and the odd non-kid photo
// (a buggy wheel, a recipe card) mixed in among real photos of the boys.
// To catch those, every Tori-sent photo was scored with a simple
// image-content heuristic — % of near-white pixels and mean saturation on
// a downsampled thumbnail, since screenshots/text-on-solid-background
// images tend to run either very pale or very desaturated — and every
// flagged candidate (27 out of ~1500) was manually reviewed by eye.
// EXCLUDED_PHOTOS below is the resulting hand-confirmed list: mostly
// checkout/payment screens, ticket confirmations, and text screenshots —
// several of which contain a parent's card digits, home address, or full
// name, which is another reason to keep these out of the gallery. The
// heuristic doesn't catch everything (e.g. a dark-mode chat screenshot
// with a video thumbnail slipped through, since it's neither pale nor
// desaturated) — entries reported directly after browsing the gallery are
// appended at the end of the list below.
const EXCLUDED_PHOTOS = new Set<string>(
  [
    ["WhatsApp Chat - Tori (Nanny)", "00001194-PHOTO-2024-10-17-08-30-07.jpg"],
    ["WhatsApp Chat - Tori (Nanny)", "00002275-PHOTO-2026-02-14-11-45-28.jpg"],
    ["WhatsApp Chat - Tori (Nanny)", "00002615-PHOTO-2026-07-15-12-09-04.jpg"],
    ["WhatsApp Chat - Tori (Nanny)", "00001433-PHOTO-2025-02-05-14-06-51.jpg"],
    ["WhatsApp Chat - Tori (Nanny)", "00001070-PHOTO-2024-09-02-09-09-16.jpg"],
    ["WhatsApp Chat - Tori (Nanny)", "00002274-PHOTO-2026-02-14-11-45-28.jpg"],
    ["WhatsApp Chat - Tori (Nanny)", "00002702-PHOTO-2026-08-26-13-47-52.jpg"],
    ["WhatsApp Chat - Tori (Nanny)", "00001541-PHOTO-2025-03-20-08-07-22.jpg"],
    ["WhatsApp Chat - Tori (Nanny)", "00001468-PHOTO-2025-02-13-08-04-24.jpg"],
    ["WhatsApp Chat - Tori (Nanny)", "00000865-PHOTO-2024-07-10-08-43-20.jpg"],
    ["WhatsApp Chat - Tori (Nanny)", "00000920-PHOTO-2024-07-24-21-30-18.jpg"],
    ["WhatsApp Chat - Tori (Nanny)", "00000732-PHOTO-2024-05-20-08-55-47.jpg"],
    ["WhatsApp Chat - Tori (Nanny)", "00000280-PHOTO-2023-11-28-14-40-53.jpg"],
    ["WhatsApp Chat - Tori - Charlie - Milo", "00004087-PHOTO-2025-07-31-07-51-03.jpg"],
    ["WhatsApp Chat - Tori - Charlie - Milo", "00004339-PHOTO-2025-11-19-19-22-59.jpg"],
    ["WhatsApp Chat - Tori - Charlie - Milo", "00003377-PHOTO-2025-03-20-15-46-48.jpg"],
    ["WhatsApp Chat - Tori - Charlie - Milo", "00001831-PHOTO-2024-05-15-12-30-26.jpg"],
    ["WhatsApp Chat - Tori - Charlie - Milo", "00002258-PHOTO-2024-07-22-13-02-11.jpg"],
    ["WhatsApp Chat - Tori - Charlie - Milo", "00001832-PHOTO-2024-05-15-12-30-26.jpg"],
    ["WhatsApp Chat - Tori-Milo-Arlo", "00000362-PHOTO-2024-01-14-13-36-46.jpg"],
    // Reported directly (missed by the heuristic above):
    ["WhatsApp Chat - Tori (Nanny)", "00002552-PHOTO-2026-07-07-12-47-35.jpg"],
  ].map(([chat, file]) => `${chat}|${file}`)
);
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
      if (EXCLUDED_PHOTOS.has(`${chat}|${file}`)) continue;
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
