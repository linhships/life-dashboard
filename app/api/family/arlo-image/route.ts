import { NextRequest, NextResponse } from "next/server";
import { isAuthedRequest } from "@/lib/familyAuth";
import { resolveArloNurseryPhotoPath } from "@/lib/arloNurseryPhotos";
import { streamLocalFile } from "@/lib/streamLocalFile";

// Arlo's nursery photos for the /family view — see the comment in
// ../milo-image/route.ts for why these live under /api/family.
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

  return streamLocalFile(request, resolved);
}
