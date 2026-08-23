import { createPasscodeGate } from "./passcodeGate";

// Passcode gate for the /links page. See lib/passcodeGate.ts for the
// mechanism and components/PasscodeAuthGuard.tsx for how the client keeps
// the session alive.
const gate = createPasscodeGate({
  cookieName: "links_auth",
  envVar: "LINKS_PASSCODE",
  salt: "life-dashboard-links-gate",
});

export const LINKS_AUTH_COOKIE = gate.cookieName;
export const LINKS_AUTH_MAX_AGE_SECONDS = gate.maxAgeSeconds;
export const isGateEnabled = gate.isGateEnabled;
export const isAuthed = gate.isAuthed;
export const isAuthedRequest = gate.isAuthedRequest;
export const verifyPasscode = gate.verifyPasscode;
export const issueToken = gate.issueToken;
