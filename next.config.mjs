/** @type {import('next').NextConfig} */
const nextConfig = {
  // Needed for the Fly.io Docker build (standalone = self-contained server.js)
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  // ODIS's blinding client (blind-threshold-bls) is a WASM native module —
  // let Node require() it directly at runtime instead of webpack bundling it.
  // (Next 14 key; renamed to top-level `serverExternalPackages` in Next 15.)
  experimental: {
    serverComponentsExternalPackages: ['blind-threshold-bls', '@celo/identity'],
  },
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
