// /milo-nursery now shares one gate with /tori-photos and /arlo-nursery —
// see lib/kidsPhotosAuth.ts. This module stays as the page's and its API
// route's entry point so nothing else had to change; the old
// MILO_NURSERY_PHOTOS_* names resolve to the shared cookie.
export {
  KIDS_PHOTOS_AUTH_COOKIE as MILO_NURSERY_PHOTOS_AUTH_COOKIE,
  KIDS_PHOTOS_AUTH_MAX_AGE_SECONDS as MILO_NURSERY_PHOTOS_AUTH_MAX_AGE_SECONDS,
  isGateEnabled,
  isAuthed,
  isAuthedRequest,
  verifyPasscode,
  issueToken,
} from "./kidsPhotosAuth";
