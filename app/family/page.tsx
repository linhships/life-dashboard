import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Baby, Backpack, School } from "lucide-react";

import { getArloNurseryDays } from "@/lib/arloNurseryPhotos";
import { getChiarlineDays } from "@/lib/chiarlineDays";
import { getGatehouseClassInfo } from "@/lib/gatehouseClassInfo";
import { getGatehouseReports } from "@/lib/gatehouseReports";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { FAMILY_AUTH_COOKIE, isAuthed } from "@/lib/familyAuth";

export const dynamic = "force-dynamic";

// The family landing page: one card per section, same pattern as before.
// Note what it does NOT read — no credentials, no links. The cards only
// ever count things, so nothing sensitive reaches this page either.
export default async function FamilyHomePage() {
  const cookieStore = await cookies();
  if (!isAuthed(cookieStore.get(FAMILY_AUTH_COOKIE)?.value)) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/family/auth" label="Milo &amp; Arlo" />
      </main>
    );
  }

  const nurseryDays = getArloNurseryDays();
  const chiarlineDays = getChiarlineDays();
  const arloDays = new Set([
    ...nurseryDays.map((d) => d.date),
    ...chiarlineDays.map((d) => d.date),
  ]).size;
  const arloMedia =
    nurseryDays.reduce((sum, d) => sum + d.photos.length, 0) +
    chiarlineDays.reduce((sum, d) => sum + d.media.length, 0);

  const classInfo = getGatehouseClassInfo();
  const reports = getGatehouseReports();

  const cards = [
    {
      href: "/family/arlo",
      label: "Arlo's Nursery and Chiarline Time",
      blurb: `${arloMedia} photos across ${arloDays} days, with the nursery's notes and Chiarline's messages`,
      icon: Baby,
      tint: "bg-emerald-50 text-emerald-600",
    },
    {
      href: "/family/gatehouse-info",
      label: "Gatehouse — Class Info",
      blurb: classInfo
        ? `${classInfo.className} — teachers and term dates`
        : "Milo's class, teachers and term dates",
      icon: Backpack,
      tint: "bg-amber-50 text-amber-600",
    },
    {
      href: "/family/gatehouse",
      label: "Gatehouse — Communication",
      blurb: `${reports.length} ${reports.length === 1 ? "week" : "weeks"} of school news, this week's lunches and what's coming up`,
      icon: School,
      tint: "bg-blue-50 text-blue-600",
    },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Milo &amp; Arlo</h1>
        <p className="mt-2 text-base text-slate-600">
          Photos and news about the boys, kept up to date automatically.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, label, blurb, icon: Icon, tint }) => (
          <Link
            key={href}
            href={href}
            className="pressable group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-base font-semibold text-slate-900">
                {label}
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
              </span>
              <span className="mt-1 block text-sm text-slate-500">{blurb}</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
