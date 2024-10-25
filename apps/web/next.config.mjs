/** @type {import('next').NextConfig} */
import packageJson from "./package.json" with { type: "json" };

const nextConfig = {
  output: "standalone",
  env: {
    BANALIZE_WEB_API_SERVER_URL:
      process.env.BANALIZE_WEB_API_SERVER_URL || "BANALIZE_WEB_API_SERVER_URL",
    NEXT_PUBLIC_BANALIZE_WEB_VERSION: packageJson.version,
    BANALIZE_WEB_BASE_URL:
      process.env.BANALIZE_WEB_BASE_URL || "BANALIZE_WEB_BASE_URL",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/configs",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.BANALIZE_WEB_API_SERVER_URL+"/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
