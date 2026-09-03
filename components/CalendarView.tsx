"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarEvent } from "@/lib/troettgerCalendar";
import { categoryColorClass } from "@/lib/colorHash";

// Month/Week/Day calendar, styled after Untitled UI's React calendar
// component (untitledui.com/react/components/calendars) but adapted to
// this app's three themes (Classic/Haven repaint automatically via the
// CSS-variable system in globals.css; Neobrutal gets its own hook classes
// in globals.css, same pattern as NewsFeed/MealPlanGrid). Read-only —
// there's no "Add event" control on purpose, since lib/troettgerCalendar.ts
// has no write path. File predates week/day support (was
// CalendarMonthView.tsx); kept the export name simple after the rename.

type ViewMode = "month" | "week" | "day";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_VISIBLE_PER_DAY = 3;
const HOUR_HEIGHT = 48; // px per hour in the week/day timeline
const HOURS = Array.from({ length: 24 }, (_, i) => i);

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

function formatHourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function startOfWeek(d: Date): Date {
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  return addDays(d, -dow);
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

// Greedy lane assignment for overlapping timed events within one day, so
// two events at the same time sit side by side instead of on top of each
// other. Not a perfect calendar-grade packer, but good enough for a family
// calendar that rarely has more than 2-3 things clash.
interface LaidOutEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
}

