import type { MetadataRoute } from "next";

const origin = "https://useclippy.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: origin,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${origin}/pricing`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${origin}/security`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${origin}/privacy`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${origin}/terms`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
