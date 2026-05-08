import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "uxmrvrwaotmctthjiotw.supabase.co" },
    ],
  },
  trailingSlash: true,
};

export default nextConfig;
