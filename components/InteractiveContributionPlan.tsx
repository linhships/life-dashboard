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
import { KpiCard } from "./KpiCard";
import { gbp } from "@/lib/format";
import { AlertTriangle, CheckCircle2, PiggyBank, Receipt, Percent } from "lucide-react";

interface Props {
  start: StartingBalances;
  plan: ContributionPlan;
  onPlanChange: (plan: ContributionPlan | ((p: ContributionPlan) => ContributionPlan)) => void;
  spend: number;
  onSpendChange: (spend: number) => void;
  liquidReserve: number;
  onLiquidReserveChange: (reserve: number) => void;
  initialPlan: ContributionPlan;
  baseYear: number;
  currentAge: number;
  targetRetirementAge: number;
  sippAccessAge: number;
  lifeExpectancy: number;
  targetSpend: number;
  statePensionAge: number;
  statePension: number;
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  max,
  step = 1000,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block min-h-[2rem] text-xs leading-4 text-slate-500">
        {label}
      </span>
      <div className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 focus-within:border-slate-500">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) ? Math.max(min, n) : min);
          }}
          className="w-full border-0 p-0 text-sm text-slate-900 focus:outline-none focus:ring-0"
        />
        {suffix && <span className="shrink-0 text-xs text-slate-400">{suffix}</span>}
      </div>
    </label>
  );
}

export function InteractiveContributionPlan({
  start,
  plan,
  onPlanChange: setPlan,
  spend,
  onSpendChange: setSpend,
  liquidReserve,
  onLiquidReserveChange: setLiquidReserve,
  initialPlan,
  baseYear,
  currentAge,
  targetRetirementAge,
  sippAccessAge,
  lifeExpectancy,
  targetSpend,
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

  const lastRow = drawdown[drawdown.length - 1];
  const finalBalance = lastRow ? lastRow.isaEnd + lastRow.giaEnd + lastRow.sippEnd : 0;
  const yearsFunded = drawdown.filter((r) => r.netReceived >= spend - 1).length;
  const lifetimeTax = drawdown.reduce((s, r) => s + r.incomeTax + r.cgt, 0);
  const totalWithdrawn = drawdown.reduce(
    (s, r) => s + r.withdrawnIsa + r.withdrawnGia + r.withdrawnSipp,
    0
  );
  const effectiveTaxRate = totalWithdrawn > 0 ? (lifetimeTax / totalWithdrawn) * 100 : 0;
  const isDefault =
    JSON.stringify(plan) === JSON.stringify(initialPlan) &&
    spend === targetSpend &&
    liquidReserve === 100000;

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

      <div className="border-t border-slate-200 pt-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Adjust the plan</p>
          {!isDefault && (
            <button
              type="button"
              onClick={() => {
                setPlan(initialPlan);
                setSpend(targetSpend);
                setLiquidReserve(100000);
              }}
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Reset to current plan
            </button>
          )}
        </div>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-md">
          <NumberField
            label="Target annual retirement spending"
            value={spend}
            onChange={setSpend}
            suffix="£/yr, today's terms"
            step={1000}
          />
          <NumberField
            label="Emergency buffer kept accessible (ISA+GIA)"
            value={liquidReserve}
            onChange={setLiquidReserve}
            suffix="£ floor"
            step={5000}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2 rounded-xl border border-slate-200 p-3 transition-shadow hover:shadow-md">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              ISA
            </p>
            <NumberField
              label="Annual contribution"
              value={plan.isaAnnual}
              onChange={(v) => setPlan((p) => ({ ...p, isaAnnual: v }))}
              suffix="£/yr"
              step={1000}
            />
            <NumberField
              label="Years contributing"
              value={plan.isaYears}
              onChange={(v) => setPlan((p) => ({ ...p, isaYears: v }))}
              max={nYears}
              step={1}
            />
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 p-3 transition-shadow hover:shadow-md">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <span className="h-2 w-2 rounded-full bg-purple-600" />
              GIA
            </p>
            <NumberField
              label="Annual contribution"
              value={plan.giaAnnual}
              onChange={(v) => setPlan((p) => ({ ...p, giaAnnual: v }))}
              suffix="£/yr"
              step={1000}
            />
            <NumberField
              label="Years contributing"
              value={plan.giaYears}
              onChange={(v) => setPlan((p) => ({ ...p, giaYears: v }))}
              max={nYears}
              step={1}
            />
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 p-3 transition-shadow hover:shadow-md">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              SIPP
            </p>
            <NumberField
              label="Annual contribution"
              value={plan.sippAnnual}
              onChange={(v) => setPlan((p) => ({ ...p, sippAnnual: v }))}
              suffix="£/yr"
              step={1000}
            />
            <NumberField
              label="Years contributing"
              value={plan.sippYears}
              onChange={(v) => setPlan((p) => ({ ...p, sippYears: v }))}
              max={nYears}
              step={1}
            />
          </div>
        </div>
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

      <div className="border-t border-slate-200 pt-6">
        <p className="mb-4 text-sm font-medium text-slate-700">
          Resulting tax-aware drawdown (age {targetRetirementAge} to {lifeExpectancy})
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Balance at 90"
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
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-slate-700">Account balances by age</p>
          <DrawdownBalanceChart data={drawdown} />
        </div>
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
        <div className="border-t border-slate-200 pt-6">
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
