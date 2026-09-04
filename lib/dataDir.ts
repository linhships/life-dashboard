import fs from "fs";
import path from "path";

// Real personal data and fictional demo data now live in two completely
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
// Instead, this is a read-time choice:
//   - dataPath(...) — for reading. Prefers the real file/folder in data/;
//     falls back to the matching file/folder in sample-data/ only if the
//     real one doesn't exist yet (e.g. a fresh clone, or a feature you
//     haven't plugged real data into yet). Once a real file exists,
//     reads always prefer it.
//   - writeDataPath(...) — for writing (links.json/learning.json today).
//     Always resolves to data/ — a write is what *creates* your real
//     data in the first place, so it should never silently land in
//     sample-data/ just because the real file didn't exist a moment ago.
//   - USE_SAMPLE_DATA=true (.env.local) forces both to sample-data/
//     regardless of what's in data/ — e.g. for taking screenshots or
//     demoing the app without any real numbers ever touching the screen.
const REAL_DIR = path.join(process.cwd(), "data");
const SAMPLE_DIR = path.join(process.cwd(), "sample-data");

const FORCE_SAMPLE = process.env.USE_SAMPLE_DATA?.trim().toLowerCase() === "true";

export function isSampleDataForced(): boolean {
  return FORCE_SAMPLE;
}

export function dataPath(...segments: string[]): string {
  if (FORCE_SAMPLE) return path.join(SAMPLE_DIR, ...segments);
  const real = path.join(REAL_DIR, ...segments);
  if (fs.existsSync(real)) return real;
  const sample = path.join(SAMPLE_DIR, ...segments);
  return fs.existsSync(sample) ? sample : real;
}

export function writeDataPath(...segments: string[]): string {
  return path.join(FORCE_SAMPLE ? SAMPLE_DIR : REAL_DIR, ...segments);
}
