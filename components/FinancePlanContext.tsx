"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ContributionPlan, StartingBalances } from "@/lib/simulate";

export const DEFAULT_LIQUID_RESERVE = 100000;

interface FinancePlanContextValue {
  plan: ContributionPlan;
  setPlan: (p: ContributionPlan | ((prev: ContributionPlan) => ContributionPlan)) => void;
  spend: number;
  setSpend: (s: number) => void;
  liquidReserve: number;
  setLiquidReserve: (r: number) => void;
  initialPlan: ContributionPlan;
  initialSpend: number;
  start: StartingBalances;
}

const FinancePlanContext = createContext<FinancePlanContextValue | null>(null);

// Shares the live contribution plan / target spend / emergency reserve
// between the top-level KPI cards and the interactive Coast FIRE section
// further down the page, so they don't drift out of sync — without forcing
// those two blocks to be adjacent in the JSX tree.
export function FinancePlanProvider({
  children,
  start,
  initialPlan,
  initialSpend,
}: {
  children: ReactNode;
  start: StartingBalances;
  initialPlan: ContributionPlan;
  initialSpend: number;
}) {
  const [plan, setPlan] = useState<ContributionPlan>(initialPlan);
  const [spend, setSpend] = useState<number>(initialSpend);
  const [liquidReserve, setLiquidReserve] = useState<number>(DEFAULT_LIQUID_RESERVE);

  const value = useMemo(
    () => ({
      plan,
      setPlan,
      spend,
      setSpend,
      liquidReserve,
      setLiquidReserve,
      initialPlan,
      initialSpend,
      start,
    }),
    [plan, spend, liquidReserve, initialPlan, initialSpend, start]
  );

  return <FinancePlanContext.Provider value={value}>{children}</FinancePlanContext.Provider>;
}

export function useFinancePlan(): FinancePlanContextValue {
  const ctx = useContext(FinancePlanContext);
  if (!ctx) {
    throw new Error("useFinancePlan must be used within a FinancePlanProvider");
  }
  return ctx;
}
