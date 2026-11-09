import { site, siteUrl } from "@/lib/site";
import { BHI_COURSE_NAMES } from "@/lib/course-names";

/** Structured data (schema.org) for search engines: who BHI is, what it teaches and this web app. */
export function OrganizationJsonLd() {
  const base = siteUrl();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["EducationalOrganization", "LocalBusiness"],
        "@id": `${site.website}/#organization`,
        name: site.name,
        alternateName: site.shortName,
        url: site.website,
        logo: { "@type": "ImageObject", url: `${base}/brand/bhi-logo-square.png`, width: 1200, height: 1200 },
        image: `${base}/og/og-default.png`,
        foundingDate: site.foundingDate,
        telephone: site.phone,
        address: { "@type": "PostalAddress", ...site.address },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Courses",
          itemListElement: BHI_COURSE_NAMES.map((name) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Course", name, provider: { "@id": `${site.website}/#organization` } },
          })),
        },
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: site.appName,
        inLanguage: "en-US",
        publisher: { "@id": `${site.website}/#organization` },
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped cannot break out of the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
