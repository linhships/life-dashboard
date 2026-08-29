import { createPasscodeGate } from "./passcodeGate";

// Passcode gate for the /tori-photos page and its image API route. Same
// mechanism as lib/linksAuth.ts / lib/financeAuth.ts, separate cookie and
// env var so this section locks independently.
const gate = createPasscodeGate({
  cookieName: "tori_photos_auth",
  envVar: "TORI_PHOTOS_PASSCODE",
  salt: "life-dashboard-tori-photos-gate",
});

export const TORI_PHOTOS_AUTH_COOKIE = gate.cookieName;
export const TORI_PHOTOS_AUTH_MAX_AGE_SECONDS = gate.maxAgeSeconds;
export const isGateEnabled = gate.isGateEnabled;
export const isAuthed = gate.isAuthed;
export const isAuthedRequest = gate.isAuthedRequest;
export const verifyPasscode = gate.verifyPasscode;
export const issueToken = gate.issueToken;
