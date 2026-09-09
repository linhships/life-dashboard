import { createPasscodeGate } from "./passcodeGate";

// Passcode gate for the /resources page. See lib/passcodeGate.ts for the
// mechanism and components/PasscodeAuthGuard.tsx for how the client keeps
// the session alive.
const gate = createPasscodeGate({
  cookieName: "resources_auth",
  envVar: "RESOURCES_PASSCODE",
  salt: "life-dashboard-resources-gate",
});

export const RESOURCES_AUTH_COOKIE = gate.cookieName;
export const RESOURCES_AUTH_MAX_AGE_SECONDS = gate.maxAgeSeconds;
export const isGateEnabled = gate.isGateEnabled;
export const isAuthed = gate.isAuthed;
export const isAuthedRequest = gate.isAuthedRequest;
export const verifyPasscode = gate.verifyPasscode;
export const issueToken = gate.issueToken;
