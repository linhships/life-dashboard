import Link from "next/link";
import { Activity, Settings as SettingsIcon } from "lucide-react";
import { ThemePicker } from "@/components/ThemePicker";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <SettingsIcon className="h-4 w-4" />
          <span>Settings</span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">Appearance</h1>
        <p className="mt-2 text-sm text-slate-500">
          Pick a color theme for the whole dashboard. This only changes how things look —
          nothing about the data or how each section works.
        </p>
      </header>

      <section>
        <ThemePicker />
      </section>

      <section className="border-t border-slate-200 pt-6">
        <Link
          href="/settings/data-sources"
          className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
        >
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>
            <span className="block text-sm font-semibold text-slate-900">Data sources</span>
            <span className="mt-0.5 block text-sm text-slate-500">
              Where each page reads from and what it found there — the place to look when a
              section is unexpectedly empty.
            </span>
          </span>
        </Link>
      </section>
    </main>
  );
}
