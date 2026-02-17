import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    formats: ["image/webp", "image/avif"],
  },
  serverExternalPackages: ["sharp"],
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/uploads/:filename", destination: "/api/uploads/:filename" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
