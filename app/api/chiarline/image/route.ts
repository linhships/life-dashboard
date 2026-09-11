import { NextRequest, NextResponse } from "next/server";
// Chiarline's photos live on the "Arlo's Nursery and Chiarline Time" page,
// so they're behind that page's gate rather than one of their own — one
// page, one passcode.
import { isAuthedRequest } from "@/lib/arloNurseryPhotosAuth";
import { resolveChiarlineMediaPath } from "@/lib/chiarlineDays";
import { streamLocalFile } from "@/lib/streamLocalFile";

export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return new NextResponse("Locked", { status: 401 });
  }

  const file = request.nextUrl.searchParams.get("file");
  if (!file) {
    return new NextResponse("Missing file", { status: 400 });
  }

  const resolved = resolveChiarlineMediaPath(file);
  if (!resolved) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Handles the Range requests the videos in this export need.
  return streamLocalFile(request, resolved);
}
