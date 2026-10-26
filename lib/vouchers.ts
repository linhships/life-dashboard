import fs from "fs";
import path from "path";

import { daysUntil, type Voucher } from "./voucherShared";

// Reads discount/voucher codes out of VOUCHERS_DIR (see .env.example): one
// or more markdown files, each holding a table like
//
//   | Webpage | Voucher code | Expiry date | Notes |
//   |---|---|---|---|
//   | cewe.co.uk | 4UEXPRESS | 31/12/2026 (11pm) | Max 5 uses; UK only. |
//
// The rows are written by something else — codes arrive from emails and
// get appended here — so this parser is deliberately forgiving about
// everything except the two things it actually needs:
//
//   Columns are matched BY HEADER NAME, not by position, so a column added
//   or reordered upstream doesn't silently shift every value one to the
//   left. An unrecognised column is ignored rather than fatal.
//
//   The expiry cell is free text and stays that way. Real entries include
//   "31/12/2026 (11pm)" and "~02/11/2026 (email of 26/10 says 'expires in
//   7 days')". A date is extracted when one can be found, for sorting and
//   for the countdown, but the original string is what gets displayed —
//   throwing away the "~" or the "(11pm)" would be throwing away the part
//   that tells you how much to trust the date.
//
// Rows that can't be read are counted and returned rather than dropped, so
// /settings/data-sources can say so instead of this page quietly getting
// shorter.

// Re-exported so server-side callers have one import for the feature.
export { daysUntil };
export type { Voucher };

export interface VouchersReport {
  vouchers: Voucher[];
  // Table rows that looked like data but yielded no code — kept so the
  // health page can surface them.
  skippedRows: string[];
  files: string[];
}

function vouchersDir(): string | null {
  const dir = process.env.VOUCHERS_DIR?.trim();
  return dir || null;
}

export function isVouchersConfigured(): boolean {
  return vouchersDir() !== null;
}

export function vouchersDirPath(): string | null {
  return vouchersDir();
}

// Which header a column is, by keyword. Checked longest-intent-first so
// "voucher code" lands on code rather than on anything matching "voucher".
function columnRole(header: string): keyof Voucher | null {
  const h = header.toLowerCase().trim();
  if (/code/.test(h)) return "code";
  if (/expir|valid|until/.test(h)) return "expiryRaw";
  if (/note|detail|terms|condition/.test(h)) return "notes";
  if (/site|web|shop|store|url|page|retailer|brand/.test(h)) return "site";
  return null;
}

function splitRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map((c) => c.trim());
}

function isSeparatorRow(line: string): boolean {
  return /^\|?[\s:|-]+\|?$/.test(line.trim()) && line.includes("-");
}

// DD/MM/YYYY or D/M/YY(YY), also accepting - and . as separators. UK order
// throughout: "02/11/2026" here is 2 November, never 11 February.
const DATE_RE = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/;

function parseExpiry(raw: string): { iso: string | null; approximate: boolean } {
  const approximate = /[~≈]|about|around|approx/i.test(raw);
  const m = raw.match(DATE_RE);
  if (!m) return { iso: null, approximate };
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year = 2000 + year;
  if (month < 1 || month > 12 || day < 1 || day > 31) return { iso: null, approximate };
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { iso, approximate };
}

function parseMarkdownTables(text: string): { rows: Record<string, string>[]; skipped: string[] } {
  const lines = text.split(/\r?\n/);
  const rows: Record<string, string>[] = [];
  const skipped: string[] = [];

  let headers: (keyof Voucher | null)[] | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) {
      headers = null; // a blank line or prose ends the current table
      continue;
    }
    if (isSeparatorRow(line)) continue;

    const cells = splitRow(line);
    if (!headers) {
      const roles = cells.map(columnRole);
      // A header row is one that names a code column; anything else that
      // starts with a pipe before we've seen one isn't a table we know.
      if (roles.includes("code")) headers = roles;
      else skipped.push(line.trim());
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((role, idx) => {
      if (role) row[role] = cells[idx] ?? "";
    });
    if (row.code) rows.push(row);
    else skipped.push(line.trim());
  }

  return { rows, skipped };
}

export function readVouchers(): VouchersReport {
  const dir = vouchersDir();
  if (!dir) return { vouchers: [], skippedRows: [], files: [] };

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return { vouchers: [], skippedRows: [], files: [] };
  }

  // vouchers.md first when present, then any other markdown, so the
  // expected file leads and a second one still gets picked up.
  const mdFiles = entries
    .filter((f) => /\.mdx?$/i.test(f))
    .sort((a, b) => {
      const pri = (f: string) => (/^vouchers\.mdx?$/i.test(f) ? 0 : 1);
      return pri(a) - pri(b) || a.localeCompare(b);
    });

  const vouchers: Voucher[] = [];
  const skippedRows: string[] = [];
  const files: string[] = [];

  for (const file of mdFiles) {
    let text: string;
    try {
      text = fs.readFileSync(path.join(dir, file), "utf8");
    } catch {
      continue;
    }
    files.push(file);
    const { rows, skipped } = parseMarkdownTables(text);
    skippedRows.push(...skipped);
    rows.forEach((row, idx) => {
      const expiryRaw = (row.expiryRaw ?? "").trim();
      const { iso, approximate } = parseExpiry(expiryRaw);
      vouchers.push({
        id: `${file}:${idx}:${row.code}`,
        site: (row.site ?? "").trim(),
        code: row.code.trim(),
        expiryRaw,
        expiry: iso,
        approximate,
        notes: (row.notes ?? "").trim(),
      });
    });
  }

  // Soonest expiry first; undated last rather than first, since a code with
  // no date is the least urgent thing to look at, not the most.
  vouchers.sort((a, b) => {
    if (a.expiry && b.expiry) return a.expiry.localeCompare(b.expiry);
    if (a.expiry) return -1;
    if (b.expiry) return 1;
    return a.site.localeCompare(b.site);
  });

  return { vouchers, skippedRows, files };
}

export function getVouchers(): Voucher[] {
  return readVouchers().vouchers;
}
