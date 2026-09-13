import { networkInterfaces } from "node:os";

import type { NextConfig } from "next";

/** IPv4 hosts that may open this machine's `next dev` server, including LAN addresses. */
function lanDevelopmentOrigins(): string[] {
  const origins = new Set<string>(["localhost", "127.0.0.1"]);

  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (!address.internal && address.family === "IPv4") {
        origins.add(address.address);
      }
    }
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanDevelopmentOrigins(),
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
