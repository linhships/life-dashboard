import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { ICON_BADGE, PILL, type ThemeColor } from "@/lib/theme";

export function KpiCard({
  label,
  value,
  subtext,
  tone = "neutral",
  tooltip,
  icon: Icon,
  iconColor = "slate",
  badge,
}: {
  label: string;
  value: string;
  subtext?: string;
  tone?: "neutral" | "positive" | "negative";
  tooltip?: string;
  icon?: LucideIcon;
  iconColor?: ThemeColor;
  badge?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
      ? "text-rose-600"
      : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        {Icon && (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${ICON_BADGE[iconColor]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
        {badge && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              PILL[tone]
            }`}
          >
            {tone === "positive" && <ArrowUpRight className="h-3 w-3" />}
            {tone === "negative" && <ArrowDownRight className="h-3 w-3" />}
            {badge}
          </span>
        )}
      </div>

      <div className={`flex items-center gap-1.5 ${Icon ? "mt-4" : ""}`}>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {tooltip && (
          <span className="group relative inline-flex">
            <span
              tabIndex={0}
              aria-label={tooltip}
              className="flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold leading-none text-slate-500 outline-none focus:ring-2 focus:ring-slate-300"
            >
              ?
            </span>
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full left-1/2 z-10 mt-2 w-64 -translate-x-1/2 rounded-md bg-slate-800 px-3 py-2 text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              {tooltip}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800" />
            </span>
          </span>
        )}
      </div>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {subtext && <p className="mt-1 text-xs text-slate-400">{subtext}</p>}
    </div>
  );
}

export function SectionCard({
  id,
  title,
  description,
  icon: Icon,
  iconColor = "slate",
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: ThemeColor;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ICON_BADGE[iconColor]}`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>
      {description && (
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}
