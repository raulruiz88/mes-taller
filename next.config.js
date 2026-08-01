/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA configuration via next-pwa
  reactStrictMode: true,
  // Allow images from external domains if needed
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

module.exports = nextConfig;
