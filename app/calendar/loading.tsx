// Next.js App Router convention: this automatically wraps app/calendar/
// page.tsx in a Suspense boundary and shows this fallback while the page
// (an async server component that does a live CalDAV round-trip to
// iCloud) is still loading. Without this file, clicking "Calendar" in
// the sidebar gave no visible feedback until the fetch finished — slow
// or flaky enough sometimes that it looked like the click hadn't
// registered, so it was tempting to click again (and again). This makes
// the click's effect visible immediately instead.
export default function CalendarLoading() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-10">
      <header>
        <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-8 w-64 animate-pulse rounded bg-slate-200" />
      </header>

      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 animate-pulse rounded-lg bg-slate-100" />
              <div className="space-y-2">
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
            <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="mt-6 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 space-y-3">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="h-4 animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
