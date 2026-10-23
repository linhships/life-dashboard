import { createPasscodeGate } from "./passcodeGate";

// ONE passcode gate shared by all three "Milo & Arlo" pages: /tori-photos,
// /milo-nursery and /arlo-nursery (plus their image API routes). They used
// to have a cookie and a salt each, which meant typing the same passcode
// three times to walk between them. Now they share this single cookie, so
// unlocking any one of them unlocks all three for the session.
//
// Deliberately NOT shared with the family app (lib/familyAuth.ts): that is
// the only instance that leaves the house, and it keeps its own passcode.
//
// Passcode variable: KIDS_PASSCODE, falling back to the three older
// per-page variables so an .env.local that hasn't been updated keeps
// working. Any one of them being set locks all three pages.
const gate = createPasscodeGate({
  cookieName: "kids_photos_auth",
  envVar: [
    "KIDS_PASSCODE",
    "TORI_PHOTOS_PASSCODE",
    "MILO_NURSERY_PHOTOS_PASSCODE",
    "ARLO_NURSERY_PHOTOS_PASSCODE",
  ],
  salt: "life-dashboard-kids-photos-gate",
});

export const KIDS_PHOTOS_AUTH_COOKIE = gate.cookieName;
export const KIDS_PHOTOS_AUTH_MAX_AGE_SECONDS = gate.maxAgeSeconds;
export const isGateEnabled = gate.isGateEnabled;
export const isAuthed = gate.isAuthed;
export const isAuthedRequest = gate.isAuthedRequest;
export const verifyPasscode = gate.verifyPasscode;
export const issueToken = gate.issueToken;
