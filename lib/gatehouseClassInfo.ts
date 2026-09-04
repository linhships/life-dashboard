import fs from "fs";
import path from "path";
import { getGatehouseMessages, type GatehouseMessage } from "./gatehouse";

// Static reference card for Milo's actual class — GATEHOUSE_DIR/reports/
// class-info.md, hand-maintained the same way as key-dates.md, pulling
// together every class-specific detail (schedule, contacts, links) that's
// scattered across the Nursery Synodinou-tagged messages into one place.
// Unlike the weekly reports/key dates, this isn't time-ordered — it's a
// "quick reference" card, so the parser just returns rows in file order.

export interface ClassInfoField {
  label: string;
  detail: string;
  message: GatehouseMessage | null;
}

export interface ClassInfo {
  className: string;
  classCode: string;
  fields: ClassInfoField[];
}

function classInfoPath(): string | null {
  const dir = process.env.GATEHOUSE_DIR?.trim();
  return dir ? path.join(dir, "reports", "class-info.md") : null;
}

function splitTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

const MSG_REF_RE = /\[\[msg:([a-zA-Z0-9_-]+)\]\]/;

export function getGatehouseClassInfo(): ClassInfo | null {
  const file = classInfoPath();
  if (!file || !fs.existsSync(file)) return null;

  const raw = fs.readFileSync(file, "utf-8");
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return null;
  const fm = raw.slice(3, end).trim();
  const bodyStart = raw.indexOf("\n", end + 4);
  const body = bodyStart === -1 ? "" : raw.slice(bodyStart + 1);

  let className = "";
  let classCode = "";
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    if (m[1] === "class") className = m[2].trim();
    if (m[1] === "code") classCode = m[2].trim();
  }
  if (!className) return null;

  const byId = new Map(getGatehouseMessages().map((m) => [m.id, m]));
  const lines = body.split(/\r?\n/);
  const fields: ClassInfoField[] = [];
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inTable) {
      if (trimmed.startsWith("| Field")) inTable = true;
      continue;
    }
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*-+\s*\|/.test(trimmed)) continue; // header separator row

    const cells = splitTableCells(trimmed);
    if (cells.length < 2) continue;
    const [label, detail, sourceCell] = cells;
    if (!label || !detail) continue;

    const m = sourceCell ? sourceCell.match(MSG_REF_RE) : null;
    const message = m ? (byId.get(m[1]) ?? null) : null;

    fields.push({ label, detail, message });
  }

  return { className, classCode, fields };
}
