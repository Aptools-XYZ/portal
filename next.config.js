/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  // assetPrefix: isProd ? 'https://aptools.xyz' : '',
  reactStrictMode: true,
  trailingSlash: true,
  swcMinify: true,
  rewrites: async () => {
    return [
      {
        source: "/",
        destination: "/index.html",
      }
    ]
  }
};

module.exports = nextConfig;
