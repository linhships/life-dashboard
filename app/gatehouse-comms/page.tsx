import { School } from "lucide-react";
import { getGatehouseReports } from "@/lib/gatehouseReports";
import { getUpcomingGatehouseKeyDates, isoDaysAgo } from "@/lib/gatehouseKeyDates";
import { getGatehouseMeals } from "@/lib/gatehouseMeals";
import { GatehouseWeeklyReports } from "@/components/GatehouseWeeklyReports";

export const dynamic = "force-dynamic";

// Weekly digests of Gatehouse school comms (email + WhatsApp) captured
// under GATEHOUSE_DIR — see lib/gatehouse.ts / lib/gatehouseReports.ts for
// the data model. No passcode gate: same as Learning/Links, unlike the
// other two Milo & Arlo pages which hold photos of the kids.
export default function GatehouseCommsPage() {
  const reports = getGatehouseReports();
  // Two weeks back, not just today, so a just-passed event (e.g. the
  // flu spray that was Mon this week) stays visible a little longer —
  // GatehouseWeeklyReports dims anything before today rather than
  // dropping it outright.
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
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">Gatehouse — Communication</h1>
        <p className="mt-2 text-sm text-slate-500">
          Weekly digests of Milo&apos;s Gatehouse School emails and WhatsApp messages. Click any
          highlighted item to see the original message and its attachments.
        </p>
      </header>

      <GatehouseWeeklyReports reports={reports} upcomingEvents={upcomingEvents} meals={meals} />
    </main>
  );
}
