"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LinksLockScreen } from "./LinksLockScreen";

// How often we're willing to send a heartbeat, at most (activity events
// fire far more often than this — mousemove alone would otherwise spam the
// server). The cookie's own sliding window (see lib/linksAuth.ts) is 10
// minutes, so anything comfortably under that keeps the session alive
// during genuine activity.
const HEARTBEAT_MIN_GAP_MS = 30_000;

// Wraps the already-rendered Links page content. The server already
// verified the cookie before sending this data down, so we start
// "authed." From here it's purely a client-side sliding session: activity
// (mouse/keyboard/scroll) and tab-visibility changes trigger a heartbeat
// that refreshes the cookie's expiry. If 10 minutes pass with no
// heartbeat — because the tab was idle, or the laptop was asleep/locked
// (no JS runs during that time, so no heartbeats fire, and the cookie's
// real-clock expiry lapses on its own) — the next heartbeat comes back
// 401 and we swap the content out for the lock screen, in place.
export function LinksAuthGuard({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(true);
  const lastHeartbeatRef = useRef(0);

  useEffect(() => {
    if (!authed) return;

    let cancelled = false;

    const heartbeat = async () => {
      try {
        const res = await fetch("/api/links/auth", { method: "PUT" });
        if (cancelled) return;
        if (!res.ok) {
          setAuthed(false);
          return;
        }
        lastHeartbeatRef.current = Date.now();
      } catch {
        // Transient network error — don't lock on this alone.
      }
    };

    const maybeHeartbeat = () => {
      if (Date.now() - lastHeartbeatRef.current >= HEARTBEAT_MIN_GAP_MS) {
        heartbeat();
      }
    };

    const onVisibility = () => {
      // Catches resuming from sleep/lock or switching back to the tab —
      // check immediately rather than waiting for the next throttled tick.
      if (document.visibilityState === "visible") heartbeat();
    };

    const events: Array<keyof DocumentEventMap> = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((evt) => document.addEventListener(evt, maybeHeartbeat));
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(maybeHeartbeat, HEARTBEAT_MIN_GAP_MS);

    heartbeat();

    return () => {
      cancelled = true;
      events.forEach((evt) => document.removeEventListener(evt, maybeHeartbeat));
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, [authed]);

  if (!authed) {
    return <LinksLockScreen onUnlocked={() => setAuthed(true)} />;
  }

  return <>{children}</>;
}
