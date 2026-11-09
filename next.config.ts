import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** Pages behind a login (or one-time links). Search engines are told not to index them. */
const PRIVATE_PATHS = [
  "/admin/:path*",
  "/instructor/:path*",
  "/dashboard/:path*",
  "/enroll/:path*",
  "/application/:path*",
  "/api/:path*",
  "/verify",
  "/invite/:path*",
  "/reset-password",
  "/forgot-password",
];

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["mongodb", "bcryptjs"],
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  // The original BHI forms the PDFs are printed on (read at runtime by src/lib/pdf/forms).
  outputFileTracingIncludes: { "/api/pdf/**/*": ["./assets/forms/**/*"] },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Generated form PDFs may be framed by the LMS itself, so the "Print" button can print them.
      // (A later rule overrides the same header from an earlier one.)
      { source: "/api/pdf/:path*", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
      // Keep private areas, API responses and generated PDFs out of search results even if a link leaks.
      ...PRIVATE_PATHS.map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] })),
      // Favicons, banners and the logo rarely change: let browsers and link-preview crawlers cache them.
      ...["/og/:path*", "/icons/:path*", "/brand/:path*", "/favicon.ico", "/apple-touch-icon.png"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      })),
    ];
  },
};

export default config;
