import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/s/",
      disallow: [
        "/api/",
        "/login",
        "/register",
        "/sites/",
        "/editor/",
        "/media/",
        "/templates/",
        "/preview/",
        "/_next/",
      ],
    },
  };
}
