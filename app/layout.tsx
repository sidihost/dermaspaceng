import type { Metadata, Viewport } from 'next'
import { Lexend_Deca, Poppins, Playfair_Display } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import MobileNav from '@/components/layout/mobile-nav'
import BodyWrapper from '@/components/layout/body-wrapper'
import ClientShell from '@/components/layout/client-shell'
import Preloader from '@/components/shared/preloader'
import { GeoProvider } from '@/lib/geo-context'
import { LocationBanner } from '@/components/location-banner'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { ScrollPositionRestore } from '@/components/pwa/scroll-position-restore'
import { SlowConnectionBanner } from '@/components/pwa/slow-connection-banner'
import { NotifyProvider } from '@/components/shared/notify'
import { RootErrorBoundary } from '@/components/shared/root-error-boundary'
import './globals.css'

// Heavy, strictly-below-the-fold widgets (Ambient music, Birthday
// celebration, Derma AI mount) are lazy-loaded inside `ClientShell`
// with `next/dynamic` + `ssr: false`. That has to happen in a
// client component in Next.js 16 — calling `dynamic(..., { ssr:
// false })` from this server layout throws at compile time
// ("`ssr: false` is not allowed with `next/dynamic` in Server
// Components") and was the reason the Derma AI chat panel never
// appeared when users tapped the floating launcher.

