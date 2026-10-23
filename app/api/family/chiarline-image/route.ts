import { NextRequest, NextResponse } from "next/server";
import { isAuthedRequest } from "@/lib/familyAuth";
import { resolveChiarlineMediaPath } from "@/lib/chiarlineDays";
import { streamLocalFile } from "@/lib/streamLocalFile";

// Chiarline's photos and videos for the /family view.
//
// This has to exist even though /api/chiarline/image already serves the
// same bytes: on the family-only instance middleware.ts 404s everything
// that isn't /family or /api/family, before the request reaches any route.
// Without this the timeline would render its cards and every picture from
// Chiarline would quietly fail to load — the gate doing its job, looking
// like broken images.
//
// Same family passcode as the rest of the section, and the same path
// resolution as the private route, so the filename is still validated
// against the expected shape before anything is read off disk.
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
