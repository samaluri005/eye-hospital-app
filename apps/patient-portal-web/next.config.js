/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly expose environment variables to client
  env: {
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
    NEXT_PUBLIC_AZURE_CLIENT_ID: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID,
    NEXT_PUBLIC_AZURE_TENANT_ID: process.env.NEXT_PUBLIC_AZURE_TENANT_ID,
  },
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
  // Webpack configuration to handle native modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize native Argon2 modules for server-side only
      config.externals = config.externals || [];
      config.externals.push({
        '@node-rs/argon2': 'commonjs @node-rs/argon2',
        '@node-rs/argon2-linux-x64-gnu': 'commonjs @node-rs/argon2-linux-x64-gnu',
        '@node-rs/argon2-linux-x64-musl': 'commonjs @node-rs/argon2-linux-x64-musl',
      });
    }
    return config;
  },
}

module.exports = nextConfig