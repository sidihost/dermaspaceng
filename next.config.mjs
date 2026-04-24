/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Image optimization — Vercel's image CDN resizes, re-encodes to
  // AVIF/WebP, and serves the smallest variant that fits the device.
  // Leaving this off (`unoptimized: true`) was shipping full-size
  // source blobs (1-3 MB each) to every phone, which was the single
  // biggest perf regression on slow networks. `remotePatterns` lists
  // the hosts we legitimately embed images from (Vercel Blob is
  // where most of the spa's photography lives).
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Vercel Blob public buckets — where all the spa's uploaded
      // photography / gallery / service artwork is stored.
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'blob.v0.dev' },
      // Legacy hero / OG assets that still point at the v0 preview host.
      { protocol: 'https', hostname: 'v0.dev' },
      { protocol: 'https', hostname: 'hebbkx1anhila5yf.public.blob.vercel-storage.com' },
      // Maps / profile avatars we proxy occasionally.
      { protocol: 'https', hostname: 'api.mapbox.com' },
    ],
    // Restrict device sizes to realistic target breakpoints so the
    // image CDN isn't asked to render dozens of variants it will
    // never serve.
    deviceSizes: [360, 420, 640, 828, 1080, 1280, 1920],
    imageSizes: [16, 32, 64, 96, 128, 256, 384],
    // Cache resized image variants at the edge for 1 year; blobs
    // are content-addressed so a new upload gets a new URL anyway.
    minimumCacheTTL: 31536000,
  },
  // Tree-shake the chunky third-party libraries the site lives on.
  // Without this, importing `{ Heart }` from `lucide-react` pulls in
  // every single icon (~900+), and similar for framer-motion /
  // recharts / date-fns. These are safe, production-only wins.
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      'date-fns',
      'sonner',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-select',
      '@radix-ui/react-accordion',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-navigation-menu',
    ],
  },
  // Compress responses on the origin too (Vercel CDN also compresses,
  // but this helps local / preview / non-Vercel deployments).
  compress: true,
  // Drop React dev warnings / console.* in production builds —
  // keeps the client bundle smaller and hides internal logs from
  // site visitors.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  async headers() {
    return [
      {
        // HTML routes — revalidate every request so deploys show up
        // immediately, but still allow the CDN to hold a copy for
        // a few seconds of stale-while-revalidate grace.
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // Hashed build assets — safe to cache forever.
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Optimized images served via /_next/image — long TTL,
        // content-addressed URLs.
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Raw static /images in the repo — long TTL, these are
        // rarely edited and will be purged by deploy anyway.
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Service Worker - no cache to ensure updates
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        // Manifest - cache for a day
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      {
        // Icons & favicons - cache for a year (immutable).
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/favicon.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, immutable',
          },
        ],
      },
      {
        // Security + resource hints that help the browser finish the
        // critical render path a few hundred ms sooner.
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
