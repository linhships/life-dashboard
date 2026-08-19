// Tax-aware Coast FIRE / drawdown simulation, ported from the validated Python model.
// England / Wales / NI tax bands. SIPP 25% tax-free lump sum taken in phased slices.
// All figures in "today's money" (real terms). Runs entirely client-side, no server round-trip.

import type { DrawdownRow } from "./types";

export const G = 0.05; // real growth rate

const PA_FULL = 12570;
const HIGHER_THRESHOLD_TAXABLE = 37700; // width of basic-rate band (taxable income above PA)
const ADDL_THRESHOLD_TAXABLE = 112570; // taxable income above which additional rate (45%) applies
const CGT_ALLOWANCE = 3000;
const CGT_BASIC = 0.18;
const CGT_HIGHER = 0.24;

function personalAllowance(totalIncome: number): number {
  let pa = PA_FULL;
  if (totalIncome > 100000) {
    pa -= Math.min(pa, (totalIncome - 100000) / 2);
  }
  return Math.max(0, pa);
}

function marginalIncomeTaxRate(totalIncomeSoFar: number, pa: number): number {
  const taxableSoFar = Math.max(0, totalIncomeSoFar - pa);
  if (taxableSoFar < HIGHER_THRESHOLD_TAXABLE) {
    return totalIncomeSoFar >= pa ? 0.2 : 0;
  } else if (taxableSoFar < ADDL_THRESHOLD_TAXABLE) {
    return 0.4;
  }
  return 0.45;
}

function marginalCgtRate(
  totalIncomeThisYear: number,
  pa: number,
  gainsRealizedSoFar: number
): number {
  const taxableIncome = Math.max(0, totalIncomeThisYear - pa);
  const roomInBasicBand = Math.max(
    0,
    HIGHER_THRESHOLD_TAXABLE - taxableIncome - gainsRealizedSoFar
  );
  return roomInBasicBand > 0 ? CGT_BASIC : CGT_HIGHER;
}

export interface ContributionPlan {
  isaAnnual: number;
  isaYears: number;
  giaAnnual: number;
  giaYears: number;
  sippAnnual: number;
  sippYears: number;
}

export interface StartingBalances {
  isa0: number;
  gia0: number;
  sipp0: number;
}

export function accumulate(
  start: StartingBalances,
  plan: ContributionPlan,
  nYears: number
): { isa: number; gia: number; giaBasis: number; sipp: number } {
  let isa = start.isa0;
  let gia = start.gia0;
  let giaBasis = start.gia0;
  let sipp = start.sipp0;
  for (let y = 0; y < nYears; y++) {
    const isaC = y < plan.isaYears ? plan.isaAnnual : 0;
    const giaC = y < plan.giaYears ? plan.giaAnnual : 0;
    const sippC = y < plan.sippYears ? plan.sippAnnual : 0;
    isa = (isa + isaC) * (1 + G);
    gia = (gia + giaC) * (1 + G);
    giaBasis += giaC;
    sipp = (sipp + sippC) * (1 + G);
  }
  return { isa, gia, giaBasis, sipp };
}

export interface AccumulationYear {
  year: number;
  age: number;
  isaGia: number;
  sipp: number;
}

// Year-by-year accumulation balances (end of each contribution year), for
// visualizing the Coast FIRE build-up phase. Mirrors accumulate()'s math
// exactly, so the final value here equals accumulate()'s returned totals.
export function accumulateYearly(
  start: StartingBalances,
  plan: ContributionPlan,
  currentAge: number,
  baseYear: number,
  nYears: number
): AccumulationYear[] {
  let isa = start.isa0;
  let gia = start.gia0;
  let sipp = start.sipp0;
  const rows: AccumulationYear[] = [];
  for (let y = 0; y < nYears; y++) {
    const isaC = y < plan.isaYears ? plan.isaAnnual : 0;
    const giaC = y < plan.giaYears ? plan.giaAnnual : 0;
    const sippC = y < plan.sippYears ? plan.sippAnnual : 0;
    isa = (isa + isaC) * (1 + G);
    gia = (gia + giaC) * (1 + G);
    sipp = (sipp + sippC) * (1 + G);
    rows.push({ year: baseYear + y, age: currentAge + y, isaGia: isa + gia, sipp });
  }
  return rows;
}

