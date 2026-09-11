import { createPasscodeGate } from "./passcodeGate";

// Passcode gate for the /family section — the cut-down, grandparent-facing
// view (photos of the boys + Gatehouse news, nothing else). Its own cookie
// and env var, deliberately separate from the private sections' codes:
// this is the one code that gets shared outside the household, so it must
// not be the same string that unlocks Finance.
//
// This is the *second* line of defence. The first is that only /family and
// its own API routes are proxied onto the tailnet at all — see
// FAMILY-ACCESS.md. Someone who can reach this page still can't reach
// /finance, because the proxy never forwards that path.
const gate = createPasscodeGate({
  cookieName: "family_auth",
  envVar: "FAMILY_PASSCODE",
  salt: "life-dashboard-family-gate",
});

export const FAMILY_AUTH_COOKIE = gate.cookieName;
export const FAMILY_AUTH_MAX_AGE_SECONDS = gate.maxAgeSeconds;
export const isGateEnabled = gate.isGateEnabled;
export const isAuthed = gate.isAuthed;
export const isAuthedRequest = gate.isAuthedRequest;
export const verifyPasscode = gate.verifyPasscode;
export const issueToken = gate.issueToken;
