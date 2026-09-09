import { NextRequest, NextResponse } from "next/server";
import {
  addResource,
  deleteResource,
  fetchResourceMetadata,
  getResources,
  saveResourceAttachment,
  updateResource,
} from "@/lib/resources";
import { isAuthedRequest } from "@/lib/resourcesAuth";

// Guard every route here so the passcode gate can't be bypassed by hitting
// the API directly (the page itself never even fetches this data server-side
// unless the cookie checks out — see app/resources/page.tsx — but these
// routes are also reachable independently, e.g. for add/edit/delete actions).
function unauthorized() {
  return NextResponse.json({ error: "Locked" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();
  return NextResponse.json(getResources());
}

// Two request shapes land here, told apart by Content-Type:
//  - multipart/form-data: a file upload (fields: file, category, forLearn,
//    title?) — saved to disk via saveResourceAttachment and added as a
//    kind: "file" entry.
//  - application/json: the original bookmark-a-URL flow (fields: url,
//    category, forLearn, title?) — added as a kind: "url" entry, same as
//    before. `title` is optional in both shapes: if left blank, it falls
//    back to the fetched OG title (url) or the uploaded filename (file).
export async function POST(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const category = form.get("category");
    const forLearn = form.get("forLearn") === "true";
    const titleOverride = form.get("title");

    if (!(file instanceof File) || !category || typeof category !== "string") {
      return NextResponse.json({ error: "Missing file or category" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = saveResourceAttachment(buffer, file.name);

    const entry = addResource({
      kind: "file",
      url: "",
      title: (typeof titleOverride === "string" && titleOverride.trim()) || file.name,
      description: "",
      image: null,
      category,
      forLearn,
      attachmentStoredName: saved.storedName,
      attachmentFilename: file.name,
      attachmentMime: saved.mime,
      attachmentSize: saved.size,
    });

    return NextResponse.json(entry);
  }

  const body = await request.json();
  const { url, category, forLearn, title: titleOverride } = body as {
    url?: string;
    category?: string;
    forLearn?: boolean;
    title?: string;
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

  const meta = await fetchResourceMetadata(normalized);

  const entry = addResource({
    kind: "url",
    url: normalized,
    title: titleOverride?.trim() || meta.title || normalized,
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
  const updated = updateResource(id, updates);
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
  deleteResource(id);
  return NextResponse.json({ ok: true });
}
