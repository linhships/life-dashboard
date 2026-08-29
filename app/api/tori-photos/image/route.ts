import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { isAuthedRequest } from "@/lib/toriPhotosAuth";
import { resolveToriPhotoPath } from "@/lib/toriPhotos";

// Streams a photo from the local WhatsApp export folder. Same pattern as
// /api/news/image: a *local* file, not a remote fetch, guarded by
// resolveToriPhotoPath()'s path-traversal check plus the passcode gate
// (this route serves photos of the kids, so it's gated same as the page).
export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return new NextResponse("Locked", { status: 401 });
  }

  const chat = request.nextUrl.searchParams.get("chat");
  const file = request.nextUrl.searchParams.get("file");
  if (!chat || !file) {
    return new NextResponse("Missing chat or file", { status: 400 });
  }

  const resolved = resolveToriPhotoPath(chat, file);
  if (!resolved) {
    return new NextResponse("Not found", { status: 404 });
  }

  const data = await fs.promises.readFile(resolved);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
