import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { isAuthedRequest } from "@/lib/toriPhotosAuth";
import { resolveToriPhotoPath } from "@/lib/toriPhotos";

// Streams a photo or video from the local WhatsApp export folder. Same
// pattern as /api/news/image: a *local* file, not a remote fetch, guarded
// by resolveToriPhotoPath()'s path-traversal check plus the passcode gate
// (this route serves photos/videos of the kids, so it's gated same as the
// page).
//
// Videos need HTTP Range support: without it, Safari in particular won't
// play an mp4 served from a route at all (it probes with a Range request
// before it will even start), and scrubbing/seeking needs it in every
// browser. Photos never send a Range header, so this only kicks in for
// video requests.
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

  const isVideo = resolved.toLowerCase().endsWith(".mp4");
  const contentType = isVideo ? "video/mp4" : "image/jpeg";

  if (!isVideo) {
    const data = await fs.promises.readFile(resolved);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  }

  const { size } = await fs.promises.stat(resolved);
  const range = request.headers.get("range");
  if (!range) {
    const data = await fs.promises.readFile(resolved);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=86400",
      },
    });
  }

  const match = range.match(/bytes=(\d*)-(\d*)/);
  const start = match && match[1] ? parseInt(match[1], 10) : 0;
  const end = match && match[2] ? parseInt(match[2], 10) : size - 1;
  const chunkSize = end - start + 1;

  const data = await fs.promises.readFile(resolved);
  const chunk = data.subarray(start, end + 1);
  return new NextResponse(new Uint8Array(chunk), {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(chunkSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
