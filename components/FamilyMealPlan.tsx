import ReactMarkdown from "react-markdown";
import type { MealRow } from "@/lib/mealplan";
import { dateForDay } from "@/lib/weekdays";
import { categoryColorClass } from "@/lib/colorHash";

// Read-only echo of the household's own weekly grid
// (components/MealPlanGrid.tsx) for the family view: same day/meal/dish/
// notes, but with the thumbs-up rating buttons and grocery lists dropped
// — the ratings POST to /api/meals/feedback, which the family-only server
// instance can't reach anyway (see middleware.ts), and the grocery lists
// are logistics for whoever's cooking, not something grandparents need.
// No "use client" here: nothing on this page is interactive.

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

function StaticRating({ label, value }: { label: string; value: string }) {
  if (!value || value === "–" || value === "-") return null;
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">
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
    if (last && last.day === row.day) last.rows.push(row);
    else groups.push({ day: row.day, rows: [row] });
  }
  return groups;
}

export function FamilyMealPlan({
  weekStart,
  today,
  rows,
}: {
  weekStart: string;
  today: string;
  rows: MealRow[];
}) {
  const days = groupByDay(rows);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {days.map((group) => {
        const groupDate = dateForDay(weekStart, group.day);
        const isPast = groupDate !== null && groupDate < today;
        const isToday = groupDate === today;

        return (
          <div
            key={group.day}
            className={`rounded-xl border p-4 shadow-sm ${
              isToday
                ? "border-blue-300 bg-blue-50/60 ring-1 ring-blue-200"
                : isPast
                  ? "border-slate-200 bg-slate-100"
                  : "border-slate-200 bg-white"
            }`}
          >
            <h2
              className={`mb-3 text-base font-bold uppercase tracking-wide ${
                isPast ? "text-slate-500" : isToday ? "text-blue-700" : "text-slate-900"
              }`}
            >
              {group.day}
            </h2>
            <div className="space-y-3">
              {group.rows.map((row) => (
                <div
                  key={row.id}
                  className={`meal-row ${categoryColorClass(
                    row.meal
                  )} border-t border-slate-100 pt-3 first:border-0 first:pt-0`}
                >
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    {row.meal}
                  </p>
                  <div className="mt-1 text-base text-slate-700">
                    <ReactMarkdown components={markdownComponents}>{row.dish}</ReactMarkdown>
                  </div>
                  {(row.milo || row.arlo) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <StaticRating label="Milo" value={row.milo} />
                      <StaticRating label="Arlo" value={row.arlo} />
                    </div>
                  )}
                  {row.notes && (
                    <div className="mt-1.5 text-sm text-slate-500">
                      <ReactMarkdown components={markdownComponents}>{row.notes}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
