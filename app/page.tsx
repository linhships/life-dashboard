import Link from "next/link";
import {
  GraduationCap,
  Heart,
  Landmark,
  Link2,
  Newspaper,
  School,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { ICON_BADGE, type ThemeColor } from "@/lib/theme";

// The root route used to just be the Finance dashboard (app/page.tsx, now
// moved to app/finance/page.tsx) — with 9+ unrelated sections behind the
// sidebar, landing straight in Finance stopped making sense. This is a
// plain static hub: one tile per top-level destination, no data fetching
// of its own, so it never needs GATEHOUSE_DIR/NEWS_BRIEFING_DIR/etc. to be
// configured to render.

interface Tile {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconColor: ThemeColor;
}

const TILES: Tile[] = [
  {
    href: "/finance",
    label: "Finance",
    description: "Net worth, cash flow, pension allowance, kids' accounts.",
    icon: Landmark,
    iconColor: "blue",
  },
  {
    href: "/news",
    label: "News",
    description: "Daily briefing and AI briefing digests.",
    icon: Newspaper,
    iconColor: "slate",
  },
  {
    href: "/meals",
    label: "Food",
    description: "Weekly meal plan and saved recipes.",
    icon: UtensilsCrossed,
    iconColor: "amber",
  },
  {
    href: "/tori-photos",
    label: "Milo & Arlo",
    description: "Photos and updates from Tori, and Milo's nursery.",
    icon: Heart,
    iconColor: "rose",
  },
  {
    href: "/gatehouse-info",
    label: "Gatehouse",
    description: "Class info, communication, and notes for Milo's school.",
    icon: School,
    iconColor: "purple",
  },
  {
    href: "/resources",
    label: "Resources",
    description: "Saved links and file attachments, by category.",
    icon: Link2,
    iconColor: "emerald",
  },
  {
    href: "/learning",
    label: "Learning",
    description: "Topic-organized reading and reference material.",
    icon: GraduationCap,
    iconColor: "blue",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Life Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">Pick a section to get started.</p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map(({ href, label, description, icon: Icon, iconColor }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${ICON_BADGE[iconColor]}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900 group-hover:text-blue-600">
              {label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
