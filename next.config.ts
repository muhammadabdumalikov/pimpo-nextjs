import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a minimal self-contained server for Docker (.next/standalone).
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fsn1.your-objectstorage.com",
        pathname: "/pimpo/**",
      },
    ],
  },
  async redirects() {
    return [
      // Onlayn do'kon moved from a standalone settings page into the Apps grid
      // (2026-08-05). Permanent, so old bookmarks and any printed/linked
      // address keep working.
      {
        source: "/settings/online-store",
        destination: "/settings/applications/online-store",
        permanent: true,
      },
    ];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
    
    turbopack: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  
};

export default nextConfig;
