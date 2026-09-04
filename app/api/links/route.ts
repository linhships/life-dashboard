import { NextRequest, NextResponse } from "next/server";
import { addLink, deleteLink, fetchLinkMetadata, getLinks, updateLink } from "@/lib/links";
import { isAuthedRequest } from "@/lib/linksAuth";

// Guard every route here so the passcode gate can't be bypassed by hitting
// the API directly (the page itself never even fetches this data server-side
// unless the cookie checks out — see app/links/page.tsx — but these routes
// are also reachable independently, e.g. for add/edit/delete actions).
function unauthorized() {
  return NextResponse.json({ error: "Locked" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();
  return NextResponse.json(getLinks());
}

export async function POST(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();
  const body = await request.json();
  const { url, category, forLearn } = body as {
    url?: string;
    category?: string;
    forLearn?: boolean;
  };

  if (!url || !category) {
    return NextResponse.json({ error: "Missing url or category" }, { status: 400 });
  }

  let normalized: string;
  try {
    normalized = new URL(url).toString();
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const meta = await fetchLinkMetadata(normalized);

  const entry = addLink({
    url: normalized,
    title: meta.title || normalized,
    description: meta.description || "",
    image: meta.image,
    category,
    forLearn: Boolean(forLearn),
  });

  return NextResponse.json(entry);
}

export async function PATCH(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();
  const body = await request.json();
  const { id, ...updates } = body as {
    id?: string;
    title?: string;
    description?: string;
    image?: string | null;
    category?: string;
    notes?: string;
    forLearn?: boolean;
  };
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const updated = updateLink(id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  deleteLink(id);
  return NextResponse.json({ ok: true });
}
