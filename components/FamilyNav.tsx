"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Tabs across the top of the /family section. Deliberately the only
// navigation these pages have — there is no link from here into the rest
// of the dashboard (see the comment in components/Sidebar.tsx).
const FAMILY_LINKS: { href: string; label: string }[] = [
  { href: "/family", label: "Home" },
  { href: "/family/arlo", label: "Arlo's Nursery & Chiarline" },
  { href: "/family/gatehouse-info", label: "Gatehouse Info" },
  { href: "/family/gatehouse", label: "Gatehouse Comms" },
];

export function FamilyNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {FAMILY_LINKS.map((link) => {
          // Match on a path BOUNDARY, not a bare prefix. Two of these hrefs
          // are prefixes of each other — "/family/gatehouse" is a prefix of
          // "/family/gatehouse-info" — so startsWith lit both tabs at once
          // on the Info page. Requiring the next character to be "/" means
          // a sibling route can never match, while a future sub-route of a
          // section still keeps its parent tab active. "/family" is exact
          // only, since every other href sits underneath it.
          const isActive =
            pathname === link.href ||
            (link.href !== "/family" && (pathname?.startsWith(`${link.href}/`) ?? false));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-2 text-base font-medium transition-colors ${
              isActive
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
