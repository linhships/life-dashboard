"use client";

import ReactMarkdown from "react-markdown";
import { CalendarDays, UtensilsCrossed } from "lucide-react";

// The grandparent-facing view of Milo's school news. Deliberately a
// read-only digest: no source-message modals, no attachment links, no
// footnote machinery — all of that is Linh's research trail on
// /gatehouse-comms, and it would only be noise here (it also keeps this
// page from needing any API route beyond the family ones).

export interface FamilyKeyDate {
  date: string;
  event: string;
}

export interface FamilyWeekNote {
  weekStart: string;
  weekEnd: string;
  body: string; // markdown, [[msg:id]] tokens already stripped
}

export interface FamilyMenuDay {
  day: string;
  main: string;
  veg: string;
  side: string;
  dessert: string;
}

function formatKeyDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" });
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(`${weekEnd}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return weekStart;
  return `${start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
}

const markdownComponents = {
  p: (props: React.ComponentProps<"p">) => (
    <p className="mb-2 text-base leading-relaxed text-slate-700 last:mb-0" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 text-base text-slate-700 last:mb-0" {...props} />
  ),
  li: (props: React.ComponentProps<"li">) => <li className="leading-relaxed" {...props} />,
  strong: (props: React.ComponentProps<"strong">) => (
    <strong className="font-semibold text-slate-900" {...props} />
  ),
  // Links in a report body point at school pages; open them in a new tab
  // rather than navigating this page away.
  a: (props: React.ComponentProps<"a">) => (
    <a
      className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-600"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
};

export function FamilyGatehouse({
  upcoming,
  weeks,
  menuDays,
  menuWeekStart,
}: {
  upcoming: FamilyKeyDate[];
  weeks: FamilyWeekNote[];
  menuDays: FamilyMenuDay[];
  menuWeekStart: string | null;
}) {
  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
            <CalendarDays className="h-4 w-4" />
            Coming up
          </p>
          <ul className="mt-3 space-y-2">
            {upcoming.map((item, i) => (
              <li key={i} className="flex flex-col gap-0.5 text-base sm:flex-row sm:gap-3">
                <span className="shrink-0 font-semibold text-slate-900 sm:w-44">
                  {formatKeyDate(item.date)}
                </span>
                <span className="text-slate-700">{item.event}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {menuDays.length > 0 && (
        <section className="overflow-x-auto rounded-2xl border border-orange-200 bg-orange-50/50 p-5">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700">
            <UtensilsCrossed className="h-4 w-4" />
            Lunch this week
            {menuWeekStart ? ` · week of ${formatKeyDate(menuWeekStart)}` : ""}
          </p>
          <table className="mt-3 w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left font-semibold text-slate-500">
                <th className="py-1 pr-3">Day</th>
                <th className="py-1 pr-3">Main</th>
                <th className="py-1">Pudding</th>
              </tr>
            </thead>
            <tbody>
              {menuDays.map((d, i) => (
                <tr key={i} className="border-t border-orange-100 align-top">
                  <td className="py-2 pr-3 font-semibold text-slate-600">{d.day}</td>
                  <td className="py-2 pr-3 text-slate-700">{d.main}</td>
                  <td className="py-2 text-slate-700">{d.dessert}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {weeks.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900">Recent weeks</h2>
          <div className="mt-4 space-y-4">
            {weeks.map((week) => (
              <article
                key={week.weekStart}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-base font-bold text-slate-900">
                  {formatWeekRange(week.weekStart, week.weekEnd)}
                </h3>
                <div className="mt-2">
                  <ReactMarkdown components={markdownComponents}>{week.body}</ReactMarkdown>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {upcoming.length === 0 && weeks.length === 0 && menuDays.length === 0 && (
        <p className="text-base text-slate-600">Nothing new from school just now.</p>
      )}
    </div>
  );
}
