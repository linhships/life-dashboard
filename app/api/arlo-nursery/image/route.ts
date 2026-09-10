import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { isAuthedRequest } from "@/lib/arloNurseryPhotosAuth";
import { resolveArloNurseryPhotoPath } from "@/lib/arloNurseryPhotos";

// Streams a photo from the local Arlo nursery photos folder. Same pattern
// as /api/milo-nursery/image — plain jpegs only — guarded by
// resolveArloNurseryPhotoPath()'s path-traversal check plus the passcode
// gate (this route serves photos of Arlo, so it's gated same as the page).
export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return new NextResponse("Locked", { status: 401 });
  }

  const monthDir = request.nextUrl.searchParams.get("monthDir");
  const file = request.nextUrl.searchParams.get("file");
  if (!monthDir || !file) {
    return new NextResponse("Missing monthDir or file", { status: 400 });
  }

  const resolved = resolveArloNurseryPhotoPath(monthDir, file);
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
