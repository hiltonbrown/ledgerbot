import type { NextConfig } from "next";

const enablePartialPrerendering = process.env.NEXT_EXPERIMENTAL_PPR === "true";

const nextConfig: NextConfig = {
  ...(enablePartialPrerendering ? { experimental: { ppr: true } } : {}),
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
    ],
  },
};

export default nextConfig;
