import { Metadata } from 'next'
import Link from 'next/link'
import { Wrench, ArrowLeft, Mail, Phone } from 'lucide-react'
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
  // Card design notes:
  //   * No drop-shadow and no gradient — the rest of the site renders
  //     content on flat white surfaces with hairline borders, so the
  //     maintenance shell now matches that language.
  //   * Wider footprint (`max-w-3xl`) so the card sits comfortably on
  //     desktop and tablet without feeling like a centered "card popup"
  //     against an empty page.
  //   * Two-column layout from `md:` upwards: copy + CTAs on the left,
  //     contact methods on the right, divided by a thin border. Stacks
  //     cleanly on mobile.
  //   * The Sparkle icon previously sitting next to the eyebrow has
  //     been removed; the eyebrow tag now reads as a plain uppercase
  //     label, consistent with the rest of the site's section headers.
  return (
    <main className="min-h-screen flex flex-col bg-white font-sans">
      <Header />

      <section className="flex-1 flex items-center justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-3xl">
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
            {/* Brand strip — kept as a solid 1px-tall plum bar at the
                top of the card so the surface still reads as a
                Dermaspace artefact at a glance. No gradient. */}
            <div className="h-1 bg-[#7B2D8E]" aria-hidden />

            <div className="grid md:grid-cols-5">
              {/* Left: status + copy + CTAs */}
              <div className="md:col-span-3 px-6 md:px-8 pt-7 pb-6 md:pt-9 md:pb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-5 h-5 text-[#7B2D8E]" aria-hidden />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#7B2D8E]">
                    Laser &amp; Tech
                  </p>
                </div>

                <h1 className="text-2xl md:text-[28px] font-bold text-gray-900 tracking-tight text-balance leading-tight">
                  We&apos;re upgrading this page
                </h1>
                <p className="mt-3 text-sm md:text-[15px] text-gray-600 leading-relaxed text-pretty">
                  Our laser hair removal, Hollywood carbon peel and skin
                  rejuvenation pages are getting a refresh. Bookings are
                  still open &mdash; reach out and we&apos;ll get you
                  scheduled directly.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                  <Link
                    href="/book"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm rounded-full hover:bg-[#6B2D7E] transition-colors font-semibold"
                  >
                    Book a consultation
                  </Link>
                  <Link
                    href="/services"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 text-sm rounded-full hover:bg-gray-50 transition-colors font-medium"
                  >
                    Browse other services
                  </Link>
                </div>
              </div>

              {/* Right: contact column. On mobile, sits below with a
                  top border; on md+, sits to the right with a left
                  border. No shadow, no gradient — just a hairline. */}
              <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-gray-200 px-6 md:px-7 py-6 md:py-9 bg-[#FAF6FB]">
                <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-gray-500 mb-3">
                  Need to talk to us?
                </p>
                <div className="flex flex-col gap-2.5 text-sm">
                  <a
                    href="tel:+2349017972919"
                    className="inline-flex items-center gap-2.5 font-semibold text-gray-900 hover:text-[#7B2D8E] transition-colors"
                  >
                    <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden />
                    </span>
                    +234 901 797 2919
                  </a>
                  <a
                    href="mailto:support@dermaspaceng.com"
                    className="inline-flex items-center gap-2.5 font-semibold text-gray-900 hover:text-[#7B2D8E] transition-colors break-all"
                  >
                    <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden />
                    </span>
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
