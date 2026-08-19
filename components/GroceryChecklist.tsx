"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { GrocerySection } from "@/lib/mealplan";

export function GroceryChecklist({
  weekStart,
  sections,
  initialChecked,
}: {
  weekStart: string;
  sections: GrocerySection[];
  initialChecked: Record<string, boolean>;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>(initialChecked);

  const toggle = (section: string, subheading: string | null, id: string, text: string) => {
    const next = !checked[id];
    setChecked((prev) => ({ ...prev, [id]: next }));
    fetch("/api/meals/groceries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, weekStart, section, subheading, text, checked: next }),
    }).catch(() => {
      // Best-effort — checklist is a nice-to-have log, not critical path.
    });
  };

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div
          key={section.heading}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-base font-bold text-slate-900">{section.heading}</h2>
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            {section.subsections.map((sub, idx) => (
              <div key={`${sub.subheading ?? "none"}-${idx}`}>
                {sub.subheading && (
                  <h3 className="mb-1.5 text-sm font-semibold text-slate-800">
                    {sub.subheading}
                  </h3>
                )}
                {sub.note && <p className="mb-2 text-xs text-slate-500">{sub.note}</p>}
                {sub.items.length > 0 && (
                  <ul className="space-y-1.5">
                    {sub.items.map((item) => {
                      const isChecked = Boolean(checked[item.id]);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() =>
                              toggle(section.heading, sub.subheading, item.id, item.text)
                            }
                            className="flex w-full items-start gap-2 text-left"
                          >
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                isChecked
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {isChecked && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                            <span
                              className={`text-sm ${
                                isChecked ? "text-slate-400 line-through" : "text-slate-700"
                              }`}
                            >
                              {item.text}
                            </span>
                          </button>
                        </li>
                      );
                    })}
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
