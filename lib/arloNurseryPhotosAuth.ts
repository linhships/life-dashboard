// /arlo-nursery (and the Chiarline image route) now shares one gate with
// /tori-photos and /milo-nursery — see lib/kidsPhotosAuth.ts. This module
// stays as the page's and its API routes' entry point so nothing else had
// to change; the old ARLO_NURSERY_PHOTOS_* names resolve to the shared
// cookie.
export {
  KIDS_PHOTOS_AUTH_COOKIE as ARLO_NURSERY_PHOTOS_AUTH_COOKIE,
  KIDS_PHOTOS_AUTH_MAX_AGE_SECONDS as ARLO_NURSERY_PHOTOS_AUTH_MAX_AGE_SECONDS,
  isGateEnabled,
  isAuthed,
  isAuthedRequest,
  verifyPasscode,
  issueToken,
} from "./kidsPhotosAuth";
