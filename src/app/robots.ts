import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rareimagery.net";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/console/admin"],
    },
    sitemap: [`${siteUrl}/sitemap.xml`],
    host: new URL(siteUrl).host,
  };
}