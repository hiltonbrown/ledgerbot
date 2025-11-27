import type { NextConfig } from "next";

const enablePartialPrerendering = process.env.NEXT_EXPERIMENTAL_PPR === "true";

const nextConfig: NextConfig = {
  ...(enablePartialPrerendering ? { experimental: { ppr: true } } : {}),
  // Explicitly enable Turbopack (Next.js 16 default)
  turbopack: {},
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
