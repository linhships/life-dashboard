import type { ReactNode } from "react";
import { cookies } from "next/headers";
import ReactMarkdown from "react-markdown";
import { UtensilsCrossed } from "lucide-react";
import { getCurrentMealPlan, getNextMealPlan, type MealPlan } from "@/lib/mealplan";
import { FamilyMealPlan } from "@/components/FamilyMealPlan";
import { SimpleTabs } from "@/components/SimpleTabs";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { FAMILY_AUTH_COOKIE, isAuthed } from "@/lib/familyAuth";

export const dynamic = "force-dynamic";

// Read-only view of the household's weekly meal plan (see lib/mealplan.ts
// / app/meals/page.tsx for Linh's own, interactive version) — what's for
// dinner each day, in case that's useful for whoever's visiting or
// cooking. No rating buttons, no grocery lists; see
// components/FamilyMealPlan.tsx for why.
export default async function FamilyMealsPage() {
  const cookieStore = await cookies();
  if (!isAuthed(cookieStore.get(FAMILY_AUTH_COOKIE)?.value)) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/family/auth" label="Milo & Arlo" />
      </main>
    );
  }

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
