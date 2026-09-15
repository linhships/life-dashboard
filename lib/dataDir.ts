import path from "path";

// Real personal data and fictional demo data live in two completely
// separate top-level folders — data/ and sample-data/ — with nothing that
// ever copies or writes across them. That's a hard structural guarantee,
// not just a convention: the old approach (a `data/sample/` folder nested
// *inside* data/, mirrored into its parent by `npm run seed:sample`) once
// silently overwrote real saved links and real financial data with
// fictional placeholders, because both trees shared the same parent
// folder and the seed script's job was literally "copy sample/ into the
// folder it lives in." That mistake is no longer possible: there is no
// script that copies sample-data/ into data/ at all anymore.
//
// Which folder is used is an explicit, hardcoded choice — never an
// automatic "use real if it exists, else silently fall back to sample"
// check. A silent existence-based fallback was rejected on purpose: it
// would mean you can't tell, just by looking at the page, whether you're
// seeing your real data or fictional sample data — the answer would
// depend on which files happen to exist on disk at that moment. Instead:
//   - Default (USE_SAMPLE_DATA unset or "false"): always data/. If a real
//     file is missing, that's a missing file — the page shows empty/error
//     state, it does not quietly substitute fictional numbers.
//   - USE_SAMPLE_DATA=true (.env.local): always sample-data/, regardless
//     of what's in data/ — e.g. for screenshots or demoing the app without
//     any real numbers ever touching the screen.
// Both dataPath() (reads) and writeDataPath() (writes — links.json/
// learning.json today) resolve identically; there's no case where a read
// and a write for the same segments could land in different folders.
// Where the real folder *is* is separate from which folder is *used*.
// It defaults to <repo>/data, but can sit anywhere on the machine via
// DATA_DIR in .env.local — the same bring-your-own-folder pattern every
// other external source here already uses (NEWS_BRIEFING_DIR,
// GATEHOUSE_DIR, ...), for the same reason: this data isn't owned by the
// repo and doesn't travel with it, so a new machine should be able to
// point at wherever it actually keeps it rather than move it in. A
// relative DATA_DIR resolves against the repo root.
//
// This deliberately does NOT weaken the guarantee above: DATA_DIR only
// relocates the real folder, it never decides between real and sample —
// that stays USE_SAMPLE_DATA's job alone, so "which am I looking at" is
// still answered by exactly one setting. A DATA_DIR pointing somewhere
// that doesn't exist is a missing folder, and renders as empty/error
// state; it never silently falls through to sample-data/.
const DATA_DIR_OVERRIDE = process.env.DATA_DIR?.trim();

const REAL_DIR = DATA_DIR_OVERRIDE
  ? path.resolve(process.cwd(), DATA_DIR_OVERRIDE)
  : path.join(process.cwd(), "data");
const SAMPLE_DIR = path.join(process.cwd(), "sample-data");

const FORCE_SAMPLE = process.env.USE_SAMPLE_DATA?.trim().toLowerCase() === "true";

export function isSampleDataForced(): boolean {
  return FORCE_SAMPLE;
}

export function dataPath(...segments: string[]): string {
  return path.join(FORCE_SAMPLE ? SAMPLE_DIR : REAL_DIR, ...segments);
}

export function writeDataPath(...segments: string[]): string {
  return path.join(FORCE_SAMPLE ? SAMPLE_DIR : REAL_DIR, ...segments);
}
