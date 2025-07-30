// next.config.js
// import webpack from 'webpack';

// // Create a custom webpack configuration
// const configureWebpack = (config, { isServer }) => {
//   config.resolve.fallback = {
//     ...config.resolve.fallback,
//     crypto: 'crypto-browserify',
//     stream: 'stream-browserify',
//     buffer: 'buffer/',
//     fs: false,
//     path: false,
//   };

//   config.resolve.alias = {
//     ...config.resolve.alias,
//     'crypto': 'crypto-browserify',
//     'stream': 'stream-browserify',
//     'buffer': 'buffer/'
//   };

//   config.plugins.push(
//     new webpack.ProvidePlugin({
//       Buffer: ['buffer', 'Buffer'],
//       process: 'process/browser',
//     })
//   );
  
//   if (!isServer) {
//     config.externals = config.externals || [];
//     config.externals.push('bcryptjs');
//   }
//   return config;
// };

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
    serverComponentsExternalPackages: ['bcryptjs'],
  },
  // Move these out of experimental as they are now top-level options
  serverExternalPackages: ['bcryptjs'],
  outputFileTracingExcludes: {
    '**/*': [
      '**/node_modules/@next/swc*/**/*',
      '**/node_modules/next/dist/compiled/bcryptjs/**/*',
      '**/node_modules/bcryptjs/**/*',
      '**/.next/cache/**/*'
    ]
  },
  
  // Use standalone output for better compatibility
  // output: 'standalone',
  
  // Minimal experimental features
  experimental: {
    // Add any necessary experimental features here
  }
};

export default nextConfig;