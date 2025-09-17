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
        ],
      },
    ]
  },
  // Allow all hosts for Replit proxy
  async rewrites() {
    return []
  }
}

module.exports = nextConfig