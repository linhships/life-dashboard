import fs from "fs";
import path from "path";

import { dataPath, isSampleDataForced } from "./dataDir";
import { getAccounts, getIncome, getPensionAllowance } from "./data";
import { getGatehouseMessages } from "./gatehouse";
import { getGatehouseReports } from "./gatehouseReports";
import {
  AI_SUMMARY_RE,
  listAiBriefingDates,
  listBriefingDates,
  SUMMARY_RE,
} from "./news";
import { listPlanWeeks } from "./mealplan";
import { getRecipes } from "./recipes";
import { getResources } from "./resources";
import { getLearningResources } from "./learning";
import { getLearningGuides } from "./learningGuides";
import {
  getToriCareDays,
  PHOTO_FILENAME_RE as TORI_PHOTO_RE,
  SKIPPED_FILENAME_RE as TORI_SKIPPED_RE,
  VIDEO_FILENAME_RE as TORI_VIDEO_RE,
} from "./toriPhotos";
import {
  EXCLUDED_PHOTOS as MILO_EXCLUDED,
  getMiloNurseryDays,
  PHOTO_FILENAME_RE as MILO_PHOTO_RE,
} from "./miloNurseryPhotos";
import {
  getArloNurseryDays,
  MONTH_DIR_RE as ARLO_MONTH_DIR_RE,
  PHOTO_FILENAME_RE as ARLO_PHOTO_RE,
} from "./arloNurseryPhotos";
import {
  getChiarlineDays,
  PHOTO_FILENAME_RE as CHIARLINE_PHOTO_RE,
  VIDEO_FILENAME_RE as CHIARLINE_VIDEO_RE,
} from "./chiarlineDays";

// Every failure this app has had in practice looked the same from the
// outside: a page that loads fine and shows nothing. A folder moved, an env
// var pointed one level too deep, a scheduled task changed the shape of the
// markdown it writes - and because each reader catches its own errors and
// returns an empty list (which is right: one broken source shouldn't take
// down a page), nothing was ever reported anywhere.
//
// This module is the counterweight. Per source it answers two questions
// that fail independently:
//
//   1. Does the folder resolve?   -> catches moved folders and bad paths
//   2. What did the reader find?  -> catches format changes, where the
//                                    folder is fine and the parse is not
//
// A path check alone would have caught only half of the real incidents.
// "Resolves, found nothing" is the most valuable cell on the page.

export type HealthStatus = "ok" | "empty" | "missing" | "unset" | "error";

export interface HealthRow {
  label: string;
  page: string;
  envVar: string | null;
  resolvedPath: string | null;
  configured: boolean;
  status: HealthStatus;
  found: string;
  newest: string | null;
  // Media files present whose NAMES the reader cannot use - the signal
  // that a filename or folder convention changed underneath us. This is
  // deliberately NOT "files on disk minus files shown": plenty of files
  // are excluded on purpose (sent by someone else, before the date
  // cutoff), and counting those made the number a permanent false alarm.
  // Only unreadable names count. null where the source has no naming
  // convention to violate.
  unparsed: number | null;
  // What unparsed means for this source, so a number is never bare.
  unparsedLabel: string | null;
  // A few of the offending names. A count alone makes you go and look,
  // which is exactly the errand this page exists to save.
  unparsedExamples: string[];
  error: string | null;
  hint: string | null;
}

// The readers' date lists are not consistently ordered - listBriefingDates
// returns newest-first, listPlanWeeks oldest-first - so indexing either end
// is a coin flip. Taking the maximum is order-independent and can't drift
// if a reader's sort changes.
function latestOf(dates: string[]): string | null {
  return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}

function envDir(name: string): string | null {
  const raw = process.env[name]?.trim();
  return raw ? raw : null;
}

function exists(dir: string | null): boolean {
  if (!dir) return false;
  try {
    return fs.existsSync(dir);
  } catch {
    return false;
  }
}

