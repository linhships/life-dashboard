"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// The "not this week" switch. Flipping it writes the week into
// Skipped_Weeks.md, which both greys this page out and tells the weekly
// planning task not to log the week or add it to any dish's Times Eaten.
export function SkipWeekSwitch({
  weekStart,
  skipped,
}: {
  weekStart: string;
  skipped: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Mirrors the switch locally so it moves on the tap rather than after the
  // round-trip; the server's answer is what the refresh then confirms.
  const [optimistic, setOptimistic] = useState(skipped);
  const [error, setError] = useState<string | null>(null);

  const on = pending ? optimistic : skipped;

  async function toggle() {
    const next = !on;
    setOptimistic(next);
    setError(null);
    try {
      const res = await fetch("/api/meals/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, skipped: next }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      startTransition(() => router.refresh());
    } catch {
      // Put the switch back rather than leaving it showing a state the
      // file doesn't have.
      setOptimistic(!next);
      setError("Couldn't save that — the plan folder may not be writable.");
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">Not planning this week</p>
        <p className="mt-0.5 text-sm text-slate-500">
          Greys out the plan and keeps the week out of the eaten tracking.
        </p>
        {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Not planning this week"
        onClick={toggle}
        className={`press-scale relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          on ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
            on ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
