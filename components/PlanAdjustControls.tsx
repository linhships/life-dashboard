"use client";

import type { ContributionPlan } from "@/lib/simulate";

interface Props {
  plan: ContributionPlan;
  onPlanChange: (plan: ContributionPlan | ((p: ContributionPlan) => ContributionPlan)) => void;
  spend: number;
  onSpendChange: (spend: number) => void;
  liquidReserve: number;
  onLiquidReserveChange: (reserve: number) => void;
  initialPlan: ContributionPlan;
  targetSpend: number;
  nYears: number;
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

// Pulled out of InteractiveContributionPlan and rendered right below the
// "Coast FIRE & tax-aware drawdown" KPI summary near the top of the page
// (see ConnectedPlanAdjustControls + app/page.tsx), so the plan controls
// are visible without scrolling into the charts further down — everything
// on the page that reads the live plan (KPIs, charts, narrative) still
// updates live via FinancePlanContext regardless of where this box sits.
export function PlanAdjustControls({
  plan,
  onPlanChange: setPlan,
  spend,
  onSpendChange: setSpend,
  liquidReserve,
  onLiquidReserveChange: setLiquidReserve,
  initialPlan,
  targetSpend,
  nYears,
}: Props) {
  const isDefault =
    JSON.stringify(plan) === JSON.stringify(initialPlan) &&
    spend === targetSpend &&
    liquidReserve === 100000;

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          disabled={isDefault}
          onClick={() => {
            setPlan(initialPlan);
            setSpend(targetSpend);
            setLiquidReserve(100000);
          }}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:text-slate-300"
        >
          Reset to default
        </button>
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
  );
}
