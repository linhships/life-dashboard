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
set of fictional example data (`data/sample/`) with the same file structure,
so the app is runnable immediately on a fresh clone, and so this repo is safe
to make public without exposing anything real.

```bash
npm install
npm run seed:sample   # copies data/sample/* into data/ (fictional numbers)
npm run dev
```

When you're ready to use it for real, replace the files in `data/` with your
own (see [Data](#data) below for the expected format). Anything in `data/`
except `data/sample/` is gitignored — `git status` will never show your real
numbers as changed, and there's no risk of committing them by accident.

## Running it locally

```bash
npm install
npm run seed:sample   # optional: populate data/ with fictional example data
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
- `data/news/` — fallback location for dated news-briefing markdown files
  and `feedback.jsonl`, used only if `NEWS_BRIEFING_DIR` isn't set. See
  "Daily briefing" below.
- `data/meals/` — fallback location for dated weekly meal-plan markdown
  files, used only if `MEAL_PLAN_DIR` isn't set. See "Weekly meal plan"
  below.

`data/sample/` holds fictional versions of all of the above, committed to
git, used by `npm run seed:sample`.

The page is rendered dynamically (`export const dynamic = "force-dynamic"`
in `app/page.tsx`), so it re-reads these files on every request — replacing
a CSV or the xlsx and refreshing the browser is all that's needed to see new
numbers, no restart required.

## Daily briefing

The `/news` page reads dated markdown files (`YYYY-MM-DD-news-summary.md`)
written by a separate "daily-news" scheduled task, and shows the latest one
with 👎 / 👍 / 🔥 buttons on each story.

Copy `.env.example` to `.env.local` (gitignored) and set `NEWS_BRIEFING_DIR`
to the folder your task writes into. If unset, it falls back to `data/news/`
(seeded with one fictional example day by `npm run seed:sample`).

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
to the folder your task writes into. If unset, it falls back to
`data/meals/` (seeded with one fictional example week by
`npm run seed:sample`).

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
`data/sample/links.json` for the fictional seed used by
`npm run seed:sample`. Categories are just free text per link — reassign
a link's category any time from the dropdown on its card as your
collection grows and a category gets too broad.

## Calendar & Reminders

The `/calendar` page is a read-only view of one iCloud calendar and one
Reminders list (both named "Troettger AI" by default). Unlike every other
page in this app, it doesn't read a local file — it connects live to
Apple's CalDAV server (`https://caldav.icloud.com`) on every page load via
[`tsdav`](https://github.com/natelindev/tsdav), and parses the returned
iCalendar data with [`ical.js`](https://github.com/kewisch/ical.js)
(`lib/troettgerCalendar.ts`). Recurring events are expanded server-side by
iCloud itself (`expand: true` on the CalDAV time-range query), so a yearly
birthday just shows up as a normal event on the right day rather than
needing its own recurrence-rule handling in this app.

Copy `.env.example` to `.env.local` and set `ICLOUD_CALDAV_USERNAME` /
`ICLOUD_CALDAV_APP_PASSWORD` yourself — generate the app-specific password
at appleid.apple.com → Sign-In and Security → App-Specific Passwords, and
never reuse your real Apple ID password here. If unset, the page shows a
"not connected" message instead of erroring. `ICLOUD_CALENDAR_NAME` /
`ICLOUD_REMINDERS_LIST` are optional overrides if your calendar/list isn't
literally named "Troettger AI" (both default to that).

This module has no create/update/delete code paths — it only ever calls
`fetchCalendars`/`fetchCalendarObjects` (read operations).

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
