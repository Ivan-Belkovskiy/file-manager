import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ['192.168.100.2'],
  experimental: {
    proxyTimeout: (10 * (60 * 1000)),
  }
};

export default nextConfig;
