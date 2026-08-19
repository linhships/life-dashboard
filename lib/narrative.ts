// Turns a DrawdownRow[] into a plain-English, phase-by-phase walkthrough of
// the mechanics — which account money comes from, when tax starts showing
// up, when state pension kicks in, and when growth outpaces withdrawals.
// Pure function of the simulation output, so it stays in sync automatically
// whenever the interactive plan/spend/reserve inputs change.

import { gbp } from "./format";
import type { DrawdownRow } from "./types";

export interface NarrativePhase {
  startAge: number;
  heading: string;
  body: string;
}

function firstAgeWhere(
  rows: DrawdownRow[],
  pred: (r: DrawdownRow) => boolean
): number | undefined {
  return rows.find(pred)?.age;
}

function avg(rows: DrawdownRow[], f: (r: DrawdownRow) => number): number {
  if (rows.length === 0) return 0;
  return rows.reduce((s, r) => s + f(r), 0) / rows.length;
}

function slice(rows: DrawdownRow[], fromAge: number, toAgeExclusive: number): DrawdownRow[] {
  return rows.filter((r) => r.age >= fromAge && r.age < toAgeExclusive);
}

// Describes how close actual income (avgNet) came to the target spend,
// honestly — instead of always assuming the target was met.
function fundingClause(avgNet: number, targetSpend: number): string {
  if (targetSpend <= 0) return `netting ${gbp(avgNet)}`;
  const pct = avgNet / targetSpend;
  if (pct >= 0.98) return `netting close to ${gbp(targetSpend)}`;
  if (pct <= 0.05)
    return `netting almost nothing (~${gbp(avgNet)}/yr) — nowhere near the ${gbp(
      targetSpend
    )} target`;
  return `netting only ~${gbp(avgNet)}/yr of the ${gbp(targetSpend)} target — a real shortfall`;
}