export function simulateDrawdown(
  isa0: number,
  gia0: number,
  giaBasis0: number,
  sipp0: number,
  startAge: number,
  endAge: number,
  targetSpend: number,
  sippAccessAge: number,
  statePensionAge: number,
  statePension: number,
  step = 50,
  liquidReserve = 0
): DrawdownRow[] {
  let isa = isa0;
  let gia = gia0;
  let giaBasis = giaBasis0;
  let sipp = sipp0;
  const rows: DrawdownRow[] = [];

  for (let age = startAge; age <= endAge; age++) {
    const stateIncome = age >= statePensionAge ? statePension : 0;
    let totalIncome = stateIncome;
    let cgtAllowanceLeft = CGT_ALLOWANCE;
    let gainsRealized = 0;
    let netReceived = stateIncome;
    let wIsa = 0;
    let wGia = 0;
    let wSipp = 0;
    let taxPaid = 0;
    let cgtPaid = 0;

    let remainingNeed = targetSpend - netReceived;
    let guard = 0;
    while (remainingNeed > 0.5 && guard < 100000) {
      guard++;
      const pa = personalAllowance(totalIncome);
      // Combined ISA+GIA headroom above the "keep accessible for hard times"
      // reserve — SIPP isn't subject to this floor since it's locked/illiquid
      // anyway (and untouchable at all before sippAccessAge).
      const liquidHeadroom = Math.max(0, isa + gia - liquidReserve);
      const options: { rate: number; src: "isa" | "sipp" | "gia" }[] = [];
      if (isa > 0 && liquidHeadroom > 0) options.push({ rate: 1, src: "isa" });
      if (sipp > 0 && age >= sippAccessAge) {
        const m = marginalIncomeTaxRate(totalIncome, pa);
        options.push({ rate: 1 - 0.75 * m, src: "sipp" });
      }
      if (gia > 0 && liquidHeadroom > 0) {
        const gainFrac = gia > 0 ? Math.max(0, (gia - giaBasis) / gia) : 0;
        const c =
          cgtAllowanceLeft <= 0
            ? marginalCgtRate(totalIncome, pa, gainsRealized)
            : 0;
        options.push({ rate: 1 - gainFrac * c, src: "gia" });
      }
      if (options.length === 0) break;

      const pref = { sipp: 2, gia: 1, isa: 0 };
      options.sort((a, b) => b.rate - a.rate || pref[b.src] - pref[a.src]);
      const { rate: bestRate, src } = options[0];
      let inc = Math.min(step, remainingNeed / Math.max(bestRate, 0.01));
      let net: number;

      if (src === "isa") {
        inc = Math.min(inc, isa, liquidHeadroom);
        isa -= inc;
        net = inc;
        wIsa += inc;
      } else if (src === "sipp") {
        inc = Math.min(inc, sipp);
        const m = marginalIncomeTaxRate(totalIncome, pa);
        const taxablePart = inc * 0.75;
        const tax = taxablePart * m;
        net = inc - tax;
        sipp -= inc;
        totalIncome += taxablePart;
        taxPaid += tax;
        wSipp += inc;
      } else {
        inc = Math.min(inc, gia, liquidHeadroom);
        const gainFrac = gia > 0 ? Math.max(0, (gia - giaBasis) / gia) : 0;
        const gainAmt = inc * gainFrac;
        const taxableGain = Math.max(0, gainAmt - cgtAllowanceLeft);
        cgtAllowanceLeft = Math.max(0, cgtAllowanceLeft - gainAmt);
        const c = marginalCgtRate(totalIncome, pa, gainsRealized);
        const tax = taxableGain * c;
        net = inc - tax;
        giaBasis -= inc * (1 - gainFrac);
        gia -= inc;
        gainsRealized += gainAmt;
        cgtPaid += tax;
        wGia += inc;
      }

      netReceived += net;
      remainingNeed = targetSpend - netReceived;
    }

    rows.push({
      age,
      isaStart: isa + wIsa,
      giaStart: gia + wGia,
      sippStart: sipp + wSipp,
      withdrawnIsa: wIsa,
      withdrawnGia: wGia,
      withdrawnSipp: wSipp,
      incomeTax: taxPaid,
      cgt: cgtPaid,
      netReceived,
      isaEnd: isa,
      giaEnd: gia,
      sippEnd: sipp,
    });

    isa *= 1 + G;
    gia *= 1 + G;
    sipp *= 1 + G;
  }

  return rows;
}

export function runScenario(
  start: StartingBalances,
  plan: ContributionPlan,
  currentAge: number,
  targetRetirementAge: number,
  sippAccessAge: number,
  lifeExpectancy: number,
  targetSpend: number,
  statePensionAge: number,
  statePension: number,
  liquidReserve = 0
): DrawdownRow[] {
  const nYears = targetRetirementAge - currentAge;
  const { isa, gia, giaBasis, sipp } = accumulate(start, plan, nYears);
  return simulateDrawdown(
    isa,
    gia,
    giaBasis,
    sipp,
    targetRetirementAge,
    lifeExpectancy,
    targetSpend,
    sippAccessAge,
    statePensionAge,
    statePension,
    50,
    liquidReserve
  );
}
