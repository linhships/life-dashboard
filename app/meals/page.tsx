import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import {
  getCurrentMealPlan,
  getNextMealPlan,
  readLatestGroceryChecks,
  readLatestMealFeedback,
  type MealPlan,
} from "@/lib/mealplan";
import { MealPlanGrid } from "@/components/MealPlanGrid";
import { GroceryChecklist } from "@/components/GroceryChecklist";
import { SimpleTabs } from "@/components/SimpleTabs";
import { UtensilsCrossed } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MealsPage() {
  const thisWeek = getCurrentMealPlan();
  const nextWeek = getNextMealPlan();

  if (!thisWeek) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Weekly meal plan</h1>
        <p className="mt-4 text-sm text-slate-500">
          No meal plan found yet. Run the weekly food-planning task, or set{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">MEAL_PLAN_DIR</code> in{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.local</code> to point
          at the folder with your dated plans.
        </p>
      </main>
    );
  }

  // Both live in one flat, append-only log each (see lib/mealplan.ts) —
  // every entry's id already encodes its own weekStart, so one read
  // covers every week and each week's grid below just finds its own keys
  // in the same map. No need to read per-week.
  const feedback = readLatestMealFeedback();
  const groceryChecks = readLatestGroceryChecks();
  const today = new Date().toISOString().slice(0, 10);

  const renderPlan = (plan: MealPlan): ReactNode => (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <UtensilsCrossed className="h-4 w-4" />
          <span>Week of {plan.weekStart}</span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">{plan.title}</h1>
        {plan.intro && <p className="mt-2 text-sm text-slate-500">{plan.intro}</p>}
      </header>

      <MealPlanGrid
        weekStart={plan.weekStart}
        today={today}
        rows={plan.rows}
        initialFeedback={feedback}
      />

      {plan.otherSections.length > 0 && (
        <div className="prose-slate max-w-none rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:first:mt-0 [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-800 [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-blue-600 [&_a:hover]:underline [&_strong]:font-semibold [&_strong]:text-slate-900">
          {plan.otherSections.map((section) => (
            <div key={section.heading}>
              <h2>{section.heading}</h2>
              <ReactMarkdown>{section.markdown}</ReactMarkdown>
            </div>
          ))}
        </div>
      )}

      {plan.grocerySections.length > 0 && (
        <GroceryChecklist
          weekStart={plan.weekStart}
          sections={plan.grocerySections}
          initialChecked={groceryChecks}
        />
      )}
    </div>
  );

  const tabs = [{ label: "This week", content: renderPlan(thisWeek) }];
  if (nextWeek) tabs.push({ label: "Next week", content: renderPlan(nextWeek) });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {tabs.length > 1 ? <SimpleTabs tabs={tabs} /> : tabs[0].content}
    </main>
  );
}
