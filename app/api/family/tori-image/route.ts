import { NextRequest, NextResponse } from "next/server";
import { isAuthedRequest } from "@/lib/familyAuth";
import { resolveToriPhotoPath } from "@/lib/toriPhotos";
import { streamLocalFile } from "@/lib/streamLocalFile";

// Photos and videos from Tori's chats for the /family view — see the
// comment in ../milo-image/route.ts for why these live under /api/family.
// streamLocalFile handles the Range requests the videos need.
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

  return streamLocalFile(request, resolved);
}
