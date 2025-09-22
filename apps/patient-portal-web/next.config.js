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
  },
  // Fix cross-origin requests for Replit environment
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    '17791e9b-5553-473f-90c6-ebc465f8543f-00-3l7xmxdpueco.sisko.replit.dev'
  ]
}

module.exports = nextConfig