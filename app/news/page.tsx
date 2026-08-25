import ReactMarkdown from "react-markdown";
import { getLatestBriefing, readLatestFeedback } from "@/lib/news";
import { NewsFeed } from "@/components/NewsFeed";
import { Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const briefing = getLatestBriefing();
  const feedback = readLatestFeedback();

  if (!briefing) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
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
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Newspaper className="h-3.5 w-3.5" />
          <span>Daily briefing · {briefing.date}</span>
        </div>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">{briefing.title}</h1>
        {briefing.intro && (
          <div className="mt-4 max-w-3xl space-y-3 font-serif text-sm italic leading-relaxed text-slate-800">
            <ReactMarkdown
              components={{
                p: ({ node: _node, ...props }) => <p {...props} />,
                strong: ({ node: _node, ...props }) => <strong className="font-bold" {...props} />,
                em: ({ node: _node, ...props }) => <em {...props} />,
                code: ({ node: _node, ...props }) => (
                  <code
                    className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm not-italic text-slate-600"
                    {...props}
                  />
                ),
                a: ({ node: _node, ...props }) => (
                  <a
                    className="not-italic font-sans text-sm text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
              }}
            >
              {briefing.intro}
            </ReactMarkdown>
          </div>
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
