import { cookies } from "next/headers";
import { Heart } from "lucide-react";
import { getToriCareDays } from "@/lib/toriPhotos";
import { ToriPhotosGallery } from "@/components/ToriPhotosGallery";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { FAMILY_AUTH_COOKIE, isAuthed } from "@/lib/familyAuth";

export const dynamic = "force-dynamic";

export default async function FamilyToriPage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(FAMILY_AUTH_COOKIE)?.value);

  if (!authed) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/family/auth" label="Milo & Arlo" />
      </main>
    );
  }

  const days = getToriCareDays();
  const totalPhotos = days.reduce((sum, d) => sum + d.photos.length, 0);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Heart className="h-4 w-4" />
          <span>
            {days.length} days · {totalPhotos} {totalPhotos === 1 ? "photo" : "photos"}
          </span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
          Days with Tori
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Photos and short videos Tori sent while she was looking after the boys, oldest days
          first.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/family/auth" label="Milo & Arlo">
        <ToriPhotosGallery days={days} mediaEndpoint="/api/family/tori-image" />
      </PasscodeAuthGuard>
    </main>
  );
}
