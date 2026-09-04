// Copies the fictional example data from data/sample/ into data/, so the app
// has something to render on a fresh clone before you've plugged in your own
// real data.
//
// SAFE BY DEFAULT: any file that already exists in data/ is left alone and
// reported as skipped — this only ever fills in files that are missing. This
// guard exists because an earlier run of this script (without it) silently
// overwrote real saved links and real financial data with the fictional
// samples, since data/ isn't one file, it's the same folder every real
// feature also writes into. To force a specific file back to its fictional
// sample version, delete that one file yourself first, or pass --force to
// overwrite everything (only do this on a fresh clone with no real data yet).

import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const force = process.argv.includes("--force");
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sampleDir = join(root, "data", "sample");
const dataDir = join(root, "data");

if (!existsSync(sampleDir)) {
  console.error("No data/sample directory found — nothing to seed.");
  process.exit(1);
}

mkdirSync(dataDir, { recursive: true });

let seeded = 0;
let skipped = 0;

// Mirrors the data/sample/ tree into data/, recursing into subfolders
// (e.g. data/sample/news/ -> data/news/) so nested sample data seeds too.
function seedDir(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  const entries = readdirSync(srcDir).filter((f) => !f.startsWith("."));
  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    if (statSync(srcPath).isDirectory()) {
      seedDir(srcPath, destPath);
    } else if (existsSync(destPath) && !force) {
      console.log(`Skipped data/${relative(dataDir, destPath)} (already exists — real data, not touching it)`);
      skipped++;
    } else {
      copyFileSync(srcPath, destPath);
      console.log(`Seeded data/${relative(dataDir, destPath)} (fictional sample data)`);
      seeded++;
    }
  }
}

seedDir(sampleDir, dataDir);

console.log(`\nDone: ${seeded} file(s) seeded, ${skipped} skipped (already present).`);
if (skipped > 0 && !force) {
  console.log("Run with --force if you actually want to overwrite those with fictional data.");
}
console.log("Run `npm run dev` to see the dashboard. When you're ready, replace any remaining");
console.log("sample files in data/ with your own — they're gitignored.");
