import fs from "fs";
import path from "path";
import { hashId } from "./hash";

// Reads the daily news briefing produced by the separate "daily-news"
// scheduled task. That task writes dated markdown files
// (YYYY-MM-DD-news-summary.md) into its own folder — outside this repo
// entirely on a real machine. Point NEWS_BRIEFING_DIR (in .env.local,
// gitignored) at that folder; falls back to data/news/ (sample data) so the
// app still runs on a fresh clone with no env configured.
const DEFAULT_NEWS_DIR = path.join(process.cwd(), "data", "news");

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
    const boldOnly = trimmed.match(/^\*\*(.+)\*\*$/);
    if (boldOnly) {
      subheading = boldOnly[1];
      continue;
    }
    if (trimmed.startsWith("- ")) {
      const body = trimmed.slice(2).trim();
      const headlineMatch = body.match(/^\*\*(.+?)\*\*/);
      const headline = headlineMatch ? headlineMatch[1] : body.slice(0, 80);
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
  }

  return {
    date,
    title: title || date,
    intro: introLines.join(" "),
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
