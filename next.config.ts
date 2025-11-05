import type { NextConfig } from "next";

const enablePartialPrerendering = process.env.NEXT_EXPERIMENTAL_PPR === "true";

const nextConfig: NextConfig = {
  ...(enablePartialPrerendering ? { experimental: { ppr: true } } : {}),
  serverExternalPackages: ["@mastra/*"],
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
};

export default nextConfig;
