import fs from "fs";
import path from "path";
import { hashId } from "./hash";
import { dataPath } from "./dataDir";

// Reads the weekly meal plan produced by a separate planning task. That
// task writes dated markdown files (Weekly_Plan_YYYY-MM-DD.md, named for
// the Monday of the week) into its own folder — outside this repo, same
// pattern as the news briefing. Point MEAL_PLAN_DIR (in .env.local,
// gitignored) at that folder; falls back to sample-data/meals/ (fictional
// demo data — see lib/dataDir.ts) so the app still runs on a fresh clone
// with no env configured.
function mealsDir(): string {
  return process.env.MEAL_PLAN_DIR?.trim() || dataPath("meals");
}

const PLAN_RE = /^Weekly_Plan_(\d{4}-\d{2}-\d{2})\.md$/;

export type Kid = "Milo" | "Arlo";
export type KidRating = "up" | "down" | "none";

export interface MealRow {
  id: string;
  day: string;
  meal: string;
  dish: string;
  milo: string;
  arlo: string;
  notes: string;
}

export interface GroceryItem {
  id: string;
  text: string;
}

export interface GrocerySubsection {
  subheading: string | null;
  note: string;
  items: GroceryItem[];
}

export interface GrocerySection {
  heading: string;
  subsections: GrocerySubsection[];
}

export interface OtherSection {
  heading: string;
  markdown: string;
}

export interface MealPlan {
  weekStart: string;
  title: string;
  intro: string;
  rows: MealRow[];
  otherSections: OtherSection[];
  grocerySections: GrocerySection[];
}

export interface MealFeedbackEntry {
  id: string;
  weekStart: string;
  day: string;
  meal: string;
  dish: string;
  kid: Kid;
  rating: KidRating;
  ratedAt: string;
}

export interface GroceryCheckEntry {
  id: string;
  weekStart: string;
  section: string;
  subheading: string | null;
  text: string;
  checked: boolean;
  checkedAt: string;
}

export function listPlanWeeks(): string[] {
  const dir = mealsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(/* turbopackIgnore: true */ dir)
    .map((f) => f.match(PLAN_RE)?.[1])
    .filter((d): d is string => Boolean(d))
    .sort();
}

