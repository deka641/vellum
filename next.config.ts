import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    formats: ["image/webp", "image/avif"],
  },
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