function layoutDayTimedEvents(dayEvents: CalendarEvent[]): LaidOutEvent[] {
  const timed = dayEvents
    .filter((e) => !e.allDay)
    .map((e) => {
      const start = new Date(e.start);
      const end = e.end ? new Date(e.end) : new Date(start.getTime() + 60 * 60000);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      let endMinutes = end.getHours() * 60 + end.getMinutes();
      if (endMinutes <= startMinutes) endMinutes = Math.min(startMinutes + 30, 24 * 60);
      return { event: e, startMinutes, endMinutes };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const lanes: { endMinutes: number }[] = [];
  const placed: { event: CalendarEvent; startMinutes: number; endMinutes: number; lane: number }[] = [];
  for (const item of timed) {
    let laneIndex = lanes.findIndex((l) => l.endMinutes <= item.startMinutes);
    if (laneIndex === -1) {
      laneIndex = lanes.length;
      lanes.push({ endMinutes: item.endMinutes });
    } else {
      lanes[laneIndex].endMinutes = item.endMinutes;
    }
    placed.push({ ...item, lane: laneIndex });
  }
  const laneCount = Math.max(1, lanes.length);
  return placed.map((p) => ({
    event: p.event,
    top: (p.startMinutes / 60) * HOUR_HEIGHT,
    height: Math.max(((p.endMinutes - p.startMinutes) / 60) * HOUR_HEIGHT, 20),
    lane: p.lane,
    laneCount,
  }));
}

function EventChip({ event, showTime }: { event: CalendarEvent; showTime: boolean }) {
  return (
    <div
      title={event.title}
      className={`event-chip ${chipPalette(event.title)} ${categoryColorClass(
        event.title
      )} truncate rounded border px-1.5 py-0.5 text-[11px] font-medium`}
    >
      {showTime && !event.allDay && (
        <span className="event-chip-time opacity-70">{formatTime(event.start)} </span>
      )}
      {event.title}
    </div>
  );
}

function MonthGrid({
  monthCursor,
  eventsByDay,
  todayKey,
  onPickDay,
}: {
  monthCursor: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  todayKey: string;
  onPickDay: (d: Date) => void;
}) {
  const cells = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-7">
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
                <button
                  type="button"
                  onClick={() => onPickDay(date)}
                  aria-label={`Open ${date.toDateString()} in day view`}
                  className={`calendar-day-number inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday
                      ? "calendar-day-number--today bg-slate-900 text-white"
                      : inMonth
                        ? "text-slate-700 hover:bg-slate-100"
                        : "text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {date.getDate()}
                </button>
                <div className="mt-1 space-y-1">
                  {visible.map((event) => (
                    <EventChip key={event.id} event={event} showTime />
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
    </>
  );
}

function TimelineView({
  days,
  eventsByDay,
  todayKey,
}: {
  days: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  todayKey: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridCols = `56px repeat(${days.length}, minmax(0, 1fr))`;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 6.5 * HOUR_HEIGHT;
  }, [days]);

  return (
    <div className="calendar-timeline overflow-hidden rounded-lg border border-slate-200">
      <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: gridCols }}>
        <div />
        {days.map((d) => {
          const key = isoDateKey(d);
          const isToday = key === todayKey;
          return (
            <div key={key} className="calendar-weekday-label border-l border-slate-200 py-2 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {d.toLocaleDateString("en-GB", { weekday: "short" })}
              </div>
              <div
                className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${
                  isToday ? "calendar-day-number--today bg-slate-900 text-white" : "text-slate-700"
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: gridCols }}>
        <div className="py-1.5 pr-2 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          All day
        </div>
        {days.map((d) => {
          const key = isoDateKey(d);
          const allDayEvents = (eventsByDay.get(key) ?? []).filter((e) => e.allDay);
          return (
            <div key={key} className="space-y-1 border-l border-slate-200 p-1">
              {allDayEvents.map((e) => (
                <EventChip key={e.id} event={e} showTime={false} />
              ))}
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="calendar-timeline-body max-h-[560px] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
          <div>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                className="border-t border-slate-100 pr-2 text-right text-[10px] text-slate-400"
              >
                {formatHourLabel(h)}
              </div>
            ))}
          </div>
          {days.map((d) => {
            const key = isoDateKey(d);
            const dayEvents = eventsByDay.get(key) ?? [];
            const laidOut = layoutDayTimedEvents(dayEvents);
            return (
              <div
                key={key}
                className="relative border-l border-slate-200"
                style={{ height: HOUR_HEIGHT * 24 }}
              >
                {HOURS.map((h) => (
                  <div key={h} style={{ height: HOUR_HEIGHT }} className="border-t border-slate-100" />
                ))}
                {laidOut.map(({ event, top, height, lane, laneCount }) => (
                  <div
                    key={event.id}
                    title={event.title}
                    style={{
                      top,
                      height,
                      left: `${(lane / laneCount) * 100}%`,
                      width: `${100 / laneCount}%`,
                    }}
                    className={`event-chip ${chipPalette(event.title)} ${categoryColorClass(
                      event.title
                    )} absolute overflow-hidden rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight`}
                  >
                    <div className="event-chip-time opacity-70">{formatTime(event.start)}</div>
                    <div className="truncate">{event.title}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CalendarView({ events }: { events: CalendarEvent[] }) {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => today);

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

  const todayKey = isoDateKey(today);

  function goToday() {
    setCursor(today);
  }
  function goPrev() {
    setCursor((c) => (view === "month" ? addMonths(startOfMonth(c), -1) : view === "week" ? addDays(c, -7) : addDays(c, -1)));
  }
  function goNext() {
    setCursor((c) => (view === "month" ? addMonths(startOfMonth(c), 1) : view === "week" ? addDays(c, 7) : addDays(c, 1)));
  }
  function pickDay(d: Date) {
    setCursor(d);
    setView("day");
  }

  let headerTitle: string;
  let rangeLabel: string;
  if (view === "month") {
    const monthCursor = startOfMonth(cursor);
    const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
    headerTitle = monthCursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    rangeLabel = `${monthCursor.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${monthEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  } else if (view === "week") {
    const weekStart = startOfWeek(cursor);
    const weekEnd = addDays(weekStart, 6);
    headerTitle = weekStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    rangeLabel = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  } else {
    headerTitle = cursor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    rangeLabel = cursor.toLocaleDateString("en-GB", { year: "numeric" });
  }

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

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
            <h2 className="text-lg font-bold text-slate-900">{headerTitle}</h2>
            <p className="text-xs text-slate-400">{rangeLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="calendar-view-switch flex items-center rounded-lg border border-slate-200 p-0.5">
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`calendar-view-btn rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
                  view === v
                    ? "calendar-view-btn--active bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={goToday}
            className="calendar-nav-btn rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-200">
            <button
              type="button"
              aria-label="Previous"
              onClick={goPrev}
              className="calendar-nav-btn p-1.5 text-slate-500 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={goNext}
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

      <div className="mt-4">
        {view === "month" && (
          <MonthGrid
            monthCursor={startOfMonth(cursor)}
            eventsByDay={eventsByDay}
            todayKey={todayKey}
            onPickDay={pickDay}
          />
        )}
        {view === "week" && (
          <TimelineView days={weekDays} eventsByDay={eventsByDay} todayKey={todayKey} />
        )}
        {view === "day" && (
          <TimelineView days={[cursor]} eventsByDay={eventsByDay} todayKey={todayKey} />
        )}
      </div>
    </section>
  );
}
