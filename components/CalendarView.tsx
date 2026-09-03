"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
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
const HOUR_HEIGHT = 64; // px per hour in the week/day timeline — tall enough
// for a title + time + location line to actually be readable, not just a
// sliver of color (Linh's "make the view more like this so one can read
// more" feedback, referencing Apple Calendar's week view).
const GUTTER_WIDTH = 56; // px, the hour-label column in the timeline
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Color-per-event accent for Classic/Haven — a light tint fill plus a
// stronger left border bar (Apple Calendar-style block), one entry per
// colorHash bucket so an event's color stays stable across renders.
// Neobrutal repaints the same category-color-N hook class with its own
// flat/bold palette (see globals.css) — this array is only what
// Classic/Haven actually see.
const CHIP_ACCENTS = [
  { bg: "bg-purple-50", border: "border-purple-400" },
  { bg: "bg-blue-50", border: "border-blue-400" },
  { bg: "bg-emerald-50", border: "border-emerald-400" },
  { bg: "bg-amber-50", border: "border-amber-400" },
  { bg: "bg-rose-50", border: "border-rose-400" },
  { bg: "bg-sky-50", border: "border-sky-400" },
  { bg: "bg-orange-50", border: "border-orange-400" },
  { bg: "bg-teal-50", border: "border-teal-400" },
];

function chipAccent(name: string): { bg: string; border: string } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CHIP_ACCENTS[h % CHIP_ACCENTS.length];
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

function formatTimeRange(event: CalendarEvent): string {
  if (!event.end) return formatTime(event.start);
  return `${formatTime(event.start)} – ${formatTime(event.end)}`;
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

// Only events that start at the exact same time actually compete for
// horizontal space (lane-split, each getting a fraction of the column's
// width). Events that overlap but start at different times — e.g. an
// all-afternoon "No Chiarline" block with a 2-hour outing somewhere in
// the middle of it — are allowed to just overlap instead: both render at
// full width, with the shorter one stacked on top (higher z-index) so
// it stays readable. Per Linh's feedback: "as long as the events don't
// start at the same time, they can overlap instead of the event being
// smaller in width."
interface LaidOutEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
  zIndex: number;
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
    });

  const groups = new Map<number, typeof timed>();
  for (const item of timed) {
    const list = groups.get(item.startMinutes) ?? [];
    list.push(item);
    groups.set(item.startMinutes, list);
  }

  const result: LaidOutEvent[] = [];
  for (const group of groups.values()) {
    const laneCount = group.length;
    group.forEach((item, lane) => {
      result.push({
        event: item.event,
        top: (item.startMinutes / 60) * HOUR_HEIGHT,
        height: Math.max(((item.endMinutes - item.startMinutes) / 60) * HOUR_HEIGHT, 34),
        lane,
        laneCount,
        // Shorter events sit above longer ones they overlap, so a brief
        // appointment stays on top of (and readable over) a long
        // background-ish block rather than getting buried under it.
        zIndex: 10000 - (item.endMinutes - item.startMinutes),
      });
    });
  }
  return result;
}

// Compact single-line chip — used in the month grid, where each day cell
// is small and just needs to hint what's there.
function EventChip({ event, showTime }: { event: CalendarEvent; showTime: boolean }) {
  const accent = chipAccent(event.title);
  return (
    <div
      title={event.title}
      className={`event-chip ${accent.bg} ${accent.border} ${categoryColorClass(
        event.title
      )} truncate rounded-md border-l-4 px-1.5 py-0.5 text-[11px] font-medium text-slate-800`}
    >
      {showTime && !event.allDay && (
        <span className="event-chip-time opacity-70">{formatTime(event.start)} </span>
      )}
      {event.title}
    </div>
  );
}

// Rounded pill for the all-day row in week/day view — roomier than the
// month-grid chip since there's a whole row's height to use.
function AllDayPill({ event }: { event: CalendarEvent }) {
  const accent = chipAccent(event.title);
  return (
    <div
      title={event.title}
      className={`event-chip ${accent.bg} ${accent.border} ${categoryColorClass(
        event.title
      )} truncate rounded-full border-l-4 px-3 py-1 text-[12px] font-medium text-slate-800`}
    >
      {event.title}
    </div>
  );
}

