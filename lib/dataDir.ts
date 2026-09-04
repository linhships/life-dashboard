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
const REAL_DIR = path.join(process.cwd(), "data");
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
