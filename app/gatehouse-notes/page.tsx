import { NotebookText } from "lucide-react";
import { getGatehouseNotes } from "@/lib/gatehouseNotes";
import { GatehouseNotes } from "@/components/GatehouseNotes";

export const dynamic = "force-dynamic";

// Hand-maintained summary of the key points from the reference documents
// in Important Links (nursery booklet, PE & Games overview) — not the full
// documents, just what matters for Milo's Nursery year. See
// lib/gatehouseNotes.ts for the data model.
export default function GatehouseNotesPage() {
  const notes = getGatehouseNotes();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <NotebookText className="h-4 w-4" />
          <span>Notes</span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">Gatehouse — Notes</h1>
        <p className="mt-2 text-sm text-slate-500">
          Summary of the most important bits from the nursery booklet and the PE &amp; Games
          overview (nursery-relevant parts only). See Important Links on the Class Info page for
          the full documents.
        </p>
      </header>

      <GatehouseNotes notes={notes} />
    </main>
  );
}
