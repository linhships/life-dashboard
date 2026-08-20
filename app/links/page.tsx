import { getLinks } from "@/lib/links";
import { LinksBoard } from "@/components/LinksBoard";
import { Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
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

      <LinksBoard initialLinks={links} />
    </main>
  );
}
