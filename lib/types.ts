export interface AccountRow {
  date: string;
  beneficiary: string;
  accountType: string;
  bucket: string;
  value: number;
  originalInvestment: number;
  gainLoss: number;
  gainLossPct: number;
}

export interface PensionAllowanceRow {
  taxYear: string;
  adjustedIncome: number | null;
  allowanceLimit: number | null;
  finalAllowance: number;
  contributions: number;
  carryForwardRemainder: number;
}

export interface IncomeRow {
  company: string;
  year: number;
  month: number;
  taxablePay: number;
  pensionEmployee: number;
  giaEmployee: number | null;
  pensionEmployer: number;
  giaEmployer: number | null;
  netPay: number;
  ni: number;
  overallBankPayment: number;
}

export interface AssumptionItem {
  section: string;
  label: string;
  value: string | number | null;
  note: string | null;
}

export interface ProjectionRow {
  year: number;
  age: number;
  isaStart: number;
  isaContrib: number;
  isaEnd: number;
  giaStart: number;
  giaContrib: number;
  giaEnd: number;
  sippStart: number;
  sippContrib: number;
  sippEnd: number;
}

export interface BridgeRow {
  year: number;
  age: number;
  isaGiaStart: number;
  spending: number;
  isaGiaEnd: number;
  sippStart: number;
  sippEnd: number;
}

export interface SummaryItem {
  label: string;
  value: string | number;
  note: string | null;
}

export interface RetirementModel {
  assumptions: AssumptionItem[];
  projection: ProjectionRow[];
  bridge: BridgeRow[];
  summary: SummaryItem[];
}

export interface DrawdownRow {
  age: number;
  isaStart: number;
  giaStart: number;
  sippStart: number;
  withdrawnIsa: number;
  withdrawnGia: number;
  withdrawnSipp: number;
  incomeTax: number;
  cgt: number;
  netReceived: number;
  isaEnd: number;
  giaEnd: number;
  sippEnd: number;
}
