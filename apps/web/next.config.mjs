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
        destination: "http://localhost:3000/:path*", // The actual backend URL without "/api"
      },
    ];
  },
};

export default nextConfig;
