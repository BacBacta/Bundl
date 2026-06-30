/** @type {import('next').NextConfig} */
const nextConfig = {
  // Needed for the Fly.io Docker build (standalone = self-contained server.js)
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    return config
  },
}

export default nextConfig
