import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { isAuthedRequest } from "@/lib/familyAuth";
import { resolveGatehouseAttachment } from "@/lib/gatehouse";

// Gatehouse attachments for the /family view.
//
// Same bytes as /api/gatehouse/file, but reachable: the family-only
// instance 404s anything outside /family and /api/family before it reaches
// a route (middleware.ts), so without this every attachment in a source
// message would be a broken image and a dead download.
//
// Behind the family passcode, and resolution still goes through
// resolveGatehouseAttachment, which is the path-traversal guard — only
// "files/..." paths resolving inside GATEHOUSE_DIR/files are ever read.
const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
};
const INLINE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"]);

export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return new NextResponse("Locked", { status: 401 });
  }

  const file = request.nextUrl.searchParams.get("path");
  if (!file) {
    return new NextResponse("Missing path", { status: 400 });
  }

  const resolved = resolveGatehouseAttachment(file);
  if (!resolved) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXT[ext] || "application/octet-stream";
  const data = await fs.promises.readFile(resolved);

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "private, max-age=86400",
  };
  if (!INLINE_EXT.has(ext)) {
    headers["Content-Disposition"] = `attachment; filename="${path.basename(resolved)}"`;
  }

  return new NextResponse(new Uint8Array(data), { headers });
}
