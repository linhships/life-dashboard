import { cookies } from "next/headers";
import { School } from "lucide-react";
import { getUpcomingGatehouseKeyDates } from "@/lib/gatehouseKeyDates";
import { getGatehouseReports } from "@/lib/gatehouseReports";
import { getGatehouseMeals, type WeeklyMenu } from "@/lib/gatehouseMeals";
import { FamilyGatehouse } from "@/components/FamilyGatehouse";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { FAMILY_AUTH_COOKIE, isAuthed } from "@/lib/familyAuth";

export const dynamic = "force-dynamic";

// How many past weeks of digest to show. Grandparents want "what's been
// happening lately", not the full archive.
const RECENT_WEEKS = 4;

// Source-message citations ("[[msg:2026-09-02_email_welcome-letter]]") are
// Linh's provenance trail — strip them here rather than rendering footnote
// markers that lead nowhere on this page.
function stripMessageTokens(body: string): string {
  return body
    .replace(/\s*\[\[msg:[a-zA-Z0-9_-]+\]\]/g, "")
    .replace(/[ \t]+([.,;])/g, "$1")
    .trim();
}

// The menu week to show: the most recent one that started on or before
// today, falling back to the earliest known week if they're all upcoming.
function currentMenuWeek(weeks: WeeklyMenu[], today: string): WeeklyMenu | null {
  const withDays = weeks.filter((w) => w.days.length > 0);
  if (withDays.length === 0) return null;
  const sorted = [...withDays].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const past = sorted.filter((w) => w.weekStart <= today);
  return past.length > 0 ? past[past.length - 1] : sorted[0];
}

export default async function FamilyGatehousePage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(FAMILY_AUTH_COOKIE)?.value);

  if (!authed) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/family/auth" label="Milo & Arlo" />
      </main>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = getUpcomingGatehouseKeyDates().map((d) => ({ date: d.date, event: d.event }));
  const weeks = getGatehouseReports()
    .slice(0, RECENT_WEEKS)
    .map((r) => ({
      weekStart: r.weekStart,
      weekEnd: r.weekEnd,
      body: stripMessageTokens(r.body),
    }));
  const menuWeek = currentMenuWeek(getGatehouseMeals()?.weeks ?? [], today);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <School className="h-4 w-4" />
          <span>Gatehouse School</span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
          Milo&apos;s school
        </h1>
        <p className="mt-2 text-base text-slate-600">
          What&apos;s coming up, what&apos;s for lunch, and a short note on how the last few weeks
          went.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/family/auth" label="Milo & Arlo">
        <FamilyGatehouse
          upcoming={upcoming}
          weeks={weeks}
          menuDays={menuWeek?.days ?? []}
          menuWeekStart={menuWeek?.weekStart ?? null}
        />
      </PasscodeAuthGuard>
    </main>
  );
}
