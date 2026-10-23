import { cookies } from "next/headers";
import { Baby } from "lucide-react";

import { getArloNurseryDays } from "@/lib/arloNurseryPhotos";
import { getChiarlineDays } from "@/lib/chiarlineDays";
import { CareTimeline } from "@/components/CareTimeline";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { FAMILY_AUTH_COOKIE, isAuthed } from "@/lib/familyAuth";

export const dynamic = "force-dynamic";

// The same day-by-day record of Arlo's days that /arlo-nursery shows,
// nursery and Chiarline merged into one timeline. The only difference is
// where the media comes from: this instance 404s anything outside /family
// and /api/family (middleware.ts), so both endpoints point at their
// /api/family equivalents, behind the family passcode.
export default async function FamilyArloPage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(FAMILY_AUTH_COOKIE)?.value);

  if (!authed) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/family/auth" label="Milo &amp; Arlo" />
      </main>
    );
  }

  const nurseryDays = getArloNurseryDays();
  const chiarlineDays = getChiarlineDays();
  const dayCount = new Set([
    ...nurseryDays.map((d) => d.date),
    ...chiarlineDays.map((d) => d.date),
  ]).size;
  const mediaCount =
    nurseryDays.reduce((sum, d) => sum + d.photos.length, 0) +
    chiarlineDays.reduce((sum, d) => sum + d.media.length, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Baby className="h-4 w-4" />
          <span>
            {dayCount} {dayCount === 1 ? "day" : "days"} · {mediaCount}{" "}
            {mediaCount === 1 ? "photo" : "photos"}
          </span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
          Arlo&apos;s Nursery and Chiarline Time
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Every day in one place — photos and the nursery&apos;s own notes on nursery days, photos
          and Chiarline&apos;s messages on the days she has them.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/family/auth" label="Milo &amp; Arlo">
        <CareTimeline
          nurseryDays={nurseryDays}
          chiarlineDays={chiarlineDays}
          nurseryEndpoint="/api/family/arlo-image"
          chiarlineEndpoint="/api/family/chiarline-image"
        />
      </PasscodeAuthGuard>
    </main>
  );
}
