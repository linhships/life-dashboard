"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarEvent } from "@/lib/troettgerCalendar";
import { categoryColorClass } from "@/lib/colorHash";

// Month-grid calendar, styled after Untitled UI's React calendar component
// (untitledui.com/react/components/calendars) but adapted to this app's
// three themes (Classic/Haven repaint automatically via the CSS-variable
// system in globals.css; Neobrutal gets its own hook classes below, same
// pattern as NewsFeed/MealPlanGrid). Read-only — there's no "Add event"
// control on purpose, since lib/troettgerCalendar.ts has no write path.

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_VISIBLE_PER_DAY = 3;

// Pastel chip palette for Classic/Haven, one entry per colorHash bucket so
// an event's color stays stable across renders. Neobrutal repaints the
// same category-color-N hook class with its own flat/bold palette (see
// globals.css) — this array is only what Classic/Haven actually see.
const CHIP_PALETTES = [
  "bg-purple-50 text-purple-700 border-purple-200",
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-orange-50 text-orange-700 border-orange-200",
  "bg-teal-50 text-teal-700 border-teal-200",
];

function chipPalette(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CHIP_PALETTES[h % CHIP_PALETTES.length];
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function isoDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

// Monday-first grid: previous-month padding, every day of the month, then
// next-month padding out to a full final week.
function buildMonthGrid(monthCursor: Date): Date[] {
  const first = startOfMonth(monthCursor);
  const firstWeekday = (first.getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: Date[] = [];
  for (let i = firstWeekday; i > 0; i--) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), 1 - i));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), d));
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  return cells;
}

export default function CalendarMonthView({ events }: { events: CalendarEvent[] }) {
  const today = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(today));
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = dayKey(event.start);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const todayKey = isoDateKey(today);
  const monthLabel = monthCursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
  const rangeLabel = `${monthCursor.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${monthEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <section className="calendar-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="calendar-header flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="calendar-date-badge flex w-14 flex-col items-center rounded-lg border border-slate-200 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {today.toLocaleDateString("en-GB", { month: "short" })}
            </span>
            <span className="text-lg font-bold text-slate-900">{today.getDate()}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{monthLabel}</h2>
            <p className="text-xs text-slate-400">{rangeLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthCursor(startOfMonth(today))}
            className="calendar-nav-btn rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-200">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonthCursor((m) => addMonths(m, -1))}
              className="calendar-nav-btn p-1.5 text-slate-500 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonthCursor((m) => addMonths(m, 1))}
              className="calendar-nav-btn border-l border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <span className="calendar-readonly-badge rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400">
            Read-only
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="calendar-weekday-label pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="calendar-grid overflow-hidden rounded-lg">
        <div className="grid grid-cols-7">
          {cells.map((date, index) => {
            const key = isoDateKey(date);
            const inMonth = date.getMonth() === monthCursor.getMonth();
            const dayEvents = eventsByDay.get(key) ?? [];
            const isToday = key === todayKey;
            const expanded = expandedDay === key;
            const visible = expanded ? dayEvents : dayEvents.slice(0, MAX_VISIBLE_PER_DAY);
            const hiddenCount = dayEvents.length - visible.length;
            return (
              <div
                key={key}
                className={`calendar-day-cell min-h-[92px] border-slate-200 p-1.5 ${
                  index % 7 !== 0 ? "border-l" : ""
                } border-b ${index < 7 ? "border-t" : ""} ${
                  inMonth ? "bg-white" : "calendar-day-cell--muted bg-slate-50/60"
                }`}
              >
                <span
                  className={`calendar-day-number inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday
                      ? "calendar-day-number--today bg-slate-900 text-white"
                      : inMonth
                        ? "text-slate-700"
                        : "text-slate-300"
                  }`}
                >
                  {date.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {visible.map((event) => (
                    <div
                      key={event.id}
                      title={event.title}
                      className={`event-chip ${chipPalette(event.title)} ${categoryColorClass(
                        event.title
                      )} truncate rounded border px-1.5 py-0.5 text-[11px] font-medium`}
                    >
                      {!event.allDay && (
                        <span className="event-chip-time opacity-70">{formatTime(event.start)} </span>
                      )}
                      {event.title}
                    </div>
                  ))}
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedDay(key)}
                      className="calendar-more-btn block text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                    >
                      {hiddenCount} more…
                    </button>
                  )}
                  {expanded && dayEvents.length > MAX_VISIBLE_PER_DAY && (
                    <button
                      type="button"
                      onClick={() => setExpandedDay(null)}
                      className="calendar-more-btn block text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                    >
                      Show less
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
