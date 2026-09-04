"use client";

import { PlanAdjustControls } from "./PlanAdjustControls";
import { useFinancePlan } from "./FinancePlanContext";

interface Props {
  currentAge: number;
  targetRetirementAge: number;
}

// Thin wrapper that connects the (reusable, controlled) PlanAdjustControls
// to the shared FinancePlanContext — same pattern as ConnectedContributionPlan,
// just for the plan-editing box on its own so it can be positioned separately
// from the charts (see app/page.tsx).
export function ConnectedPlanAdjustControls({ currentAge, targetRetirementAge }: Props) {
  const { plan, setPlan, spend, setSpend, liquidReserve, setLiquidReserve, initialPlan, initialSpend } =
    useFinancePlan();
  const nYears = Math.max(0, targetRetirementAge - currentAge);

  return (
    <PlanAdjustControls
      plan={plan}
      onPlanChange={setPlan}
      spend={spend}
      onSpendChange={setSpend}
      liquidReserve={liquidReserve}
      onLiquidReserveChange={setLiquidReserve}
      initialPlan={initialPlan}
      targetSpend={initialSpend}
      nYears={nYears}
    />
  );
}
