import { School } from "lucide-react";

// Placeholder page for Milo's Gatehouse School — content TBD (e.g. term
// dates, attendance schedule, holidays). Wired into the "Milo & Arlo" nav
// group in components/Sidebar.tsx; no passcode gate since there's nothing
// sensitive here yet.
export default function GatehousePage() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <School className="h-4 w-4" />
          <span>Gatehouse</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Gatehouse</h1>
        <p className="mt-2 text-sm text-slate-500">
          Nothing here yet — this page is a placeholder for Milo&apos;s Gatehouse School info.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
        Content coming soon.
      </div>
    </main>
  );
}