export function buildDrawdownNarrative(
  rows: DrawdownRow[],
  sippAccessAge: number,
  statePensionAge: number,
  statePension: number,
  targetSpend: number,
  liquidReserve: number
): NarrativePhase[] {
  if (rows.length === 0) return [];

  const lastAge = rows[rows.length - 1].age;
  const phases: NarrativePhase[] = [];

  // Key transition ages, detected from the data rather than assumed.
  const ageIsaDry = firstAgeWhere(rows, (r) => r.isaEnd <= 0.5);
  const ageGiaDry = firstAgeWhere(rows, (r) => r.giaEnd <= 0.5);

  // --- Phase 1: SIPP locked -------------------------------------------------
  // Capped at the earlier of sippAccessAge / ISA running dry, so this phase's
  // "steady ISA+GIA funding" description never overlaps a later phase that
  // already covers what happens once ISA is exhausted.
  const phase1End = Math.min(sippAccessAge, ageIsaDry ?? sippAccessAge);
  const lockedRows = slice(rows, rows[0].age, Math.max(phase1End, rows[0].age + 1));
  if (lockedRows.length > 0 && rows[0].age < sippAccessAge && phase1End > rows[0].age) {
    const first = lockedRows[0];
    const last = lockedRows[lockedRows.length - 1];
    const totalTax = lockedRows.reduce((s, r) => s + r.incomeTax + r.cgt, 0);
    const avgNet = avg(lockedRows, (r) => r.netReceived);
    const nextIsa = lockedRows[1]?.isaStart ?? first.isaEnd;
    const reserveNote =
      liquidReserve > 0
        ? ` (kept above your ${gbp(liquidReserve)} emergency buffer)`
        : "";
    phases.push({
      startAge: first.age,
      heading: `Age ${first.age}–${last.age}: retired, but SIPP is locked (can't touch it until ${sippAccessAge})`,
      body: `Every year you need ${gbp(
        targetSpend
      )}, ${fundingClause(avgNet, targetSpend)}${reserveNote} — total tax across these years is only ${gbp(
        totalTax
      )}. Example, age ${first.age}→${first.age + 1}: ISA goes from ${gbp(
        first.isaStart
      )} to ${gbp(nextIsa)} (withdrew ~${gbp(first.withdrawnIsa)}), GIA from ${gbp(
        first.giaStart
      )} to ${gbp(first.giaEnd)} (withdrew ~${gbp(
        first.withdrawnGia
      )}). SIPP just sits there compounding, untouched, growing from ${gbp(
        first.sippStart
      )} to ${gbp(last.sippEnd)}.`,
    });
  }

  // --- Phase 2: SIPP unlocked, before ISA runs dry and before state pension -
  const phase2End = Math.min(ageIsaDry ?? lastAge + 1, statePensionAge);
  const modestRows = slice(rows, Math.max(sippAccessAge, rows[0].age), phase2End);
  if (modestRows.length > 0) {
    const first = modestRows[0];
    const last = modestRows[modestRows.length - 1];
    const avgSippW = avg(modestRows, (r) => r.withdrawnSipp);
    const avgNet = avg(modestRows, (r) => r.netReceived);
    const totalTax = modestRows.reduce((s, r) => s + r.incomeTax + r.cgt, 0);
    phases.push({
      startAge: first.age,
      heading: `Age ${first.age}–${last.age}: SIPP unlocks, but you're not drawing much from it yet`,
      body: `SIPP becomes available, but with no state pension income yet you have your full Personal Allowance free each year. A modest ~${gbp(
        avgSippW
      )}/yr comes from SIPP — 25% of it tax-free, the rest fitting inside your allowance — while the remainder comes from ISA/GIA, ${fundingClause(
        avgNet,
        targetSpend
      )}. Tax stays low across this stretch (${gbp(totalTax)} total).`,
    });
  }

  // --- Phase 3: ISA has run dry, GIA works harder, real tax appears --------
  if (ageIsaDry !== undefined && ageIsaDry <= lastAge) {
    const phase3End = Math.min(
      ageGiaDry !== undefined ? ageGiaDry + 2 : lastAge + 1,
      statePensionAge
    );
    const dryRows = slice(rows, ageIsaDry, Math.max(phase3End, ageIsaDry + 1));
    if (dryRows.length > 0) {
      const first = dryRows[0];
      const last = dryRows[dryRows.length - 1];
      const giaDryText =
        ageGiaDry !== undefined && ageGiaDry <= lastAge
          ? ` GIA itself runs dry around age ${ageGiaDry}.`
          : "";
      phases.push({
        startAge: first.age,
        heading: `Age ${first.age}–${last.age}: ISA runs dry, GIA has to work harder, tax starts appearing`,
        body: `ISA hits £0 at age ${ageIsaDry}. From here GIA has to cover more of the gap than the CGT-free allowance permits, so real tax shows up: ${gbp(
          first.incomeTax + first.cgt
        )} at ${first.age}, ${
          last.age !== first.age
            ? `${last.incomeTax + last.cgt >= first.incomeTax + first.cgt ? "rising" : "falling"} to ${gbp(
                last.incomeTax + last.cgt
              )} by ${last.age}.`
            : "."
        }${giaDryText}`,
      });
    }
  }

  // --- Phase 4: state pension begins ----------------------------------------
  // Only shown if the transition actually happens partway through the
  // simulated horizon (not if state pension was already flowing from day one).
  if (
    statePensionAge > rows[0].age &&
    statePensionAge <= lastAge &&
    rows.some((r) => r.age === statePensionAge)
  ) {
    phases.push({
      startAge: statePensionAge,
      heading: `Age ${statePensionAge} onward: state pension kicks in (${gbp(statePension)}/yr)`,
      body: `That covers a chunk of the ${gbp(
        targetSpend
      )} automatically, reducing how much has to come from SIPP (and GIA, if any is left).`,
    });
  }

  // --- Phase 5: steady state — SIPP (+ state pension) is the only source ---
  const steadyStart = Math.max(
    statePensionAge,
    ageGiaDry ?? rows[0].age,
    ageIsaDry ?? rows[0].age
  );
  const steadyRows = rows.filter((r) => r.age >= steadyStart);
  if (steadyRows.length > 1) {
    const first = steadyRows[0];
    const mid = steadyRows[Math.floor(steadyRows.length / 2)];
    const last = steadyRows[steadyRows.length - 1];
    const avgSippW = avg(steadyRows, (r) => r.withdrawnSipp);
    const avgTax = avg(steadyRows, (r) => r.incomeTax + r.cgt);
    const avgNet = avg(steadyRows, (r) => r.netReceived);
    const growing = last.sippEnd > first.sippStart && avgNet / Math.max(targetSpend, 1) >= 0.98;
    phases.push({
      startAge: first.age,
      heading: `Age ${first.age}–${last.age}: SIPP (plus state pension) is now the only source${
        growing ? ", and it just keeps growing" : ""
      }`,
      body: `From ${first.age} on, most years look similar: state pension (${gbp(
        statePension
      )}) plus a SIPP withdrawal of ~${gbp(avgSippW)} gross, taxed ~${gbp(
        avgTax
      )}, ${fundingClause(avgNet, targetSpend)}. ${
        growing
          ? `Because the SIPP balance is large by this point, growth outpaces what you're withdrawing — the balance keeps climbing: ${gbp(
              first.sippEnd
            )} at ${first.age}, ${gbp(mid.sippEnd)} at ${mid.age}, ${gbp(
              last.sippEnd
            )} by ${last.age}.`
          : `The balance moves from ${gbp(first.sippEnd)} at ${first.age} to ${gbp(
              last.sippEnd
            )} by ${last.age}.`
      }`,
    });
  }

  return phases.sort((a, b) => a.startAge - b.startAge);
}
