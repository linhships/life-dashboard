import fs from "fs";
import path from "path";

// Static reference card for the school meals setup — GATEHOUSE_DIR/reports/
// school-meals.md. Unlike class-info.md/credentials.md/links.md, this one
// isn't sourced from a captured email/WhatsApp message — it's read
// directly off the school's public School Meals page — so there's no
// [[msg:id]] to cite; `sourceUrl` (from frontmatter) is used instead for a
// "view source" link.

export interface SchoolMealsData {
  title: string;
  sourceUrl: string;
  items: string[];
}

function mealsPath(): string | null {
  const dir = process.env.GATEHOUSE_DIR?.trim();
  return dir ? path.join(dir, "reports", "school-meals.md") : null;
}

export function getGatehouseSchoolMeals(): SchoolMealsData | null {
  const file = mealsPath();
  if (!file || !fs.existsSync(file)) return null;

  const raw = fs.readFileSync(file, "utf-8");
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return null;
  const fm = raw.slice(3, end).trim();
  const bodyStart = raw.indexOf("\n", end + 4);
  const body = bodyStart === -1 ? "" : raw.slice(bodyStart + 1).trim();

  let title = "";
  let sourceUrl = "";
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    if (m[1] === "title") title = m[2].trim();
    if (m[1] === "source") sourceUrl = m[2].trim();
  }
  if (!title) return null;

  const items = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());

  return { title, sourceUrl, items };
}
