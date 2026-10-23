import { cookies } from "next/headers";
import { School } from "lucide-react";

import { getGatehouseReports } from "@/lib/gatehouseReports";
import { getUpcomingGatehouseKeyDates, isoDaysAgo } from "@/lib/gatehouseKeyDates";
import { getGatehouseMeals } from "@/lib/gatehouseMeals";
import { GatehouseWeeklyReports } from "@/components/GatehouseWeeklyReports";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { FAMILY_AUTH_COOKIE, isAuthed } from "@/lib/familyAuth";

export const dynamic = "force-dynamic";

// The full school digest for the family view — the same component and the
// same data as the private /gatehouse-comms page: every week, not a recent
// handful; the whole lunch menu, not just the current week; and the source
// messages behind each item, with their attachments.
//
// This replaces a deliberately cut-down version (components/FamilyGatehouse,
// now unused) which dropped citations and attachments because they pointed
// at /api/gatehouse/file, a route this instance 404s. Rather than hide
// them, attachments are served from /api/family/gatehouse-file, which sits
// inside the allowed prefix and behind the family passcode — so "show
// everything" means everything actually works, rather than everything
// being visible and half of it broken.
export default async function FamilyGatehousePage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(FAMILY_AUTH_COOKIE)?.value);

  if (!authed) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/family/auth" label="Milo &amp; Arlo" />
      </main>
    );
  }

  const reports = getGatehouseReports();
  // Two weeks back rather than just today, so a just-passed event stays
  // visible a little longer; the component dims past dates instead of
  // dropping them.
  const upcomingEvents = getUpcomingGatehouseKeyDates(isoDaysAgo(14));
  const meals = getGatehouseMeals();
  const totalMessages = new Set(reports.flatMap((r) => r.messages.map((m) => m.id))).size;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <School className="h-4 w-4" />
          <span>
            {reports.length} {reports.length === 1 ? "week" : "weeks"} · {totalMessages}{" "}
            {totalMessages === 1 ? "message" : "messages"}
          </span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
          Gatehouse Comms
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Weekly digests of Milo&apos;s Gatehouse School emails and WhatsApp messages. Click any
          highlighted item to see the original message and its attachments.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/family/auth" label="Milo &amp; Arlo">
        <GatehouseWeeklyReports
          reports={reports}
          upcomingEvents={upcomingEvents}
          meals={meals}
          fileEndpoint="/api/family/gatehouse-file"
        />
      </PasscodeAuthGuard>
    </main>
  );
}
