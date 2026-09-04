import fs from "fs";
import path from "path";
import { getGatehouseMessages, type GatehouseMessage } from "./gatehouse";

// Weekly digests of Gatehouse messages, hand-written (by Claude, reviewing
// the week's messages) into GATEHOUSE_DIR/reports/*.md — one file per
// Monday-Sunday week, named YYYY-MM-DD_to_YYYY-MM-DD.md. Frontmatter has
// weekStart/weekEnd (ISO dates); the body is markdown prose that references
// specific source messages inline via [[msg:<id>]] tokens, which the UI
// turns into clickable chips that open that message in a popup (see
// GatehouseWeeklyReports.tsx). This mirrors the News/AI Briefing pattern —
// the app renders pre-written summaries rather than generating them live,
// since there's no LLM call anywhere else in this codebase either.

export interface GatehouseReport {
  weekStart: string; // ISO date, Monday
  weekEnd: string; // ISO date, Sunday
  body: string; // markdown, with [[msg:id]] tokens still inline
  messages: GatehouseMessage[]; // every message referenced by this report, in date order
}

function reportsDir(): string | null {
  const dir = process.env.GATEHOUSE_DIR?.trim();
  return dir ? path.join(dir, "reports") : null;
}

const MSG_REF_RE = /\[\[msg:([a-zA-Z0-9_-]+)\]\]/g;

function parseReportFile(raw: string): { weekStart: string; weekEnd: string; body: string } | null {
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return null;
  const fm = raw.slice(3, end).trim();
  const bodyStart = raw.indexOf("\n", end + 4);
  const body = bodyStart === -1 ? "" : raw.slice(bodyStart + 1).trim();

  let weekStart = "";
  let weekEnd = "";
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    if (m[1] === "weekStart") weekStart = m[2].trim();
    if (m[1] === "weekEnd") weekEnd = m[2].trim();
  }
  if (!weekStart || !weekEnd) return null;
  return { weekStart, weekEnd, body };
}

export function getGatehouseReports(): GatehouseReport[] {
  const dir = reportsDir();
  if (!dir || !fs.existsSync(dir)) return [];

  const allMessages = getGatehouseMessages();
  const byId = new Map(allMessages.map((m) => [m.id, m]));

  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith(".md"));

  const reports: GatehouseReport[] = [];
  for (const f of files) {
    let raw: string;
    try {
      raw = fs.readFileSync(path.join(dir, f.name), "utf-8");
    } catch {
      continue;
    }
    const parsed = parseReportFile(raw);
    if (!parsed) continue;

    const ids = new Set<string>();
    for (const m of parsed.body.matchAll(MSG_REF_RE)) ids.add(m[1]);
    const messages = Array.from(ids)
      .map((id) => byId.get(id))
      .filter((m): m is GatehouseMessage => Boolean(m))
      .sort((a, b) => a.date.localeCompare(b.date));

    reports.push({ weekStart: parsed.weekStart, weekEnd: parsed.weekEnd, body: parsed.body, messages });
  }

  return reports.sort((a, b) => b.weekStart.localeCompare(a.weekStart)); // newest week first
}
