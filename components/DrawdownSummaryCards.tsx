"use client";

import { useMemo } from "react";
import { runScenario } from "@/lib/simulate";
import { KpiCard } from "./KpiCard";
import { gbp } from "@/lib/format";
import { useFinancePlan } from "./FinancePlanContext";
import { AlertTriangle, CheckCircle2, PiggyBank, Receipt, Percent } from "lucide-react";

interface Props {
  currentAge: number;
  targetRetirementAge: number;
  sippAccessAge: number;
  lifeExpectancy: number;
  statePensionAge: number;
  statePension: number;
}

// Headline result of the tax-aware drawdown simulation, pulled up to the
// top of the page (below the main KPI row) so it's visible without
// scrolling into the interactive Coast FIRE section further down. Reads
// the live plan/spend/reserve from FinancePlanContext, so it updates
// automatically as those are adjusted down there — same pattern as
// TopKpis / ConnectedContributionPlan.
export function DrawdownSummaryCards({
  currentAge,
  targetRetirementAge,
  sippAccessAge,
  lifeExpectancy,
  statePensionAge,
  statePension,
}: Props) {
  const { plan, spend, liquidReserve, start } = useFinancePlan();

  const drawdown = useMemo(
    () =>
      runScenario(
        start,
        plan,
        currentAge,
        targetRetirementAge,
        sippAccessAge,
        lifeExpectancy,
        spend,
        statePensionAge,
        statePension,
        liquidReserve
      ),
    [
      start,
      plan,
      currentAge,
      targetRetirementAge,
      sippAccessAge,
      lifeExpectancy,
      spend,
      statePensionAge,
      statePension,
      liquidReserve,
    ]
  );

  const lastRow = drawdown[drawdown.length - 1];
  const finalBalance = lastRow ? lastRow.isaEnd + lastRow.giaEnd + lastRow.sippEnd : 0;
  const yearsFunded = drawdown.filter((r) => r.netReceived >= spend - 1).length;
  const lifetimeTax = drawdown.reduce((s, r) => s + r.incomeTax + r.cgt, 0);
  const totalWithdrawn = drawdown.reduce(
    (s, r) => s + r.withdrawnIsa + r.withdrawnGia + r.withdrawnSipp,
    0
  );
  const effectiveTaxRate = totalWithdrawn > 0 ? (lifetimeTax / totalWithdrawn) * 100 : 0;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">
        Coast FIRE & tax-aware drawdown (age {targetRetirementAge} to {lifeExpectancy})
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Balance at ${lifeExpectancy}`}
          value={gbp(finalBalance)}
          icon={PiggyBank}
          iconColor="emerald"
        />
        <KpiCard
          label="Years fully funded"
          value={`${yearsFunded} / ${drawdown.length}`}
          tone={yearsFunded === drawdown.length ? "positive" : "negative"}
          icon={yearsFunded === drawdown.length ? CheckCircle2 : AlertTriangle}
          iconColor={yearsFunded === drawdown.length ? "emerald" : "rose"}
          badge={yearsFunded === drawdown.length ? "Fully funded" : `${drawdown.length - yearsFunded} short`}
        />
        <KpiCard
          label="Lifetime tax paid"
          value={gbp(lifetimeTax)}
          icon={Receipt}
          iconColor="amber"
        />
        <KpiCard
          label="Effective tax rate"
          value={`${effectiveTaxRate.toFixed(1)}%`}
          icon={Percent}
          iconColor="blue"
          subtext="on money withdrawn from accounts"
        />
      </div>
    </div>
  );
}
