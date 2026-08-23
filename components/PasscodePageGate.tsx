"use client";

import { useRouter } from "next/navigation";
import { PasscodeLockScreen } from "./PasscodeLockScreen";

// Page-level gate: rendered by a gated page's server component when no
// valid session cookie was found, so it never fetched the page's data at
// all. On success, refresh so the server component re-runs and fetches
// the data now that the cookie is set.
export function PasscodePageGate({
  authEndpoint,
  label,
}: {
  authEndpoint: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <PasscodeLockScreen
      authEndpoint={authEndpoint}
      label={label}
      onUnlocked={() => router.refresh()}
    />
  );
}
