import { Metadata } from 'next'
import Link from 'next/link'
import { Wrench, Sparkles, ArrowLeft, Mail, Phone } from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

// ---------------------------------------------------------------------------
// /laser-tech — temporarily under maintenance.
//
// We keep the SEO metadata pointing at the canonical laser-tech URL so
// rankings don't get re-shuffled while the page is offline, but we swap
// the body for a focused "we're updating this section" shell. The
// global Header/Footer stay so the rest of the site stays one click
// away — the maintenance is scoped to laser services only, not a
// site-wide outage like /maintenance handles.
//
// When laser content is ready to come back, restore the original
// `<LaserPageContent />` import and render path. The component file
// at `components/laser/laser-page-content.tsx` is intentionally left
// in place so this is a one-line swap.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Laser Hair Removal & Skin Treatments',
  description: 'Experience advanced laser treatments at Dermaspace Lagos including laser hair removal, skin rejuvenation, Hollywood carbon peel, and electrolysis. FDA-approved technology with professional results in Victoria Island & Ikoyi.',
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
    description: 'Advanced laser treatments including permanent hair removal, skin rejuvenation, Hollywood carbon peel & electrolysis. FDA-approved technology at Dermaspace Lagos.',
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
    description: 'Advanced laser treatments including permanent hair removal, skin rejuvenation & Hollywood peel at Dermaspace Lagos.',
    images: ['/images/laser-hair-removal-ng.jpg'],
  },
  alternates: {
    canonical: 'https://dermaspaceng.com/laser-tech',
  },
}

export default function LaserTechPage() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <Header />

      <section className="flex-1 flex items-center justify-center px-5 py-10 md:py-16">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl shadow-[#7B2D8E]/10 border border-[#7B2D8E]/10 overflow-hidden">
            {/* Brand strip */}
            <div className="h-1 bg-[#7B2D8E]" aria-hidden />

            <div className="px-6 pt-7 pb-6 text-center">
              {/* Icon tile — same calm purple-on-purple as /maintenance */}
              <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-[#7B2D8E]" aria-hidden />
              </div>

              <p className="text-[11.5px] uppercase tracking-[0.18em] font-bold text-[#7B2D8E] mb-2 inline-flex items-center gap-1.5 justify-center">
                <Sparkles className="w-3 h-3" aria-hidden />
                Laser &amp; Tech
              </p>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight text-balance">
                We&apos;re upgrading this page
              </h1>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed text-pretty">
                Our laser hair removal, Hollywood carbon peel and skin
                rejuvenation pages are getting a refresh. Bookings are
                still open &mdash; reach out and we&apos;ll get you
                scheduled directly.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-2.5">
                <Link
                  href="/book"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7B2D8E] text-white text-sm rounded-full hover:bg-[#6B2D7E] transition-colors font-semibold"
                >
                  Book a consultation
                </Link>
                <Link
                  href="/services"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm rounded-full hover:bg-gray-50 transition-colors font-medium"
                >
                  Browse other services
                </Link>
              </div>

              <div className="mt-6 pt-5 border-t border-gray-100">
                <p className="text-[11.5px] uppercase tracking-[0.18em] font-bold text-gray-400 mb-2.5">
                  Need to talk to us?
                </p>
                <div className="flex flex-col gap-1.5 text-sm">
                  <a
                    href="tel:+2349017972919"
                    className="inline-flex items-center justify-center gap-2 font-semibold text-[#7B2D8E] hover:underline"
                  >
                    <Phone className="w-4 h-4" aria-hidden />
                    +234 901 797 2919
                  </a>
                  <a
                    href="mailto:support@dermaspaceng.com"
                    className="inline-flex items-center justify-center gap-2 font-semibold text-[#7B2D8E] hover:underline"
                  >
                    <Mail className="w-4 h-4" aria-hidden />
                    support@dermaspaceng.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#7B2D8E]"
            >
              <ArrowLeft className="w-3 h-3" aria-hidden />
              Back to home
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
