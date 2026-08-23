"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

// Shared passcode-entry UI, reused across every gated section (Links,
// Finance, ...). Used two ways:
//  - at the page level, when the server never fetched the section's data
//    at all (onUnlocked triggers a router.refresh() to re-fetch now that
//    the cookie is set) — see PasscodePageGate
//  - inline by PasscodeAuthGuard, to re-lock an already-loaded page in
//    place after the session's inactivity window lapses (onUnlocked just
//    flips local state back to authed)
export function PasscodeLockScreen({
  authEndpoint,
  label = "This page",
  onUnlocked,
}: {
  authEndpoint: string;
  label?: string;
  onUnlocked: () => void;
}) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!passcode || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(authEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        setError("Incorrect passcode.");
        return;
      }
      setPasscode("");
      onUnlocked();
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-24 max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Lock className="h-5 w-5 text-slate-400" />
      </div>
      <h1 className="mt-3 text-base font-semibold text-slate-900">{label} is locked</h1>
      <p className="mt-1 text-sm text-slate-500">Enter the passcode to continue.</p>
      <input
        type="password"
        inputMode="numeric"
        autoFocus
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Passcode"
        className="mt-4 w-full rounded-md border border-slate-200 px-3 py-2 text-center text-sm tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-300"
      />
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={submitting || !passcode}
        className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Checking…" : "Unlock"}
      </button>
    </div>
  );
}
