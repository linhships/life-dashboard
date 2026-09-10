import fs from "fs";
import path from "path";
import { dataPath } from "./dataDir";

// Study guides: one markdown file per Learning topic under
// data/learning-guides/<slug>.md, written by the "learning-study-guides"
// scheduled task (see its SKILL.md under ~/Claude/Scheduled/) — the task
// researches the topic + the resources saved under it and lays the topic
// out as small, ordered chunks. The app only reads these; nothing here
// writes.
//
// File shape the task is told to produce (and this parser expects):
//
//   ---
//   topic: Mechanistic Interpretability
//   generated: 2026-09-10
//   ---
//   # Mechanistic Interpretability
//   <intro paragraph(s) — the "why this matters" hook>
//   ## Start here
//   ...
//   ## Map
//   ...
//   ## Chunk 1: <title> · ~20 min
//   ...
//   ## Glossary
//   ...
//
// Everything is plain markdown; the only structure this relies on is the
// frontmatter and "## " headings, which split the body into sections. A
// section whose heading starts with "Chunk <n>" is a learnable unit and
// gets a "done" checkbox + counts toward progress in the UI. The parser
// is deliberately forgiving — a guide with unexpected headings still
// renders, just without the chunk affordances.

export interface GuideSection {
  title: string;
  markdown: string;
  // "Chunk 3: Attention heads · ~20 min" -> chunkNumber 3; null otherwise.
  chunkNumber: number | null;
}

export interface LearningGuide {
  slug: string;
  topic: string;
  generated: string | null; // YYYY-MM-DD as written in the frontmatter
  intro: string; // markdown before the first "## " (minus the H1)
  sections: GuideSection[];
}

const GUIDES_SUBDIR = "learning-guides";

// Topic name -> filename slug. Must match the rule the task uses when it
// writes the file, and what the Learning page links to.
export function topicSlug(topic: string): string {
  return topic
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CHUNK_HEADING_RE = /^chunk\s+(\d+)\b/i;

function parseGuide(slug: string, raw: string): LearningGuide | null {
  let topic = "";
  let generated: string | null = null;
  let body = raw;

  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    if (end !== -1) {
      const fm = raw.slice(3, end);
      for (const line of fm.split(/\r?\n/)) {
        const m = line.match(/^(\w+):\s*(.*)$/);
        if (!m) continue;
        if (m[1] === "topic") topic = m[2].trim();
        if (m[1] === "generated") generated = m[2].trim() || null;
      }
      const bodyStart = raw.indexOf("\n", end + 4);
      body = bodyStart === -1 ? "" : raw.slice(bodyStart + 1);
    }
  }

  // Split on "## " headings (H2 only — "### " inside a section stays in
  // that section's markdown).
  const lines = body.split(/\r?\n/);
  const introLines: string[] = [];
  const sections: GuideSection[] = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2 && !line.startsWith("###")) {
      if (current) {
        sections.push(finishSection(current.title, current.lines));
      }
      current = { title: h2[1], lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
    else introLines.push(line);
  }
  if (current) sections.push(finishSection(current.title, current.lines));

  // The H1 (if any) in the intro duplicates the topic — drop it, the page
  // renders its own header. If the frontmatter had no topic, use the H1.
  const intro = introLines
    .filter((l) => {
      const h1 = l.match(/^#\s+(.+?)\s*$/);
      if (h1) {
        if (!topic) topic = h1[1];
        return false;
      }
      return true;
    })
    .join("\n")
    .trim();

  if (!topic) return null;
  return { slug, topic, generated, intro, sections };
}

function finishSection(title: string, lines: string[]): GuideSection {
  const m = title.match(CHUNK_HEADING_RE);
  return {
    title,
    markdown: lines.join("\n").trim(),
    chunkNumber: m ? Number(m[1]) : null,
  };
}

// Not cached — same read-fresh-per-request convention as the rest of the
// app's local-file readers, so a task run that rewrites a guide shows up
// on the next page load.
export function getLearningGuides(): LearningGuide[] {
  const dir = dataPath(GUIDES_SUBDIR);
  if (!fs.existsSync(dir)) return [];
  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const guides: LearningGuide[] = [];
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const slug = file.slice(0, -3);
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const guide = parseGuide(slug, raw);
      if (guide) guides.push(guide);
    } catch {
      // Unreadable file — skip rather than break the whole list.
    }
  }
  guides.sort((a, b) => a.topic.localeCompare(b.topic));
  return guides;
}

// Slug is used as a filename: only accept the exact shape topicSlug()
// produces, so this can't be steered at another path.
export function getLearningGuide(slug: string): LearningGuide | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const file = path.join(dataPath(GUIDES_SUBDIR), `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  try {
    return parseGuide(slug, fs.readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}
