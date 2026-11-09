import type { Metadata } from "next";
import { isPrivateUrl } from "@/lib/url-host";

/**
 * One place for everything search engines and link previews read about the LMS.
 * Change the organisation details here; every page, the sitemap, robots.txt, the web app manifest
 * and the structured data (JSON-LD) pick them up.
 */
export const site = {
  name: "Bright Horizon Institute",
  shortName: "BHI",
  appName: "BHI Learning Portal",
  description:
    "Apply to Bright Horizon Institute online: create your student account, choose a course, complete your enrollment forms and documents, then follow your classes and attendance in one place.",
  /** Public marketing website (not the LMS). */
  website: "https://www.brighthorizoninstitute.com",
  phone: "+1-201-377-1594",
  foundingDate: "2009",
  address: {
    streetAddress: "910 Bergen Ave, Floor 3",
    addressLocality: "Jersey City",
    addressRegion: "NJ",
    postalCode: "07306",
    addressCountry: "US",
  },
  locale: "en_US",
  themeColor: "#1F4E46",
  backgroundColor: "#173B35",
  keywords: [
    "Bright Horizon Institute",
    "BHI",
    "BHI LMS",
    "BHI student portal",
    "vocational training Jersey City",
    "career training New Jersey",
    "Equus One-Stop training",
    "DFS training program",
    "Hudson County training",
    "Bergen County training",
    "Somerset County training",
    "Medical Assistant course",
    "Pharmacy Technician course",
    "Patient Care Technician course",
    "Home Health Aide course",
    "Cisco Network Associate course",
    "Solar Panel Installer course",
    "Child Development Associate course",
    "GED classes Jersey City",
    "ESL classes Jersey City",
  ],
} as const;

/**
 * The public address of the LMS, used for canonical links, the sitemap and absolute image URLs.
 * Set NEXT_PUBLIC_SITE_URL (or APP_URL) to the live address, e.g. https://lms.brighthorizoninstitute.com.
 * A localhost / private-network value is ignored in favour of the default, so link previews never point
 * at a machine nobody else can reach.
 */
export function siteUrl(): string {
  const candidates = [process.env.NEXT_PUBLIC_SITE_URL, process.env.APP_URL, "https://lms.brighthorizoninstitute.com"];
  for (const raw of candidates) {
    const v = raw?.trim().replace(/^(["'])(.*)\1$/, "$2");
    if (!v) continue;
    try {
      const u = new URL(v);
      if (process.env.NODE_ENV === "production" && isPrivateUrl(u.origin)) continue;
      return u.origin;
    } catch {
      /* try the next one */
    }
  }
  return "https://lms.brighthorizoninstitute.com";
}

/** Social banners in /public/og (1200x630). */
export const banners = {
  default: "/og/og-default.png",
  login: "/og/og-login.png",
  register: "/og/og-register.png",
  instructorSignup: "/og/og-instructor.png",
  password: "/og/og-password.png",
  student: "/og/og-student.png",
  instructor: "/og/og-instructor-portal.png",
  admin: "/og/og-admin.png",
  twitter: "/og/twitter-default.png",
} as const;

export type Banner = keyof typeof banners;

const NOINDEX: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false, noimageindex: true },
};

const INDEX: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
};

/**
 * Builds the metadata for one page: title, description, canonical URL, Open Graph and Twitter cards,
 * and whether search engines may index it. Only public pages (sign in, sign up) pass `index: true`;
 * everything behind a login stays out of search results.
 */
export function pageMetadata({
  title,
  description,
  path,
  banner = "default",
  index = false,
}: {
  title: string;
  description: string;
  /** Canonical path, e.g. "/login". Leave out for pages whose URL contains private ids. */
  path?: string;
  banner?: Banner;
  index?: boolean;
}): Metadata {
  const image = { url: banners[banner], width: 1200, height: 630, alt: `${site.name}: ${title}`, type: "image/png" };
  return {
    title,
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    robots: index ? INDEX : NOINDEX,
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: site.locale,
      title: `${title} | ${site.name}`,
      description,
      ...(path ? { url: path } : {}),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${site.name}`,
      description,
      images: [{ url: banners[banner], alt: image.alt }],
    },
  };
}
