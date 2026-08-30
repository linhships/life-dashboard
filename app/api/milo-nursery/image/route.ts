import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { isAuthedRequest } from "@/lib/miloNurseryPhotosAuth";
import { resolveMiloNurseryPhotoPath } from "@/lib/miloNurseryPhotos";

// Streams a photo from the local nursery photos folder. Same pattern as
// /api/tori-photos/image, minus the video/Range handling — this folder is
// plain jpegs only — guarded by resolveMiloNurseryPhotoPath()'s
// path-traversal check plus the passcode gate (this route serves photos of
// Milo, so it's gated same as the page).
export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return new NextResponse("Locked", { status: 401 });
  }

  const file = request.nextUrl.searchParams.get("file");
  if (!file) {
    return new NextResponse("Missing file", { status: 400 });
  }

  const resolved = resolveMiloNurseryPhotoPath(file);
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
