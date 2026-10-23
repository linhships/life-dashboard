import { cookies } from "next/headers";
import { CalendarDays } from "lucide-react";

import CalendarView from "@/components/CalendarView";
import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { FAMILY_AUTH_COOKIE, isAuthed } from "@/lib/familyAuth";
import {
  getSocialCalendarEvents,
  isCalendarConfigured,
  socialCalendarLabel,
  type CalendarEvent,
} from "@/lib/troettgerCalendar";

export const dynamic = "force-dynamic";

// The shared family calendar: "Social Troettger AI" — social events, visits,
// half-terms and work trips — opening on the week.
//
// Unlike every other page in the family section, this one reads no local
// file. It connects live to iCloud over CalDAV on each load, which is why
// there is a loading.tsx beside it: that round-trip is real, and without
// visible feedback a slow one reads as a click that didn't register.
//
// The credentials never leave the server. This instance's Node process does
// the CalDAV fetch and sends only the resulting events, so nothing about the
// Apple ID reaches a browser — which matters here, because the family app is
// the one instance shared outside the household.
export default async function FamilyCalendarPage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(FAMILY_AUTH_COOKIE)?.value);

  if (!authed) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/family/auth" label="Milo &amp; Arlo" />
      </main>
    );
  }

  const configured = isCalendarConfigured();
  let events: CalendarEvent[] = [];
  let error: string | null = null;

  if (configured) {
    try {
      events = await getSocialCalendarEvents();
    } catch (e) {
      // A failed connection is reported, not swallowed into an empty grid.
      error = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <CalendarDays className="h-4 w-4" />
          <span>
            {configured && !error
              ? `${events.length} ${events.length === 1 ? "event" : "events"}`
              : "Calendar"}
          </span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
          What&apos;s on
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Visits, trips, half-terms and the rest of what&apos;s coming up, from the shared{" "}
          {socialCalendarLabel()} calendar.
        </p>
      </header>

      <PasscodeAuthGuard authEndpoint="/api/family/auth" label="Milo &amp; Arlo">
        {!configured ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Not connected to iCloud yet</p>
            <p className="mt-1.5">
              This page reads the calendar live from iCloud, which needs two settings in{" "}
              <code className="rounded bg-white/70 px-1 py-0.5 text-xs">.env.local</code>:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <code className="text-xs">ICLOUD_CALDAV_USERNAME</code> — the Apple ID the
                calendar lives under.
              </li>
              <li>
                <code className="text-xs">ICLOUD_CALDAV_APP_PASSWORD</code> — an
                app-specific password from appleid.apple.com → Sign-In and Security →
                App-Specific Passwords. Never the real Apple ID password.
              </li>
            </ul>
            <p className="mt-2">
              Optionally <code className="text-xs">ICLOUD_SOCIAL_CALENDAR_NAME</code> if the
              calendar isn&apos;t named {socialCalendarLabel()}. Restart the server after
              editing.
            </p>
          </section>
        ) : error ? (
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Couldn&apos;t reach the calendar</p>
            <p className="mt-1.5">{error}</p>
          </section>
        ) : (
          <CalendarView events={events} initialView="week" />
        )}
      </PasscodeAuthGuard>
    </main>
  );
}
