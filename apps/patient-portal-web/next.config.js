/** @type {import('next').NextConfig} */
const nextConfig = {
  // Essential for Replit proxy environment
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  // Allow all hosts for Replit proxy
  async rewrites() {
    return []
  },
}

module.exports = nextConfig