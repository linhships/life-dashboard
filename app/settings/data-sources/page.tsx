import Link from "next/link";
import { cookies } from "next/headers";
import { Activity } from "lucide-react";

import { PasscodeAuthGuard } from "@/components/PasscodeAuthGuard";
import { PasscodePageGate } from "@/components/PasscodePageGate";
import { FINANCE_AUTH_COOKIE, isAuthed } from "@/lib/financeAuth";
import { getDataHealth, type HealthRow, type HealthStatus } from "@/lib/dataHealth";

export const dynamic = "force-dynamic";

// A single page answering "is every source still wired up, and is anything
// actually in it". Behind the Finance passcode because it prints the real
// folder paths on this machine.
//
// It exists because every real failure in this app has presented as a page
// that loads fine and shows nothing: each reader swallows its own errors
// and returns an empty list, which is the right behaviour for a page and a
// terrible one for debugging. See lib/dataHealth.ts.

const STATUS: Record<HealthStatus, { dot: string; text: string; label: string }> = {
  ok: { dot: "bg-emerald-500", text: "text-emerald-700", label: "OK" },
  empty: { dot: "bg-amber-500", text: "text-amber-700", label: "Empty" },
  missing: { dot: "bg-rose-500", text: "text-rose-700", label: "Folder missing" },
  unset: { dot: "bg-slate-300", text: "text-slate-500", label: "Not configured" },
  error: { dot: "bg-rose-500", text: "text-rose-700", label: "Error" },
};

function Row({ row }: { row: HealthRow }) {
  const s = STATUS[row.status];
  return (
    <div className="border-t border-slate-100 px-4 py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden />
          <span className="text-sm font-semibold text-slate-900">{row.label}</span>
        </span>
        <Link href={row.page} className="text-xs text-slate-400 hover:text-slate-600">
          {row.page}
        </Link>
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${s.text}`}>
          {s.label}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
        <span className="text-slate-700">{row.found}</span>
        {row.newest && <span className="text-slate-400">newest file {row.newest}</span>}
        {row.unparsed ? (
          <span className="font-semibold text-amber-700">
            {row.unparsed} file{row.unparsed === 1 ? "" : "s"} {row.unparsedLabel}
          </span>
        ) : null}
      </div>

      {row.unparsed && row.unparsedExamples.length > 0 ? (
        <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-amber-700/80">
          {row.unparsedExamples.map((name) => (
            <li key={name} className="truncate" title={name}>
              {name}
            </li>
          ))}
          {row.unparsed > row.unparsedExamples.length && (
            <li className="not-italic text-slate-400">
              + {row.unparsed - row.unparsedExamples.length} more
            </li>
          )}
        </ul>
      ) : null}

      <p className="mt-1 truncate font-mono text-[11px] text-slate-400" title={row.resolvedPath ?? ""}>
        {row.envVar ? `${row.envVar}=` : ""}
        {row.resolvedPath ?? "(unset)"}
        {row.envVar && row.envVar !== "DATA_DIR" && !row.configured ? " — unset" : ""}
      </p>

      {row.error && (
        <p className="mt-1 font-mono text-[11px] text-rose-600">{row.error}</p>
      )}
      {row.hint && <p className="mt-1 text-[11px] italic text-slate-500">{row.hint}</p>}
    </div>
  );
}

export default async function DataSourcesPage() {
  const cookieStore = await cookies();
  const authed = isAuthed(cookieStore.get(FINANCE_AUTH_COOKIE)?.value);

  // Gate first: the real folder paths never reach an unauthenticated
  // request's HTML, same pattern as the other gated pages.
  if (!authed) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <PasscodePageGate authEndpoint="/api/finance/auth" label="Data sources" />
      </main>
    );
  }

  const { rows, sampleDataForced } = await getDataHealth();
  const problems = rows.filter((r) => r.status !== "ok" || r.unparsed);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Activity className="h-4 w-4" />
          <span>Settings</span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
          Data sources
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Where each page reads from, and what it found there just now. Nothing on this page
          changes anything — it&apos;s here because a source that has moved or changed shape
          renders as an ordinary empty page rather than an error.
        </p>
        <p className="mt-2 text-sm font-medium text-slate-700">
          {problems.length === 0
            ? "All sources reading normally."
            : `${problems.length} source${problems.length === 1 ? "" : "s"} worth a look.`}
        </p>
      </header>

      {sampleDataForced && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">USE_SAMPLE_DATA=true</strong> — every page is showing
          fictional sample data, not your real numbers.
        </div>
      )}

      <PasscodeAuthGuard authEndpoint="/api/finance/auth" label="Data sources">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {rows.map((row) => (
            <Row key={`${row.label}-${row.page}`} row={row} />
          ))}
        </section>

        <p className="text-[11px] leading-relaxed text-slate-400">
          &ldquo;Empty&rdquo; means the folder resolved but the reader surfaced nothing — usually
          a format change rather than a missing folder, and the single most useful line here. The
          file counts below a row are files the reader can see but cannot <em>name</em>: they use
          each reader&apos;s own filename patterns, so the two can&apos;t drift apart, and files
          excluded on purpose — sent by someone else, or older than a cutoff — are never counted.
          A non-zero number means a naming or folder convention changed underneath the parser.
        </p>
      </PasscodeAuthGuard>

      <Link href="/settings" className="inline-block text-sm text-slate-500 hover:text-slate-700">
        ← Appearance settings
      </Link>
    </main>
  );
}
