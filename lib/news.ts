import fs from "fs";
import path from "path";
import { hashId } from "./hash";
import { splitHeadline } from "./newsItem";
import { dataPath } from "./dataDir";

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
//   Intro sentence(s), plain/*italic*/    <- rendered as markdown (bold,
//   **bold**/`code`, one per line            italic, inline code, links),
//                                            each source line becomes its
//                                            own paragraph, not one run-on
//   ---                                  <- optional, allowed anywhere;
//   ## Section Name                      <- h2 = a real section boundary
//   ### Subsection Name                  <- h3 = optional pill/category tag,
//                                            resets at the next "## "
//   - **Headline** Summary, its own fresh sentence. Source: [Name](url), ...
//   ---                                  <- only the LAST "---" in the
//   ## Processed this run                   whole file starts footer capture;
//   Free text, shown raw/unformatted        everything from there on is
//                                            dumped verbatim, not parsed.
// As of 2026-09-02, sources moved from a parenthetical group right after
// the headline to a trailing "Source: [Name](url), ..." sentence — see
// ./newsItem's own top comment for the full current shape, including the
// interest-tier note ("*(medium)*", ...) that may follow the sources and
// is intentionally dropped rather than parsed/displayed. The pre-2026-09-02
// shape ("**Headline** ([Source](url), ...): Excerpt.") is still accepted
// as a fallback in case a run ever slips back to it.
//
// A bullet without a **bold** headline still renders — splitHeadline() (in
// ./newsItem, shared with the client-side excerpt/source parsing) falls
// back to cutting the text right before the "Source:" label (or, for the
// older shape, the "([" source-links group) instead of a blind 80-char
// truncation, so it still produces a clean headline as long as one of
// those follows. Only a bullet with neither a bold marker nor a
// recognizable source marker falls back to a blunt 80-char slice.
//
// Every story is also allowed to skip the leading "- " bullet marker
// entirely and just be its own paragraph line (one line = one story) —
// added 2026-08-31 after a "condensed catch-up" run wrote most sections as
// bare "**Bold lead.** summary…" paragraphs instead of bulleted lists, and
// every one of those sections silently vanished from the page (the parser
// only ever recognized lines starting with "- "). Both shapes are parsed
// identically from here — a non-empty, non-heading line becomes an item
// either way — so a future format drift like that one no longer drops
// content, it just renders slightly less tidily.
//
// That "any line is a story" fallback is deliberately not unconditional,
// though: a line is only treated as a story if it contains a **bold**
// span or a markdown [link](url) somewhere in it — every real bullet has
// at least one of those, per the shape above. A plain-prose line with
// neither is section-level commentary, not a story — e.g. "Kept detailed
// per your standing preference for this category." showing up as its own
// line under a section heading (seen 2026-09-02) — and gets silently
// skipped rather than rendered as a broken, sourceless "article" card.
function newsDir(): string {
  return process.env.NEWS_BRIEFING_DIR?.trim() || dataPath("news");
}

const SUMMARY_RE = /^(\d{4}-\d{2}-\d{2})-news-summary\.md$/;

// The daily-news task splits AI-related stories into their own dated file
// (added 2026-08-31 per that task's own CLAUDE.md, "AI news — separate
// briefing file") — same folder, same markdown shape as the main summary,
// just a different filename suffix and read/rendered as a fully separate
// briefing (own page, own feedback log) rather than merged into the main
// one.
const AI_SUMMARY_RE = /^(\d{4}-\d{2}-\d{2})-ai-briefing\.md$/;

// "none" represents a cleared/undone rating — clicking an already-active
// rate button sends this so the log's "last line wins" reduction (see
// readLatestFeedback below) correctly shows the item as unrated again.
export type Rating = "down" | "up" | "love" | "none";

export interface NewsItem {
  id: string;
  date: string;
  section: string;
  subheading: string | null;
  headline: string;
  markdown: string;
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
    // Blank lines between bullets/paragraphs — not content.
    if (!trimmed) continue;
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

    // A story, either as a "- " bullet (the documented, primary format) or
    // as a bare paragraph line — a condensed/catch-up run may drop the
    // bullet marker but still write one story per line. Either way, any
    // remaining non-empty, non-heading line is one story: strip a leading
    // "- " when present, then run it through the same headline-extraction
    // fallback (bold lead, or text right before a "Source:"/"([" marker, or
    // a blunt slice) either shape ends up using.
    const body = trimmed.startsWith("- ") ? trimmed.slice(2).trim() : trimmed;

    // A genuine story always carries either a bolded headline or a
    // markdown link somewhere in it — per the format contract, even the
    // leanest "headline only" bullet still ends in "Source: [Name](url).".
    // A line with neither is section-level commentary that ended up
    // without a proper home rather than an actual story — e.g. "Kept
    // detailed per your standing preference for this category." showing
    // up as its own line under a Lifestyle/Parenting heading (seen
    // 2026-09-02) — and rendering it as a card gives a broken,
    // sourceless "article". Skip it instead.
    const looksLikeStory = /\*\*.+\*\*/.test(body) || /\[[^\]]+\]\([^)]+\)/.test(body);
    if (!looksLikeStory) continue;

    const { headline } = splitHeadline(body);
    const idSeed = `${section}|${subheading ?? ""}|${headline}`;

    items.push({
      id: hashId(idSeed),
      date,
      section,
      subheading,
      headline,
      markdown: body,
    });
  }

  return {
    date,
    title: title || date,
    // Join with a markdown blank line, not a single space — each source
    // line becomes its own rendered paragraph (see app/news/page.tsx)
    // rather than one long run-on sentence.
    intro: introLines.join("\n\n"),
    items,
    footer: footerLines.join("\n").trim(),
  };
}

export function getLatestBriefing(): NewsBriefing | null {
  const dates = listBriefingDates();
  if (dates.length === 0) return null;
  const date = dates[0];
  const raw = fs.readFileSync(path.join(newsDir(), `${date}-news-summary.md`), "utf-8");
  return parseBriefing(raw, date);
}

export function listAiBriefingDates(): string[] {
  const dir = newsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(/* turbopackIgnore: true */ dir)
    .map((f) => f.match(AI_SUMMARY_RE)?.[1])
    .filter((d): d is string => Boolean(d))
    .sort()
    .reverse();
}

export function getLatestAiBriefing(): NewsBriefing | null {
  const dates = listAiBriefingDates();
  if (dates.length === 0) return null;
  const date = dates[0];
  const raw = fs.readFileSync(path.join(newsDir(), `${date}-ai-briefing.md`), "utf-8");
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

// Kept as a separate log from feedbackPath() above rather than shared —
// mirrors the daily-news task's own choice to keep AI content in a
// wholly separate dated file from the main summary, so ratings for one
// briefing never get mixed into the other's history.
function aiFeedbackPath(): string {
  return path.join(newsDir(), "ai-feedback.jsonl");
}

export function appendAiFeedback(entry: FeedbackEntry): void {
  const dir = newsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(aiFeedbackPath(), JSON.stringify(entry) + "\n", "utf-8");
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

export function readLatestAiFeedback(): Record<string, FeedbackEntry> {
  const p = aiFeedbackPath();
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
