import type { NextConfig } from "next";

const enablePartialPrerendering = process.env.NEXT_EXPERIMENTAL_PPR === "true";

const nextConfig: NextConfig = {
  ...(enablePartialPrerendering ? { experimental: { ppr: true } } : {}),
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        hostname: "img.clerk.com",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Suppress Node.js deprecation warnings in development
    if (isServer && process.env.NODE_ENV === "development") {
      const originalWarn = process.emitWarning;
      // biome-ignore lint/suspicious/noExplicitAny: emitWarning has complex overloads
      process.emitWarning = (warning: any, ...args: any[]) => {
        if (typeof warning === "string" && warning.includes("DEP0169")) {
          return;
        }
        return originalWarn.call(process, warning, ...args);
      };
    }
    return config;
  },
};

export default nextConfig;
