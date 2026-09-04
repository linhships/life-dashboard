import fs from "fs";
import path from "path";
import { getGatehouseMessages, type GatehouseMessage } from "./gatehouse";

// Static reference card for key documents/links — GATEHOUSE_DIR/reports/
// links.md, hand-maintained the same way as class-info.md/credentials.md.
// Not time-ordered, just a quick-reference list, so the parser returns rows
// in file order. Href is either an external URL or a "files/..." path
// pointing at a file under GATEHOUSE_DIR (served via /api/gatehouse/file,
// same as a message attachment) — isAttachment tells the UI which.

export interface LinkField {
  label: string;
  href: string;
  isAttachment: boolean;
  message: GatehouseMessage | null;
}

function linksPath(): string | null {
  const dir = process.env.GATEHOUSE_DIR?.trim();
  return dir ? path.join(dir, "reports", "links.md") : null;
}

function splitTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

const MSG_REF_RE = /\[\[msg:([a-zA-Z0-9_-]+)\]\]/;

export function getGatehouseLinks(): LinkField[] {
  const file = linksPath();
  if (!file || !fs.existsSync(file)) return [];

  const raw = fs.readFileSync(file, "utf-8");
  if (!raw.startsWith("---")) return [];
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return [];
  const bodyStart = raw.indexOf("\n", end + 4);
  const body = bodyStart === -1 ? "" : raw.slice(bodyStart + 1);

  const byId = new Map(getGatehouseMessages().map((m) => [m.id, m]));
  const lines = body.split(/\r?\n/);
  const fields: LinkField[] = [];
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inTable) {
      if (trimmed.startsWith("| Label")) inTable = true;
      continue;
    }
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*-+\s*\|/.test(trimmed)) continue; // header separator row

    const cells = splitTableCells(trimmed);
    if (cells.length < 2) continue;
    const [label, href, sourceCell] = cells;
    if (!label || !href) continue;

    const m = sourceCell ? sourceCell.match(MSG_REF_RE) : null;
    const message = m ? (byId.get(m[1]) ?? null) : null;

    fields.push({ label, href, isAttachment: href.startsWith("files/"), message });
  }

  return fields;
}
