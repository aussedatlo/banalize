/** @type {import('next').NextConfig} */

const nextConfig = {
  output: "standalone",
  env: {
    BANALIZE_WEB_API_SERVER_URL:
      process.env.BANALIZE_WEB_API_SERVER_URL || "BANALIZE_WEB_API_SERVER_URL",
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
};

export default nextConfig;
