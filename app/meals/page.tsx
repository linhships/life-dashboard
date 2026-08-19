import ReactMarkdown from "react-markdown";
import { getCurrentMealPlan, type MealRow } from "@/lib/mealplan";
import { UtensilsCrossed } from "lucide-react";

export const dynamic = "force-dynamic";

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

function Rating({ label, value }: { label: string; value: string }) {
  if (!value || value === "–" || value === "-") return null;
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {label}: {value}
    </span>
  );
}

export default async function MealsPage() {
  const plan = getCurrentMealPlan();

  if (!plan) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Weekly meal plan</h1>
        <p className="mt-4 text-sm text-slate-500">
          No meal plan found yet. Run the weekly food-planning task, or set{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">MEAL_PLAN_DIR</code> in{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.local</code> to point
          at the folder with your dated plans.
        </p>
      </main>
    );
  }

  const days = groupByDay(plan.rows);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <UtensilsCrossed className="h-4 w-4" />
          <span>Week of {plan.weekStart}</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{plan.title}</h1>
        {plan.intro && <p className="mt-2 text-sm text-slate-500">{plan.intro}</p>}
      </header>

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
              {group.rows.map((row, idx) => (
                <div key={idx} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {row.meal}
                  </p>
                  <div className="mt-1 text-sm text-slate-700">
                    <ReactMarkdown components={markdownComponents}>{row.dish}</ReactMarkdown>
                  </div>
                  {(row.milo || row.arlo) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Rating label="Milo" value={row.milo} />
                      <Rating label="Arlo" value={row.arlo} />
                    </div>
                  )}
                  {row.notes && (
                    <div className="mt-1.5 text-xs text-slate-500">
                      <ReactMarkdown components={markdownComponents}>{row.notes}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {plan.rest && (
        <div className="prose-slate max-w-none rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:first:mt-0 [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-800 [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-blue-600 [&_a:hover]:underline [&_strong]:font-semibold [&_strong]:text-slate-900">
          <ReactMarkdown>{plan.rest}</ReactMarkdown>
        </div>
      )}
    </main>
  );
}
