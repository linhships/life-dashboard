import { cookies } from "next/headers";
import { getResources } from "@/lib/resources";
import { ResourcesBoard } from "@/components/ResourcesBoard";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { RESOURCES_AUTH_COOKIE, isAuthed } from "@/lib/resourcesAuth";
import { Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(RESOURCES_AUTH_COOKIE)?.value);

  // Gate check happens before the data is ever fetched, so an unauthenticated
  // request never gets resource data in the page's HTML — this isn't just a
  // UI overlay hiding an already-loaded page.
  if (!authed) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/resources/auth" label="Resources" />
      </main>
    );
  }

  const resources = getResources();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Link2 className="h-4 w-4" />
          <span>{resources.length} saved</span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">Resources</h1>
        <p className="mt-2 text-sm text-slate-500">
          Paste a link or upload a file to save it with its title, preview image, and
          description — organized into categories you can reassign any time.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/resources/auth" label="Resources">
        <ResourcesBoard initialResources={resources} />
      </PasscodeAuthGuard>
    </main>
  );
}
