import crypto from "crypto";
import type { NextRequest } from "next/server";

// Passcode gate for the /links page. If LINKS_PASSCODE isn't set at all,
// the page is left unlocked (so local dev against sample data doesn't
// require any setup) — this is documented in .env.example.
//
// The cookie is a *sliding* 10-minute session: every heartbeat from the
// client (see components/LinksAuthGuard.tsx) re-sets it with a fresh
// maxAge. If the tab goes inactive (no events) or the laptop sleeps/locks,
// no heartbeats fire, so the cookie's absolute expiry — set by the browser
// itself, independent of any JS timer — lapses on its own. The next
// heartbeat (or page load) after that finds it missing and re-locks.
export const LINKS_AUTH_COOKIE = "links_auth";
export const LINKS_AUTH_MAX_AGE_SECONDS = 10 * 60;

const SALT = "life-dashboard-links-gate";

function expectedToken(): string | null {
  const passcode = process.env.LINKS_PASSCODE;
  if (!passcode) return null;
  return crypto.createHash("sha256").update(`${SALT}:${passcode}`).digest("hex");
}

// Whether the gate is even enabled — false means "no passcode configured,
// don't lock the page."
export function isGateEnabled(): boolean {
  return Boolean(process.env.LINKS_PASSCODE);
}

export function isAuthed(cookieValue: string | undefined): boolean {
  const expected = expectedToken();
  if (!expected) return true; // gate disabled
  return cookieValue === expected;
}

export function isAuthedRequest(request: NextRequest): boolean {
  return isAuthed(request.cookies.get(LINKS_AUTH_COOKIE)?.value);
}

export function verifyPasscode(candidate: string): boolean {
  const passcode = process.env.LINKS_PASSCODE;
  if (!passcode) return false;
  return candidate === passcode;
}

export function issueToken(): string {
  const token = expectedToken();
  if (!token) throw new Error("LINKS_PASSCODE is not configured");
  return token;
}