// Newest mtime up to `depth` levels down, as YYYY-MM-DD. Deliberately
// capped: staleness is visible from the newest file, and walking an entire
// photo archive to learn it would make this page slow.
function newestMtime(target: string | null, depth = 2): string | null {
  if (!target) return null;
  let newest = 0;
  const consider = (p: string) => {
    try {
      const t = fs.statSync(p).mtimeMs;
      if (t > newest) newest = t;
    } catch {
      /* unreadable - ignore */
    }
  };
  const walk = (d: string, level: number) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (level < depth) walk(p, level + 1);
        continue;
      }
      consider(p);
    }
  };
  try {
    if (fs.statSync(target).isDirectory()) walk(target, 0);
    else consider(target);
  } catch {
    return null;
  }
  return newest === 0 ? null : new Date(newest).toISOString().slice(0, 10);
}

// Count files matching `re` up to `depth` levels down, skipping `skip` dirs.
function countFiles(
  dir: string | null,
  re: RegExp,
  depth = 1,
  skip: string[] = []
): number | null {
  if (!dir) return null;
  const skipLower = skip.map((s) => s.toLowerCase());
  let n = 0;
  const walk = (d: string, level: number) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        if (skipLower.includes(entry.name.toLowerCase())) continue;
        if (level < depth) walk(path.join(d, entry.name), level + 1);
        continue;
      }
      if (re.test(entry.name)) n += 1;
    }
  };
  walk(dir, 0);
  return n;
}

// Whether a _chat.txt is reachable under CHIARLINE_DIR. Called out on its
// own because its absence has exactly one symptom - notes render, photos
// silently don't - which is otherwise indistinguishable from a format
// change.
function chiarlineChatLogFound(): boolean {
  const dir = envDir("CHIARLINE_DIR");
  if (!dir) return false;
  try {
    if (fs.existsSync(path.join(dir, "_chat.txt"))) return true;
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .some((e) => fs.existsSync(path.join(dir, e.name, "_chat.txt")));
  } catch {
    return false;
  }
}

// Files matching `candidate` (i.e. "this looks like data") whose names
// fail `accepted` (i.e. "the reader can't use it"). That difference is the
// format-change signal; anything the reader filters out for other reasons
// never appears here.
function listUnnameable(
  dir: string | null,
  candidate: RegExp,
  accepted: RegExp[],
  depth = 1,
  skip: string[] = []
): string[] {
  if (!dir) return [];
  const skipLower = skip.map((x) => x.toLowerCase());
  const names: string[] = [];
  const walk = (d: string, level: number) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        if (skipLower.includes(entry.name.toLowerCase())) continue;
        if (level < depth) walk(path.join(d, entry.name), level + 1);
        continue;
      }
      if (!candidate.test(entry.name)) continue;
      if (!accepted.some((re) => re.test(entry.name))) names.push(entry.name);
    }
  };
  walk(dir, 0);
  return names.sort();
}

function countUnnameable(
  dir: string | null,
  candidate: RegExp,
  accepted: RegExp[],
  depth = 1,
  skip: string[] = []
): number {
  return listUnnameable(dir, candidate, accepted, depth, skip).length;
}

