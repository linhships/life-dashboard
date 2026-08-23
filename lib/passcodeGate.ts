import crypto from "crypto";
import type { NextRequest } from "next/server";

// Generic factory behind every passcode-gated section of this app (Links,
// Finance, ...). Each section gets its own cookie + env var, but shares
// this same sliding-session mechanism — see lib/linksAuth.ts and
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
  envVar: string;
  salt: string;
  maxAgeSeconds?: number;
}): PasscodeGate {
  const maxAgeSeconds = opts.maxAgeSeconds ?? 10 * 60;

  function expectedToken(): string | null {
    const passcode = process.env[opts.envVar];
    if (!passcode) return null;
    return crypto.createHash("sha256").update(`${opts.salt}:${passcode}`).digest("hex");
  }

  function isGateEnabled(): boolean {
    return Boolean(process.env[opts.envVar]);
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
    const passcode = process.env[opts.envVar];
    if (!passcode) return false;
    return candidate === passcode;
  }

  function issueToken(): string {
    const token = expectedToken();
    if (!token) throw new Error(`${opts.envVar} is not configured`);
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
