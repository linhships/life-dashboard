import { gbp } from "@/lib/format";

interface PlanItem {
  label: string;
  annualAmount: number;
  years: number;
  color: string;
}

export function ContributionPlanSummary({
  isa,
  gia,
  sipp,
}: {
  isa: { annualAmount: number; years: number };
  gia: { annualAmount: number; years: number };
  sipp: { annualAmount: number; years: number };
}) {
  const items: PlanItem[] = [
    { label: "ISA", ...isa, color: "#2563eb" },
    { label: "GIA", ...gia, color: "#7c3aed" },
    { label: "SIPP", ...sipp, color: "#059669" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
          </div>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {gbp(item.annualAmount)}
            <span className="text-sm font-normal text-slate-500">/yr</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {item.years > 0
              ? `for ${item.years} more year${item.years === 1 ? "" : "s"} — ${gbp(
                  item.annualAmount * item.years
                )} total`
              : "no further contributions planned"}
          </p>
        </div>
      ))}
    </div>
  );
}
