import { cookies } from "next/headers";
import { Baby } from "lucide-react";
import { getMiloNurseryDays } from "@/lib/miloNurseryPhotos";
import { MiloNurseryGallery } from "@/components/MiloNurseryGallery";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { FAMILY_AUTH_COOKIE, isAuthed } from "@/lib/familyAuth";

export const dynamic = "force-dynamic";

// Same gallery as Linh's own /milo-nursery page, pointed at the family
// image route (its own passcode, and the only API prefix the tailnet proxy
// forwards — see FAMILY-ACCESS.md).
export default async function FamilyMiloPage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(FAMILY_AUTH_COOKIE)?.value);

  if (!authed) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/family/auth" label="Milo & Arlo" />
      </main>
    );
  }

  const days = await getMiloNurseryDays();
  const totalPhotos = days.reduce((sum, d) => sum + d.photos.length, 0);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Baby className="h-4 w-4" />
          <span>
            {days.length} days · {totalPhotos} {totalPhotos === 1 ? "photo" : "photos"}
          </span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
          Milo&apos;s nursery
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Tap a month to open it. Photos are grouped by the day they were taken.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/family/auth" label="Milo & Arlo">
        <MiloNurseryGallery days={days} imageEndpoint="/api/family/milo-image" />
      </PasscodeAuthGuard>
    </main>
  );
}
