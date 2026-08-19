import { getLatestBriefing, readLatestFeedback } from "@/lib/news";
import { NewsFeed } from "@/components/NewsFeed";
import { Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const briefing = getLatestBriefing();
  const feedback = readLatestFeedback();

  if (!briefing) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Daily briefing</h1>
        <p className="mt-4 text-sm text-slate-500">
          No briefing found yet. Run the daily-news task, or set{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">NEWS_BRIEFING_DIR</code>{" "}
          in <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.local</code> to
          point at the folder with your dated summaries.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Newspaper className="h-4 w-4" />
          <span>{briefing.date}</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{briefing.title}</h1>
        {briefing.intro && (
          <p className="mt-2 text-sm text-slate-500">{briefing.intro}</p>
        )}
      </header>

      <NewsFeed items={briefing.items} initialFeedback={feedback} />

      {briefing.footer && (
        <footer className="whitespace-pre-wrap border-t border-slate-200 pt-4 text-xs text-slate-400">
          {briefing.footer}
        </footer>
      )}
    </main>
  );
}
