import { cookies } from "next/headers";
import { getArloNurseryDays } from "@/lib/arloNurseryPhotos";
import { getChiarlineDays } from "@/lib/chiarlineDays";
import { CareTimeline } from "@/components/CareTimeline";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { ARLO_NURSERY_PHOTOS_AUTH_COOKIE, isAuthed } from "@/lib/arloNurseryPhotosAuth";
import { Baby } from "lucide-react";

export const dynamic = "force-dynamic";

// One day-by-day record of Arlo's days, whichever kind they were: at
// nursery (Bright Horizons app data + their photos) or with Chiarline (her
// photos and what she wrote). Merged into a single timeline rather than
// two lists — some days are both, and "what happened last Tuesday" should
// be one place to look.
export default async function ArloNurseryPage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(ARLO_NURSERY_PHOTOS_AUTH_COOKIE)?.value);

  // Gate check happens before the data is ever fetched, so an
  // unauthenticated request never gets the photo/update manifest in the
  // page's HTML — same server-side-first pattern as Milo's Nursery.
  if (!authed) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/arlo-nursery/auth" label="Arlo's Nursery" />
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

      <PasscodeAuthGuard authEndpoint="/api/arlo-nursery/auth" label="Arlo's Nursery">
        <CareTimeline nurseryDays={nurseryDays} chiarlineDays={chiarlineDays} />
      </PasscodeAuthGuard>
    </main>
  );
}
