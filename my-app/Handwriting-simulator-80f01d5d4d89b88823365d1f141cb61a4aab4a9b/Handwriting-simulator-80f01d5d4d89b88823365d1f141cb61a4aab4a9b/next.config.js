/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['your-domain.com'],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(ttf|woff|woff2)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/fonts/[name][ext]'
      }
    });
    return config;
  },
}

module.exports = nextConfig 