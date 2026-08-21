import { NextRequest, NextResponse } from "next/server";
import {
  LINKS_AUTH_COOKIE,
  LINKS_AUTH_MAX_AGE_SECONDS,
  isAuthedRequest,
  issueToken,
  verifyPasscode,
} from "@/lib/linksAuth";

// Login: verify the passcode and set the sliding session cookie.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { passcode } = body as { passcode?: string };

  if (!passcode || !verifyPasscode(passcode)) {
    return NextResponse.json({ ok: false, error: "Incorrect passcode" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(LINKS_AUTH_COOKIE, issueToken(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: LINKS_AUTH_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}

// Heartbeat: called periodically by the client while the Links page is
// open and active, to slide the session window forward. Fails (401) if the
// cookie is missing or stale, which the client treats as "locked again."
export async function PUT(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LINKS_AUTH_COOKIE, issueToken(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: LINKS_AUTH_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}
