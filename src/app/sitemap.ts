import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Read the site address at request time, so NEXT_PUBLIC_SITE_URL / APP_URL set on the server are used.
export const dynamic = "force-dynamic";


/** /sitemap.xml — only the public pages. Everything else needs a login and is kept out of search. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();
  return [
    { url: `${base}/register`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/login`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/register/instructor`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];
}
