# Life Dashboard

A personal dashboard, starting with finances: net worth over time, cash flow,
an interactive UK "Coast FIRE" retirement plan with a full tax-aware drawdown
simulation (income tax + CGT, SIPP access rules, State Pension), pension
annual allowance tracking, and kids' Junior ISA/SIPP accounts. Built to grow
into a broader daily life planner alongside the finance section.

Built with Next.js (App Router) + TypeScript + Tailwind CSS + Recharts.
Reads data from local files only — no external services, no database, no
credentials required to run it.

## Privacy model — this repo ships with fake data

This is a **bring-your-own-data** app. Your real financial data never lives
in this repository — it's gitignored. What's committed instead is a small
set of fictional example data in its own top-level folder, `sample-data/`,
with the same file structure as `data/`, so the app is runnable immediately
on a fresh clone, and so this repo is safe to make public without exposing
anything real.

`data/` (your real files) and `sample-data/` (the fictional demo files) are
two completely separate folders — nothing ever copies between them, and
which one is read is a hardcoded, explicit choice (`lib/dataDir.ts`'s
`dataPath()`), never a silent "use real if it exists, else fall back to
sample" check. That's deliberate: with a silent fallback you can't tell,
just by looking at a page, whether you're seeing your real data or
fictional sample data — it'd depend on which files happen to exist on disk.
Instead:

- By default, every page reads from `data/`, full stop. Nothing there yet?
  You'll see an empty/error state, not fictional numbers standing in for
  it.
- Set `USE_SAMPLE_DATA=true` in `.env.local` to switch every page to
  `sample-data/` instead — e.g. to try the app on a fresh clone, or for
  screenshots/demos without any real numbers ever touching the screen.

```bash
npm install
echo "USE_SAMPLE_DATA=true" >> .env.local   # optional: browse with fictional data first
npm run dev
```

