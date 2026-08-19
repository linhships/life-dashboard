"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { Kid, KidRating, MealFeedbackEntry, MealRow } from "@/lib/mealplan";

const markdownComponents = {
  p: (props: React.ComponentProps<"p">) => <p className="m-0" {...props} />,
  strong: (props: React.ComponentProps<"strong">) => (
    <strong className="font-semibold text-slate-900" {...props} />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a
      className="text-blue-600 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
};

const KIDS: { name: Kid; emoji: string }[] = [
  { name: "Milo", emoji: "👦🏻" },
  { name: "Arlo", emoji: "👶🏻" },
];

const TONE_CLASSES: Record<"up" | "down", string> = {
  up: "bg-emerald-50 text-emerald-600 border-emerald-200",
  down: "bg-rose-50 text-rose-600 border-rose-200",
};

function RateButton({
  active,
  tone,
  label,
  onClick,
  children,
}: {
  active: boolean;
  tone: "up" | "down";
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
      className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
        active
          ? TONE_CLASSES[tone]
          : "border-slate-200 text-slate-300 hover:bg-slate-50 hover:text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}

function StaticRating({ label, value }: { label: string; value: string }) {
  if (!value || value === "–" || value === "-") return null;
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {label}: {value}
    </span>
  );
}

interface DayGroup {
  day: string;
  rows: MealRow[];
}

function groupByDay(rows: MealRow[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.day === row.day) {
      last.rows.push(row);
    } else {
      groups.push({ day: row.day, rows: [row] });
    }
  }
  return groups;
}

export function MealPlanGrid({
  weekStart,
  rows,
  initialFeedback,
}: {
  weekStart: string;
  rows: MealRow[];
  initialFeedback: Record<string, MealFeedbackEntry>;
}) {
  const [feedback, setFeedback] = useState<Record<string, KidRating>>(() =>
    Object.fromEntries(
      Object.entries(initialFeedback)
        .filter(([, f]) => f.rating !== "none")
        .map(([key, f]) => [key, f.rating])
    )
  );

  const rate = (row: MealRow, kid: Kid, clicked: "up" | "down") => {
    const key = `${row.id}:${kid}`;
    // Clicking the already-active button clears the rating.
    const rating: KidRating = feedback[key] === clicked ? "none" : clicked;
    setFeedback((prev) => {
      const next = { ...prev };
      if (rating === "none") delete next[key];
      else next[key] = rating;
      return next;
    });
    fetch("/api/meals/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        weekStart,
        day: row.day,
        meal: row.meal,
        dish: row.dish,
        kid,
        rating,
      }),
    }).catch(() => {
      // Best-effort — feedback is a nice-to-have log, not critical path.
    });
  };

  const days = groupByDay(rows);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {days.map((group) => (
        <div
          key={group.day}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-900">
            {group.day}
          </h2>
          <div className="space-y-3">
            {group.rows.map((row) => (
              <div key={row.id} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {row.meal}
                </p>
                <div className="mt-1 text-sm text-slate-700">
                  <ReactMarkdown components={markdownComponents}>{row.dish}</ReactMarkdown>
                </div>
                {(row.milo || row.arlo) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StaticRating label="Milo" value={row.milo} />
                    <StaticRating label="Arlo" value={row.arlo} />
                  </div>
                )}
                {row.notes && (
                  <div className="mt-1.5 text-xs text-slate-500">
                    <ReactMarkdown components={markdownComponents}>{row.notes}</ReactMarkdown>
                  </div>
                )}

                <div className="mt-3 space-y-1.5">
                  {KIDS.map((kid) => {
                    const key = `${row.id}:${kid.name}`;
                    const active = feedback[key];
                    return (
                      <div key={kid.name} className="flex items-center gap-1.5">
                        <span className="text-sm">{kid.emoji}</span>
                        <span className="w-9 text-xs text-slate-500">{kid.name}</span>
                        <RateButton
                          active={active === "up"}
                          tone="up"
                          label={`${kid.name} liked it`}
                          onClick={() => rate(row, kid.name, "up")}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </RateButton>
                        <RateButton
                          active={active === "down"}
                          tone="down"
                          label={`${kid.name} didn't like it`}
                          onClick={() => rate(row, kid.name, "down")}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </RateButton>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
