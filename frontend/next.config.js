const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.alias["form-engine"] = path.resolve(__dirname, "../shared/form-engine");
    return config;
  },
  async redirects() {
    return [
      { source: "/export/buyers", destination: "/export/distributors", permanent: false },
      { source: "/export/buyers/:path*", destination: "/export/distributors/:path*", permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
