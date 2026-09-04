import fs from "fs";
import path from "path";
import { getGatehouseMessages, type GatehouseMessage } from "./gatehouse";

// Static reference card for logins/passwords Gatehouse has circulated by
// email or WhatsApp — GATEHOUSE_DIR/reports/credentials.md, hand-maintained
// the same way as class-info.md. Not time-ordered, just a quick-reference
// table, so the parser returns rows in file order (same shape/approach as
// gatehouseClassInfo.ts).

export interface CredentialField {
  service: string;
  login: string;
  password: string;
  message: GatehouseMessage | null;
}

function credentialsPath(): string | null {
  const dir = process.env.GATEHOUSE_DIR?.trim();
  return dir ? path.join(dir, "reports", "credentials.md") : null;
}

function splitTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

const MSG_REF_RE = /\[\[msg:([a-zA-Z0-9_-]+)\]\]/;

export function getGatehouseCredentials(): CredentialField[] {
  const file = credentialsPath();
  if (!file || !fs.existsSync(file)) return [];

  const raw = fs.readFileSync(file, "utf-8");
  if (!raw.startsWith("---")) return [];
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return [];
  const bodyStart = raw.indexOf("\n", end + 4);
  const body = bodyStart === -1 ? "" : raw.slice(bodyStart + 1);

  const byId = new Map(getGatehouseMessages().map((m) => [m.id, m]));
  const lines = body.split(/\r?\n/);
  const fields: CredentialField[] = [];
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inTable) {
      if (trimmed.startsWith("| Service")) inTable = true;
      continue;
    }
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*-+\s*\|/.test(trimmed)) continue; // header separator row

    const cells = splitTableCells(trimmed);
    if (cells.length < 3) continue;
    const [service, login, password, sourceCell] = cells;
    if (!service || !password) continue;

    const m = sourceCell ? sourceCell.match(MSG_REF_RE) : null;
    const message = m ? (byId.get(m[1]) ?? null) : null;

    fields.push({ service, login, password, message });
  }

  return fields;
}
