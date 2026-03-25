import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb", // allow base64 trader photos (compressed ~200KB, but safety net for edge cases)
    },
  },
};

export default nextConfig;
