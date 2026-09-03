import { DAVClient } from "tsdav";
import type { DAVCalendar } from "tsdav";
import ICAL from "ical.js";

// Read-only view onto the "Troettger AI" iCloud calendar + Reminders list
// (see Documents/Claude/Troettger-AI-calendar/CLAUDE.md — that's the
// consolidated family calendar everything else gets copied into). Unlike
// every other feature in this app, there's no local file to read: this
// talks live to Apple's CalDAV server on every page load, using an
// app-specific Apple ID password.
//
// Credentials (set these yourself in .env.local — never share an Apple
// password with an AI assistant to type in for you, even a scoped
// app-specific one; add it directly):
//   ICLOUD_CALDAV_USERNAME=your-apple-id@example.com
//   ICLOUD_CALDAV_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx   (generate at
//     appleid.apple.com -> Sign-In and Security -> App-Specific Passwords)
// Optional, only needed if your calendar/list isn't literally named
// "Troettger AI":
//   ICLOUD_CALENDAR_NAME=Troettger AI
//   ICLOUD_REMINDERS_LIST=Troettger AI
//
// This module only ever reads (fetchCalendars/fetchCalendarObjects) —
// never creates, updates, or deletes anything on the account.

const CALDAV_SERVER_URL = "https://caldav.icloud.com";

function username(): string | undefined {
  return process.env.ICLOUD_CALDAV_USERNAME?.trim() || undefined;
}
function password(): string | undefined {
  return process.env.ICLOUD_CALDAV_APP_PASSWORD?.trim() || undefined;
}
function calendarName(): string {
  return process.env.ICLOUD_CALENDAR_NAME?.trim() || "Troettger AI";
}
function remindersListName(): string {
  return process.env.ICLOUD_REMINDERS_LIST?.trim() || "Troettger AI";
}

export function isCalendarConfigured(): boolean {
  return Boolean(username() && password());
}

export interface CalendarEvent {
  // Recurring events expand into one instance per occurrence within the
  // fetched window (see getUpcomingEvents), all sharing the same iCal
  // UID — so `id` (uid + start time) rather than `uid` alone is what's
  // unique per row/list-key on the page.
  id: string;
  uid: string;
  title: string;
  start: string; // ISO 8601
  end: string | null; // ISO 8601
  allDay: boolean;
  location: string | null;
  notes: string | null;
}

export interface ReminderItem {
  uid: string;
  title: string;
  due: string | null; // ISO 8601
  completed: boolean;
  notes: string | null;
}

