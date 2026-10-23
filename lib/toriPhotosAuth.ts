// /tori-photos now shares one gate with /milo-nursery and /arlo-nursery —
// see lib/kidsPhotosAuth.ts. This module stays as the page's and its API
// route's entry point so nothing else had to change; the old
// TORI_PHOTOS_* names resolve to the shared cookie.
export {
  KIDS_PHOTOS_AUTH_COOKIE as TORI_PHOTOS_AUTH_COOKIE,
  KIDS_PHOTOS_AUTH_MAX_AGE_SECONDS as TORI_PHOTOS_AUTH_MAX_AGE_SECONDS,
  isGateEnabled,
  isAuthed,
  isAuthedRequest,
  verifyPasscode,
  issueToken,
} from "./kidsPhotosAuth";
