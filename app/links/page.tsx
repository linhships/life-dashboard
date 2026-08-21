import { cookies } from "next/headers";
import { getLinks } from "@/lib/links";
import { LinksBoard } from "@/components/LinksBoard";
import { LinksAuthGuard } from "@/components/LinksAuthGuard";
import { LinksPageGate } from "@/components/LinksPageGate";
import { LINKS_AUTH_COOKIE, isAuthed } from "@/lib/linksAuth";
import { Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(LINKS_AUTH_COOKIE)?.value);

  // Gate check happens before the data is ever fetched, so an unauthenticated
  // request never gets link data in the page's HTML — this isn't just a UI
  // overlay hiding an already-loaded page.
  if (!authed) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <LinksPageGate />
      </main>
    );
  }

  const links = getLinks();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link2 className="h-4 w-4" />
          <span>{links.length} saved</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Links</h1>
        <p className="mt-2 text-sm text-slate-500">
          Paste a link to save it with its title, preview image, and description — organized
          into categories you can reassign any time.
        </p>
      </header>

      <LinksAuthGuard>
        <LinksBoard initialLinks={links} />
      </LinksAuthGuard>
    </main>
  );
}
