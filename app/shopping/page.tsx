import Link from "next/link";
import { ShoppingBag, Ticket } from "lucide-react";

import { getVouchers, isVouchersConfigured } from "@/lib/vouchers";

export const dynamic = "force-dynamic";

export default function ShoppingPage() {
  const count = isVouchersConfigured() ? getVouchers().length : 0;

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <ShoppingBag className="h-4 w-4" />
          <span>Shopping</span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">Shopping</h1>
        <p className="mt-2 text-sm text-slate-500">
          Things worth having to hand before buying something.
        </p>
      </header>

      <section>
        <Link
          href="/shopping/vouchers"
          className="pressable flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
        >
          <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>
            <span className="block text-sm font-semibold text-slate-900">Vouchers</span>
            <span className="mt-0.5 block text-sm text-slate-500">
              {count > 0
                ? `${count} discount ${count === 1 ? "code" : "codes"}, soonest to expire first.`
                : "Discount codes and what they apply to."}
            </span>
          </span>
        </Link>
      </section>
    </main>
  );
}
