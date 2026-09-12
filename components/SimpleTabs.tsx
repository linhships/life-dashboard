"use client";

import { useState, type ReactNode } from "react";

// Small generic tab switcher. Each tab's content is computed server-side
// by the caller (a Server Component) and passed in already-rendered —
// this component only tracks which one is visible, so switching tabs is
// instant with no extra fetch. Kept generic/undomained rather than named
// for meal plans specifically, in case another family page wants the
// same this-week/next-week pattern later.
export function SimpleTabs({
  tabs,
}: {
  tabs: { label: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActive(i)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-base font-semibold transition-colors ${
              active === i
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-6">{tabs[active]?.content}</div>
    </div>
  );
}
