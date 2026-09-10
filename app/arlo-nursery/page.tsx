import { cookies } from "next/headers";
import { getArloNurseryDays } from "@/lib/arloNurseryPhotos";
import { ArloNurseryGallery } from "@/components/ArloNurseryGallery";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { ARLO_NURSERY_PHOTOS_AUTH_COOKIE, isAuthed } from "@/lib/arloNurseryPhotosAuth";
import { Baby } from "lucide-react";

export const dynamic = "force-dynamic";

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

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Baby className="h-4 w-4" />
          <span>
            {days.length} days · {totalPhotos} {totalPhotos === 1 ? "photo" : "photos"}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Arlo&apos;s Nursery</h1>
        <p className="mt-2 text-sm text-slate-500">
          Photos and nursery-app updates from Arlo&apos;s days at nursery, grouped by day.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/arlo-nursery/auth" label="Arlo's Nursery">
        <ArloNurseryGallery days={days} />
      </PasscodeAuthGuard>
    </main>
  );
}
