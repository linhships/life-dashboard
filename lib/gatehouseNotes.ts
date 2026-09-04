import fs from "fs";
import path from "path";
import { getGatehouseMessages, type GatehouseMessage } from "./gatehouse";

// Hand-maintained summary page — GATEHOUSE_DIR/reports/notes.md. Unlike
// class-info.md/credentials.md/links.md (all simple tables), this one is
// free-form prose with a tiny markdown-lite syntax ("## " headings, "- "
// bullets, blank-line-separated paragraphs, inline [[msg:id]] refs) —
// parsing of that structure happens client-side in
// components/GatehouseNotes.tsx, this module just extracts the frontmatter
// title and the ordered list of referenced messages.

export interface GatehouseNotesData {
  title: string;
  body: string;
  messages: GatehouseMessage[]; // referenced messages, in order of first appearance in body
}

function notesPath(): string | null {
  const dir = process.env.GATEHOUSE_DIR?.trim();
  return dir ? path.join(dir, "reports", "notes.md") : null;
}

const MSG_REF_RE = /\[\[msg:([a-zA-Z0-9_-]+)\]\]/g;

export function getGatehouseNotes(): GatehouseNotesData | null {
  const file = notesPath();
  if (!file || !fs.existsSync(file)) return null;

  const raw = fs.readFileSync(file, "utf-8");
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return null;
  const fm = raw.slice(3, end).trim();
  const bodyStart = raw.indexOf("\n", end + 4);
  const body = bodyStart === -1 ? "" : raw.slice(bodyStart + 1).trim();
  if (!body) return null;

  let title = "";
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^title:\s*(.*)$/);
    if (m) title = m[1].trim();
  }

  const byId = new Map(getGatehouseMessages().map((m) => [m.id, m]));
  const seen = new Set<string>();
  const messages: GatehouseMessage[] = [];
  for (const m of body.matchAll(MSG_REF_RE)) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const msg = byId.get(id);
    if (msg) messages.push(msg);
  }

  return { title: title || "Notes", body, messages };
}
