import { createPasscodeGate } from "./passcodeGate";

// Passcode gate for the Finance dashboard (the root "/" route and its
// data API routes). Same mechanism as lib/linksAuth.ts, separate cookie
// and env var so the two sections lock independently.
const gate = createPasscodeGate({
  cookieName: "finance_auth",
  envVar: "FINANCE_PASSCODE",
  salt: "life-dashboard-finance-gate",
});

export const FINANCE_AUTH_COOKIE = gate.cookieName;
export const FINANCE_AUTH_MAX_AGE_SECONDS = gate.maxAgeSeconds;
export const isGateEnabled = gate.isGateEnabled;
export const isAuthed = gate.isAuthed;
export const isAuthedRequest = gate.isAuthedRequest;
export const verifyPasscode = gate.verifyPasscode;
export const issueToken = gate.issueToken;