// Full detail block for the week/day hourly timeline: title, time range,
// and location all readable (wrapped where needed) rather than a
// single truncated line, per Linh's "make the view more like this so one
// can read more" feedback against Apple Calendar's week view.
function TimelineEventBlock({ event, style }: { event: CalendarEvent; style: CSSProperties }) {
  const accent = chipAccent(event.title);
  return (
    <div
      style={style}
      title={event.title}
      className={`event-chip ${accent.bg} ${accent.border} ${categoryColorClass(
        event.title
      )} absolute overflow-hidden rounded-md border-l-4 px-2 py-1 text-slate-900`}
    >
      <p className="line-clamp-2 text-[12px] font-semibold leading-tight">{event.title}</p>
      {!event.allDay && (
        <p className="event-chip-time mt-0.5 truncate text-[10.5px] leading-tight opacity-70">
          {formatTimeRange(event)}
        </p>
      )}
      {event.location && (
        <p className="mt-0.5 flex items-center gap-1 truncate text-[10.5px] leading-tight opacity-70">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{event.location}</span>
        </p>
      )}
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
                      ? "calendar-day-number--today bg-rose-500 text-white"
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

function CurrentTimeIndicator({ now, days, todayKey }: { now: Date; days: Date[]; todayKey: string }) {
  const todayIndex = days.findIndex((d) => isoDateKey(d) === todayKey);
  if (todayIndex === -1) return null;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const top = (nowMinutes / 60) * HOUR_HEIGHT;
  const fraction = todayIndex / days.length;
  return (
    <div className="calendar-now-line pointer-events-none absolute inset-x-0 z-20" style={{ top }}>
      <div className="flex items-center">
        <div className="flex shrink-0 justify-end pr-1" style={{ width: GUTTER_WIDTH }}>
          <span className="rounded bg-rose-500 px-1 py-0.5 text-[9px] font-semibold leading-none text-white">
            {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="relative h-px flex-1 bg-rose-500">
          <span
            className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500"
            style={{ left: `${fraction * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function TimelineView({
  days,
  eventsByDay,
  todayKey,
  now,
}: {
  days: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  todayKey: string;
  now: Date;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridCols = `${GUTTER_WIDTH}px repeat(${days.length}, minmax(0, 1fr))`;
  const includesToday = days.some((d) => isoDateKey(d) === todayKey);

  useEffect(() => {
    if (!scrollRef.current) return;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const targetHour = includesToday ? Math.max(nowMinutes / 60 - 1, 0) : 6.5;
    scrollRef.current.scrollTop = targetHour * HOUR_HEIGHT;
  }, [days, includesToday, now]);

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
                  isToday ? "calendar-day-number--today bg-rose-500 text-white" : "text-slate-700"
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
            <div key={key} className="space-y-1 border-l border-slate-200 p-1.5">
              {allDayEvents.map((e) => (
                <AllDayPill key={e.id} event={e} />
              ))}
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="calendar-timeline-body relative max-h-[640px] overflow-y-auto">
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
                {laidOut.map(({ event, top, height, lane, laneCount, zIndex }) => (
                  <TimelineEventBlock
                    key={event.id}
                    event={event}
                    style={{
                      top,
                      height,
                      left: `${(lane / laneCount) * 100}%`,
                      width: `calc(${100 / laneCount}% - 2px)`,
                      zIndex,
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
        <CurrentTimeIndicator now={now} days={days} todayKey={todayKey} />
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
      <div className="calendar-header flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
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

      <div className="mt-6">
        {view === "month" && (
          <MonthGrid
            monthCursor={startOfMonth(cursor)}
            eventsByDay={eventsByDay}
            todayKey={todayKey}
            onPickDay={pickDay}
          />
        )}
        {view === "week" && (
          <TimelineView days={weekDays} eventsByDay={eventsByDay} todayKey={todayKey} now={today} />
        )}
        {view === "day" && (
          <TimelineView days={[cursor]} eventsByDay={eventsByDay} todayKey={todayKey} now={today} />
        )}
      </div>
    </section>
  );
}
