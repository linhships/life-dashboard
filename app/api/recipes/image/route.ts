import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { findRecipeBySlug, primaryExternalUrl } from "@/lib/recipes";
import { fetchLinkMetadata } from "@/lib/links";

// Unlike /api/links/image (which proxies a preview image live on every
// request, for arbitrary user-supplied URLs), this route downloads a
// recipe's photo once and caches it to disk — "download the picture" per
// the request, not just proxy it. It also only ever fetches from a URL it
// looked up itself (the recipe's own source link, keyed by slug), never
// one passed in by the client, so there's no open-proxy/SSRF surface here.
const CACHE_DIR = path.join(process.cwd(), "data", "recipe-images");

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const CONTENT_TYPE_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_BY_CONTENT_TYPE).map(([ct, ext]) => [ext, ct])
);

// A ".none" marker file records "we tried and there's no usable image" —
// several sources here are behind a login (Cookidoo) or just don't expose
// an og:image, so without this every page load would re-fetch and re-fail
// the same lookup. Rerun `npm run dev` (or delete the marker) to retry.
function noneMarkerPath(slug: string): string {
  return path.join(CACHE_DIR, `${slug}.none`);
}

function findCachedImage(slug: string): { filePath: string; contentType: string } | null {
  if (!fs.existsSync(CACHE_DIR)) return null;
  const hit = fs
    .readdirSync(CACHE_DIR)
    .find((f) => f.startsWith(`${slug}.`) && !f.endsWith(".none"));
  if (!hit) return null;
  const ext = path.extname(hit).slice(1).toLowerCase();
  return { filePath: path.join(CACHE_DIR, hit), contentType: CONTENT_TYPE_BY_EXT[ext] || "image/jpeg" };
}

function markNoImage(slug: string): void {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(noneMarkerPath(slug), "", "utf-8");
}

async function downloadAndCache(
  slug: string,
  imageUrl: string
): Promise<{ filePath: string; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
    const ext = EXT_BY_CONTENT_TYPE[contentType];
    if (!ext) return null; // not a recognized image type — skip rather than guess

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;

    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    const filePath = path.join(CACHE_DIR, `${slug}.${ext}`);
    fs.writeFileSync(filePath, buffer);
    return { filePath, contentType };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return new NextResponse("Invalid slug", { status: 400 });
  }

  const cached = findCachedImage(slug);
  if (cached) {
    const data = fs.readFileSync(cached.filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": cached.contentType, "Cache-Control": "public, max-age=86400" },
    });
  }

  if (fs.existsSync(noneMarkerPath(slug))) {
    return new NextResponse("No image available", { status: 404 });
  }

  const recipe = findRecipeBySlug(slug);
  const sourceUrl = recipe ? primaryExternalUrl(recipe) : null;
  if (!sourceUrl) {
    markNoImage(slug);
    return new NextResponse("No source link for this recipe", { status: 404 });
  }

  const meta = await fetchLinkMetadata(sourceUrl);
  if (!meta.image) {
    markNoImage(slug);
    return new NextResponse("No image found on source page", { status: 404 });
  }

  const downloaded = await downloadAndCache(slug, meta.image);
  if (!downloaded) {
    markNoImage(slug);
    return new NextResponse("Failed to download image", { status: 502 });
  }

  const data = fs.readFileSync(downloaded.filePath);
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": downloaded.contentType, "Cache-Control": "public, max-age=86400" },
  });
}
