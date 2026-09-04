import { createPasscodeGate } from "./passcodeGate";

// Passcode gate for the /learning page. See lib/passcodeGate.ts for the
// mechanism and components/PasscodeAuthGuard.tsx for how the client keeps
// the session alive. Mirrors lib/linksAuth.ts exactly, with its own
// cookie name/env var/salt so the two gates are fully independent.
const gate = createPasscodeGate({
  cookieName: "learning_auth",
  envVar: "LEARNING_PASSCODE",
  salt: "life-dashboard-learning-gate",
});

export const LEARNING_AUTH_COOKIE = gate.cookieName;
export const LEARNING_AUTH_MAX_AGE_SECONDS = gate.maxAgeSeconds;
export const isGateEnabled = gate.isGateEnabled;
export const isAuthed = gate.isAuthed;
export const isAuthedRequest = gate.isAuthedRequest;
export const verifyPasscode = gate.verifyPasscode;
export const issueToken = gate.issueToken;
