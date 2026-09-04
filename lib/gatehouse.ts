import fs from "fs";
import path from "path";

// Reads Gatehouse school comms captured under GATEHOUSE_DIR (see
// .env.example): messages/*.md, one file per email or WhatsApp
// message/thread, each with a small YAML-ish frontmatter block followed by
// a plain-text body. Deliberately hand-rolled parsing rather than pulling
// in a YAML library — the frontmatter shape here is narrow and fixed (a
// handful of scalar fields plus one array-of-objects field, `sources`), so
// a general parser would be more code than this.
//
// Files under messages/_merged/ are skipped — they're working copies of
// messages already represented in the top-level folder (e.g. a corrected
// re-send of a letter already captured elsewhere), not additional content.

export interface GatehouseSource {
  type: string; // "email" | "whatsapp"
  sender?: string;
  subject?: string;
  chat?: string;
  gmail_id?: string;
  export?: string;
  note?: string;
  date?: string;
}

export interface GatehouseMessage {
  id: string; // filename without .md, also the [[msg:id]] key used by reports
  title: string;
  date: string; // ISO "YYYY-MM-DD HH:MM" as written in frontmatter
  sources: GatehouseSource[];
  attachments: string[]; // paths relative to GATEHOUSE_DIR, e.g. "files/foo.jpg"
  body: string;
}

function gatehouseDir(): string | null {
  const dir = process.env.GATEHOUSE_DIR?.trim();
  return dir || null;
}

function messagesDir(): string | null {
  const dir = gatehouseDir();
  return dir ? path.join(dir, "messages") : null;
}

// Splits "---\n<frontmatter>\n---\n<body>" into its two halves. Returns
// null if the file doesn't start with a frontmatter block.
function splitFrontmatter(raw: string): { frontmatter: string; body: string } | null {
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return null;
  const frontmatter = raw.slice(3, end).trim();
  const bodyStart = raw.indexOf("\n", end + 4);
  const body = bodyStart === -1 ? "" : raw.slice(bodyStart + 1);
  return { frontmatter, body: body.trim() };
}

// Parses just enough YAML to handle this file shape:
//   title: ...
//   date: ...
//   sources:
//     - type: email
//       sender: ...
//     - type: whatsapp
//       chat: ...
//   attachments: [a, b]
function parseFrontmatter(fm: string): {
  title: string;
  date: string;
  sources: GatehouseSource[];
  attachments: string[];
} {
  const lines = fm.split(/\r?\n/);
  let title = "";
  let date = "";
  const sources: GatehouseSource[] = [];
  let attachments: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const topMatch = line.match(/^(\w+):\s*(.*)$/);
    if (!topMatch) {
      i++;
      continue;
    }
    const [, key, rest] = topMatch;

    if (key === "title") {
      title = rest.trim();
      i++;
    } else if (key === "date") {
      date = rest.trim();
      i++;
    } else if (key === "attachments") {
      // Single-line inline array: attachments: [a, b, c]
      const m = rest.trim().match(/^\[(.*)\]$/);
      attachments = m
        ? m[1]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      i++;
    } else if (key === "sources") {
      i++;
      let current: GatehouseSource | null = null;
      while (i < lines.length) {
        const l = lines[i];
        if (/^\S/.test(l)) break; // dedented back to a top-level key
        const itemStart = l.match(/^\s*-\s+(\w+):\s*(.*)$/);
        const nested = l.match(/^\s+(\w+):\s*(.*)$/);
        if (itemStart) {
          if (current) sources.push(current);
          current = { type: "" } as GatehouseSource;
          (current as unknown as Record<string, string>)[itemStart[1]] = itemStart[2].trim();
        } else if (nested && current) {
          (current as unknown as Record<string, string>)[nested[1]] = nested[2].trim();
        }
        i++;
      }
      if (current) sources.push(current);
    } else {
      i++;
    }
  }

  return { title, date, sources, attachments };
}

function loadMessageFile(filePath: string, id: string): GatehouseMessage | null {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
  const split = splitFrontmatter(raw);
  if (!split) return null;
  const { title, date, sources, attachments } = parseFrontmatter(split.frontmatter);
  if (!date) return null;
  return { id, title: title || id, date, sources, attachments, body: split.body };
}

export function getGatehouseMessages(): GatehouseMessage[] {
  const dir = messagesDir();
  if (!dir || !fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith(".md"));

  const messages: GatehouseMessage[] = [];
  for (const f of files) {
    const id = f.name.replace(/\.md$/, "");
    const msg = loadMessageFile(path.join(dir, f.name), id);
    if (msg) messages.push(msg);
  }
  return messages.sort((a, b) => a.date.localeCompare(b.date));
}

export function getGatehouseMessage(id: string): GatehouseMessage | null {
  const dir = messagesDir();
  if (!dir) return null;
  // Guard against path traversal via id — only plain filenames allowed.
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return loadMessageFile(path.join(dir, `${id}.md`), id);
}

// Resolves an attachment's "files/xxx" path (as written in a message's
// frontmatter) to an absolute path under GATEHOUSE_DIR/files, guarding
// against traversal. Returns null if it doesn't resolve inside that folder
// or doesn't exist.
export function resolveGatehouseAttachment(relPath: string): string | null {
  const dir = gatehouseDir();
  if (!dir) return null;
  if (relPath.includes("..")) return null;
  if (!relPath.startsWith("files/")) return null;
  const resolved = path.resolve(dir, relPath);
  const filesRoot = path.resolve(dir, "files");
  if (resolved !== filesRoot && !resolved.startsWith(filesRoot + path.sep)) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}
