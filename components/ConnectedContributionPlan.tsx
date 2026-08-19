"use client";

import { InteractiveContributionPlan } from "./InteractiveContributionPlan";
import { useFinancePlan } from "./FinancePlanContext";

interface Props {
  baseYear: number;
  currentAge: number;
  targetRetirementAge: number;
  sippAccessAge: number;
  lifeExpectancy: number;
  statePensionAge: number;
  statePension: number;
}

// Thin wrapper that connects the (reusable, controlled) InteractiveContributionPlan
// to the shared FinancePlanContext, so its edits also drive the top-level KPIs.
export function ConnectedContributionPlan(props: Props) {
  const { plan, setPlan, spend, setSpend, liquidReserve, setLiquidReserve, initialPlan, initialSpend, start } =
    useFinancePlan();

  return (
    <InteractiveContributionPlan
      {...props}
      start={start}
      plan={plan}
      onPlanChange={setPlan}
      spend={spend}
      onSpendChange={setSpend}
      liquidReserve={liquidReserve}
      onLiquidReserveChange={setLiquidReserve}
      initialPlan={initialPlan}
      targetSpend={initialSpend}
    />
  );
}
