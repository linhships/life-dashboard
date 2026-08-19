import type { AccountRow } from "./types";

export interface NetWorthPoint {
  date: string;
  [bucket: string]: string | number;
}

const OWN_BUCKETS = ["ISA", "GIA", "SIPP", "Savings"];
const KID_BUCKETS = ["Junior ISA", "Junior SIPP"];

export function ownAccounts(accounts: AccountRow[]): AccountRow[] {
  return accounts.filter((a) => OWN_BUCKETS.includes(a.bucket));
}

export function kidAccounts(accounts: AccountRow[]): AccountRow[] {
  return accounts.filter((a) => KID_BUCKETS.includes(a.bucket));
}

export function netWorthTimeSeries(accounts: AccountRow[]): NetWorthPoint[] {
  const own = ownAccounts(accounts);
  const dates = Array.from(new Set(own.map((a) => a.date))).sort();
  return dates.map((date) => {
    const point: NetWorthPoint = { date };
    for (const bucket of OWN_BUCKETS) {
      point[bucket] = own
        .filter((a) => a.date === date && a.bucket === bucket)
        .reduce((sum, a) => sum + a.value, 0);
    }
    return point;
  });
}

export function latestDate(accounts: AccountRow[]): string {
  return accounts.reduce((max, a) => (a.date > max ? a.date : max), "");
}

export function latestNetWorth(accounts: AccountRow[]): number {
  const own = ownAccounts(accounts);
  const latest = latestDate(own);
  return own
    .filter((a) => a.date === latest)
    .reduce((sum, a) => sum + a.value, 0);
}

export interface ChildSummary {
  name: string;
  juniorIsa: number;
  juniorSipp: number;
  total: number;
  originalInvestment: number;
}

export function kidsSummary(accounts: AccountRow[]): ChildSummary[] {
  const kids = kidAccounts(accounts);
  const names = Array.from(new Set(kids.map((a) => a.beneficiary))).sort();
  return names.map((name) => {
    const latest = latestDate(kids.filter((a) => a.beneficiary === name));
    const rows = kids.filter((a) => a.beneficiary === name && a.date === latest);
    const juniorIsa = rows
      .filter((a) => a.bucket === "Junior ISA")
      .reduce((s, a) => s + a.value, 0);
    const juniorSipp = rows
      .filter((a) => a.bucket === "Junior SIPP")
      .reduce((s, a) => s + a.value, 0);
    const originalInvestment = rows.reduce((s, a) => s + a.originalInvestment, 0);
    return {
      name,
      juniorIsa,
      juniorSipp,
      total: juniorIsa + juniorSipp,
      originalInvestment,
    };
  });
}

export function last12Months<T extends { year: number; month: number }>(
  rows: T[]
): T[] {
  return [...rows]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .slice(-12);
}
