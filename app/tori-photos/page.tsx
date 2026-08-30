import { cookies } from "next/headers";
import { getToriCareDays } from "@/lib/toriPhotos";
import { ToriPhotosGallery } from "@/components/ToriPhotosGallery";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { TORI_PHOTOS_AUTH_COOKIE, isAuthed } from "@/lib/toriPhotosAuth";
import { Heart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ToriPhotosPage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(TORI_PHOTOS_AUTH_COOKIE)?.value);

  // Gate check happens before the data is ever fetched, so an
  // unauthenticated request never gets the photo manifest in the page's
  // HTML — same server-side-first pattern as Links/Finance.
  if (!authed) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/tori-photos/auth" label="Tori & the boys" />
      </main>
    );
  }

  const days = getToriCareDays();
  const allMedia = days.flatMap((d) => d.photos);
  const totalVideos = allMedia.filter((p) => p.type === "video").length;
  const totalPhotos = allMedia.length - totalVideos;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Heart className="h-4 w-4" />
          <span>
            {days.length} days · {totalPhotos} {totalPhotos === 1 ? "photo" : "photos"}
            {totalVideos > 0
              ? ` · ${totalVideos} ${totalVideos === 1 ? "video" : "videos"}`
              : ""}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Tori & the boys</h1>
        <p className="mt-2 text-sm text-slate-500">
          Every photo and video Tori sent while looking after Milo and Arlo, from her first day
          to her last — pulled from your WhatsApp chats with her and grouped by the day she sent
          them.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/tori-photos/auth" label="Tori & the boys">
        <ToriPhotosGallery days={days} />
      </PasscodeAuthGuard>
    </main>
  );
}
