import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { getLearningGuides } from "@/lib/learningGuides";
import { THEME_INIT_SCRIPT } from "@/lib/themePrefs";

// Tab icon = the same serif "L" monogram as components/BrandMark.tsx
// (ink square, off-white letter), inlined as an SVG data URL so no
// separate icon file is needed. Colours are literal here (an SVG data URL
// can't read the page's CSS variables) and match the default theme.
const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1f2923"/><text x="32" y="47" font-family="ui-serif, Iowan Old Style, Palatino, Georgia, serif" font-size="42" font-weight="600" fill="#fcfaf7" text-anchor="middle">L</text></svg>'
  );

export const metadata: Metadata = {
  title: "Life Dashboard",
  description: "Personal finance, planning, and life dashboard.",
  icons: {
    icon: FAVICON,
  },
};

// The sidebar's Learning group depends on files on disk, so every route
// renders dynamically — otherwise the statically prerendered pages (/,
// /settings) would keep a build-time snapshot of the guide list.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Study guides are files on disk (lib/learningGuides.ts); the sidebar
  // lists them under Learning. Read here (server) and passed down, since
  // the Sidebar itself is a client component.
  const learningGuides = getLearningGuides().map((g) => ({ slug: g.slug, label: g.topic }));
  return (
    // suppressHydrationWarning: the script below deliberately sets
    // data-theme on this element before React hydrates (see
    // lib/themePrefs.ts), so the server-rendered HTML (no attribute) and
    // the client DOM at hydration time (attribute present, for anyone
    // who's picked Haven or Neobrutal) never match. That's expected and
    // is the standard fix for this pattern — this only silences the
    // mismatch warning for html's own attributes, not for its children.
    <html lang="en" className="h-full scroll-smooth antialiased" suppressHydrationWarning>
      <head>
        {/* Applies a saved non-default theme before first paint, so
            there's no flash of the default look on reload. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-slate-50 font-sans">
        <div className="flex min-h-full flex-col md:flex-row">
          <Sidebar learningGuides={learningGuides} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
