import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** /manifest.webmanifest — name, colours and icons when the LMS is added to a phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.appName} | ${site.name}`,
    short_name: site.shortName,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: site.backgroundColor,
    theme_color: site.themeColor,
    lang: "en-US",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
