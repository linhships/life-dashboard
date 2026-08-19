"use client";

import { useMemo } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, TrendingUp, Wallet } from "lucide-react";
import { accumulate, G } from "@/lib/simulate";
import { KpiCard } from "./KpiCard";
import { gbp } from "@/lib/format";
import { useFinancePlan } from "./FinancePlanContext";

interface Props {
  netWorth: number;
  currentAge: number;
  targetRetirementAge: number;
  sippAccessAge: number;
  longHorizonSwr: number;
}

export function TopKpis({
  netWorth,
  currentAge,
  targetRetirementAge,
  sippAccessAge,
  longHorizonSwr,
}: Props) {
  const { plan, spend, start } = useFinancePlan();
  const yearsToRetirement = targetRetirementAge - currentAge;

  const accumulated = useMemo(
    () => accumulate(start, plan, targetRetirementAge - currentAge),
    [start, plan, targetRetirementAge, currentAge]
  );
  const sippAt57 = accumulated.sipp * Math.pow(1 + G, sippAccessAge - targetRetirementAge);
  const shortfall = sippAt57 * longHorizonSwr - spend;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Net worth today"
        value={gbp(netWorth)}
        icon={Wallet}
        iconColor="blue"
      />
      <KpiCard
        label="Years to target retirement"
        value={`${yearsToRetirement}`}
        subtext={`Age ${currentAge} → ${targetRetirementAge}`}
        icon={CalendarClock}
        iconColor="purple"
      />
      <KpiCard
        label="Projected SIPP at 57"
        value={gbp(sippAt57)}
        subtext={`Access from age ${sippAccessAge}`}
        icon={TrendingUp}
        iconColor="emerald"
      />
      <KpiCard
        label="Shortfall vs. target spend"
        value={gbp(shortfall)}
        subtext={`Target: ${gbp(spend)}/yr`}
        tone={shortfall < 0 ? "negative" : "positive"}
        icon={shortfall < 0 ? AlertTriangle : CheckCircle2}
        iconColor={shortfall < 0 ? "rose" : "emerald"}
        badge={shortfall < 0 ? "Shortfall" : "On track"}
        tooltip="This only answers one narrow question: could my SIPP alone, drawn very conservatively, cover my target spend forever? It ignores your ISA/GIA balance entirely and ignores State Pension from 67. See the tax-aware drawdown simulation below for the full picture, which accounts for all your accounts and usually looks much better than this number. Updates live as you adjust the plan below."
      />
    </section>
  );
}