const lexendDeca = Lexend_Deca({
  subsets: ["latin"],
  variable: '--font-lexend',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#7B2D8E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://dermaspaceng.com'),
  title: {
    default: 'Dermaspace Esthetic & Wellness Centre | Premium Spa in Lagos, Nigeria',
    template: '%s | Dermaspace Lagos',
  },
  description: 'Experience luxury spa treatments at Dermaspace Esthetic & Wellness Centre in Lagos, Nigeria. Expert facial treatments, body massages, nail care, waxing, and advanced skincare. Locations in Victoria Island & Ikoyi.',
  keywords: [
    'spa Lagos',
    'facial treatment Lagos',
    'body massage Victoria Island',
    'nail care Ikoyi',
    'waxing Lagos Nigeria',
    'acne treatment Lagos',
    'microneedling Lagos',
    'chemical peel Lagos',
    'best spa Nigeria',
    'wellness centre Lagos',
    'dermaspace',
    'esthetic spa Lagos',
    'luxury spa Nigeria',
    'skincare Lagos',
    'body scrub Lagos',
  ],
  authors: [{ name: 'Dermaspace Esthetic & Wellness Centre' }],
  creator: 'Dermaspace',
  publisher: 'Dermaspace Esthetic & Wellness Centre',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://dermaspaceng.com',
    siteName: 'Dermaspace Esthetic & Wellness Centre',
    title: 'Dermaspace Esthetic & Wellness Centre | Premium Spa in Lagos',
    description: 'Experience luxury spa treatments at Dermaspace. Expert facial treatments, body massages, nail care, and advanced skincare in Victoria Island & Ikoyi, Lagos.',
    images: [
      {
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp',
        width: 1200,
        height: 630,
        alt: 'Dermaspace Esthetic & Wellness Centre - Premium Spa Lagos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dermaspace Esthetic & Wellness Centre | Premium Spa Lagos',
    description: 'Experience luxury spa treatments at Dermaspace Lagos. Expert facial treatments, body massages, nail care, and advanced skincare.',
    site: '@DermaspaceN',
    creator: '@DermaspaceN',
    images: ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  alternates: {
    canonical: 'https://dermaspaceng.com',
  },
  category: 'Spa & Wellness',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${lexendDeca.variable} ${poppins.variable} ${playfair.variable}`}>
      <head>
        {/* ─────────────────────────────────────────────────────────────
            Inline pre-React error reporter.

            Synchronous, dependency-free, runs as the FIRST script on
            the page. Catches `window.onerror` and `unhandledrejection`
            before any framework code has loaded, then forwards the
            report to /api/client-errors via `navigator.sendBeacon`.

            Why inline + synchronous?
              - If the bundle itself fails to parse, no React-based
                handler will ever run — only an inline <script> in
                <head> can capture it.
              - `sendBeacon` survives page navigation/unload so we
                still get the report when the browser bails.
              - No imports = no risk of THIS handler being the broken
                thing that hides the real broken thing.

            Output is visible in:
              Vercel → Project → Deployments → (latest) → Logs
              (filter: "[CLIENT-ERROR]")
            ──────────────────────────────────────────────────────── */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var ENDPOINT = "/api/client-errors";
    var sent = 0, MAX = 5; // cap so a tight error loop can't DOS our logs
    function send(payload){
      if (sent >= MAX) return;
      sent++;
      try {
        payload.url = location.href;
        var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;
        // Fallback: keepalive fetch (Safari < 14 etc.)
        if (window.fetch) {
          fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true
          }).catch(function(){});
        }
      } catch(_) {}
    }
    window.addEventListener("error", function(e){
      send({
        source: "inline-onerror",
        message: (e && e.message) || "unknown error",
        stack: (e && e.error && e.error.stack) || "",
        line: e && e.lineno,
        column: e && e.colno
      });
    }, true);
    window.addEventListener("unhandledrejection", function(e){
      var reason = e && e.reason;
      send({
        source: "inline-rejection",
        message: (reason && (reason.message || String(reason))) || "unhandled rejection",
        stack: (reason && reason.stack) || ""
      });
    });
    // Expose so React-side reporters can reuse the same transport.
    window.__dermaspaceReportError = send;
  } catch(_) {}
})();`,
          }}
        />
        {/* Warm up the two cross-origin CDNs that ship critical
            above-the-fold content, so the browser can start the TCP
            handshake + TLS negotiation in parallel with HTML parse.
            Without this the first hero image / analytics beacon paid
            the full ~200-300ms DNS + connect penalty on cold loads. */}
        <link
          rel="preconnect"
          href="https://hebbkx1anhila5yf.public.blob.vercel-storage.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://hebbkx1anhila5yf.public.blob.vercel-storage.com"
        />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://analytics.dermaspaceng.com" />
        <link rel="dns-prefetch" href="https://analytics.dermaspaceng.com" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Dermaspace" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "DaySpa",
              "name": "Dermaspace Esthetic & Wellness Centre",
              "image": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp",
              "url": "https://dermaspaceng.com",
              "telephone": "+2349017972919",
              "email": "info@dermaspaceng.com",
              "address": [
                {
                  "@type": "PostalAddress",
                  "streetAddress": "237b Muri Okunola St",
                  "addressLocality": "Victoria Island",
                  "addressRegion": "Lagos",
                  "postalCode": "106104",
                  "addressCountry": "NG"
                },
                {
                  "@type": "PostalAddress", 
                  "streetAddress": "9, Agbeke Rotinwa Close, Dolphin Extension Estate",
                  "addressLocality": "Ikoyi",
                  "addressRegion": "Lagos",
                  "addressCountry": "NG"
                }
              ],
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": 6.4281,
                "longitude": 3.4219
              },
              "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                "opens": "09:00",
                "closes": "19:00"
              },
              "priceRange": "₦₦₦",
              "servesCuisine": "Spa & Wellness Services",
              "sameAs": [
                "https://www.facebook.com/dermaspaceng/",
                "https://x.com/DermaspaceN",
                "https://www.instagram.com/dermaspace.ng/"
              ]
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* Third-party analytics load AFTER the page is interactive so
            they never compete with HTML parse / critical resource
            scheduling. GTM runs `afterInteractive` so tag firing still
            happens on first visit; Umami is marketing-tier telemetry
            and can wait until `lazyOnload` (fires after window `load`). */}
        <Script
          id="gtm-bootstrap"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M2VSNSQZ');`,
          }}
        />
        <Script
          id="umami-analytics"
          strategy="lazyOnload"
          src="https://analytics.dermaspaceng.com/script.js"
          data-website-id="445ec8fd-afbf-4be8-a752-231e430eb49c"
        />
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe 
            src="https://www.googletagmanager.com/ns.html?id=GTM-M2VSNSQZ"
            height="0" 
            width="0" 
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <GeoProvider>
          {/* NotifyProvider wraps everything so any component in the
              tree (pages, modals, floating widgets) can call
              useNotify() to fire a branded success/error toast. Kept
              inside GeoProvider so existing geo-aware toasts-via-effect
              don't fire before the notification layer is mounted. */}
          <NotifyProvider>
            {/* Every floating "chrome" widget below is wrapped in its
                own RootErrorBoundary so a single widget crashing
                (bad pathname edge case, failed env var, stale
                localStorage etc.) cannot white-screen the entire
                site — a failing widget just disappears and the page
                keeps working. This is what fixed the "Application
                error" blank page on dermaspaceng.com. */}
            <RootErrorBoundary label="service-worker"><ServiceWorkerRegister /></RootErrorBoundary>
            <RootErrorBoundary label="slow-connection"><SlowConnectionBanner /></RootErrorBoundary>
            <RootErrorBoundary label="scroll-restore"><ScrollPositionRestore /></RootErrorBoundary>
            <RootErrorBoundary label="preloader"><Preloader /></RootErrorBoundary>
            <RootErrorBoundary label="location-banner"><LocationBanner /></RootErrorBoundary>
            <BodyWrapper>
              {children}
            </BodyWrapper>
            <RootErrorBoundary label="mobile-nav"><MobileNav /></RootErrorBoundary>
            {/* ClientShell hosts AmbientMusic, BirthdayCelebration, and
                the Derma AI mount. Rendered as a client component so
                those `dynamic(..., { ssr: false })` imports are legal
                under Next.js 16. Each widget inside is wrapped in its
                own error boundary, so a single failure doesn't take
                down the rest of the chrome. */}
            <ClientShell />
          </NotifyProvider>
        </GeoProvider>
        <Analytics />
        {/* Google Tag Manager — loaded with `afterInteractive` so it
            runs as soon as the page becomes interactive instead of
            blocking FCP in <head>. Functionally equivalent to the
            classic async bootstrap snippet. */}
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M2VSNSQZ');`}
        </Script>
        {/* Self-hosted Umami analytics — lazy-loaded so it never
            blocks the render path. */}
        <Script
          src="https://analytics.dermaspaceng.com/script.js"
          data-website-id="445ec8fd-afbf-4be8-a752-231e430eb49c"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}
