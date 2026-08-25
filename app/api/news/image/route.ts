import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { resolveNewsImagePath } from "@/lib/news";

// Streams a locally downloaded article image from the news briefing dir's
// images/ subfolder. Unlike /api/links/image (which proxies a *remote*
// URL through this server to dodge hotlink protection), this serves a
// *local* file the daily-news task already downloaded — see
// resolveNewsImagePath() for the path-traversal guard.
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src");
  if (!src) {
    return new NextResponse("Missing src", { status: 400 });
  }

  const resolved = resolveNewsImagePath(src);
  if (!resolved) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = resolved.slice(resolved.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new NextResponse("Unsupported file type", { status: 415 });
  }

  const data = await fs.promises.readFile(resolved);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
