import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { UtensilsCrossed } from "lucide-react";
import { getCurrentMealPlan, getNextMealPlan, type MealPlan } from "@/lib/mealplan";
import { FamilyMealPlan } from "@/components/FamilyMealPlan";
import { FamilyGroceryList } from "@/components/FamilyGroceryList";
import { SimpleTabs } from "@/components/SimpleTabs";

export const dynamic = "force-dynamic";

// Read-only view of the household's weekly meal plan (see lib/mealplan.ts
// / app/meals/page.tsx for Linh's own, interactive version) — what's for
// dinner each day, plus the delivery grocery lists, in case that's
// useful for whoever's visiting or cooking. No rating buttons, no
// checkboxes on the groceries; see components/FamilyMealPlan.tsx and
// components/FamilyGroceryList.tsx for why.
//
// Deliberately no passcode gate, unlike the rest of /family: it's just
// this week's/next week's dinner plan, no photos of the kids, so there's
// nothing here worth putting behind FAMILY_PASSCODE. Same reasoning as
// Learning/Resources being passcode-free elsewhere in the app.
export default async function FamilyMealsPage() {
  const thisWeek = getCurrentMealPlan();
  const nextWeek = getNextMealPlan();

  if (!thisWeek) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Meals
        </h1>
        <p className="mt-4 text-base text-slate-600">No meal plan published yet.</p>
      </main>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const renderPlan = (plan: MealPlan): ReactNode => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <UtensilsCrossed className="h-4 w-4" />
          <span>Week of {plan.weekStart}</span>
        </div>
        {plan.intro && (
          <div className="mt-3 max-w-2xl text-base text-slate-600 [&_strong]:font-semibold [&_strong]:text-slate-900">
            <ReactMarkdown>{plan.intro}</ReactMarkdown>
          </div>
        )}
      </div>
      <FamilyMealPlan weekStart={plan.weekStart} today={today} rows={plan.rows} />
      {plan.grocerySections.length > 0 && (
        <FamilyGroceryList sections={plan.grocerySections} />
      )}
    </div>
  );

  const tabs = [{ label: "This week", content: renderPlan(thisWeek) }];
  if (nextWeek) tabs.push({ label: "Next week", content: renderPlan(nextWeek) });

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Meals
        </h1>
      </header>

      {tabs.length > 1 ? <SimpleTabs tabs={tabs} /> : tabs[0].content}
    </main>
  );
}
