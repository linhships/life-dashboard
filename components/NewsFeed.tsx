"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, Flame, ThumbsDown, ThumbsUp } from "lucide-react";
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

function NewsCard({
  item,
  rating,
  onRate,
}: {
  item: NewsItem;
  rating: Rating | undefined;
  onRate: (item: NewsItem, rating: Rating) => void;
}) {
  return (
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
          active={rating === "love"}
          tone="love"
          label="Loved it"
          onClick={() => onRate(item, "love")}
        >
          <Flame className="h-4 w-4" />
        </RateButton>
        <RateButton
          active={rating === "up"}
          tone="up"
          label="Liked it"
          onClick={() => onRate(item, "up")}
        >
          <ThumbsUp className="h-4 w-4" />
        </RateButton>
        <RateButton
          active={rating === "down"}
          tone="down"
          label="Not interested"
          onClick={() => onRate(item, "down")}
        >
          <ThumbsDown className="h-4 w-4" />
        </RateButton>
      </div>
    </div>
  );
}

interface Section {
  name: string;
  items: NewsItem[];
}

function groupBySection(items: NewsItem[]): Section[] {
  const sections: Section[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.name === item.section) {
      last.items.push(item);
    } else {
      sections.push({ name: item.section, items: [item] });
    }
  }
  return sections;
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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

  const toggleSection = (name: string) => {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const sections = groupBySection(items);

  return (
    <div className="space-y-8">
      {sections.map((section) => {
        const isCollapsed = collapsed[section.name];
        let lastSubheading: string | null = "";

        return (
          <div key={section.name}>
            <button
              type="button"
              onClick={() => toggleSection(section.name)}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-200 pb-2 text-left"
            >
              <h2 className="text-lg font-bold text-slate-900">{section.name}</h2>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                  isCollapsed ? "-rotate-90" : ""
                }`}
              />
            </button>

            {!isCollapsed && (
              <div className="mt-4 space-y-4">
                {section.items.map((item) => {
                  const showSubheading = item.subheading !== lastSubheading;
                  lastSubheading = item.subheading;
                  return (
                    <div key={item.id}>
                      {showSubheading && item.subheading && (
                        <p className="mb-1.5 text-sm font-semibold text-slate-600">
                          {item.subheading}
                        </p>
                      )}
                      <NewsCard item={item} rating={feedback[item.id]} onRate={rate} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
