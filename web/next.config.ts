import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // /.well-known/ai is the authoritative discovery location (draft-01).
  // App Router can't route dot-folders, so rewrite to the /ai route handler.
  async rewrites() {
    return [
      { source: "/.well-known/ai", destination: "/ai" },
      { source: "/.well-known/webmcp", destination: "/webmcp/manifest" },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons/**",
      },
    ],
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
