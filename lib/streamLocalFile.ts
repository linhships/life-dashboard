import fs from "fs";
import { NextRequest, NextResponse } from "next/server";

// Streams a local file as an API response, with HTTP Range support for
// video. Extracted so the /api/family/* media routes don't each repeat it
// (the Range handling in particular: without it Safari won't play an mp4
// served from a route at all — it probes with a Range request before it
// will start — and seeking needs it everywhere). Photos never send a
// Range header, so that path is only exercised by video requests.
//
// The caller is responsible for auth and for resolving `absolutePath`
// through a path-traversal guard; this helper only reads and responds.
export async function streamLocalFile(
  request: NextRequest,
  absolutePath: string
): Promise<NextResponse> {
  const isVideo = absolutePath.toLowerCase().endsWith(".mp4");
  const contentType = isVideo ? "video/mp4" : "image/jpeg";

  if (!isVideo) {
    const data = await fs.promises.readFile(absolutePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  }

  const { size } = await fs.promises.stat(absolutePath);
  const range = request.headers.get("range");
  if (!range) {
    const data = await fs.promises.readFile(absolutePath);
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

  const data = await fs.promises.readFile(absolutePath);
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
