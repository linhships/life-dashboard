// Copies the fictional example data from data/sample/ into data/, so the app
// has something to render on a fresh clone before you've plugged in your own
// real data. Safe to re-run any time — it will overwrite files currently in
// data/ with the sample versions (your real data files are gitignored and
// never touched by git, but this script itself will overwrite local files,
// so don't run it if you already have real data in data/ that you want to keep).

import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sampleDir = join(root, "data", "sample");
const dataDir = join(root, "data");

if (!existsSync(sampleDir)) {
  console.error("No data/sample directory found — nothing to seed.");
  process.exit(1);
}

mkdirSync(dataDir, { recursive: true });

const files = readdirSync(sampleDir).filter((f) => !f.startsWith("."));
for (const file of files) {
  copyFileSync(join(sampleDir, file), join(dataDir, file));
  console.log(`Seeded data/${file} (fictional sample data)`);
}

console.log("\nDone. Run `npm run dev` to see the dashboard with example data.");
console.log("When you're ready, replace the files in data/ with your own — they're gitignored.");
