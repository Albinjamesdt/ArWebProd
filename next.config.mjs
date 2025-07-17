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
  },
   api: {
    // this applies to ALL API routes, pages *and* app-router
    bodyParser: {
      sizeLimit: '500mb',
    },
  }
}

export default nextConfig
