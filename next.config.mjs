/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Emit browser source maps in production. Without this, our
  // `[CLIENT-ERROR]` reports come back with stacks like
  // `at eD (.../489ac51...js:1:77404)` — useless for figuring out
  // which component actually crashed. With source maps enabled,
  // opening the URL in DevTools resolves those minified names back
  // to the real source location, and the per-deploy .map files are
  // available in the network tab so support can correlate beacons
  // to source on demand. Slight first-load cost (the .map files are
  // fetched lazily by DevTools, never by users) is well worth it
  // while we're chasing the production white-screen.
  productionBrowserSourceMaps: true,
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
  // every single icon (~900+), and similar for date-fns / sonner.
  //
  // IMPORTANT — limited package list.
  // Production was hitting `ReferenceError: Cannot access 'X' before
  // initialization` on every fresh load, with the stack landing
  // inside React 19's `mountIndeterminateComponent → renderWithHooks`
  // — a Turbopack-side temporal-dead-zone caused by
  // `optimizePackageImports` rewriting circular barrel imports in
  // libraries that don't tolerate it. The known offenders under
  // Next 16 + Turbopack are `framer-motion` (12.x), `recharts`
  // (2.x), and most of the `@radix-ui/*` packages whose internal
  // re-exports form short cycles.
  //
  // We keep ONLY the libraries whose barrels are flat and proven
  // safe: lucide-react (giant icon barrel — biggest bundle win),
  // date-fns (per-function modules), sonner (single-file lib).
  // Everything else falls back to Turbopack's normal tree-shaking,
  // which is correct, just slightly larger. We can re-introduce
  // entries one-by-one if/when upstream fixes land — but breaking
  // the entire site is not an acceptable trade for a few KB.
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'sonner',
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
      // NOTE: we intentionally do NOT set a catch-all
      // `Cache-Control: max-age=0, must-revalidate` on `/:path*` here.
      // That override was disabling Vercel's Edge CDN cache for every
      // single HTML response on the site — even fully static marketing
      // pages — so every hit paid the cost of hitting the origin
      // function. Next 16 + Vercel will emit the correct per-route
      // cache headers automatically: static / ISR pages become
      // `s-maxage=…, stale-while-revalidate=…` at the edge, while
      // dynamic user pages (dashboard, admin, auth) stay `private`.
      // That is what makes a CDN-backed site actually feel instant
      // on repeat hits.
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
        //
        // The Permissions-Policy entries are what unblock Derma AI
        // Live's mic / camera / screen-share controls. Vercel sets a
        // restrictive default policy on production, which means that
        // even on browsers that fully support `getDisplayMedia` /
        // `getUserMedia`, the API silently rejects with `NotAllowed`
        // unless we explicitly opt our origin in via this header.
        // `display-capture` is the screen-share permission;
        // `microphone` and `camera` cover the voice-to-voice and
        // facial-analysis flows respectively.
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), display-capture=(self), geolocation=(self)',
          },
        ],
      },
    ]
  },
}

export default nextConfig
