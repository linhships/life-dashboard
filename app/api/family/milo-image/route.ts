import { NextRequest, NextResponse } from "next/server";
import { isAuthedRequest } from "@/lib/familyAuth";
import { resolveMiloNurseryPhotoPath } from "@/lib/miloNurseryPhotos";
import { streamLocalFile } from "@/lib/streamLocalFile";

// Milo's nursery photos for the /family view. Same file + same
// path-traversal guard as /api/milo-nursery/image, but behind the family
// passcode instead of Linh's own — and, importantly, under /api/family/*,
// which is the only API prefix the tailnet proxy forwards (see
// FAMILY-ACCESS.md).
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

  return streamLocalFile(request, resolved);
}
