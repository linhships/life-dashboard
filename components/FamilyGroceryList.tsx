import type { GrocerySection } from "@/lib/mealplan";

// Read-only echo of components/GroceryChecklist.tsx for the family
// (grandparent-facing) meals page — same sections/subsections/notes, no
// checkboxes. Ticking one here wouldn't persist anyway: this page is
// served from the family-only server instance too (see middleware.ts,
// which only lets /family and /api/family through), and the checklist's
// POSTs go to /api/meals/groceries — outside that allow-list. A plain
// list avoids a checkbox that silently does nothing.
export function FamilyGroceryList({ sections }: { sections: GrocerySection[] }) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div
          key={section.heading}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-bold text-slate-900">{section.heading}</h2>
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            {section.subsections.map((sub, idx) => (
              <div key={`${sub.subheading ?? "none"}-${idx}`}>
                {sub.subheading && (
                  <h3 className="mb-1.5 text-base font-semibold text-slate-800">
                    {sub.subheading}
                  </h3>
                )}
                {sub.note && <p className="mb-2 text-sm text-slate-500">{sub.note}</p>}
                {sub.items.length > 0 && (
                  <ul className="space-y-1.5">
                    {sub.items.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-base text-slate-700">
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                        {item.text}
                      </li>
                    ))}
                  </ul>
                )}
                {sub.trailingNotes.length > 0 && (
                  <ul
                    className={`space-y-1 text-sm text-slate-500 ${
                      sub.items.length > 0 ? "mt-2 border-t border-slate-100 pt-2" : ""
                    }`}
                  >
                    {sub.trailingNotes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