When you're ready to use it for real, add your own files to `data/` (see
[Data](#data) below for the expected format) and remove `USE_SAMPLE_DATA`
(or set it to `false`) so pages read from `data/` again. `data/` (aside
from a couple of files created directly by the app, see "Links"/"Learning"
below) is gitignored — `git status` will never show your real numbers as
changed, and there's no risk of committing them by accident.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

For a production-style run:

```bash
npm run build
npm run start
```

## Data

All data lives in `/data` as plain files you (or a scheduled task) update:

- `data/accounts_snapshot.csv` — ISA / GIA / SIPP / Savings / Junior ISA /
  Junior SIPP balances per snapshot date.
- `data/pension_allowance.csv` — UK pension annual allowance and
  carry-forward, per tax year.
- `data/income_monthly.csv` — monthly payroll: taxable pay, pension/GIA
  contributions, net pay, NI, and what actually landed in the bank.
- `data/retirement_model.xlsx` — the Coast FIRE model (Assumptions /
  Projection / Bridge to 57 / Summary sheets). The **Assumptions** sheet is
  the one that matters to the app — starting balances, contribution plan,
  ages, target spend, and growth/withdrawal-rate constants are all read from
  there. The Projection/Bridge/Summary sheets are the spreadsheet's own
  working — useful if you want to sanity-check things in Excel, but the
  dashboard computes its own live tax-aware projection in TypeScript
  (`lib/simulate.ts`) rather than reading those cached formula results,
  so it stays correct even when you edit the Assumptions sheet without
  reopening it in Excel first.
- `data/drawdown_baseline.csv` — a static baseline drawdown export, exposed
  via `/api/drawdown` for reference; the dashboard itself now computes the
  drawdown live and doesn't depend on this file.
- `data/news/` — location for dated news-briefing markdown files and
  `feedback.jsonl`, used only if `NEWS_BRIEFING_DIR` isn't set. See
  "Daily briefing" below.
- `data/meals/` — location for dated weekly meal-plan markdown files,
  used only if `MEAL_PLAN_DIR` isn't set. See "Weekly meal plan" below.

`sample-data/` holds fictional versions of all of the above, committed to
git. Which folder gets read is an explicit switch, not automatic — see
"Privacy model" above and `USE_SAMPLE_DATA` in `.env.example`.

The page is rendered dynamically (`export const dynamic = "force-dynamic"`
in `app/finance/page.tsx`), so it re-reads these files on every request — replacing
a CSV or the xlsx and refreshing the browser is all that's needed to see new
numbers, no restart required.

## Daily briefing

The `/news` page reads dated markdown files (`YYYY-MM-DD-news-summary.md`)
written by a separate "daily-news" scheduled task, and shows the latest one
with 👎 / 👍 / 🔥 buttons on each story.

Copy `.env.example` to `.env.local` (gitignored) and set `NEWS_BRIEFING_DIR`
to the folder your task writes into. If unset, it reads from `data/news/`
instead (or `sample-data/news/`, one fictional example day, if
`USE_SAMPLE_DATA=true`).

Clicking a rating appends one line to `feedback.jsonl` in that same folder —
an append-only log of `{ id, date, section, headline, rating, ratedAt }`,
so the daily-news task can eventually read it back to learn what you
actually want to see more or less of. Nothing currently consumes this file
automatically; it's just being logged for now.

## Weekly meal plan

The `/meals` page reads dated markdown files (`Weekly_Plan_YYYY-MM-DD.md`,
named for the Monday of that week) written by a separate food-planning
task, and shows the most recent one that isn't in the future — i.e. this
week's plan. It parses the Day/Meal/Dish/Milo/Arlo/Notes table into a
day-by-day grid, and renders the rest of the file (cuisine spread, open
items, groceries) as-is below it.

Copy `.env.example` to `.env.local` (gitignored) and set `MEAL_PLAN_DIR`
to the folder your task writes into. If unset, it reads from `data/meals/`
instead (or `sample-data/meals/`, one fictional example week, if
`USE_SAMPLE_DATA=true`).

## Links

The `/links` page is a simple bookmark manager: paste a URL and pick (or
create) a category, and the server fetches the page's Open Graph title,
description, and preview image (`lib/links.ts`, `fetchLinkMetadata`).
Falls back gracefully to the URL/filename when a site doesn't expose OG
tags or blocks server-side fetches (common for some social platforms) —
use the refresh button on a card to retry, e.g. after opening the app on
a machine with a plainer network path to that site.

Links are stored in `data/links.json` (gitignored — created directly by
the app rather than an external task, but still personal data). See
`sample-data/links.json` for the fictional version shown instead when
`USE_SAMPLE_DATA=true`. Categories are just free text per link — reassign
a link's category any time from the dropdown on its card as your
collection grows and a category gets too broad.

## Learning

The `/learning` page is the same bookmark-manager mechanic as `/links`
(`lib/learning.ts` reuses `fetchLinkMetadata` from `lib/links.ts` rather
than duplicating the Open Graph scraping), organized by "topic" instead
of "category" and kept as its own page/passcode/data file so course and
article bookmarks don't get mixed in with general links. Same
paste-a-URL-and-tag-it flow, same grouped-by-topic-with-a-count-badge
layout, same free-text reassignment from a dropdown on each card.

Stored in `data/learning.json` (gitignored, personal data); see
`sample-data/learning.json` for the fictional version shown instead when
`USE_SAMPLE_DATA=true`.

## Skipping a meal-plan week

The `/meals` page carries a **"Not planning this week"** switch, one per
week tab. Turning it on does two things:

- The plan below goes `inert` and fades. Not merely faded: a greyed-out
  plan you could still tap would go on recording kid ratings and grocery
  ticks for a week that is meant to count for nothing, so the whole subtree
  leaves pointer, keyboard and accessibility reach.
- The week is written into `MEAL_PLAN_DIR/Skipped_Weeks.md` as a row in a
  small table, with the date the switch was flipped.

That file is a markdown **document**, not a third `.jsonl` alongside
`meal-feedback` / `grocery-checked`, because it has a second reader.
`Weekly_Plan_Instructions.md` in the Food-Planning folder now opens its
"Updating the eaten tracking" section by checking it: a week listed there
gets **no** `### Week of <date>` section in `Food_list.md`'s Eaten log and
adds **nothing** to any dish's *Times Eaten* or *Last Eaten*. A plan file
may still exist for that week — it just wasn't what got eaten.

So the switch reaches the counter through that document rather than through
any code in this app; the app's part is writing the row and refusing to
collect feedback for the week. Turning the switch off removes the row.

The file is rewritten in full on each toggle, so the preamble (which is the
contract with the planning task) lives in one place in `lib/mealplan.ts`.
Rows are parsed by requiring an ISO date in the first cell, so hand-editing
the file or adding prose to it doesn't break the read.

## Shopping

`/shopping` is a small section whose one page so far is
`/shopping/vouchers`: discount codes read from `VOUCHERS_DIR`, soonest to
expire first, each with a tap-to-copy code.

The codes are collected into that folder by something else (they arrive by
email) and this app only ever reads them. The source is one or more
markdown files holding a table:

```
| Webpage | Voucher code | Expiry date | Notes |
|---|---|---|---|
| cewe.co.uk | 4UEXPRESS | 31/12/2026 (11pm) | Max 5 uses; UK only. |
```

Two deliberate choices in `lib/vouchers.ts`, both because the rows are
written upstream rather than here:

- Columns are matched by header **name**, not position, so a column added
  or reordered later doesn't silently shift every value sideways. An
  unrecognised column is ignored rather than fatal.
- The expiry cell stays free text. Real entries include
  `31/12/2026 (11pm)` and `~02/11/2026 (email of 26/10 says "expires in 7
  days")`. A date is extracted where one can be found — in UK order, so
  `02/11/2026` is 2 November — for the sort and the countdown, but the
  original string is what gets shown whenever it says more than the
  countdown does. Dropping the `~` would drop the part that tells you how
  much to trust the date.

Rows that yield no code are counted rather than dropped, and surface on
`/settings/data-sources` as "table rows without a readable code".

`lib/voucherShared.ts` holds the `Voucher` shape and the date maths
separately from the reader, because `components/VouchersList.tsx` is a
client component (it copies to the clipboard) and importing them from the
reader pulled `fs` into the browser bundle.

Note on copying: the dashboard is normally reached over plain http on its
Tailscale address, which is not a secure context, so `navigator.clipboard`
doesn't exist there. The copy button tries it and falls back to
`document.execCommand("copy")`, which does work; failing both, the code is
still selectable text.

## Calendar

`/family/calendar` is a read-only week view of the shared **Social
Troettger AI** iCloud calendar — social events, visits, half-terms and work
trips. It lives in the family section rather than the private dashboard,
which is what it is for: it's the page the family actually reads.

Unlike every other page in this app, it reads no local file. It connects
live to Apple's CalDAV server (`https://caldav.icloud.com`) on each page
load via [`tsdav`](https://github.com/natelindev/tsdav) and parses the
returned iCalendar data with [`ical.js`](https://github.com/kewisch/ical.js)
(`lib/troettgerCalendar.ts`). Recurring events are expanded server-side by
iCloud itself (`expand: true` on the CalDAV time-range query), so a yearly
birthday arrives as a normal event on the right day instead of needing
recurrence-rule handling here.

Set `ICLOUD_CALDAV_USERNAME` and `ICLOUD_CALDAV_APP_PASSWORD` in
`.env.local` yourself — generate the app-specific password at
appleid.apple.com → Sign-In and Security → App-Specific Passwords, and
never reuse the real Apple ID password. If either is unset the page shows a
"not connected" panel listing these steps rather than erroring.
`ICLOUD_SOCIAL_CALENDAR_NAME` overrides the calendar name (default "Social
Troettger AI"); iCloud matches on the calendar's **display name**, so
renaming it in the Calendar app detaches it — the page says so instead of
rendering an empty week.

The credentials stay server-side: this instance's Node process makes the
CalDAV request and sends only the resulting events, so nothing about the
Apple ID reaches a browser. That matters because the family section is the
one instance shared outside the household.

Two limits worth knowing. The fetch window is 30 days back and 120 ahead,
so paging past that range shows empty weeks rather than loading more — it
would need an `/api/family` route to refetch on navigation. And the module
has no create/update/delete code path at all: it only ever calls
`fetchCalendars`/`fetchCalendarObjects`.

An earlier version of this (a private `/calendar` page with a Reminders
sidebar, plus month/week/day views) was removed in `91f073f` as unused;
`getReminders`/`getCalendarData` survive in the module from that era and are
currently uncalled.

## How the retirement model works

- **Accumulation**: from your current age to target retirement age, ISA/GIA/
  SIPP grow with your contributions at a flat real growth rate.
- **Drawdown**: from retirement age to life expectancy, a year-by-year
  simulation withdraws your target spend from whichever account is
  tax-cheapest that year (ISA is always free; SIPP is 25% tax-free with the
  rest taxed as income once you can access it; GIA is taxed on gains above
  the CGT allowance), respecting UK income tax bands, Personal Allowance
  tapering, State Pension starting at State Pension age, and an optional
  "emergency buffer" that keeps a minimum amount permanently accessible in
  ISA/GIA.
- Everything on the Coast FIRE section of the dashboard — the two charts,
  the four KPIs, and the phase-by-phase written explanation — is driven by
  the same live simulation and updates immediately as you edit the
  contribution plan, target spend, or emergency buffer in the UI.

## API routes

Each data source is also exposed as JSON, so a future client (e.g. an iOS
app) can read the same data without going through the page:

- `GET /api/accounts`
- `GET /api/pension-allowance`
- `GET /api/income`
- `GET /api/retirement`
- `GET /api/drawdown`

## Tech notes

- `lib/simulate.ts` — the tax-aware drawdown/accumulation engine, pure
  TypeScript, no dependencies, runs client-side.
- `lib/narrative.ts` — turns a simulation result into a plain-English,
  phase-by-phase written walkthrough, regenerated live.
- `components/FinancePlanContext.tsx` — shares the live contribution
  plan/spend/reserve state between the top KPI cards and the interactive
  Coast FIRE section further down the page.
- Excel parsing uses `exceljs` (not the `xlsx`/SheetJS package, which has
  unpatched high-severity advisories).

## Next steps (not built yet)

- A scheduled task to refresh `accounts_snapshot.csv`, `pension_allowance.csv`,
  and `income_monthly.csv` from a source spreadsheet automatically.
- Calendar/reminders briefing section, once that scheduled task is writing
  its own local file.
- Deploying this (e.g. to Vercel) — note that on a real deployment, your
  data files need a home reachable from wherever the app runs; this hasn't
  been set up since the app is currently designed around local files only.

## License

MIT — see [LICENSE](./LICENSE).
