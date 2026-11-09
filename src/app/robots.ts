import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Read the site address at request time, so NEXT_PUBLIC_SITE_URL / APP_URL set on the server are used.
export const dynamic = "force-dynamic";


/** /robots.txt — public sign-in and sign-up pages may be crawled; private areas and the API may not. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/login", "/register", "/register/instructor", "/og/", "/icons/", "/brand/"],
        disallow: [
          "/admin",
          "/instructor",
          "/dashboard",
          "/enroll",
          "/application",
          "/api/",
          "/verify",
          "/invite/",
          "/reset-password",
          "/forgot-password",
          "/*?next=",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
