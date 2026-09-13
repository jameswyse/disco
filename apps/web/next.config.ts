import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    turbopackFileSystemCacheForBuild: true,
    turbopackRustReactCompiler: true,
  },
  async headers() {
    return [
      {
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
        source: "/(.*)",
      },
    ];
  },
  output: "standalone",
  poweredByHeader: false,
  reactCompiler: true,
  reactStrictMode: true,
  typedRoutes: true,
};

export default nextConfig;
