import { cookies } from "next/headers";
import { getArloNurseryDays } from "@/lib/arloNurseryPhotos";
import { getChiarlineDays } from "@/lib/chiarlineDays";
import { ArloNurseryGallery } from "@/components/ArloNurseryGallery";
import { ChiarlineGallery } from "@/components/ChiarlineGallery";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { ARLO_NURSERY_PHOTOS_AUTH_COOKIE, isAuthed } from "@/lib/arloNurseryPhotosAuth";
import { Baby } from "lucide-react";

export const dynamic = "force-dynamic";

// Two day-by-day reports on one page: Arlo's nursery days (Bright Horizons
// app data + photos) and the boys' days with Chiarline (her WhatsApp
// photos + what she wrote). Same visual language for both — full-width day
// cards, media left, words right — so they read as one continuous record
// of who he was with and how the day went.
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

  const days = getArloNurseryDays();
  const totalPhotos = days.reduce((sum, d) => sum + d.photos.length, 0);
  const chiarlineDays = getChiarlineDays();
  const chiarlineMedia = chiarlineDays.reduce((sum, d) => sum + d.media.length, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Baby className="h-4 w-4" />
          <span>
            {days.length} nursery days · {chiarlineDays.length} days with Chiarline
          </span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
          Arlo&apos;s Nursery and Chiarline Time
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Day by day: photos and the nursery&apos;s own notes from Arlo&apos;s days at nursery, and
          photos and messages from the boys&apos; days with Chiarline.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/arlo-nursery/auth" label="Arlo's Nursery">
        <section>
          <h2 className="text-xl font-bold text-slate-900">Nursery</h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">
            {totalPhotos} {totalPhotos === 1 ? "photo" : "photos"} across {days.length}{" "}
            {days.length === 1 ? "day" : "days"}, with the nursery app&apos;s meals, naps and
            observations.
          </p>
          <ArloNurseryGallery days={days} />
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900">Chiarline time</h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">
            {chiarlineMedia} {chiarlineMedia === 1 ? "photo/video" : "photos and videos"} across{" "}
            {chiarlineDays.length} {chiarlineDays.length === 1 ? "day" : "days"}, alongside what
            Chiarline wrote that day.
          </p>
          <ChiarlineGallery days={chiarlineDays} />
        </section>
      </PasscodeAuthGuard>
    </main>
  );
}
