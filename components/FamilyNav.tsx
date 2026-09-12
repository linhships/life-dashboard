"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Tabs across the top of the /family section. Deliberately the only
// navigation these pages have — there is no link from here into the rest
// of the dashboard (see the comment in components/Sidebar.tsx).
const FAMILY_LINKS: { href: string; label: string }[] = [
  { href: "/family", label: "Home" },
  { href: "/family/milo", label: "Milo's nursery" },
  { href: "/family/arlo", label: "Arlo's nursery" },
  { href: "/family/tori", label: "With Tori" },
  { href: "/family/gatehouse", label: "Milo's school" },
  { href: "/family/meals", label: "This week's meals" },
];

export function FamilyNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {FAMILY_LINKS.map((link) => {
        // "Home" is a prefix of every other href, so it only counts as
        // active on an exact match.
        const isActive =
          link.href === "/family" ? pathname === "/family" : (pathname?.startsWith(link.href) ?? false);
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
