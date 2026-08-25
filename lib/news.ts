import fs from "fs";
import path from "path";
import { hashId } from "./hash";
import { splitHeadline } from "./newsItem";

// Reads the daily news briefing produced by the separate "daily-news"
// scheduled task. That task writes dated markdown files
// (YYYY-MM-DD-news-summary.md) into its own folder — outside this repo
// entirely on a real machine. Point NEWS_BRIEFING_DIR (in .env.local,
// gitignored) at that folder; falls back to data/news/ (sample data) so the
// app still runs on a fresh clone with no env configured.
//
// Expected markdown shape (mirrored in that task's own CLAUDE.md under
// "Markdown parsing contract", so both sides stay in sync — update both
// if this parser's expectations ever change):
//   # Title                              <- h1, first thing in the file
//   Intro sentence(s), plain or *italic*  <- rendered as plain text, no md
//   ---                                  <- optional, allowed anywhere;
//   ## Section Name                      <- h2 = a real section boundary
//   ### Subsection Name                  <- h3 = optional pill/category tag,
//                                            resets at the next "## "
//   - **Headline** ([Source](url), ...): Excerpt text.
//     ![](images/YYYY-MM-DD-<slug>.jpg)  <- optional, directly under the
//                                            bullet it belongs to; a locally
//                                            downloaded representative image
//                                            for that story (see "Article
//                                            images" in that task's CLAUDE.md)
//   ---                                  <- only the LAST "---" in the
//   ## Processed this run                   whole file starts footer capture;
//   Free text, shown raw/unformatted        everything from there on is
//                                            dumped verbatim, not parsed.
// A bullet without a **bold** headline still renders — splitHeadline() (in
// ./newsItem, shared with the client-side excerpt/source parsing) falls
// back to cutting the text right before the "([" source-links group
// instead of a blind 80-char truncation, so it still produces a clean
// headline as long as a "(...)" source group follows. Only a bullet with
// neither a bold marker nor a source group falls back to a blunt 80-char
// slice.
const DEFAULT_NEWS_DIR = path.join(process.cwd(), "data", "news");
const IMAGE_SUBDIR = "images";

function newsDir(): string {
  return process.env.NEWS_BRIEFING_DIR?.trim() || DEFAULT_NEWS_DIR;
}

const SUMMARY_RE = /^(\d{4}-\d{2}-\d{2})-news-summary\.md$/;

export type Rating = "down" | "up" | "love";

export interface NewsItem {
  id: string;
  date: string;
  section: string;
  subheading: string | null;
  headline: string;
  markdown: string;
  // Relative path (e.g. "images/2026-08-25-slug.jpg") to a locally
  // downloaded representative image, as referenced by an optional
  // "![](...)" line right under the bullet. null when the story has no
  // image yet — the UI falls back to a placeholder in that case.
  image: string | null;
}

export interface NewsBriefing {
  date: string;
  title: string;
  intro: string;
  items: NewsItem[];
  footer: string;
}

export interface FeedbackEntry {
  id: string;
  date: string;
  section: string;
  headline: string;
  rating: Rating;
  ratedAt: string;
}

export function listBriefingDates(): string[] {
  const dir = newsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(/* turbopackIgnore: true */ dir)
    .map((f) => f.match(SUMMARY_RE)?.[1])
    .filter((d): d is string => Boolean(d))
    .sort()
    .reverse();
}

