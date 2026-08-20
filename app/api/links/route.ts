import { NextRequest, NextResponse } from "next/server";
import { addLink, deleteLink, fetchLinkMetadata, getLinks, updateLink } from "@/lib/links";

export async function GET() {
  return NextResponse.json(getLinks());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, category } = body as { url?: string; category?: string };

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
  });

  return NextResponse.json(entry);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body as {
    id?: string;
    title?: string;
    description?: string;
    image?: string | null;
    category?: string;
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
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  deleteLink(id);
  return NextResponse.json({ ok: true });
}
