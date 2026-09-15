# Handoff / continuing on a different machine

Written so this project (and a fresh Claude session with no memory of past
conversations) can pick back up cleanly on a new laptop. `git log` is the
real changelog — every change in this repo has a detailed commit message
explaining *why*, not just *what* — treat this file as the *how to get
running again*, not a duplicate history.

## 1. Get the code

```bash
git clone git@git-linhships:linhships/life-dashboard.git
```

`git-linhships` is a custom SSH host alias configured in `~/.ssh/config` on
the machine this was written on — it won't exist on a fresh machine unless
that SSH config (and the matching key) is copied over too. If it isn't,
either recreate that alias or clone via the plain GitHub remote instead —
check `git remote -v` on the old machine before it's decommissioned to get
the real underlying URL.

The repo was left fully committed and pushed — `git status` is clean and
`main` matches `origin/main` as of this handoff.

## 2. Recreate `.env.local`

Gitignored on purpose — it holds passcodes and machine-specific folder
paths, so it never travels via git. `.env.example` documents every
variable, what it does, and its fallback behaviour if left unset. Fastest
option: copy the real `.env.local` file over directly from the old machine
(AirDrop/USB/etc.) rather than retyping passcodes from memory.

## 3. Confirm the data folders exist on this machine

Two separate things to check.

**The main data folder.** As of this handoff it lives *outside* the repo, at
`~/Documents/Claude/life-dashboard-data`, rather than at `data/` inside it —
`DATA_DIR` in `.env.local` is what points the app at it (see
`lib/dataDir.ts`). Left unset, the app falls back to `<repo>/data` as
before, so the override is additive, not required. It holds the finance
CSVs, `retirement_model.xlsx`, `resources.json`, `learning.json`,
`learning-guides/` and `recipe-images/`.

One trap worth knowing: that folder also contains `news/`, `meals/` and
`food/` subfolders which are **byte-identical copies of the fictional
sample data**, not real plans. They sit exactly where the unset-default
readers would look, so clearing `NEWS_BRIEFING_DIR` / `MEAL_PLAN_DIR` /
`FOOD_PLANNING_DIR` doesn't produce an empty page — it produces a
convincing page full of invented dinners and made-up news, which is the one
failure mode `lib/dataDir.ts` exists to prevent. Keep those three pointed at
the folders the scheduled tasks actually write into, or delete the copies.

**The other external folders.** Every remaining page reads from folders
elsewhere under `~/Documents/Claude/` (Milo-Gatehouse, Food-Planning,
Daily-Briefing, Whatsapp - Tori, Photos/Milo nursery, Photos/Arlo nursery,
Photos/Chiarline - Milo - Arlo). If `~/Documents/Claude` is inside iCloud
Drive these should already be present on a machine signed into the same
Apple ID — worth actually checking (`ls` each path `.env.local` points at)
rather than assuming, since a missing folder just renders as an empty page
with no error.

## 4. Install, build, run

```bash
npm ci                  # not `npm install` — see gotcha 6 below
npm run build
npm run start           # your own instance — everything, port 3000
npm run start:family    # grandparent-facing instance — port 3001, /family only
```

Two separate long-running processes from the same build, not one — see
`FAMILY-ACCESS.md` for the full explanation (the family-only instance sets
`FAMILY_ONLY=1`, which `middleware.ts` uses to 404 everything except
`/family` and `/api/family` before it reaches a page or API route) and the
Tailscale Serve setup that exposes only port 3001 to the tailnet, plus the
two LaunchAgent plists for keeping both alive across reboots.

## 5. Known gotcha: Homebrew Node crash

Hit partway through this session — `node`/`npm run start` aborting with:

```
dyld[...]: Library not loaded: /opt/homebrew/opt/uvwasi/lib/libuvwasi.dylib
```

A broken Homebrew Node install (a linked library went missing, probably
after a partial `brew upgrade`), unrelated to this app. Fix, in order:

```bash
brew update && brew install uvwasi
# if node -v still crashes the same way:
brew uninstall --ignore-dependencies node
brew autoremove
brew cleanup
brew install node
```

