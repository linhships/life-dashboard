// The parts of the voucher feature that BOTH sides need.
//
// lib/vouchers.ts reads the markdown off disk, so it imports fs and can
// only ever run on the server. components/VouchersList.tsx is a client
// component (it copies a code to the clipboard), and importing the shape
// and the date maths from there dragged fs into the browser bundle —
// "Module not found: Can't resolve 'fs'", a build error tsc cannot see
// because it is a bundling constraint, not a type one. Keeping the pure
// pieces here means one definition serves both instead of the client
// carrying its own copy to drift out of step.

export interface Voucher {
  id: string;
  site: string;
  code: string;
  expiryRaw: string;
  // ISO yyyy-mm-dd when a date could be read out of expiryRaw, else null.
  expiry: string | null;
  // The source hedged the date ("~02/11/2026"), so the countdown is an
  // estimate and the UI should not state it as fact.
  approximate: boolean;
  notes: string;
}

// Whole days from today to the expiry date, or null when undated. Negative
// means it has already passed. Compared date-to-date rather than by
// subtracting timestamps, so a voucher expiring later today reads as 0 days
// left rather than -1 because of the hour.
export function daysUntil(expiry: string | null, now = new Date()): number | null {
  if (!expiry) return null;
  const [y, m, d] = expiry.split("-").map(Number);
  const end = Date.UTC(y, m - 1, d);
  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end - start) / 86400000);
}
