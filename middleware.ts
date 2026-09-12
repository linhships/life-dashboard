import { NextRequest, NextResponse } from "next/server";

// Enforces the family-only boundary for the second server instance (see
// FAMILY-ACCESS.md) — the one that runs on its own port and is the only
// thing Tailscale Serve exposes to the grandparents. When FAMILY_ONLY is
// set, every request that isn't for /family, /api/family, or Next's own
// build assets gets a plain 404 before it ever reaches a page or API
// route, so there is no server-side path from that instance into
// Finance, Resources, Learning, or any other section — not just no link
// to click. The ordinary instance on port 3000 never sets this env var,
// so nothing here changes for Linh.
const ALLOWED_PREFIXES = ["/family", "/api/family", "/_next", "/favicon.ico"];

function isAllowed(pathname: string): boolean {
  return ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  if (!process.env.FAMILY_ONLY) return NextResponse.next();

  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/family", request.url));
  }
  if (isAllowed(pathname)) return NextResponse.next();

  return new NextResponse("Not found", { status: 404 });
}

// Runs on every request except Next's own hashed static files, which are
// harmless either way (compiled JS/CSS, no data) and are cheaper to skip
// than to route through the check above.
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