Confirm with a bare `node -v` (no npm involved) before touching this app
again — if that alone crashes, nothing app-specific will work either.

## 6. Known gotcha: `node_modules` installed from another platform

Hit on the laptop this handoff was written for. `npm run dev` died on
`app/globals.css` with:

```
Error: Cannot find module '../lightningcss.darwin-arm64.node'
```

The message is misleading — that path is a local-build fallback that was
never meant to exist. What actually happened: `npm install` had been run
from a Linux shell that shared this folder (a Cowork device VM), and npm
only extracts the platform-specific optional dependencies whose `os`/`cpu`
match the machine doing the installing. It still *creates* a directory for
every platform in the lockfile, so `node_modules/lightningcss-darwin-arm64/`
existed but was empty — 0 files. The loader tried
`require('lightningcss-darwin-arm64')`, which threw because an empty folder
has no `package.json`, then fell into its `catch` and tried the local-build
path, and it's that *second* failure that surfaced.

Six packages were affected, all empty: `lightningcss-darwin-arm64`,
`@next/swc-darwin-arm64`, `@img/sharp-darwin-arm64`,
`@img/sharp-libvips-darwin-arm64`, `@tailwindcss/oxide-darwin-arm64`,
`@unrs/resolver-binding-darwin-arm64`. `lightningcss` was simply the first
one Turbopack reached; the rest were queued behind it.

Fix:

```bash
npm ci
```

`npm ci` deletes `node_modules` outright and reinstalls strictly from
`package-lock.json`, which carries every platform with the right `os`/`cpu`
constraints. A plain `npm install` is **not** enough — the existing tree
already satisfies the lock on paper, so the empty directories can survive
it. Also `rm -rf .next` if a build ran on the wrong platform, so no stale
Turbopack output is left behind.

The diagnostic, if this ever looks ambiguous — real packages are megabytes,
broken ones are zero:

```bash
find node_modules/@next/swc-darwin-arm64 -type f | wc -l
```

Moral: run `npm` on the machine the app will actually run on. Reading and
editing files from a shared VM is fine; installing from one is not.

## 7. What the most recent session covered

In commit order (`git log --oneline` for the exact list):

- Fixed the lunch-menu week span on `/gatehouse-comms` (a partial
  settling-in week was keyed to the wrong Monday).
- Dimmed (not hid) past dates in the Gatehouse "Upcoming" box, with a
  two-week lookback so recently-passed events stay visible a little
  longer instead of vanishing the instant they're over.
- **Split the family view onto its own server instance** (port 3001,
  `FAMILY_ONLY=1` + `middleware.ts`) instead of a Tailscale
  `--set-path` mount on the same port as the main app — a stronger,
  simpler boundary than the previous path-based approach. See
  `FAMILY-ACCESS.md`.
- Added a read-only "Meals" page to `/family` (`components/FamilyMealPlan.tsx`,
  `components/FamilyGroceryList.tsx`) — this/next week's dinner plan and
  delivery grocery lists, no rating buttons or checkboxes (they'd silently
  fail to save on the family-only instance anyway, since its middleware
  only allows `/family` and `/api/family`). Later made passcode-free,
  since there's nothing here worth gating unlike the photo pages.
- Added "This week"/"Next week" tabs (`components/SimpleTabs.tsx`) to
  both `/meals` and `/family/meals`, driven by `getNextMealPlan()` in
  `lib/mealplan.ts`.
- Fixed a real parsing bug in `lib/mealplan.ts`'s `parseGrocerySection`:
  a "Notes:" paragraph (or a bold `**Pantry staples**` label) written
  *after* a delivery's real shopping items got silently swallowed into
  an unchecked block along with every bullet after it, since the parser
  only recognises `### ` as a new subsection boundary. Fixed by adding a
  `trailingNotes` field, and rewrote `~/Documents/Claude/Food-Planning/
  Weekly_Plan_Instructions.md` to require pantry staples as their own
  `### Already stocked (pantry staples)` subsection per week (not an
  inline bold label), with the two live weekly-plan files corrected to
  match.

Every one of these is a separate commit with a full explanation and the
live verification that was done — `git log -p` on any of them shows the
actual diff and reasoning.
