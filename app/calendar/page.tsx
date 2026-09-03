import { CalendarDays, CheckSquare, MapPin, Square } from "lucide-react";
import {
  getReminders,
  getUpcomingEvents,
  isCalendarConfigured,
  type CalendarEvent,
  type ReminderItem,
} from "@/lib/troettgerCalendar";

export const dynamic = "force-dynamic";

function groupEventsByDay(events: CalendarEvent[]): { dayKey: string; label: string; items: CalendarEvent[] }[] {
  const groups: { dayKey: string; label: string; items: CalendarEvent[] }[] = [];
  for (const event of events) {
    const d = new Date(event.start);
    const dayKey = d.toISOString().slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.dayKey === dayKey) {
      last.items.push(event);
      continue;
    }
    groups.push({
      dayKey,
      label: d.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      items: [event],
    });
  }
  return groups;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function EventRow({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex items-start gap-3 border-t border-slate-100 py-3 first:border-0 first:pt-0">
      <div className="w-16 shrink-0 pt-0.5 text-xs font-medium text-slate-500">
        {event.allDay ? "All day" : formatTime(event.start)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{event.title}</p>
        {event.location && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{event.location}</span>
          </p>
        )}
        {event.notes && <p className="mt-1 text-xs text-slate-500">{event.notes}</p>}
      </div>
    </div>
  );
}

function ReminderRow({ reminder }: { reminder: ReminderItem }) {
  const Icon = reminder.completed ? CheckSquare : Square;
  return (
    <div className="flex items-start gap-2.5 border-t border-slate-100 py-2.5 first:border-0 first:pt-0">
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${
          reminder.completed ? "text-emerald-500" : "text-slate-300"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm ${
            reminder.completed ? "text-slate-400 line-through" : "font-medium text-slate-900"
          }`}
        >
          {reminder.title}
        </p>
        {reminder.due && (
          <p className="mt-0.5 text-xs text-slate-400">
            Due {new Date(reminder.due).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
        )}
        {reminder.notes && <p className="mt-1 text-xs text-slate-500">{reminder.notes}</p>}
      </div>
    </div>
  );
}

export default async function CalendarPage() {
  if (!isCalendarConfigured()) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Troettger AI calendar</h1>
        <p className="mt-4 text-sm text-slate-500">
          Not connected yet. Add these to{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.local</code> yourself
          (don&apos;t paste your Apple password into the chat — add it directly to the file):
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
{`ICLOUD_CALDAV_USERNAME=your-apple-id@example.com
ICLOUD_CALDAV_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx`}
        </pre>
        <p className="mt-3 text-sm text-slate-500">
          Generate the app-specific password at{" "}
          <span className="font-medium text-slate-700">appleid.apple.com</span> →{" "}
          <span className="font-medium text-slate-700">Sign-In and Security</span> →{" "}
          <span className="font-medium text-slate-700">App-Specific Passwords</span>. This page
          only reads your calendar and reminders — it never creates, edits, or deletes anything.
        </p>
      </main>
    );
  }

  let events: CalendarEvent[] = [];
  let reminders: ReminderItem[] = [];
  let error: string | null = null;
  try {
    [events, reminders] = await Promise.all([getUpcomingEvents(), getReminders()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to connect to iCloud.";
  }

  const dayGroups = groupEventsByDay(events);
  const openReminders = reminders.filter((r) => !r.completed);
  const completedReminders = reminders.filter((r) => r.completed);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Troettger AI · read-only</span>
        </div>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Calendar &amp; Reminders</h1>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Couldn&apos;t reach iCloud: {error}
        </div>
      )}

      {!error && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Upcoming events</h2>
            {dayGroups.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Nothing on the calendar right now.</p>
            ) : (
              <div className="mt-3 space-y-5">
                {dayGroups.map((group) => (
                  <div key={group.dayKey}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {group.label}
                    </p>
                    <div className="mt-1">
                      {group.items.map((event) => (
                        <EventRow key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Reminders</h2>
              {openReminders.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">Nothing open.</p>
              ) : (
                <div className="mt-2">
                  {openReminders.map((r) => (
                    <ReminderRow key={r.uid} reminder={r} />
                  ))}
                </div>
              )}
            </section>

            {completedReminders.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-500">
                  Completed ({completedReminders.length})
                </h2>
                <div className="mt-2">
                  {completedReminders.map((r) => (
                    <ReminderRow key={r.uid} reminder={r} />
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
