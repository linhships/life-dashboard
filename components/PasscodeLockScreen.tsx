"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

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
  const [revealed, setRevealed] = useState(false);

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
      <div className="relative mt-4">
        <input
          type={revealed ? "text" : "password"}
          inputMode="numeric"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Passcode"
          className="w-full rounded-md border border-slate-200 px-3 py-2 pr-10 text-center text-sm tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          title={revealed ? "Hide passcode" : "Show passcode"}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:text-slate-600"
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
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
