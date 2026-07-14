import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/admin/", "/api/", "/sign-in/", "/signup/"],
    },
    sitemap: "https://useclippy.com/sitemap.xml",
  };
}