async function getClient(): Promise<DAVClient> {
  const client = new DAVClient({
    serverUrl: CALDAV_SERVER_URL,
    credentials: { username: username(), password: password() },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
  try {
    await client.login();
  } catch (e) {
    throw new Error(describeLoginError(e));
  }
  return client;
}

// tsdav's account-discovery errors are terse library internals ("cannot
// find homeUrl", "cannot find principalUrl") that don't say what to
// actually go check. Translated based on how tsdav's discovery flow
// works (node_modules/tsdav: fetchPrincipalUrl succeeds first, then
// fetchHomeUrl does a PROPFIND for calendar-home-set on that principal)
// — reaching "cannot find homeUrl" specifically means the principal
// lookup worked but the home-set lookup came back empty or non-ok, which
// in practice is almost always either bad credentials (iCloud sometimes
// returns this instead of a clean 401 at this stage) or the Apple ID
// simply not having iCloud Calendar turned on.
function describeLoginError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  if (/invalid credentials/i.test(message) || /\b401\b/.test(message)) {
    return `${message} — double-check ICLOUD_CALDAV_USERNAME is the exact Apple ID and ICLOUD_CALDAV_APP_PASSWORD is a current app-specific password (regenerating or revoking an old one breaks it).`;
  }
  if (/cannot find (home|principal)url/i.test(message)) {
    return `${message} — usually means either the username/app-specific password is wrong, or this Apple ID doesn't have iCloud Calendar turned on (on a device signed into that Apple ID: Settings → [name] → iCloud → make sure Calendars is on). Also confirm a calendar and reminders list actually exist under this account named "Troettger AI" (or whatever ICLOUD_CALENDAR_NAME/ICLOUD_REMINDERS_LIST is set to).`;
  }
  return message;
}

function displayNameOf(collection: { displayName?: string | Record<string, unknown> }): string {
  return typeof collection.displayName === "string" ? collection.displayName : "";
}

function findCalendarByName(
  calendars: DAVCalendar[],
  component: "VEVENT" | "VTODO",
  name: string
): DAVCalendar | undefined {
  const target = name.trim().toLowerCase();
  return calendars.find(
    (c) =>
      c.components?.includes(component) && displayNameOf(c).trim().toLowerCase() === target
  );
}

// Window is intentionally asymmetric — a handful of recent days for
// context (things that just happened / are still relevant) plus several
// weeks ahead for planning. Adjustable via params if a page ever wants a
// different range.
export async function getUpcomingEvents(
  daysAhead = 30,
  daysBehind = 3
): Promise<CalendarEvent[]> {
  if (!isCalendarConfigured()) return [];

  const client = await getClient();
  const calendars = await client.fetchCalendars();
  const calendar = findCalendarByName(calendars, "VEVENT", calendarName());
  if (!calendar) return [];

  const start = new Date();
  start.setDate(start.getDate() - daysBehind);
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);

  // expand: true asks iCloud's server to do recurrence expansion for us
  // (RFC 4791 CALDAV:expand) — so a yearly "🎂 Milo" birthday comes back
  // as a single concrete instance falling inside [start, end], not the
  // recurring master event plus an RRULE we'd have to expand ourselves.
  const objects = await client.fetchCalendarObjects({
    calendar,
    expand: true,
    timeRange: { start: start.toISOString(), end: end.toISOString() },
  });

  const events: CalendarEvent[] = [];
  for (const obj of objects) {
    if (!obj.data) continue;
    try {
      const root = new ICAL.Component(ICAL.parse(obj.data));
      for (const vevent of root.getAllSubcomponents("vevent")) {
        const event = new ICAL.Event(vevent);
        const startTime = event.startDate;
        const endTime = event.endDate;
        if (!startTime) continue;
        const startIso = startTime.toJSDate().toISOString();
        events.push({
          id: `${event.uid}|${startIso}`,
          uid: event.uid,
          title: event.summary || "(untitled)",
          start: startIso,
          end: endTime ? endTime.toJSDate().toISOString() : null,
          allDay: startTime.isDate,
          location: event.location || null,
          notes: event.description || null,
        });
      }
    } catch {
      // One malformed calendar object shouldn't take down the whole
      // page — skip it and keep the rest.
    }
  }

  events.sort((a, b) => a.start.localeCompare(b.start));
  return events;
}

export async function getReminders(): Promise<ReminderItem[]> {
  if (!isCalendarConfigured()) return [];

  const client = await getClient();
  const calendars = await client.fetchCalendars();
  const list = findCalendarByName(calendars, "VTODO", remindersListName());
  if (!list) return [];

  const objects = await client.fetchCalendarObjects({ calendar: list });

  const reminders: ReminderItem[] = [];
  for (const obj of objects) {
    if (!obj.data) continue;
    try {
      const root = new ICAL.Component(ICAL.parse(obj.data));
      for (const vtodo of root.getAllSubcomponents("vtodo")) {
        const uid = String(vtodo.getFirstPropertyValue("uid") ?? "");
        if (!uid) continue;
        const title = String(vtodo.getFirstPropertyValue("summary") ?? "(untitled)");
        const status = String(vtodo.getFirstPropertyValue("status") ?? "").toUpperCase();
        const dueValue = vtodo.getFirstPropertyValue("due");
        const due =
          dueValue && typeof dueValue === "object" && "toJSDate" in dueValue
            ? (dueValue as ICAL.Time).toJSDate().toISOString()
            : null;
        const notesValue = vtodo.getFirstPropertyValue("description");
        reminders.push({
          uid,
          title,
          due,
          completed: status === "COMPLETED",
          notes: typeof notesValue === "string" ? notesValue : null,
        });
      }
    } catch {
      // Skip a malformed reminder rather than fail the whole list.
    }
  }

  reminders.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return a.title.localeCompare(b.title);
  });
  return reminders;
}