// Arlo's photos are only visible to the reader when BOTH the month folder
// and the filename match. A correctly-named photo inside a wrongly-named
// month folder is invisible, which is exactly how a whole year of photos
// once vanished - so both are counted here.
function countArloUnreachable(
  dir: string
): { count: number; label: string; examples: string[] } | null {
  let count = 0;
  const badFolderNames: string[] = [];
  const badFileNames: string[] = [];
  let years: fs.Dirent[];
  try {
    years = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const year of years) {
    if (!year.isDirectory() || !/^\d{4}$/.test(year.name)) continue;
    const yearPath = path.join(dir, year.name);
    let months: fs.Dirent[];
    try {
      months = fs.readdirSync(yearPath, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const month of months) {
      if (!month.isDirectory()) continue;
      const monthPath = path.join(yearPath, month.name);
      const reachable = ARLO_MONTH_DIR_RE.test(`${year.name}/${month.name}`);
      const jpegs = countFiles(monthPath, /\.jpe?g$/i, 0) ?? 0;
      if (!reachable) {
        if (jpegs > 0) {
          badFolderNames.push(`${year.name}/${month.name}/`);
          count += jpegs;
        }
        continue;
      }
      const unnameable = listUnnameable(monthPath, /\.jpe?g$/i, [ARLO_PHOTO_RE], 0, ["completed"]);
      count += unnameable.length;
      badFileNames.push(...unnameable);
    }
  }
  const label =
    badFolderNames.length > 0
      ? `in ${badFolderNames.length} month folder${
          badFolderNames.length === 1 ? "" : "s"
        } the reader skips`
      : "with unrecognised filenames";
  return {
    count,
    label,
    examples: (badFolderNames.length > 0 ? badFolderNames : badFileNames).slice(0, 4),
  };
}

// Shapes a name list into the {count, examples} a probe returns.
function withExamples(names: string[]): { count: number; examples: string[] } {
  return { count: names.length, examples: names.slice(0, 4) };
}

interface ProbeResult {
  found: string;
  surfaced?: number;
}

interface Probe {
  label: string;
  page: string;
  envVar: string | null;
  resolve: (configured: string | null) => string | null;
  read: () => Promise<ProbeResult> | ProbeResult;
  // Counts files the reader can see but cannot name-match, using the
  // reader's OWN exported patterns so the two can't drift apart.
  unparsed?: (dir: string) => { count: number; label: string; examples?: string[] } | null;
  hint?: string;
}

const PHOTO_RE = /\.jpe?g$/i;
const MEDIA_RE = /\.(jpe?g|mp4)$/i;
const MD_RE = /\.md$/i;

const PROBES: Probe[] = [
  {
    label: "Finance",
    page: "/finance",
    envVar: "DATA_DIR",
    resolve: () => dataPath(),
    read: () => {
      const accounts = getAccounts();
      const income = getIncome();
      const allowance = getPensionAllowance();
      const dates = new Set(accounts.map((a) => a.date));
      return {
        found: `${dates.size} snapshots · ${income.length} months · ${allowance.length} tax years`,
        surfaced: accounts.length + income.length + allowance.length,
      };
    },
    hint: "The finance CSVs and retirement_model.xlsx sit directly in DATA_DIR.",
  },
  {
    label: "Daily briefing",
    page: "/news",
    envVar: "NEWS_BRIEFING_DIR",
    resolve: (c) => c ?? dataPath("news"),
    read: () => {
      const dates = listBriefingDates();
      return {
        found: dates.length
          ? `${dates.length} briefings · latest ${latestOf(dates)}`
          : "no briefings",
        surfaced: dates.length,
      };
    },
    // This folder is shared: the AI briefings belong to /ai-news, the task
    // keeps its own CLAUDE.md here, and articles/ holds the source material
    // it collects. None of that is an unrecognised briefing, so all of it
    // counts as accepted and the scan does not descend into subfolders.
    unparsed: (d) => ({
      ...withExamples(listUnnameable(d, MD_RE, [SUMMARY_RE, AI_SUMMARY_RE, /^CLAUDE\.md$/i], 0)),
      label: "with unrecognised filenames",
    }),
    hint: "Expects YYYY-MM-DD-news-summary.md files. Unset falls back to DATA_DIR/news, which holds FICTIONAL sample copies - so an unset row showing data is showing invented data.",
  },
  {
    label: "AI briefing",
    page: "/ai-news",
    envVar: "NEWS_BRIEFING_DIR",
    resolve: (c) => c ?? dataPath("news"),
    read: () => {
      const dates = listAiBriefingDates();
      return {
        found: dates.length
          ? `${dates.length} briefings · latest ${latestOf(dates)}`
          : "no briefings",
        surfaced: dates.length,
      };
    },
    hint: "Expects YYYY-MM-DD-ai-briefing.md, in the same folder as the daily briefings.",
  },
  {
    label: "Meal plans",
    page: "/meals",
    envVar: "MEAL_PLAN_DIR",
    resolve: (c) => c ?? dataPath("meals"),
    read: () => {
      const weeks = listPlanWeeks();
      return {
        found: weeks.length
          ? `${weeks.length} weeks · latest ${latestOf(weeks)}`
          : "no plans",
        surfaced: weeks.length,
      };
    },
    unparsed: (d) => ({
      ...withExamples(listUnnameable(d, MD_RE, [/^Weekly_Plan_\d{4}-\d{2}-\d{2}\.md$/i], 0)),
      label: "with unrecognised filenames",
    }),
    hint: "Expects Weekly_Plan_YYYY-MM-DD.md, named for that week's Monday. Unset falls back to DATA_DIR/meals, which holds FICTIONAL sample copies.",
  },
  {
    label: "Recipes",
    page: "/recipes",
    envVar: "FOOD_PLANNING_DIR",
    resolve: (c) => c ?? dataPath("food"),
    read: () => {
      const recipes = getRecipes();
      return { found: `${recipes.length} recipes`, surfaced: recipes.length };
    },
    hint: "Expects Food_list.md plus a recipes/ subfolder. Unset falls back to DATA_DIR/food, which holds FICTIONAL sample copies.",
  },
  {
    label: "Gatehouse",
    page: "/gatehouse",
    envVar: "GATEHOUSE_DIR",
    resolve: (c) => c,
    read: () => {
      const messages = getGatehouseMessages();
      const reports = getGatehouseReports();
      return {
        found: `${messages.length} messages · ${reports.length} reports`,
        surfaced: messages.length + reports.length,
      };
    },
    hint: "Expects messages/*.md and reports/*.md. Unset means this page has no data at all.",
  },
  {
    label: "Resources",
    page: "/resources",
    envVar: "DATA_DIR",
    resolve: () => dataPath("resources.json"),
    read: () => {
      const items = getResources();
      return { found: `${items.length} saved links`, surfaced: items.length };
    },
  },
  {
    label: "Learning",
    page: "/learning",
    envVar: "DATA_DIR",
    resolve: () => dataPath("learning.json"),
    read: () => {
      const items = getLearningResources();
      const guides = getLearningGuides();
      return {
        found: `${items.length} links · ${guides.length} guides`,
        surfaced: items.length + guides.length,
      };
    },
  },
  {
    label: "Tori photos",
    page: "/tori-photos",
    envVar: "TORI_PHOTOS_DIR",
    resolve: (c) => c,
    read: () => {
      const days = getToriCareDays();
      const photos = days.reduce((s, d) => s + d.photos.length, 0);
      return { found: `${days.length} days · ${photos} photos`, surfaced: photos };
    },
    unparsed: (d) => ({
      // TORI_SKIPPED_RE counts as "accepted" here: GIFs are excluded on
      // purpose, so they must not read as an unrecognised format.
      ...withExamples(
        listUnnameable(d, MEDIA_RE, [TORI_PHOTO_RE, TORI_VIDEO_RE, TORI_SKIPPED_RE], 1)
      ),
      label: "with unrecognised filenames",
    }),
    hint: "Expects one subfolder per exported chat thread.",
  },
  {
    label: "Milo nursery",
    page: "/milo-nursery",
    envVar: "MILO_NURSERY_PHOTOS_DIR",
    resolve: (c) => c,
    read: async () => {
      const days = await getMiloNurseryDays();
      const photos = days.reduce((s, d) => s + d.photos.length, 0);
      return { found: `${days.length} days · ${photos} photos`, surfaced: photos };
    },
    // Milo's photos have no date in their names - the day comes from each
    // file's EXIF. So the meaningful gap here isn't an unreadable NAME but
    // an unreadable DATE: a photo the reader can see and cannot place. That
    // is precisely how a bundling failure in the EXIF library emptied this
    // gallery while the folder looked perfectly healthy.
    unparsed: (d) => {
      let candidates = 0;
      try {
        for (const f of fs.readdirSync(d)) {
          if (!MILO_PHOTO_RE.test(f)) continue;
          if (MILO_EXCLUDED.has(f)) continue;
          candidates += 1;
        }
      } catch {
        return null;
      }
      return { count: candidates, label: "with no readable date" };
    },
    hint: "A flat folder of jpegs, grouped by each file's EXIF date.",
  },
  {
    label: "Arlo nursery",
    page: "/arlo-nursery",
    envVar: "ARLO_NURSERY_PHOTOS_DIR",
    resolve: (c) => c,
    read: () => {
      const days = getArloNurseryDays();
      const photos = days.reduce((s, d) => s + d.photos.length, 0);
      const facts = days.filter((d) => d.facts).length;
      return {
        found: `${days.length} days · ${photos} photos · ${facts} with app data`,
        surfaced: photos,
      };
    },
    unparsed: countArloUnreachable,
    hint: "Expects <YYYY>/<M MonthName>/ folders - see ARLO-UPDATES-FORMAT.md.",
  },
  {
    label: "Chiarline",
    page: "/arlo-nursery",
    envVar: "CHIARLINE_DIR",
    resolve: (c) => c,
    read: () => {
      const days = getChiarlineDays();
      const notes = days.reduce((s, d) => s + d.notes.length, 0);
      const media = days.reduce((s, d) => s + d.media.length, 0);
      const chatLog = chiarlineChatLogFound();
      return {
        found: `${days.length} days · ${notes} notes · ${media} media${
          chatLog ? "" : " · NO chat log"
        }`,
        surfaced: media,
      };
    },
    // One level deep only, matching the reader: archive/ and "not relevant"/
    // sit inside these folders and hold the rejected pictures.
    unparsed: (d) => ({
      ...withExamples(
        listUnnameable(d, MEDIA_RE, [CHIARLINE_PHOTO_RE, CHIARLINE_VIDEO_RE], 1, [
          "archive",
          "not relevant",
        ])
      ),
      label: "with unrecognised filenames",
    }),
    hint: "Must point at the folder CONTAINING both updates.md and the export's _chat.txt - see CHIARLINE-UPDATES-FORMAT.md.",
  },
];

export interface HealthReport {
  rows: HealthRow[];
  sampleDataForced: boolean;
  checkedAt: string;
}

export async function getDataHealth(): Promise<HealthReport> {
  const rows: HealthRow[] = [];

  for (const probe of PROBES) {
    const configuredValue = probe.envVar ? envDir(probe.envVar) : null;
    const resolvedPath = probe.resolve(configuredValue);
    // DATA_DIR-backed sources resolve to a path inside it and are always
    // "configured" - the override being unset just means the default.
    const configured = probe.envVar === "DATA_DIR" ? true : configuredValue !== null;
    const present = exists(resolvedPath);

    let found = "—";
    let surfaced: number | undefined;
    let error: string | null = null;

    if (present) {
      try {
        const result = await probe.read();
        found = result.found;
        surfaced = result.surfaced;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
    }

    let unparsed: number | null = null;
    let unparsedLabel: string | null = null;
    let unparsedExamples: string[] = [];
    if (present && probe.unparsed) {
      try {
        const result = probe.unparsed(resolvedPath as string);
        if (result) {
          // A probe reporting "with no readable date" hands back the number
          // of candidate files; the shortfall against what the reader
          // actually surfaced is the part worth showing.
          unparsed =
            result.label === "with no readable date"
              ? Math.max(0, result.count - (surfaced ?? 0))
              : result.count;
          unparsedLabel = result.label;
          unparsedExamples = result.examples ?? [];
        }
      } catch {
        // A folder we can't walk isn't worth failing the whole page for.
      }
    }

    let status: HealthStatus;
    if (!configured) status = "unset";
    else if (!present) status = "missing";
    else if (error) status = "error";
    else if (!surfaced) status = "empty";
    else status = "ok";

    rows.push({
      label: probe.label,
      page: probe.page,
      envVar: probe.envVar,
      resolvedPath,
      configured,
      status,
      found,
      newest: present ? newestMtime(resolvedPath) : null,
      unparsed,
      unparsedLabel,
      unparsedExamples,
      error,
      hint: status === "ok" && !unparsed ? null : (probe.hint ?? null),
    });
  }

  return {
    rows,
    sampleDataForced: isSampleDataForced(),
    checkedAt: new Date().toISOString(),
  };
}
