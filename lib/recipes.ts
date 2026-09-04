import fs from "fs";
import path from "path";
import { hashId } from "./hash";
import { dataPath } from "./dataDir";

// Reads Food_list.md (and the recipes/ subfolder next to it) produced by
// the food-planning task. Point FOOD_PLANNING_DIR (in .env.local,
// gitignored) at the folder containing both — same bring-your-own-data
// pattern as MEAL_PLAN_DIR, and in fact the parent of that folder in the
// real setup (MEAL_PLAN_DIR is FOOD_PLANNING_DIR/weekly-plans). If unset,
// reads from data/food/ (or sample-data/food/ if USE_SAMPLE_DATA=true —
// see lib/dataDir.ts) so the app still runs on a fresh clone with no env
// configured.
function foodPlanningDir(): string {
  return process.env.FOOD_PLANNING_DIR?.trim() || dataPath("food");
}

function foodListPath(): string {
  return path.join(foodPlanningDir(), "Food_list.md");
}

export interface RecipeLink {
  label: string;
  url: string;
}

export interface RecipeEntry {
  id: string;
  slug: string;
  dish: string;
  category: string;
  cuisine: string;
  links: RecipeLink[];
  externalLinks: RecipeLink[];
  localFilePath: string | null;
  milo: string;
  arlo: string;
  additionalIngredients: string;
}

function splitTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

// Filesystem/URL-safe id for a dish, used as the cached image's filename
// (see app/api/recipes/image) — stable across requests, unlike hashId's
// output, which is fine for a cache key but less pleasant to eyeball on
// disk.
export function slugify(dish: string): string {
  return (
    dish
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "") // strip accents (e.g. e -> e, u -> u)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "recipe"
  );
}

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

function parseLinksCell(cell: string): RecipeLink[] {
  const links: RecipeLink[] = [];
  for (const m of cell.matchAll(LINK_RE)) {
    links.push({ label: m[1].trim(), url: m[2].trim() });
  }
  return links;
}

// A link counts as "local" if it points at a .md file rather than a real
// URL — that's the "[File](./recipes/...)" entry the food-planning task
// adds alongside the original source link.
function isLocalFileLink(link: RecipeLink): boolean {
  return /\.md$/i.test(link.url) && !/^https?:\/\//i.test(link.url);
}

export function getRecipes(): RecipeEntry[] {
  const listPath = foodListPath();
  if (!fs.existsSync(listPath)) return [];

  const dir = path.dirname(listPath);
  const lines = fs.readFileSync(listPath, "utf-8").split(/\r?\n/);

  const entries: RecipeEntry[] = [];
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inTable) {
      if (trimmed.startsWith("| Dish")) inTable = true;
      continue;
    }
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*-+\s*\|/.test(trimmed)) continue; // header separator row

    const cells = splitTableCells(trimmed);
    if (cells.length < 7) continue;
    const [dish, category, cuisine, linkCell, milo, arlo, extraIngredients] = cells;
    if (!dish) continue;

    const links = parseLinksCell(linkCell);
    if (links.length === 0) continue; // no recipe link — not shown on /recipes

    const externalLinks = links.filter((l) => !isLocalFileLink(l));
    const localLink = links.find(isLocalFileLink);
    let localFilePath: string | null = null;
    if (localLink) {
      const resolved = path.resolve(dir, localLink.url);
      // Guard against the link escaping the food-planning folder — resolved
      // path must stay under `dir`.
      if ((resolved === dir || resolved.startsWith(dir + path.sep)) && fs.existsSync(resolved)) {
        localFilePath = resolved;
      }
    }

    entries.push({
      id: hashId(dish),
      slug: slugify(dish),
      dish,
      category,
      cuisine,
      links,
      externalLinks,
      localFilePath,
      milo,
      arlo,
      additionalIngredients: extraIngredients,
    });
  }

  return entries.sort((a, b) => a.dish.localeCompare(b.dish));
}

export function getRecipeMarkdown(entry: RecipeEntry): string | null {
  if (!entry.localFilePath) return null;
  try {
    return fs.readFileSync(entry.localFilePath, "utf-8");
  } catch {
    return null;
  }
}

// The URL used to source a preview photo for this recipe (see
// app/api/recipes/image) — the first external source link, since the
// local .md file has no image of its own.
export function primaryExternalUrl(entry: RecipeEntry): string | null {
  return entry.externalLinks[0]?.url ?? null;
}

export function findRecipeBySlug(slug: string): RecipeEntry | null {
  return getRecipes().find((r) => r.slug === slug) ?? null;
}
