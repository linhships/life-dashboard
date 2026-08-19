import { gbp, pct } from "@/lib/format";
import type { ChildSummary } from "@/lib/aggregate";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
];

export function KidsAccounts({ kids }: { kids: ChildSummary[] }) {
  if (kids.length === 0) {
    return <p className="text-sm text-slate-400">No junior account data yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {kids.map((kid, i) => {
        const gain = kid.total - kid.originalInvestment;
        const gainPct =
          kid.originalInvestment > 0 ? (gain / kid.originalInvestment) * 100 : 0;
        const isaPct = kid.total > 0 ? (kid.juniorIsa / kid.total) * 100 : 0;
        const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
        const positive = gain >= 0;

        return (
          <div
            key={kid.name}
            className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor}`}
                >
                  {kid.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{kid.name}</p>
                  <p className="text-xl font-semibold text-slate-900">{gbp(kid.total)}</p>
                </div>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                }`}
              >
                {positive ? "+" : ""}
                {pct(gainPct)}
              </span>
            </div>

            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-blue-600" style={{ width: `${isaPct}%` }} />
              <div className="h-full bg-emerald-600" style={{ width: `${100 - isaPct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                ISA {gbp(kid.juniorIsa)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                SIPP {gbp(kid.juniorSipp)}
              </span>
            </div>

            <p
              className={`mt-2 text-xs font-medium ${
                positive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {positive ? "+" : ""}
              {gbp(gain)} vs. contributed
            </p>
          </div>
        );
      })}
    </div>
  );
}
