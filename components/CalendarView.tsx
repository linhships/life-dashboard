"use client";

import { useMemo, useState } from "react";
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

type ViewMode = "week" | "day";

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

// LOCAL calendar date, matching isoDateKey below — which is what the grid
// keys its day cells by. This used to return the UTC date
// (toISOString().slice(0,10)) while the cells were keyed locally, so any
// event whose local day and UTC day differ was filed under a day the grid
// never looks up. During BST that is every all-day event: iCloud sends
// them as date-only values, ical.js resolves them to local midnight, and
// local midnight is 23:00 the PREVIOUS day in UTC — so an all-day event
// starting Monday was filed under Sunday and vanished from a Mon–Sun week
// entirely. Timed events were unaffected (09:15 BST is still the 19th in
// UTC), which is why only the all-day row came up empty.
function dayKey(iso: string): string {
  return isoDateKey(new Date(iso));
}

// Every local date an event covers, for the day buckets.
//
// Only all-day events are spread across their span. For a date-only event
// iCal's DTEND is EXCLUSIVE — a Monday-to-Friday half term carries a
// Saturday end — so the last covered day is the one before it, and a
// single-day event still yields exactly one key. Timed events stay filed
// under their start day: the week/day timeline positions a block from its
// start, and handing the same block to two columns would draw it twice.
function coveredDayKeys(event: CalendarEvent): string[] {
  const startKey = dayKey(event.start);
  if (!event.allDay || !event.end) return [startKey];

  const start = new Date(event.start);
  const end = new Date(event.end);
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  // Guard the loop on a day count as well as the date comparison, so a
  // malformed end date can't spin it forever.
  for (let i = 0; i < 400 && cursor < end; i++) {
    keys.push(isoDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys.length > 0 ? keys : [startKey];
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

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function startOfWeek(d: Date): Date {
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  return addDays(d, -dow);
}

// Rounded pill for the all-day row in week/day view — roomier than the
// month-grid chip since there's a whole row's height to use.
interface AllDayBarLayout {
  event: CalendarEvent;
  startIdx: number; // first visible column the event covers
  span: number; // how many columns it covers
  lane: number; // which stacked row of the all-day area it sits in
  clippedStart: boolean; // runs back past the first visible day
  clippedEnd: boolean; // runs on past the last visible day
}

// A multi-day all-day event draws as ONE bar across the days it covers,
// which is how a span is read. Rendering it as a separate pill per day —
// which is what this did before — repeats the title, truncates each copy to
// something like "Half Ter…", and conveys nothing about where the span
// begins or ends.
//
// Bars are packed into lanes: each goes in the first lane whose existing
// bars end before this one starts, so concurrent events stack instead of
// colliding. Within a start day the longest span is placed first, so the
// bar reaching furthest sits in the top lane.
function layoutAllDayBars(
  days: Date[],
  eventsByDay: Map<string, CalendarEvent[]>
): { bars: AllDayBarLayout[]; laneCount: number } {
  const dayKeys = days.map(isoDateKey);

  // coveredDayKeys() files the same event object under every day it
  // touches, so walk the visible days and collapse those back into one
  // first/last column range per event.
  const spans = new Map<string, { event: CalendarEvent; first: number; last: number }>();
  dayKeys.forEach((key, idx) => {
    for (const event of eventsByDay.get(key) ?? []) {
      if (!event.allDay) continue;
      const seen = spans.get(event.id);
      if (seen) seen.last = idx;
      else spans.set(event.id, { event, first: idx, last: idx });
    }
  });

  const length = (s: { first: number; last: number }) => s.last - s.first;
  const ordered = [...spans.values()].sort(
    (a, b) =>
      a.first - b.first ||
      length(b) - length(a) ||
      a.event.title.localeCompare(b.event.title)
  );

  const laneLastColumn: number[] = [];
  const bars: AllDayBarLayout[] = [];
  for (const span of ordered) {
    let lane = laneLastColumn.findIndex((last) => last < span.first);
    if (lane === -1) {
      lane = laneLastColumn.length;
      laneLastColumn.push(-1);
    }
    laneLastColumn[lane] = span.last;

    // Does it carry on outside this week? Compared as ISO date strings,
    // which sort lexicographically.
    const covered = coveredDayKeys(span.event);
    bars.push({
      event: span.event,
      startIdx: span.first,
      span: span.last - span.first + 1,
      lane,
      clippedStart: covered[0] < dayKeys[0],
      clippedEnd: covered[covered.length - 1] > dayKeys[dayKeys.length - 1],
    });
  }

  return { bars, laneCount: Math.max(1, laneLastColumn.length) };
}

function AllDayBar({ bar }: { bar: AllDayBarLayout }) {
  const { event, clippedStart, clippedEnd } = bar;
  const accent = chipAccent(event.title);
  // An edge that runs past the visible week is squared off, so a span
  // continuing into the previous or next week reads as cut rather than as
  // beginning or ending here.
  const rounding =
    clippedStart && clippedEnd
      ? "rounded-none"
      : clippedStart
        ? "rounded-l-none rounded-r-md"
        : clippedEnd
          ? "rounded-r-none rounded-l-md"
          : "rounded-md";
  return (
    <div
      title={event.title}
      className={`event-chip ${accent.bg} ${categoryColorClass(
        event.title
      )} ${rounding} truncate px-3 py-1 text-[12px] font-medium text-slate-800`}
    >
      {event.title}
    </div>
  );
}

// One event, as a card in a list. No absolute positioning and no height
// proportional to duration: a 20-minute coffee and a six-hour outing are
// the same size here, and the time is read off the card rather than off a
// vertical axis. That is the whole point of dropping the axis — a day with
// one 09:00 event and one 18:00 event wasted most of its height on empty
// space representing hours in which nothing happened.
function EventCard({ event }: { event: CalendarEvent }) {
  const accent = chipAccent(event.title);
  return (
    <div
      title={event.title}
      className={`event-chip ${accent.bg} ${categoryColorClass(
        event.title
      )} overflow-hidden rounded-md p-2 text-slate-900 shadow-sm`}
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

// Week and day are the same thing at different widths: a column per day,
// each listing that day's events in order. Gone with the hour axis are the
// gutter of hour labels, the 24 x 64px of scaffolding per column, the
// overlap-lane layout (two events at once simply sit one above the other
// now) and the current-time line, which marks a position on an axis that
// no longer exists.
function AgendaView({
  days,
  eventsByDay,
  todayKey,
}: {
  days: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  todayKey: string;
}) {
  const allDay = useMemo(() => layoutAllDayBars(days, eventsByDay), [days, eventsByDay]);
  const gridCols = `repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="calendar-timeline">
      {/* Day tiles label the columns of a week. On a single day they only
          repeat the heading above, as one full-width slab, so they're left
          off. */}
      {days.length > 1 && (
      <div className="grid gap-1" style={{ gridTemplateColumns: gridCols }}>
        {days.map((d) => {
          const key = isoDateKey(d);
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`calendar-weekday-label flex items-baseline justify-center gap-1.5 rounded-md px-2 py-2 ${
                isToday
                  ? "calendar-day-number--today bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <span className="text-[11px] font-medium lowercase tracking-wide">
                {d.toLocaleDateString("en-GB", { weekday: "short" })}
              </span>
              <span className={`text-lg font-semibold ${isToday ? "text-white" : "text-slate-900"}`}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>
      )}

      {/* All-day spans stay above the lists and keep their continuous bars:
          a span is about which days it covers, which a per-day list can't
          say. Only rendered when there is something on, so an ordinary week
          doesn't carry an empty strip. */}
      {allDay.bars.length > 0 && (
        <div
          className="mt-2 grid"
          style={{ gridTemplateColumns: gridCols, gridAutoRows: "minmax(0, auto)" }}
        >
          {allDay.bars.map((bar) => (
            <div
              key={bar.event.id}
              className="min-w-0 py-0.5"
              style={{
                gridColumn: `${bar.startIdx + 1} / span ${bar.span}`,
                gridRow: bar.lane + 1,
              }}
            >
              <AllDayBar bar={bar} />
            </div>
          ))}
        </div>
      )}

      <div
        className="calendar-timeline-body mt-2 grid gap-1"
        style={{ gridTemplateColumns: gridCols }}
      >
        {days.map((d) => {
          const key = isoDateKey(d);
          // All-day events are already drawn as bars above; listing them
          // again here would show each one twice.
          const dayEvents = (eventsByDay.get(key) ?? []).filter((e) => !e.allDay);
          return (
            <div key={key} className="calendar-day-column min-h-[48px] space-y-1">
              {dayEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarView({
  events,
  initialView = "week",
}: {
  events: CalendarEvent[];
  initialView?: ViewMode;
}) {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<ViewMode>(initialView);
  const [cursor, setCursor] = useState(() => today);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      for (const key of coveredDayKeys(event)) {
        const list = map.get(key) ?? [];
        list.push(event);
        map.set(key, list);
      }
    }
    return map;
  }, [events]);

  const todayKey = isoDateKey(today);

  function goToday() {
    setCursor(today);
  }
  function goPrev() {
    setCursor((c) => (view === "week" ? addDays(c, -7) : addDays(c, -1)));
  }
  function goNext() {
    setCursor((c) => (view === "week" ? addDays(c, 7) : addDays(c, 1)));
  }
  let headerTitle: string;
  let rangeLabel: string;
  if (view === "week") {
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

  // The badge used to render `today`, so it sat at "OCT 23" while the
  // heading beside it read "November 2026" — it looked broken, because
  // nothing on screen explained why one number ignored the arrows. It now
  // shows the first day of whatever is on screen, and marks itself when
  // that happens to be today, which is the only thing the old behaviour was
  // trying to convey.
  const badgeDate = view === "week" ? weekDays[0] : cursor;
  // Marked when the range ON SCREEN contains today, not when the badge's own
  // date is today — the badge shows the first day of the week, so comparing
  // that to today would only ever light up on a Monday.
  const showingToday =
    view === "week"
      ? weekDays.some((d) => isoDateKey(d) === todayKey)
      : isoDateKey(cursor) === todayKey;

  return (
    <section className="calendar-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="calendar-header flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div
            className={`calendar-date-badge flex w-14 flex-col items-center rounded-lg border py-1 ${
              showingToday ? "border-blue-600 bg-blue-50" : "border-slate-200"
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {badgeDate.toLocaleDateString("en-GB", { month: "short" })}
            </span>
            <span className="text-lg font-bold text-slate-900">{badgeDate.getDate()}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{headerTitle}</h2>
            <p className="text-xs text-slate-400">{rangeLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="calendar-view-switch flex items-center rounded-lg border border-slate-200 p-0.5">
            {(["week", "day"] as ViewMode[]).map((v) => (
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
        {view === "week" ? (
          <AgendaView days={weekDays} eventsByDay={eventsByDay} todayKey={todayKey} />
        ) : (
          <AgendaView days={[cursor]} eventsByDay={eventsByDay} todayKey={todayKey} />
        )}
      </div>
    </section>
  );
}
