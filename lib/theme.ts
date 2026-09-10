// Shared color theme for icon badges across KPI cards, section headers,
// and account-type indicators. CHART_HEX is the recharts palette (SVG
// attributes can't read CSS variables, so these are literal hex values
// chosen to sit with the default theme in app/globals.css): ISA forest
// green (the theme's primary), GIA plum, SIPP ochre, Savings terracotta —
// four warm, clearly distinct hues for stacked areas/bars. The chart
// components all hardcode the same four values inline.

export type ThemeColor = "blue" | "purple" | "emerald" | "amber" | "rose" | "slate";

export const CHART_HEX: Record<string, string> = {
  ISA: "#2f6b4f",
  GIA: "#7e6aa8",
  SIPP: "#c1843a",
  Savings: "#c4614a",
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
