import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
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
    ];
  },
};

export default config;
