import fs from "fs";
import path from "path";

// Full weekly lunch menus for the Communication page — GATEHOUSE_DIR/
// reports/meals.md. Unlike class-info.md/credentials.md/links.md, this
// isn't sourced from a captured email/WhatsApp message — it's transcribed
// directly off the school's public School Meals page — so there's no
// [[msg:id]] to cite; `sourceUrl` (from frontmatter) is used instead.
// Format: frontmatter (title/source), then free-text intro, then one
// "## YYYY-MM-DD" heading per week (the Monday that week's menu covers)
// followed by an optional note paragraph and a
// "Day | Main | Vegetarian | Side | Dessert" table.

export interface WeeklyMenuDay {
  day: string;
  main: string;
  veg: string;
  side: string;
  dessert: string;
}

export interface WeeklyMenu {
  weekStart: string; // ISO date
  note: string; // optional free-text note for the week, e.g. "partial week" / "same as week of X"
  days: WeeklyMenuDay[];
}

export interface GatehouseMealsData {
  sourceUrl: string;
  intro: string; // general blurb (catering info, every-day items, rotation note)
  weeks: WeeklyMenu[];
}

function mealsPath(): string | null {
  const dir = process.env.GATEHOUSE_DIR?.trim();
  return dir ? path.join(dir, "reports", "meals.md") : null;
}

function splitTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

export function getGatehouseMeals(): GatehouseMealsData | null {
  const file = mealsPath();
  if (!file || !fs.existsSync(file)) return null;

  const raw = fs.readFileSync(file, "utf-8");
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return null;
  const fm = raw.slice(3, end).trim();
  const bodyStart = raw.indexOf("\n", end + 4);
  const body = bodyStart === -1 ? "" : raw.slice(bodyStart + 1).trim();

  let sourceUrl = "";
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    if (m[1] === "source") sourceUrl = m[2].trim();
  }

  // Split the body on "## YYYY-MM-DD" headings — everything before the
  // first heading is the general intro blurb.
  const sections = body.split(/\n(?=## \d{4}-\d{2}-\d{2}\s*$)/m);
  const intro = sections[0]?.trim().startsWith("##") ? "" : (sections.shift() ?? "").trim();

  const weeks: WeeklyMenu[] = [];
  for (const section of sections) {
    const headingMatch = section.match(/^## (\d{4}-\d{2}-\d{2})\s*$/m);
    if (!headingMatch) continue;
    const weekStart = headingMatch[1];
    const lines = section.slice(headingMatch.index! + headingMatch[0].length).split(/\r?\n/);

    const noteLines: string[] = [];
    const days: WeeklyMenuDay[] = [];
    let inTable = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("| Day")) {
        inTable = true;
        continue;
      }
      if (!inTable) {
        noteLines.push(trimmed);
        continue;
      }
      if (/^\|\s*-+\s*\|/.test(trimmed)) continue; // header separator row
      if (!trimmed.startsWith("|")) continue;
      const cells = splitTableCells(trimmed);
      if (cells.length < 5) continue;
      const [day, main, veg, side, dessert] = cells;
      if (!day) continue;
      days.push({ day, main, veg, side, dessert });
    }

    weeks.push({ weekStart, note: noteLines.join(" ").trim(), days });
  }

  weeks.sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return { sourceUrl, intro, weeks };
}
