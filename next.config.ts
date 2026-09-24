import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three/drei ship ESM that Next bundles fine; transpile keeps older toolchains happy
  transpilePackages: ['three'],
  async headers() {
    return [
      {
        source: '/(fonts|typefaces)/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}

export default nextConfig
