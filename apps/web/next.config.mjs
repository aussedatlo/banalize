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
        destination: `${process.env.SERVER_URL}:${process.env.SERVER_PORT}/:path*`, // The actual backend URL without "/api"
      },
    ];
  },
};

export default nextConfig;
