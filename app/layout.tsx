import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

// Tab icon = Linh's emoji from the Troettger AI calendar convention (👩🏻),
// inlined as an SVG data URL so no separate icon file is needed.
const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="32" y="46" font-size="42" text-anchor="middle">👩🏻</text></svg>'
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
    <html lang="en" className="h-full scroll-smooth antialiased">
      <body className="min-h-full bg-slate-50 font-sans">
        <div className="flex min-h-full flex-col md:flex-row">
          <Sidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
