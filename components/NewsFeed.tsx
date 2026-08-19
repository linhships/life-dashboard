"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Flame, ThumbsDown, ThumbsUp } from "lucide-react";
import type { NewsItem, Rating } from "@/lib/news";

interface FeedbackEntry {
  id: string;
  rating: Rating;
}

const TONE_CLASSES: Record<Rating, string> = {
  down: "bg-rose-50 text-rose-600 border-rose-200",
  up: "bg-emerald-50 text-emerald-600 border-emerald-200",
  love: "bg-amber-50 text-amber-600 border-amber-200",
};

function RateButton({
  active,
  tone,
  label,
  onClick,
  children,
}: {
  active: boolean;
  tone: Rating;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
        active
          ? TONE_CLASSES[tone]
          : "border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

export function NewsFeed({
  items,
  initialFeedback,
}: {
  items: NewsItem[];
  initialFeedback: Record<string, FeedbackEntry>;
}) {
  const [feedback, setFeedback] = useState<Record<string, Rating>>(() =>
    Object.fromEntries(Object.entries(initialFeedback).map(([id, f]) => [id, f.rating]))
  );

  const rate = (item: NewsItem, rating: Rating) => {
    setFeedback((prev) => ({ ...prev, [item.id]: rating }));
    fetch("/api/news/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        date: item.date,
        section: item.section,
        headline: item.headline,
        rating,
      }),
    }).catch(() => {
      // Best-effort — feedback is a nice-to-have log, not critical path.
    });
  };

  let lastSection = "";
  let lastSubheading: string | null = "";

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const showSection = item.section !== lastSection;
        const showSubheading = item.subheading !== lastSubheading;
        lastSection = item.section;
        lastSubheading = item.subheading;
        const active = feedback[item.id];

        return (
          <div key={item.id}>
            {showSection && (
              <h2 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400 first:mt-0">
                {item.section}
              </h2>
            )}
            {showSubheading && item.subheading && (
              <p className="mb-1.5 text-sm font-semibold text-slate-600">{item.subheading}</p>
            )}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="text-sm leading-relaxed text-slate-700">
                <ReactMarkdown
                  components={{
                    p: ({ ...props }) => <p className="m-0" {...props} />,
                    strong: ({ ...props }) => (
                      <strong className="font-semibold text-slate-900" {...props} />
                    ),
                    a: ({ ...props }) => (
                      <a
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      />
                    ),
                  }}
                >
                  {item.markdown}
                </ReactMarkdown>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <RateButton
                  active={active === "down"}
                  tone="down"
                  label="Not interested"
                  onClick={() => rate(item, "down")}
                >
                  <ThumbsDown className="h-4 w-4" />
                </RateButton>
                <RateButton
                  active={active === "up"}
                  tone="up"
                  label="Liked it"
                  onClick={() => rate(item, "up")}
                >
                  <ThumbsUp className="h-4 w-4" />
                </RateButton>
                <RateButton
                  active={active === "love"}
                  tone="love"
                  label="Loved it"
                  onClick={() => rate(item, "love")}
                >
                  <Flame className="h-4 w-4" />
                </RateButton>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
