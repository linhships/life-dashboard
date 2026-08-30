import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  // exifr uses runtime `require("fs")`/`require("zlib")` for its Node-only
  // fast path; bundling it (the default) breaks that detection ("Couldn't
  // load fs"/"Couldn't load zlib" in the server log, and every EXIF read
  // silently coming back empty). Marking it external makes Next.js load it
  // via plain Node require at runtime instead, where those work normally.
  serverExternalPackages: ["exifr"],
};

export default nextConfig;
