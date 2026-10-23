// This route is the only one in the family section that waits on a network
// round-trip (iCloud CalDAV) rather than a local file read. Next wraps the
// page in this via Suspense, so tapping "Calendar" shows something at once
// instead of looking like a tap that didn't land — which is what made the
// old /calendar page get clicked four or five times.
export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <header>
        <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-slate-200" />
      </header>

      <div className="calendar-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="calendar-header flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-36 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="mt-4 grid grid-cols-7 gap-px">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse bg-slate-100" />
          ))}
        </div>
        <div className="mt-px grid grid-cols-7 gap-px">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse bg-slate-50" />
          ))}
        </div>
      </div>
    </main>
  );
}
