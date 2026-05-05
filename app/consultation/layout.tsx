// ---------------------------------------------------------------------------
// app/consultation/layout.tsx
//
// /consultation is a client component (interactive booking flow), so we
// host its SEO metadata on this server layout instead. Sets a clean,
// branded title ("Book a Consultation") so Google's brand sitelinks
// surface a clear call-to-action instead of the in-page H1.
// ---------------------------------------------------------------------------

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book a Consultation',
  description:
    'Book a free skincare or wellness consultation at Dermaspace Lagos. Speak with our therapists about facials, body treatments, and personalised plans.',
  alternates: { canonical: 'https://dermaspaceng.com/consultation' },
  openGraph: {
    title: 'Book a Consultation | Dermaspace Lagos',
    description:
      'Free skincare and wellness consultations at Dermaspace Lagos — Victoria Island & Ikoyi.',
    url: 'https://dermaspaceng.com/consultation',
    type: 'website',
  },
}

export default function ConsultationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
