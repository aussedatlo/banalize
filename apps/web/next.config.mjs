/** @type {import('next').NextConfig} */
const nextConfig = {
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
        source: "/api/:path*", // The request coming into Next.js
        destination: `${process.env.BANALIZE_WEB_API_SERVER_URL}:${process.env.BANALIZE_WEB_API_SERVER_PORT}/:path*`,
      },
    ];
  },
};

export default nextConfig;
