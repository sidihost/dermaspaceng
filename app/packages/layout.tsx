// ---------------------------------------------------------------------------
// app/packages/layout.tsx
//
// /packages is a `'use client'` page (interactive package picker), so it
// can't export `generateMetadata` itself. Server-side layouts can though,
// which is the cleanest place to set the SEO title and description for
// the route. Without this, Google was synthesising the sitelink text
// from the in-page H1 ("Single Packages") — which read awkwardly and
// hid the couple bundles entirely. The explicit title here gives the
// brand SERP a clear, branded "Spa Packages" sitelink instead.
// ---------------------------------------------------------------------------

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Spa Packages',
  description:
    'Curated single and couple spa packages at Dermaspace Lagos — massage, facial, body scrub and nail care bundles in Victoria Island & Ikoyi.',
  alternates: { canonical: 'https://dermaspaceng.com/packages' },
  openGraph: {
    title: 'Spa Packages | Dermaspace Lagos',
    description:
      'Single and couple spa packages at Dermaspace Lagos — massage, facial, body scrub and nail care bundles.',
    url: 'https://dermaspaceng.com/packages',
    type: 'website',
  },
}

export default function PackagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
