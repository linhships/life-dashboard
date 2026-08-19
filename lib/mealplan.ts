import fs from "fs";
import path from "path";
import { hashId } from "./hash";

// Reads the weekly meal plan produced by a separate planning task. That
// task writes dated markdown files (Weekly_Plan_YYYY-MM-DD.md, named for
// the Monday of the week) into its own folder — outside this repo, same
// pattern as the news briefing. Point MEAL_PLAN_DIR (in .env.local,
// gitignored) at that folder; falls back to data/meals/ (sample data) so
// the app still runs on a fresh clone with no env configured.
const DEFAULT_MEALS_DIR = path.join(process.cwd(), "data", "meals");

function mealsDir(): string {
  return process.env.MEAL_PLAN_DIR?.trim() || DEFAULT_MEALS_DIR;
}

const PLAN_RE = /^Weekly_Plan_(\d{4}-\d{2}-\d{2})\.md$/;

export type Kid = "Milo" | "Arlo";
export type KidRating = "up" | "down";

export interface MealRow {
  id: string;
  day: string;
  meal: string;
  dish: string;
  milo: string;
  arlo: string;
  notes: string;
}

export interface MealPlan {
  weekStart: string;
  title: string;
  intro: string;
  rows: MealRow[];
  rest: string; // everything after the table — cuisine spread, groceries, etc.
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

  const rest = lines.slice(i).join("\n").trim();

  return { weekStart, title: title || weekStart, intro: introLines.join(" "), rows, rest };
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
// for the food-planning task to mine later.
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
