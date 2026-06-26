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
