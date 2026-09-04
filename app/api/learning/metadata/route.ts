import { NextRequest, NextResponse } from "next/server";
import { fetchLinkMetadata } from "@/lib/learning";
import { isAuthedRequest } from "@/lib/learningAuth";

// Standalone metadata lookup, used by the "Refresh" action on an existing
// card (e.g. if the page's preview image changed, or the first fetch came
// back empty).
export async function POST(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return NextResponse.json({ error: "Locked" }, { status: 401 });
  }
  const body = await request.json();
  const { url } = body as { url?: string };
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  const meta = await fetchLinkMetadata(url);
  return NextResponse.json(meta);
}
