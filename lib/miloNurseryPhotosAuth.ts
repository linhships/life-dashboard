import { createPasscodeGate } from "./passcodeGate";

// Passcode gate for the /milo-nursery page and its image API route. Same
// mechanism as lib/toriPhotosAuth.ts — separate cookie and env var so this
// section locks independently.
const gate = createPasscodeGate({
  cookieName: "milo_nursery_photos_auth",
  envVar: "MILO_NURSERY_PHOTOS_PASSCODE",
  salt: "life-dashboard-milo-nursery-photos-gate",
});

export const MILO_NURSERY_PHOTOS_AUTH_COOKIE = gate.cookieName;
export const MILO_NURSERY_PHOTOS_AUTH_MAX_AGE_SECONDS = gate.maxAgeSeconds;
export const isGateEnabled = gate.isGateEnabled;
export const isAuthed = gate.isAuthed;
export const isAuthedRequest = gate.isAuthedRequest;
export const verifyPasscode = gate.verifyPasscode;
export const issueToken = gate.issueToken;
