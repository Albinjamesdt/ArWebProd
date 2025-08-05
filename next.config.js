/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    unoptimized: true,
    disableStaticImages: true,
  },

  // For Next.js 15+ Edge builds:
  experimental: {
    serverExternalPackages: [
      "chrome-aws-lambda",
      "puppeteer-core",
      "@aws-sdk/client-s3",
      "formidable",
      "next-auth",
      "bcryptjs"
    ],
  },

  // Cloud-friendly webpack fallbacks:
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: "crypto-browserify",
        stream: "stream-browserify",
        buffer: "buffer/",
      };
    }
    return config;
  },

  // Cloudflare output mode
  output: "standalone",
};

export default nextConfig;