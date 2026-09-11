import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Baby, Heart, School } from "lucide-react";
import { getMiloNurseryDays } from "@/lib/miloNurseryPhotos";
import { getArloNurseryDays } from "@/lib/arloNurseryPhotos";
import { getToriCareDays } from "@/lib/toriPhotos";
import { getGatehouseReports } from "@/lib/gatehouseReports";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { FAMILY_AUTH_COOKIE, isAuthed } from "@/lib/familyAuth";

export const dynamic = "force-dynamic";

export default async function FamilyHomePage() {
  const cookieStore = await cookies();
  if (!isAuthed(cookieStore.get(FAMILY_AUTH_COOKIE)?.value)) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/family/auth" label="Milo & Arlo" />
      </main>
    );
  }

  const [miloDays, arloDays, toriDays] = [
    await getMiloNurseryDays(),
    getArloNurseryDays(),
    getToriCareDays(),
  ];
  const reports = getGatehouseReports();

  const countPhotos = (days: { photos: unknown[] }[]) =>
    days.reduce((sum, d) => sum + d.photos.length, 0);

  const cards = [
    {
      href: "/family/milo",
      label: "Milo's nursery",
      blurb: `${countPhotos(miloDays)} photos from ${miloDays.length} days`,
      icon: Baby,
      tint: "bg-blue-50 text-blue-600",
    },
    {
      href: "/family/arlo",
      label: "Arlo's nursery",
      blurb: `${countPhotos(arloDays)} photos, with the nursery's daily notes`,
      icon: Baby,
      tint: "bg-emerald-50 text-emerald-600",
    },
    {
      href: "/family/tori",
      label: "With Tori",
      blurb: `${countPhotos(toriDays)} photos and videos from their days with Tori`,
      icon: Heart,
      tint: "bg-rose-50 text-rose-600",
    },
    {
      href: "/family/gatehouse",
      label: "Milo's school",
      blurb:
        reports.length > 0
          ? "What's been happening at Gatehouse, week by week"
          : "Dates and news from Gatehouse",
      icon: School,
      tint: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        Milo &amp; Arlo
      </h1>
      <p className="mt-3 max-w-2xl text-base text-slate-600">
        Photos from the boys&apos; nurseries, their days with Tori, and news from Milo&apos;s
        school. Updated whenever there&apos;s something new.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map(({ href, label, blurb, icon: Icon, tint }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}>
              <Icon className="h-6 w-6" />
            </div>
            <p className="mt-4 text-xl font-bold text-slate-900 group-hover:text-blue-600">
              {label}
            </p>
            <p className="mt-1 text-base text-slate-600">{blurb}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-base font-semibold text-blue-600">
              Have a look <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
