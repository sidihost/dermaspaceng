import { Metadata } from 'next'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import LaserPageContent from '@/components/laser/laser-page-content'

// ---------------------------------------------------------------------------
// /laser-tech
//
// The maintenance shell that previously lived here ("We're upgrading this
// page") has been retired now that the redesigned content component is
// ready. We just compose the standard site chrome (Header + Footer) around
// the new <LaserPageContent /> client component, which owns the personalized
// hero, treatment gallery, pricing rows and CTA — see
// `components/laser/laser-page-content.tsx` for the full breakdown.
//
// SEO metadata is unchanged so we keep the rankings the canonical
// /laser-tech URL accrued while the maintenance shell was up.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Laser Hair Removal & Skin Treatments',
  description:
    'Experience advanced laser treatments at Dermaspace Lagos including laser hair removal, skin rejuvenation, Hollywood carbon peel, and electrolysis. FDA-approved technology with professional results in Victoria Island & Ikoyi.',
  keywords: [
    'laser hair removal Lagos',
    'laser treatment Nigeria',
    'permanent hair removal Lagos',
    'electrolysis Lagos',
    'carbon peel Lagos',
    'Hollywood peel Nigeria',
    'skin rejuvenation Lagos',
    'laser facial Lagos',
    'hair removal Victoria Island',
    'laser hair removal Ikoyi',
    'dermaspace laser',
    'best laser treatment Lagos',
    'affordable laser hair removal Nigeria',
  ],
  openGraph: {
    title: 'Laser Hair Removal & Advanced Skin Treatments | Dermaspace Lagos',
    description:
      'Advanced laser treatments including permanent hair removal, skin rejuvenation, Hollywood carbon peel & electrolysis. FDA-approved technology at Dermaspace Lagos.',
    url: 'https://dermaspaceng.com/laser-tech',
    images: [
      {
        url: '/images/laser-hair-removal-ng.jpg',
        width: 1200,
        height: 630,
        alt: 'Laser Hair Removal Treatment at Dermaspace Lagos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Laser Hair Removal & Skin Treatments | Dermaspace Lagos',
    description:
      'Advanced laser treatments including permanent hair removal, skin rejuvenation & Hollywood peel at Dermaspace Lagos.',
    images: ['/images/laser-hair-removal-ng.jpg'],
  },
  alternates: {
    canonical: 'https://dermaspaceng.com/laser-tech',
  },
}

export default function LaserTechPage() {
  return (
    <main className="min-h-screen flex flex-col bg-white font-sans">
      <Header />
      <LaserPageContent />
      <Footer />
    </main>
  )
}
