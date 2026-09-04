import { NextRequest, NextResponse } from "next/server";
import {
  addLearningResource,
  deleteLearningResource,
  fetchLinkMetadata,
  getLearningResources,
  updateLearningResource,
} from "@/lib/learning";
import { isAuthedRequest } from "@/lib/learningAuth";

// Guard every route here so the passcode gate can't be bypassed by hitting
// the API directly (the page itself never even fetches this data server-side
// unless the cookie checks out — see app/learning/page.tsx — but these
// routes are also reachable independently, e.g. for add/edit/delete actions).
function unauthorized() {
  return NextResponse.json({ error: "Locked" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();
  return NextResponse.json(getLearningResources());
}

export async function POST(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();
  const body = await request.json();
  const { url, topic } = body as { url?: string; topic?: string };

  if (!url || !topic) {
    return NextResponse.json({ error: "Missing url or topic" }, { status: 400 });
  }

  let normalized: string;
  try {
    normalized = new URL(url).toString();
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const meta = await fetchLinkMetadata(normalized);

  const entry = addLearningResource({
    url: normalized,
    title: meta.title || normalized,
    description: meta.description || "",
    image: meta.image,
    topic,
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
    topic?: string;
    notes?: string;
  };
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const updated = updateLearningResource(id, updates);
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
  deleteLearningResource(id);
  return NextResponse.json({ ok: true });
}
