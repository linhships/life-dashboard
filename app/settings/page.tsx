import { Settings as SettingsIcon } from "lucide-react";
import { ThemePicker } from "@/components/ThemePicker";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <SettingsIcon className="h-4 w-4" />
          <span>Settings</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Appearance</h1>
        <p className="mt-2 text-sm text-slate-500">
          Pick a color theme for the whole dashboard. This only changes how things look —
          nothing about the data or how each section works.
        </p>
      </header>

      <section>
        <ThemePicker />
      </section>
    </main>
  );
}
