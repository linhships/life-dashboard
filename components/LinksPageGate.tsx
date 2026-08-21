"use client";

import { useRouter } from "next/navigation";
import { LinksLockScreen } from "./LinksLockScreen";

// Page-level gate: rendered by app/links/page.tsx when the server found no
// valid session cookie, so it never fetched link data at all. On success,
// refresh so the server component re-runs and fetches the data now that
// the cookie is set.
export function LinksPageGate() {
  const router = useRouter();
  return <LinksLockScreen onUnlocked={() => router.refresh()} />;
}