// "This week's" plan: the most recent week-start that isn't in the future.
// Falls back to the latest available plan if every file is in the future
// (e.g. a plan drafted early for next week).
function pickCurrentWeek(weeks: string[]): string | null {
  if (weeks.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const notFuture = weeks.filter((w) => w <= today);
  return notFuture.length > 0 ? notFuture[notFuture.length - 1] : weeks[weeks.length - 1];
}

function splitTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

// Only "Groceries by Delivery" gets parsed into checkable items — the
// plain "Groceries" section stays as a regular read-only list, same as
// Cuisine spread / Open items.
function isGrocerySection(heading: string): boolean {
  return heading.toLowerCase().includes("groceries by delivery");
}

function parseGrocerySection(
  heading: string,
  lines: string[],
  weekStart: string
): GrocerySection {
  const subsections: GrocerySubsection[] = [];

  const ensureSubsection = (subheading: string | null): GrocerySubsection => {
    const last = subsections[subsections.length - 1];
    if (last && last.subheading === subheading) return last;
    const next: GrocerySubsection = { subheading, note: "", items: [] };
    subsections.push(next);
    return next;
  };

  let current = ensureSubsection(null);

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("### ")) {
      current = ensureSubsection(trimmed.replace(/^###\s+/, ""));
      continue;
    }
    if (trimmed.startsWith("- ")) {
      const text = trimmed.slice(2).trim();
      current.items.push({
        id: hashId(`${weekStart}|${heading}|${current.subheading ?? ""}|${text}`),
        text,
      });
      continue;
    }
    // Plain text line (intro paragraph, "Notes:", etc.) — attach to the
    // current subsection as a small note above its items.
    current.note = current.note ? `${current.note} ${trimmed}` : trimmed;
  }

  return { heading, subsections: subsections.filter((s) => s.note || s.items.length > 0) };
}

export function parsePlan(markdown: string, weekStart: string): MealPlan {
  const lines = markdown.split("\n");
  let title = "";
  const introLines: string[] = [];
  const rows: MealRow[] = [];
  let i = 0;

  // Title (first H1) + intro paragraph(s) before the table.
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("# ")) {
      title = trimmed.replace(/^#\s+/, "");
      i++;
      continue;
    }
    if (trimmed.startsWith("| Day")) break;
    if (trimmed) introLines.push(trimmed);
    i++;
  }

  // Table: header row + separator row, then data rows until a non-"|" line.
  if (i < lines.length && lines[i].trim().startsWith("| Day")) {
    i += 2; // skip header + separator
    while (i < lines.length && lines[i].trim().startsWith("|")) {
      const cells = splitTableCells(lines[i]);
      if (cells.length >= 6) {
        const day = cells[0];
        const meal = cells[1];
        const dish = cells[2];
        rows.push({
          id: hashId(`${weekStart}|${day}|${meal}|${dish}`),
          day,
          meal,
          dish,
          milo: cells[3],
          arlo: cells[4],
          notes: cells[5],
        });
      }
      i++;
    }
  }

  // Everything after the table: split into "## " sections. Grocery-ish
  // sections get parsed into checkable items; everything else stays as
  // raw markdown, rendered as-is.
  const otherSections: OtherSection[] = [];
  const grocerySections: GrocerySection[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentHeading === null) return;
    if (isGrocerySection(currentHeading)) {
      grocerySections.push(parseGrocerySection(currentHeading, currentLines, weekStart));
    } else {
      const markdown = currentLines.join("\n").trim();
      if (markdown) otherSections.push({ heading: currentHeading, markdown });
    }
    currentLines = [];
  };

  for (; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("## ")) {
      flush();
      currentHeading = trimmed.replace(/^##\s+/, "");
      continue;
    }
    if (currentHeading !== null) currentLines.push(lines[i]);
  }
  flush();

  return {
    weekStart,
    title: title || weekStart,
    intro: introLines.join(" "),
    rows,
    otherSections,
    grocerySections,
  };
}

export function getCurrentMealPlan(): MealPlan | null {
  const weeks = listPlanWeeks();
  const weekStart = pickCurrentWeek(weeks);
  if (!weekStart) return null;
  const raw = fs.readFileSync(path.join(mealsDir(), `Weekly_Plan_${weekStart}.md`), "utf-8");
  return parsePlan(raw, weekStart);
}

function feedbackPath(): string {
  return path.join(mealsDir(), "meal-feedback.jsonl");
}

export function appendMealFeedback(entry: MealFeedbackEntry): void {
  const dir = mealsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(feedbackPath(), JSON.stringify(entry) + "\n", "utf-8");
}

// Append-only log, keyed by "<rowId>:<kid>" — last line wins, so this
// reduces the log to "current" ratings while keeping full history on disk
// for the food-planning task to mine later. A rating of "none" means the
// rating was cleared — treat it as unset when consumed.
export function readLatestMealFeedback(): Record<string, MealFeedbackEntry> {
  const p = feedbackPath();
  if (!fs.existsSync(p)) return {};
  const lines = fs.readFileSync(p, "utf-8").split("\n").filter(Boolean);
  const map: Record<string, MealFeedbackEntry> = {};
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as MealFeedbackEntry;
      map[`${entry.id}:${entry.kid}`] = entry;
    } catch {
      // skip malformed lines rather than fail the whole read
    }
  }
  return map;
}

function groceryCheckPath(): string {
  return path.join(mealsDir(), "grocery-checked.jsonl");
}

export function appendGroceryCheck(entry: GroceryCheckEntry): void {
  const dir = mealsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(groceryCheckPath(), JSON.stringify(entry) + "\n", "utf-8");
}

export function readLatestGroceryChecks(): Record<string, boolean> {
  const p = groceryCheckPath();
  if (!fs.existsSync(p)) return {};
  const lines = fs.readFileSync(p, "utf-8").split("\n").filter(Boolean);
  const map: Record<string, boolean> = {};
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as GroceryCheckEntry;
      map[entry.id] = entry.checked;
    } catch {
      // skip malformed lines
    }
  }
  return map;
}
