"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
// From voucherShared, NOT lib/vouchers: that module reads the filesystem.
import { daysUntil, type Voucher } from "@/lib/voucherShared";

// Copying the code is the whole point of this page, so it gets a button
// rather than asking you to select 14 characters by hand on a phone.
//
// navigator.clipboard only exists in a secure context, and this dashboard
// is normally reached over plain http on its Tailscale address — so the
// modern API is tried and the old execCommand path is the one that
// actually runs there. Both are guarded: if neither works the code is
// still selectable text.
async function copyText(text: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "0";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}

function expiryLabel(voucher: Voucher): { text: string; tone: string } {
  const days = daysUntil(voucher.expiry);
  if (days === null) return { text: voucher.expiryRaw || "No expiry given", tone: "text-slate-400" };
  const about = voucher.approximate ? "about " : "";
  if (days < 0) {
    const n = Math.abs(days);
    return { text: `Expired ${about}${n} ${n === 1 ? "day" : "days"} ago`, tone: "text-slate-400" };
  }
  if (days === 0) return { text: "Expires today", tone: "text-rose-600" };
  if (days <= 7)
    return { text: `${about}${days} ${days === 1 ? "day" : "days"} left`, tone: "text-rose-600" };
  if (days <= 30)
    return { text: `${about}${days} days left`, tone: "text-amber-700" };
  return { text: `${about}${days} days left`, tone: "text-slate-500" };
}

function VoucherCard({ voucher, expired }: { voucher: Voucher; expired: boolean }) {
  const [copied, setCopied] = useState(false);
  const expiry = expiryLabel(voucher);
  const host = voucher.site.replace(/^https?:\/\//, "").replace(/\/$/, "");

  async function onCopy() {
    if (await copyText(voucher.code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <article
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
        expired ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {host ? (
            <a
              href={`https://${host}`}
              target="_blank"
              rel="noreferrer noopener"
              className="pressable inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
            >
              {host}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : (
            <span className="text-sm font-semibold text-slate-700">Unknown site</span>
          )}
          <p className={`mt-0.5 text-xs font-medium ${expiry.tone}`}>{expiry.text}</p>
        </div>

        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy code ${voucher.code}`}
          className="pressable flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-sm font-semibold tracking-wide text-slate-900 hover:bg-slate-100"
        >
          <span className="select-all">{voucher.code}</span>
          {copied ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          )}
        </button>
      </div>

      {voucher.notes && <p className="mt-3 text-sm text-slate-600">{voucher.notes}</p>}

      {/* The raw expiry text is kept visible whenever it says more than the
          countdown does — a "(11pm)" cutoff or the note that the date was
          inferred from an email is exactly the detail you want before
          relying on it. */}
      {voucher.expiryRaw && (voucher.approximate || /\(|,/.test(voucher.expiryRaw)) && (
        <p className="mt-1.5 text-xs text-slate-400">Expiry as written: {voucher.expiryRaw}</p>
      )}
    </article>
  );
}

export function VouchersList({ vouchers }: { vouchers: Voucher[] }) {
  const live = vouchers.filter((v) => (daysUntil(v.expiry) ?? 0) >= 0);
  const expired = vouchers.filter((v) => (daysUntil(v.expiry) ?? 0) < 0);

  if (vouchers.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No voucher codes found. Check that VOUCHERS_DIR points at the folder holding
        vouchers.md.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        {live.map((v) => (
          <VoucherCard key={v.id} voucher={v} expired={false} />
        ))}
      </div>

      {expired.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500">
            Expired ({expired.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {expired.map((v) => (
              <VoucherCard key={v.id} voucher={v} expired />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
