/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    // Image optimization enabled — remove `unoptimized` to allow Next.js WebP/AVIF conversion
  },

}

export default nextConfig
