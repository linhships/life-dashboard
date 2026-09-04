"use client";

import { useMemo } from "react";
import {
  runScenario,
  accumulateYearly,
  type ContributionPlan,
  type StartingBalances,
} from "@/lib/simulate";
import { buildDrawdownNarrative } from "@/lib/narrative";
import { ContributionPlanSummary } from "./ContributionPlanSummary";
import { ContributionChart, type ContributionYear } from "./ContributionChart";
import { CoastFireChart, type CoastFirePoint } from "./CoastFireChart";
import { DrawdownBalanceChart } from "./DrawdownBalanceChart";
import { DrawdownWithdrawalChart } from "./DrawdownWithdrawalChart";
import { gbp } from "@/lib/format";

interface Props {
  start: StartingBalances;
  plan: ContributionPlan;
  spend: number;
  liquidReserve: number;
  baseYear: number;
  currentAge: number;
  targetRetirementAge: number;
  sippAccessAge: number;
  lifeExpectancy: number;
  statePensionAge: number;
  statePension: number;
}

export function InteractiveContributionPlan({
  start,
  plan,
  spend,
  liquidReserve,
  baseYear,
  currentAge,
  targetRetirementAge,
  sippAccessAge,
  lifeExpectancy,
  statePensionAge,
  statePension,
}: Props) {
  const nYears = Math.max(0, targetRetirementAge - currentAge);

  const contributionYears: ContributionYear[] = useMemo(() => {
    const rows: ContributionYear[] = [];
    for (let y = 0; y < nYears; y++) {
      rows.push({
        year: baseYear + y,
        age: currentAge + y,
        isaContrib: y < plan.isaYears ? plan.isaAnnual : 0,
        giaContrib: y < plan.giaYears ? plan.giaAnnual : 0,
        sippContrib: y < plan.sippYears ? plan.sippAnnual : 0,
      });
    }
    return rows;
  }, [plan, nYears, baseYear, currentAge]);

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

  const retirementYear = baseYear + (targetRetirementAge - currentAge);
  const sippAccessYear = baseYear + (sippAccessAge - currentAge);

  const coastFireData: CoastFirePoint[] = useMemo(() => {
    const accumulation = accumulateYearly(start, plan, currentAge, baseYear, nYears);
    const bridge = drawdown
      .filter((r) => r.age <= sippAccessAge)
      .map((r) => ({
        year: baseYear + (r.age - currentAge),
        age: r.age,
        isaGia: r.isaStart + r.giaStart,
        sipp: r.sippStart,
      }));
    return [...accumulation, ...bridge];
  }, [start, plan, currentAge, baseYear, nYears, drawdown, sippAccessAge]);

  const narrative = useMemo(
    () =>
      buildDrawdownNarrative(
        drawdown,
        sippAccessAge,
        statePensionAge,
        statePension,
        spend,
        liquidReserve
      ),
    [drawdown, sippAccessAge, statePensionAge, statePension, spend, liquidReserve]
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">
          Accumulation (to age {targetRetirementAge}) then bridge phase spending
          ISA+GIA while SIPP grows untouched, to age {sippAccessAge}
        </p>
        <CoastFireChart
          data={coastFireData}
          retirementYear={retirementYear}
          sippAccessYear={sippAccessYear}
        />
      </div>

      <ContributionPlanSummary
        isa={{ annualAmount: plan.isaAnnual, years: plan.isaYears }}
        gia={{ annualAmount: plan.giaAnnual, years: plan.giaYears }}
        sipp={{ annualAmount: plan.sippAnnual, years: plan.sippYears }}
      />
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">
          Contributions during accumulation
        </p>
        <ContributionChart data={contributionYears} />
      </div>

      <div className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-md">
        <p className="mb-2 text-sm font-medium text-slate-700">Account balances by age</p>
        <DrawdownBalanceChart data={drawdown} />
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-slate-700">
            Where the {gbp(spend)}/yr comes from
          </p>
          <DrawdownWithdrawalChart
            data={drawdown}
            statePensionAge={statePensionAge}
            statePensionAmount={statePension}
          />
        </div>
      </div>

      {narrative.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-md">
          <p className="mb-1 text-sm font-medium text-slate-700">
            How this plays out, phase by phase
          </p>
          <p className="mb-4 text-xs text-slate-400">
            Generated from the simulation above — updates automatically as you change the plan.
          </p>
          <div className="space-y-4">
            {narrative.map((phase) => (
              <div key={phase.heading}>
                <p className="text-sm font-semibold text-slate-800">{phase.heading}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{phase.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
