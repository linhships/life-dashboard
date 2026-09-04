import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { resolveGatehouseAttachment } from "@/lib/gatehouse";

// Serves attachments referenced from Gatehouse messages (images, PDFs,
// docx) straight off disk. resolveGatehouseAttachment() does the
// path-traversal guard — only "files/..." paths that resolve inside
// GATEHOUSE_DIR/files are ever read. Images render inline in the message
// popup; other types get Content-Disposition so the browser offers to open
// or download them rather than trying (and failing) to render as text.
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
