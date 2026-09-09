import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getResources, resolveResourceAttachment } from "@/lib/resources";
import { isAuthedRequest } from "@/lib/resourcesAuth";

// Serves an uploaded file attachment (kind: "file" resources) straight off
// disk, looked up by resource id rather than a raw filename — keeps the
// path-traversal guard entirely inside resolveResourceAttachment and means
// a request can't reference anything that isn't a real resource's own
// attachment. Images/PDFs render inline; everything else gets
// Content-Disposition: attachment so the browser offers to save it.
const INLINE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf"]);

export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return new NextResponse("Locked", { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return new NextResponse("Missing id", { status: 400 });
  }

  const entry = getResources().find((r) => r.id === id);
  if (!entry || entry.kind !== "file" || !entry.attachmentStoredName) {
    return new NextResponse("Not found", { status: 404 });
  }

  const resolved = resolveResourceAttachment(entry.attachmentStoredName);
  if (!resolved) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = entry.attachmentMime || "application/octet-stream";
  const data = await fs.promises.readFile(resolved);
  const filename = entry.attachmentFilename || path.basename(resolved);

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "private, max-age=86400",
    "Content-Disposition": `${INLINE_EXT.has(ext) ? "inline" : "attachment"}; filename="${filename.replace(/"/g, "")}"`,
  };

  return new NextResponse(new Uint8Array(data), { headers });
}
