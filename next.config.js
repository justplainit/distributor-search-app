/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3001',
  },
  // Disable static generation for pages that use searchParams
  output: 'standalone',
}

module.exports = nextConfig

