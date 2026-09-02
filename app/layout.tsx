import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { THEME_INIT_SCRIPT } from "@/lib/themePrefs";

// Tab icon = Linh's emoji from the Troettger AI calendar convention (👩🏻),
// inlined as an SVG data URL so no separate icon file is needed.
const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="32" y="52" font-size="62" text-anchor="middle">👩🏻</text></svg>'
  );

export const metadata: Metadata = {
  title: "Life Dashboard",
  description: "Personal finance, planning, and life dashboard.",
  icons: {
    icon: FAVICON,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
          <Sidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
