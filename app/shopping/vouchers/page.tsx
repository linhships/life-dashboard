import { Ticket } from "lucide-react";

import { VouchersList } from "@/components/VouchersList";
import { getVouchers, isVouchersConfigured } from "@/lib/vouchers";

export const dynamic = "force-dynamic";

// Discount codes collected from emails into VOUCHERS_DIR/vouchers.md. This
// page only displays them — nothing here writes to that file.
export default function VouchersPage() {
  const configured = isVouchersConfigured();
  const vouchers = configured ? getVouchers() : [];

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Ticket className="h-4 w-4" />
          <span>
            {vouchers.length} {vouchers.length === 1 ? "code" : "codes"}
          </span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">Vouchers</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Discount codes and what they apply to, soonest to expire first. Tap a code to copy
          it.
        </p>
      </header>

      {!configured ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Voucher folder not set</p>
          <p className="mt-1.5">
            Set <code className="rounded bg-white/70 px-1 py-0.5 text-xs">VOUCHERS_DIR</code> in{" "}
            <code className="rounded bg-white/70 px-1 py-0.5 text-xs">.env.local</code> to the
            folder holding vouchers.md, then restart the server.
          </p>
        </section>
      ) : (
        <VouchersList vouchers={vouchers} />
      )}
    </main>
  );
}
