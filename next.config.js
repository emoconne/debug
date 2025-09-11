const fs = require('fs');
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    esmExternals: 'loose'
  },
  // HTTPS設定（開発環境用）
  ...(process.env.NODE_ENV === 'development' && {
    server: {
      https: {
        key: fs.readFileSync(path.join(__dirname, 'certs/localhost+2-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'certs/localhost+2.pem')),
      },
    },
  }),
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'node-fetch': 'commonjs node-fetch'
      });
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://view.officeapps.live.com https://docs.google.com"
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
