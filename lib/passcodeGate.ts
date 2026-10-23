import crypto from "crypto";
import type { NextRequest } from "next/server";

// Generic factory behind every passcode-gated section of this app (Links,
// Finance, ...). Each section gets its own cookie + env var, but shares
// this same sliding-session mechanism — see lib/resourcesAuth.ts and
// lib/financeAuth.ts for the concrete instances.
//
// If the section's env var isn't set at all, the gate is disabled (page
// stays unlocked) rather than blocking access — this keeps local dev
// against sample data working with zero setup, and is documented in
// .env.example.
export interface PasscodeGate {
  cookieName: string;
  maxAgeSeconds: number;
  isGateEnabled(): boolean;
  isAuthed(cookieValue: string | undefined): boolean;
  isAuthedRequest(request: NextRequest): boolean;
  verifyPasscode(candidate: string): boolean;
  issueToken(): string;
}

export function createPasscodeGate(opts: {
  cookieName: string;
  // One env var, or several as a fallback chain: the first one that is set
  // wins. The chain exists so a section can be moved onto a new, shared
  // passcode variable without breaking an .env.local that still only has
  // the old per-page ones — see lib/kidsPhotosAuth.ts.
  envVar: string | string[];
  salt: string;
  maxAgeSeconds?: number;
}): PasscodeGate {
  const maxAgeSeconds = opts.maxAgeSeconds ?? 10 * 60;
  const envVars = Array.isArray(opts.envVar) ? opts.envVar : [opts.envVar];

  // The single source of truth for "which passcode is this gate using?".
  // Every other function below goes through it, so verifying, hashing and
  // the enabled check can never disagree about which variable won.
  function resolvePasscode(): string | null {
    for (const name of envVars) {
      const value = process.env[name];
      if (value) return value;
    }
    return null;
  }

  function expectedToken(): string | null {
    const passcode = resolvePasscode();
    if (!passcode) return null;
    return crypto.createHash("sha256").update(`${opts.salt}:${passcode}`).digest("hex");
  }

  function isGateEnabled(): boolean {
    return resolvePasscode() !== null;
  }

  function isAuthed(cookieValue: string | undefined): boolean {
    const expected = expectedToken();
    if (!expected) return true; // gate disabled
    return cookieValue === expected;
  }

  function isAuthedRequest(request: NextRequest): boolean {
    return isAuthed(request.cookies.get(opts.cookieName)?.value);
  }

  function verifyPasscode(candidate: string): boolean {
    const passcode = resolvePasscode();
    if (!passcode) return false;
    return candidate === passcode;
  }

  function issueToken(): string {
    const token = expectedToken();
    if (!token) throw new Error(`${envVars.join(" / ")} is not configured`);
    return token;
  }

  return {
    cookieName: opts.cookieName,
    maxAgeSeconds,
    isGateEnabled,
    isAuthed,
    isAuthedRequest,
    verifyPasscode,
    issueToken,
  };
}
