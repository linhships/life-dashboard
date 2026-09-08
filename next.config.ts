import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  // `npm run dev` blocks JS-asset/RSC requests from any origin other than
  // localhost by default (a dev-only security restriction, unrelated to
  // production). Loading the dashboard over Tailscale (e.g. from an
  // iPhone hitting <mac-name>.<tailnet>.ts.net) is a different origin, so
  // the page's initial HTML renders fine but the bundle that makes it
  // interactive gets silently blocked — menu taps do nothing, and
  // passcode fields never update their React state even though the
  // native input still shows typed characters. `*.ts.net` covers
  // Tailscale's MagicDNS hostnames. This only matters for `next dev`;
  // `next start` (production) has no such restriction.
  allowedDevOrigins: ["*.ts.net"],
  // exifr uses runtime `require("fs")`/`require("zlib")` for its Node-only
  // fast path; bundling it (the default) breaks that detection ("Couldn't
  // load fs"/"Couldn't load zlib" in the server log, and every EXIF read
  // silently coming back empty). Marking it external makes Next.js load it
  // via plain Node require at runtime instead, where those work normally.
  serverExternalPackages: ["exifr"],
};

export default nextConfig;
