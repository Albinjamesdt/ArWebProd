// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    disableStaticImages: true
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'oauth'],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Configure webpack to handle Node.js modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        buffer: 'buffer',
      };
    }
    return config;
  },
  // Server external packages
  serverExternalPackages: ['bcryptjs', 'oauth'],
  outputFileTracingExcludes: {
    '**/*': [
      '**/node_modules/@next/swc*/**/*',
      '**/node_modules/next/dist/compiled/bcryptjs/**/*',
      '**/node_modules/bcryptjs/**/*',
      '**/.next/cache/**/*',
      '**/node_modules/oauth/**/*'
    ]
  },
  // Configure page runtime
  reactStrictMode: true,
};

export default nextConfig;
