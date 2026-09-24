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
  transpilePackages: ["@blocknote/core", "@blocknote/react", "@blocknote/ariakit", "@ariakit/react"],
  async redirects() {
    return [
      { source: "/export/buyers", destination: "/export/distributors", permanent: false },
      { source: "/export/buyers/:path*", destination: "/export/distributors/:path*", permanent: false },
      { source: "/export/products", destination: "/products", permanent: false },
      { source: "/export/products/:path*", destination: "/products/:path*", permanent: false },
    ];
  },
  async rewrites() {
    const apiInternalUrl = (process.env.API_INTERNAL_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
