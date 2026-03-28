import type { Metadata, Viewport } from 'next'
import { Lexend_Deca, Poppins, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import MobileNav from '@/components/layout/mobile-nav'
import Preloader from '@/components/shared/preloader'
import AmbientMusic from '@/components/shared/ambient-music'
import './globals.css'

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
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/favicon.ico',
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
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M2VSNSQZ');`,
          }}
        />
        {/* End Google Tag Manager */}
        <link rel="icon" href="/favicon.ico" />
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
      <body className="font-sans antialiased pb-24 md:pb-0">
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
        <Preloader />
        {children}
        <MobileNav />
        <AmbientMusic />
        <Analytics />
      </body>
    </html>
  )
}
