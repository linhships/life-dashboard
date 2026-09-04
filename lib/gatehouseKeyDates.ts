import fs from "fs";
import path from "path";
import { getGatehouseMessages, type GatehouseMessage } from "./gatehouse";

// "Upcoming events & meetings" box at the top of /gatehouse — a hand-
// maintained markdown table at GATEHOUSE_DIR/reports/key-dates.md (same
// write-ahead-of-time approach as the weekly reports themselves), pulling
// together every dated event mentioned across all captured messages so
// Linh doesn't have to hunt through 30+ messages to find "when's the next
// uniform sale". Each row can optionally cite the message it came from via
// a [[msg:<id>]] token, same syntax as report bodies.

export interface GatehouseKeyDate {
  date: string; // ISO YYYY-MM-DD — the start date, if the event is a range
  event: string; // display text, e.g. "Half-term (19-30 Oct)"
  message: GatehouseMessage | null;
}

function keyDatesPath(): string | null {
  const dir = process.env.GATEHOUSE_DIR?.trim();
  return dir ? path.join(dir, "reports", "key-dates.md") : null;
}

function splitTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

const MSG_REF_RE = /\[\[msg:([a-zA-Z0-9_-]+)\]\]/;

export function getGatehouseKeyDates(): GatehouseKeyDate[] {
  const file = keyDatesPath();
  if (!file || !fs.existsSync(file)) return [];

  const byId = new Map(getGatehouseMessages().map((m) => [m.id, m]));
  const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/);

  const items: GatehouseKeyDate[] = [];
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inTable) {
      if (trimmed.startsWith("| Date")) inTable = true;
      continue;
    }
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*-+\s*\|/.test(trimmed)) continue; // header separator row

    const cells = splitTableCells(trimmed);
    if (cells.length < 2) continue;
    const [date, event, sourceCell] = cells;
    if (!date || !event) continue;

    const m = sourceCell ? sourceCell.match(MSG_REF_RE) : null;
    const message = m ? (byId.get(m[1]) ?? null) : null;

    items.push({ date, event, message });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

// fromDate defaults to today (server clock) — filters out events already
// in the past so the box only shows what's actually still ahead.
export function getUpcomingGatehouseKeyDates(fromDate?: string): GatehouseKeyDate[] {
  const cutoff = fromDate ?? new Date().toISOString().slice(0, 10);
  return getGatehouseKeyDates().filter((d) => d.date >= cutoff);
}
