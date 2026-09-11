import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { FamilyNav } from "@/components/FamilyNav";

// The grandparent-facing section: photos of Milo & Arlo and news from
// Milo's school, and nothing else. It has its own header/nav rather than
// the app sidebar (which is suppressed here — see components/Sidebar.tsx),
// so there is no path from these pages into Finance or anything private.
//
// Type is a step larger than the rest of the app throughout: this is read
// on a phone or an iPad by people who don't want to squint.
export default function FamilyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/60">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex items-center gap-3">
            <BrandMark className="h-9 w-9 text-lg" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Family
              </p>
              <p className="text-lg font-bold text-slate-900">Milo &amp; Arlo</p>
            </div>
          </div>
          <div className="mt-5">
            <FamilyNav />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
