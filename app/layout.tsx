import type { Metadata, Viewport } from 'next'
import { Lexend_Deca, Poppins, Playfair_Display } from 'next/font/google'
import Script from 'next/script'
import dynamic from 'next/dynamic'
import { Analytics } from '@vercel/analytics/next'
import MobileNav from '@/components/layout/mobile-nav'
import BodyWrapper from '@/components/layout/body-wrapper'
import Preloader from '@/components/shared/preloader'
import { GeoProvider } from '@/lib/geo-context'
import { LocationBanner } from '@/components/location-banner'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { ScrollPositionRestore } from '@/components/pwa/scroll-position-restore'
import { SlowConnectionBanner } from '@/components/pwa/slow-connection-banner'
import { NotifyProvider } from '@/components/shared/notify'
import { RootErrorBoundary } from '@/components/shared/root-error-boundary'
import './globals.css'

// Heavy, strictly-below-the-fold widgets. None of them are visible on
// first paint, none of them are needed for SSR / SEO, and together
// they pull hundreds of KB into the main client bundle (DermaAIMount
// alone transitively imports the 6,600-line Derma AI chat). Loading
// them with `next/dynamic` + `ssr: false` lets Next split them into
// their own async chunks so the initial navigation is a lot lighter.
const AmbientMusic = dynamic(() => import('@/components/shared/ambient-music'), {
  ssr: false,
  loading: () => null,
})
const BirthdayCelebration = dynamic(
  () => import('@/components/shared/birthday-celebration'),
  { ssr: false, loading: () => null },
)
const DermaAIMount = dynamic(() => import('@/components/shared/derma-ai-mount'), {
  ssr: false,
  loading: () => null,
})

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
            <RootErrorBoundary label="ambient-music"><AmbientMusic /></RootErrorBoundary>
            {/* Birthday greeting — renders null for everyone except users
                whose DOB matches today. Shows a dismissible banner + confetti
                burst once per calendar day. */}
            <RootErrorBoundary label="birthday"><BirthdayCelebration /></RootErrorBoundary>
            {/* Derma AI — the floating assistant is mounted globally so it
                follows signed-in members across every customer surface
                (dashboard, services, booking, wallet, etc.). It self-gates
                on auth and hides itself on admin/staff/auth pages. */}
            <RootErrorBoundary label="derma-ai"><DermaAIMount /></RootErrorBoundary>
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
