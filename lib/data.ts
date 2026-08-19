import fs from "fs";
import path from "path";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import type {
  AccountRow,
  PensionAllowanceRow,
  IncomeRow,
  RetirementModel,
  AssumptionItem,
  ProjectionRow,
  BridgeRow,
  SummaryItem,
  DrawdownRow,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function readCsv<T extends Record<string, string>>(filename: string): T[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
  const { data } = Papa.parse<T>(raw, { header: true, skipEmptyLines: true });
  return data;
}

function num(v: string | undefined | null): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function numOrNull(v: string | undefined | null): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export function getAccounts(): AccountRow[] {
  const rows = readCsv<Record<string, string>>("accounts_snapshot.csv");
  return rows.map((r) => ({
    date: r.date,
    beneficiary: r.beneficiary,
    accountType: r.account_type,
    bucket: r.bucket,
    value: num(r.value_gbp),
    originalInvestment: num(r.original_investment_gbp),
    gainLoss: num(r.gain_loss_gbp),
    gainLossPct: num(r.gain_loss_pct),
  }));
}

export function getDrawdown(): DrawdownRow[] {
  const rows = readCsv<Record<string, string>>("drawdown_baseline.csv");
  return rows.map((r) => ({
    age: num(r.age),
    isaStart: num(r.isa_start),
    giaStart: num(r.gia_start),
    sippStart: num(r.sipp_start),
    withdrawnIsa: num(r.w_isa),
    withdrawnGia: num(r.w_gia),
    withdrawnSipp: num(r.w_sipp),
    incomeTax: num(r.income_tax),
    cgt: num(r.cgt),
    netReceived: num(r.net_received),
    isaEnd: num(r.isa_end),
    giaEnd: num(r.gia_end),
    sippEnd: num(r.sipp_end),
  }));
}

export function getPensionAllowance(): PensionAllowanceRow[] {
  const rows = readCsv<Record<string, string>>("pension_allowance.csv");
  return rows.map((r) => ({
    taxYear: r.tax_year,
    adjustedIncome: numOrNull(r.adjusted_income_gbp),
    allowanceLimit: numOrNull(r.allowance_limit_gbp),
    finalAllowance: num(r.final_allowance_gbp),
    contributions: num(r.contributions_gbp),
    carryForwardRemainder: num(r.carry_forward_remainder_gbp),
  }));
}

export function getIncome(): IncomeRow[] {
  const rows = readCsv<Record<string, string>>("income_monthly.csv");
  return rows.map((r) => ({
    company: r.company,
    year: num(r.year),
    month: num(r.month),
    taxablePay: num(r.taxable_pay_gbp),
    pensionEmployee: num(r.pension_employee_gbp),
    giaEmployee: numOrNull(r.gia_employee_gbp),
    pensionEmployer: num(r.pension_employer_gbp),
    giaEmployer: numOrNull(r.gia_employer_gbp),
    netPay: num(r.net_pay_gbp),
    ni: num(r.ni_gbp),
    overallBankPayment: num(r.overall_bank_payment_gbp),
  }));
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "result" in (v as object)) {
    return String((v as { result: unknown }).result ?? "");
  }
  if (typeof v === "object" && "richText" in (v as object)) {
    return (v as { richText: { text: string }[] }).richText
      .map((t) => t.text)
      .join("");
  }
  return String(v);
}

function cellNumber(cell: ExcelJS.Cell): number | null {
  const v = cell.value;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v !== null && "result" in (v as object)) {
    const r = (v as { result: unknown }).result;
    if (typeof r === "number") return r;
  }
  const t = cellText(cell).trim();
  if (t === "") return null;
  const n = Number(t.replace(/[£,]/g, ""));
  return Number.isNaN(n) ? null : n;
}

export async function getRetirementModel(): Promise<RetirementModel> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(DATA_DIR, "retirement_model.xlsx"));

  // --- Assumptions sheet: label/value/note rows, with section headers ---
  const assumptions: AssumptionItem[] = [];
  const assumptionsSheet = workbook.getWorksheet("Assumptions");
  let currentSection = "";
  if (assumptionsSheet) {
    assumptionsSheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return; // title + blank row
      const label = cellText(row.getCell(1)).trim();
      const valueCell = row.getCell(2);
      const valueText = cellText(valueCell).trim();
      const note = cellText(row.getCell(3)).trim();
      if (!label) return;
      if (!valueText) {
        // section header row
        currentSection = label;
        return;
      }
      const numeric = cellNumber(valueCell);
      assumptions.push({
        section: currentSection,
        label,
        value: numeric !== null ? numeric : valueText,
        note: note || null,
      });
    });
  }

  // --- Projection sheet ---
  const projection: ProjectionRow[] = [];
  const projectionSheet = workbook.getWorksheet("Projection");
  if (projectionSheet) {
    projectionSheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 3) return; // title, blank, header
      const year = cellNumber(row.getCell(1));
      if (year === null) return; // skip blank/trailer rows
      projection.push({
        year,
        age: cellNumber(row.getCell(2)) ?? 0,
        isaStart: cellNumber(row.getCell(3)) ?? 0,
        isaContrib: cellNumber(row.getCell(4)) ?? 0,
        isaEnd: cellNumber(row.getCell(5)) ?? 0,
        giaStart: cellNumber(row.getCell(6)) ?? 0,
        giaContrib: cellNumber(row.getCell(7)) ?? 0,
        giaEnd: cellNumber(row.getCell(8)) ?? 0,
        sippStart: cellNumber(row.getCell(9)) ?? 0,
        sippContrib: cellNumber(row.getCell(10)) ?? 0,
        sippEnd: cellNumber(row.getCell(11)) ?? 0,
      });
    });
  }

  // --- Bridge to 57 sheet ---
  const bridge: BridgeRow[] = [];
  const bridgeSheet = workbook.getWorksheet("Bridge to 57");
  if (bridgeSheet) {
    bridgeSheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 3) return;
      const year = cellNumber(row.getCell(1));
      if (year === null) return;
      bridge.push({
        year,
        age: cellNumber(row.getCell(2)) ?? 0,
        isaGiaStart: cellNumber(row.getCell(3)) ?? 0,
        spending: cellNumber(row.getCell(4)) ?? 0,
        isaGiaEnd: cellNumber(row.getCell(5)) ?? 0,
        sippStart: cellNumber(row.getCell(6)) ?? 0,
        sippEnd: cellNumber(row.getCell(7)) ?? 0,
      });
    });
  }

  // --- Summary sheet: label/value/note rows (numeric rows only) ---
  const summary: SummaryItem[] = [];
  const summarySheet = workbook.getWorksheet("Summary");
  if (summarySheet) {
    summarySheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return;
      const label = cellText(row.getCell(1)).trim();
      const valueCell = row.getCell(2);
      const note = cellText(row.getCell(3)).trim();
      if (!label || label === "Result" || label.startsWith("How to use")) return;
      if (/^\d+\.\s/.test(label)) return; // skip numbered instruction lines
      const numeric = cellNumber(valueCell);
      const text = cellText(valueCell).trim();
      if (numeric === null && !text) return;
      summary.push({
        label,
        value: numeric !== null ? numeric : text,
        note: note || null,
      });
    });
  }

  return { assumptions, projection, bridge, summary };
}
