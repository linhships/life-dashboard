// Shared color theme for icon badges across KPI cards, section headers,
// and account-type indicators — kept in sync with the chart palette
// (ISA blue, GIA purple, SIPP emerald, Savings amber) so the same account
// type always reads the same color everywhere in the dashboard.

export type ThemeColor = "blue" | "purple" | "emerald" | "amber" | "rose" | "slate";

export const CHART_HEX: Record<string, string> = {
  ISA: "#2563eb",
  GIA: "#7c3aed",
  SIPP: "#059669",
  Savings: "#d97706",
};

export const ICON_BADGE: Record<ThemeColor, string> = {
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
};

export const PILL: Record<"positive" | "negative" | "neutral", string> = {
  positive: "bg-emerald-50 text-emerald-700",
  negative: "bg-rose-50 text-rose-700",
  neutral: "bg-slate-100 text-slate-600",
};
