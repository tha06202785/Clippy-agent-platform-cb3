import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["img.clerk.com", "images.unsplash.com"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },


export default nextConfig;
