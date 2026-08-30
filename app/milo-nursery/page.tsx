import { cookies } from "next/headers";
import { getMiloNurseryDays } from "@/lib/miloNurseryPhotos";
import { MiloNurseryGallery } from "@/components/MiloNurseryGallery";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { MILO_NURSERY_PHOTOS_AUTH_COOKIE, isAuthed } from "@/lib/miloNurseryPhotosAuth";
import { Baby } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MiloNurseryPage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(MILO_NURSERY_PHOTOS_AUTH_COOKIE)?.value);

  // Gate check happens before the data is ever fetched, so an
  // unauthenticated request never gets the photo manifest in the page's
  // HTML — same server-side-first pattern as Tori & the boys.
  if (!authed) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/milo-nursery/auth" label="Milo's Nursery" />
      </main>
    );
  }

  const days = await getMiloNurseryDays();
  const totalPhotos = days.reduce((sum, d) => sum + d.photos.length, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Baby className="h-4 w-4" />
          <span>
            {days.length} days · {totalPhotos} {totalPhotos === 1 ? "photo" : "photos"}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Milo&apos;s Nursery</h1>
        <p className="mt-2 text-sm text-slate-500">
          Photos from Milo&apos;s time at nursery, grouped by the day they were taken.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/milo-nursery/auth" label="Milo's Nursery">
        <MiloNurseryGallery days={days} />
      </PasscodeAuthGuard>
    </main>
  );
}
