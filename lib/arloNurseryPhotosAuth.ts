import { createPasscodeGate } from "./passcodeGate";

// Passcode gate for the /arlo-nursery page and its image API route. Same
// mechanism as lib/miloNurseryPhotosAuth.ts — separate cookie and env var so
// this section locks independently.
const gate = createPasscodeGate({
  cookieName: "arlo_nursery_photos_auth",
  envVar: "ARLO_NURSERY_PHOTOS_PASSCODE",
  salt: "life-dashboard-arlo-nursery-photos-gate",
});

export const ARLO_NURSERY_PHOTOS_AUTH_COOKIE = gate.cookieName;
export const ARLO_NURSERY_PHOTOS_AUTH_MAX_AGE_SECONDS = gate.maxAgeSeconds;
export const isGateEnabled = gate.isGateEnabled;
export const isAuthed = gate.isAuthed;
export const isAuthedRequest = gate.isAuthedRequest;
export const verifyPasscode = gate.verifyPasscode;
export const issueToken = gate.issueToken;
