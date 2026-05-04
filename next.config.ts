import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/.well-known/apple-developer-merchantid-domain-association",
        headers: [
          {
            key: "Content-Type",
            value: "text/plain",
          },
        ],
      },
    ];
  },
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  runtimeCaching: [
    {
      urlPattern: /\.(?:mp4|webm)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-video-assets",
        rangeRequests: true,
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 86400,
        },
      },
    },
  ],
};

export default nextConfig;
