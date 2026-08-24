import { cookies } from "next/headers";
import {
  getAccounts,
  getPensionAllowance,
  getIncome,
  getRetirementModel,
} from "@/lib/data";
import {
  netWorthTimeSeries,
  latestNetWorth,
  kidsSummary,
  last12Months,
} from "@/lib/aggregate";
import { SectionCard } from "@/components/KpiCard";
import { NetWorthChart } from "@/components/NetWorthChart";
import { IncomeChart } from "@/components/IncomeChart";
import { PensionAllowanceChart } from "@/components/PensionAllowanceChart";
import { KidsAccounts } from "@/components/KidsAccounts";
import { FinancePlanProvider } from "@/components/FinancePlanContext";
import { TopKpis } from "@/components/TopKpis";
import { DrawdownSummaryCards } from "@/components/DrawdownSummaryCards";
import { ConnectedContributionPlan } from "@/components/ConnectedContributionPlan";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { FINANCE_AUTH_COOKIE, isAuthed } from "@/lib/financeAuth";
import { type ContributionPlan, type StartingBalances } from "@/lib/simulate";
import { gbp } from "@/lib/format";
import type { AssumptionItem } from "@/lib/types";
import { ArrowLeftRight, PiggyBank, TrendingUp, Users, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

function findAssumption(items: AssumptionItem[], needle: string): number {
  const item = items.find((i) =>
    i.label.toLowerCase().includes(needle.toLowerCase())
  );
  return typeof item?.value === "number" ? item.value : 0;
}

export default async function Home() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(FINANCE_AUTH_COOKIE)?.value);

  // Gate check happens before any finance data is fetched, so an
  // unauthenticated request never gets it in the page's HTML.
  if (!authed) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/finance/auth" label="Finance" />
      </main>
    );
  }

  const [accounts, pensionAllowance, income, retirement] = await Promise.all([
    Promise.resolve(getAccounts()),
    Promise.resolve(getPensionAllowance()),
    Promise.resolve(getIncome()),
    getRetirementModel(),
  ]);

  const netWorth = latestNetWorth(accounts);
  const netWorthSeries = netWorthTimeSeries(accounts);
  const kids = kidsSummary(accounts);
  const recentIncome = last12Months(income);

  const currentAge = findAssumption(retirement.assumptions, "Current age");
  const targetRetirementAge = findAssumption(
    retirement.assumptions,
    "Target retirement age"
  );
  const sippAccessAge = findAssumption(retirement.assumptions, "SIPP access age");
  const baseYear = retirement.projection[0]?.year ?? new Date().getFullYear();

  const currentYearAllowance = pensionAllowance[pensionAllowance.length - 1];

  const isaAnnual = findAssumption(
    retirement.assumptions,
    "ISA annual contribution while contributing"
  );
  const isaYears = findAssumption(
    retirement.assumptions,
    "ISA — years you plan to contribute"
  );
  const giaAnnual = findAssumption(
    retirement.assumptions,
    "GIA annual contribution while contributing"
  );
  const giaYears = findAssumption(
    retirement.assumptions,
    "GIA — years you plan to contribute"
  );
  const sippAnnual = findAssumption(
    retirement.assumptions,
    "SIPP annual contribution while contributing"
  );
  const sippYears = findAssumption(
    retirement.assumptions,
    "SIPP — years you plan to contribute"
  );

  const isa0 = findAssumption(retirement.assumptions, "ISA — current balance");
  const gia0 = findAssumption(retirement.assumptions, "GIA — current balance");
  const sipp0 = findAssumption(retirement.assumptions, "SIPP — combined total");
  const lifeExpectancy = findAssumption(
    retirement.assumptions,
    "Life expectancy / plan to age"
  );
  const statePensionAge = findAssumption(retirement.assumptions, "State pension age");
  const statePension = findAssumption(
    retirement.assumptions,
    "State pension (£/yr"
  );
  const targetSpend = findAssumption(
    retirement.assumptions,
    "Desired annual retirement spending"
  );
  const longHorizonSwr = findAssumption(
    retirement.assumptions,
    "Safe withdrawal rate — long retirement"
  );

  const defaultPlan: ContributionPlan = {
    isaAnnual,
    isaYears,
    giaAnnual,
    giaYears,
    sippAnnual,
    sippYears,
  };
  const start: StartingBalances = { isa0, gia0, sipp0 };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header id="overview" className="scroll-mt-6">
        <h1 className="text-2xl font-bold text-slate-900">Finance Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Long-term picture: net worth, income, retirement plan, and the kids&apos; accounts.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/finance/auth" label="Finance">
        <FinancePlanProvider start={start} initialPlan={defaultPlan} initialSpend={targetSpend}>
          <TopKpis
            netWorth={netWorth}
            currentAge={currentAge}
            targetRetirementAge={targetRetirementAge}
            sippAccessAge={sippAccessAge}
            longHorizonSwr={longHorizonSwr}
          />

          <DrawdownSummaryCards
            currentAge={currentAge}
            targetRetirementAge={targetRetirementAge}
            sippAccessAge={sippAccessAge}
            lifeExpectancy={lifeExpectancy}
            statePensionAge={statePensionAge}
            statePension={statePension}
          />

          <SectionCard
            id="net-worth"
            title="Net worth over time"
            description="ISA, GIA, SIPP and savings balances by snapshot date."
            icon={Wallet}
            iconColor="blue"
          >
            <NetWorthChart data={netWorthSeries} />
          </SectionCard>

          <SectionCard
            id="coast-fire"
            title="Coast FIRE plan & tax-aware drawdown"
            description="Adjust how much you contribute (and for how long) and your target spend, and see the Coast FIRE trajectory plus the full tax-aware drawdown to life expectancy update live — UK income tax + CGT, SIPP's 25% tax-free portion taken in phased slices, ISA/GIA/SIPP drawn in the tax-cheapest order. Deterministic 5% real growth, doesn't model market variance. Starting balances and default plan come from retirement_model.xlsx."
            icon={TrendingUp}
            iconColor="emerald"
          >
            <ConnectedContributionPlan
              baseYear={baseYear}
              currentAge={currentAge}
              targetRetirementAge={targetRetirementAge}
              sippAccessAge={sippAccessAge}
              lifeExpectancy={lifeExpectancy}
              statePensionAge={statePensionAge}
              statePension={statePension}
            />
          </SectionCard>
        </FinancePlanProvider>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <SectionCard
            id="cash-flow"
            title="Cash flow"
            description="Last 12 months: payroll net pay vs. what actually landed in the bank."
            icon={ArrowLeftRight}
            iconColor="blue"
          >
            <IncomeChart data={recentIncome} />
          </SectionCard>

          <SectionCard
            id="pension"
            title="Pension annual allowance"
            description={
              currentYearAllowance
                ? `${currentYearAllowance.taxYear}: ${gbp(
                    currentYearAllowance.carryForwardRemainder
                  )} of allowance still available.`
                : undefined
            }
            icon={PiggyBank}
            iconColor="purple"
          >
            <PensionAllowanceChart data={pensionAllowance} />
          </SectionCard>
        </div>

        <SectionCard
          id="kids"
          title="Kids' accounts"
          description="Junior ISA + Junior SIPP balances, latest snapshot."
          icon={Users}
          iconColor="amber"
        >
          <KidsAccounts kids={kids} />
        </SectionCard>
      </PasscodeAuthGuard>
    </main>
  );
}