export function parseBriefing(markdown: string, date: string): NewsBriefing {
  const lines = markdown.split("\n");
  let title = "";
  const introLines: string[] = [];
  const items: NewsItem[] = [];
  let section = "General";
  let subheading: string | null = null;
  let sawFirstHeading = false;
  let inFooter = false;
  const footerLines: string[] = [];

  // "---" dividers show up in multiple places — after the intro, and
  // sometimes between sections too (cosmetic, not consistent run to run)
  // — but there's always exactly one true footer boundary, right before
  // the trailing run-notes section, and it's always the *last* "---" in
  // the file. Only that one should start footer capture; every earlier
  // one is just a cosmetic rule and gets skipped.
  let lastDividerIndex = -1;
  lines.forEach((l, i) => {
    if (l.trim() === "---") lastDividerIndex = i;
  });

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!sawFirstHeading && trimmed.startsWith("# ")) {
      title = trimmed.replace(/^#\s+/, "");
      continue;
    }
    if (trimmed === "---") {
      if (i === lastDividerIndex) inFooter = true;
      continue;
    }
    if (inFooter) {
      footerLines.push(rawLine);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      section = trimmed.replace(/^##\s+/, "");
      subheading = null;
      sawFirstHeading = true;
      continue;
    }
    if (!sawFirstHeading) {
      if (trimmed) introLines.push(trimmed);
      continue;
    }
    // Subsections (e.g. "### UK" grouping Politics by region) can be
    // written either as an h3 heading or a standalone bold line — both
    // set the subheading the same way.
    if (trimmed.startsWith("### ")) {
      subheading = trimmed.replace(/^###\s+/, "");
      continue;
    }
    const boldOnly = trimmed.match(/^\*\*(.+)\*\*$/);
    if (boldOnly) {
      subheading = boldOnly[1];
      continue;
    }
    if (trimmed.startsWith("- ")) {
      const body = trimmed.slice(2).trim();
      const { headline } = splitHeadline(body);
      const idSeed = `${section}|${subheading ?? ""}|${headline}`;

      // An optional image line can directly follow the bullet:
      //   ![](images/YYYY-MM-DD-<slug>.jpg)
      // Peek at the next line and consume it (advance i) so it isn't
      // mistaken for the start of a new bullet/heading on the next
      // iteration.
      let image: string | null = null;
      const nextTrimmed = lines[i + 1]?.trim();
      const imageMatch = nextTrimmed?.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
      if (imageMatch) {
        image = imageMatch[1];
        i++;
      }

      items.push({
        id: hashId(idSeed),
        date,
        section,
        subheading,
        headline,
        markdown: body,
        image,
      });
    }
  }

  return {
    date,
    title: title || date,
    intro: introLines.join(" "),
    items,
    footer: footerLines.join("\n").trim(),
  };
}

// Resolves a NewsItem.image relative path (e.g. "images/2026-08-25-slug.jpg")
// against this briefing dir's images/ subfolder, used by the
// /api/news/image route to stream the file. Rejects anything that would
// escape the images/ subfolder (path traversal via "../", an absolute
// path, etc.) or that doesn't actually exist on disk — returns null in
// either case so the route can 404 rather than serve/leak an arbitrary
// file.
export function resolveNewsImagePath(relPath: string): string | null {
  const dir = newsDir();
  const imagesRoot = path.join(dir, IMAGE_SUBDIR);
  const resolved = path.resolve(dir, relPath);
  if (resolved !== imagesRoot && !resolved.startsWith(imagesRoot + path.sep)) {
    return null;
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return null;
  }
  return resolved;
}

export function getLatestBriefing(): NewsBriefing | null {
  const dates = listBriefingDates();
  if (dates.length === 0) return null;
  const date = dates[0];
  const raw = fs.readFileSync(path.join(newsDir(), `${date}-news-summary.md`), "utf-8");
  return parseBriefing(raw, date);
}

function feedbackPath(): string {
  return path.join(newsDir(), "feedback.jsonl");
}

export function appendFeedback(entry: FeedbackEntry): void {
  const dir = newsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(feedbackPath(), JSON.stringify(entry) + "\n", "utf-8");
}

// Append-only log — last line for a given id wins, so this reduces the log
// to "current" ratings while keeping the full history on disk for the
// daily-news task to mine later (e.g. re-deriving topic preferences).
export function readLatestFeedback(): Record<string, FeedbackEntry> {
  const p = feedbackPath();
  if (!fs.existsSync(p)) return {};
  const lines = fs.readFileSync(p, "utf-8").split("\n").filter(Boolean);
  const map: Record<string, FeedbackEntry> = {};
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as FeedbackEntry;
      map[entry.id] = entry;
    } catch {
      // skip malformed lines rather than fail the whole read
    }
  }
  return map;
}
