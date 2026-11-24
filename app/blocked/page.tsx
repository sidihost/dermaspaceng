import Image from 'next/image'
import { ArrowUpRight, Globe, Mail } from 'lucide-react'
import { RegionalWaitlistForm } from '@/components/shared/regional-waitlist-form'

export const metadata = {
  title: {
    absolute: 'Not Available in Your Region | Dermaspace',
  },
  description:
    'Dermaspace Esthetic & Wellness Centre is not yet available in your region. Join our priority expansion waitlist to be notified when we launch near you.',
  robots: { index: false, follow: false },
}

const DERMASPACE_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp'

const BRAND_STANDARDS = [
  {
    index: '01.',
    title: 'Thoughtful Skincare',
    copy: 'Facials, peels, and skin treatments tailored to every skin tone.',
  },
  {
    index: '02.',
    title: 'Calm Private Rooms',
    copy: 'Clean linens, soft lighting, and unhurried spa care.',
  },
  {
    index: '03.',
    title: 'Early Access',
    copy: 'Waitlist members hear first as soon as bookings open near you.',
  },
] as const

export default function BlockedPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* ── Quiet Editorial Top Bar ─────────────────────────────────── */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DERMASPACE_LOGO}
              alt="Dermaspace Esthetic & Wellness Centre"
              className="h-8 sm:h-9 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <a
            href="mailto:info@dermaspaceng.com?subject=Regional%20Access%20Inquiry"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-[#7B2D8E] transition-colors whitespace-nowrap shrink-0"
          >
            <Mail className="w-4 h-4 text-[#7B2D8E]" aria-hidden="true" />
            <span className="hidden sm:inline">info@dermaspaceng.com</span>
            <span className="sm:hidden">Contact Support</span>
          </a>
        </div>
      </header>

      {/* ── Split Editorial Viewport ────────────────────────────────── */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-7xl w-full mx-auto">
        {/* Left Column: Typography + Priority Expansion Waitlist */}
        <section className="lg:col-span-6 px-5 sm:px-8 lg:px-12 py-10 sm:py-14 lg:py-16 flex flex-col justify-between gap-10 bg-white">
          <div className="space-y-8 max-w-xl">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500">
                <span className="text-[#7B2D8E] font-semibold">
                  Regional Access
                </span>
                <span aria-hidden="true">·</span>
                <span>International Expansion</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl font-semibold text-gray-900 leading-[1.1] tracking-tight text-balance">
                Dermaspace hasn&rsquo;t arrived in your region yet.
              </h1>

              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Our skincare, spa, and wellness services are not currently
                available in your country. Join the waitlist below and we will
                let you know as soon as we open near you.
              </p>
            </div>

            {/* Single-level flat waitlist surface */}
            <div className="rounded-2xl border border-gray-200 bg-[#F8F7FA] p-6 sm:p-7">
              <RegionalWaitlistForm
                region="GLOBAL"
                source="blocked"
                title="Reserve your place on the waitlist"
                description="Leave your details and we will reach out as soon as Dermaspace launches near you."
                cityPlaceholder="Your city & country"
                submitLabel="Join Expansion Waitlist"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 max-w-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              Have a question or need assistance? Our support team is glad to
              help.
            </p>
            <a
              href="mailto:info@dermaspaceng.com?subject=Regional%20Access%20Inquiry"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7B2D8E] hover:text-[#5A1D6A] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Contact Support</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* Right Column: Framed Architectural Sanctuary & Brand Standards */}
        <aside className="lg:col-span-6 bg-[#F8F7FA] border-t lg:border-t-0 lg:border-l border-gray-200 px-5 sm:px-8 lg:px-12 py-10 sm:py-14 lg:py-16 flex flex-col justify-between gap-8">
          <div className="flex-1 flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="relative flex-1 min-h-[280px] sm:min-h-[360px] bg-[#F3EFF6]">
              <Image
                src="/dermaspace-luxury-spa-comparison.jpg"
                alt="Sunlit Dermaspace spa and skincare treatment room"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="px-6 py-5 bg-white border-t border-gray-200 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-serif text-base font-semibold text-gray-900 leading-snug">
                  Skincare, Spa &amp; Wellness
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Thoughtful skin care · Calm private rooms
                </p>
              </div>
              <span className="w-10 h-10 rounded-xl bg-[#F5EFF7] border border-[#7B2D8E]/15 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {BRAND_STANDARDS.map((item) => (
              <div
                key={item.index}
                className="border-t border-gray-300/80 pt-3.5 space-y-1.5"
              >
                <p className="text-xs font-semibold text-[#7B2D8E] tabular-nums">
                  {item.index}
                </p>
                <h2 className="text-sm font-semibold text-gray-900">
                  {item.title}
                </h2>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </main>

      {/* ── Quiet Editorial Footer ──────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} Dermaspace Esthetic &amp; Wellness
            Centre. All rights reserved.
          </p>
          <a
            href="mailto:info@dermaspaceng.com"
            className="text-gray-600 hover:text-[#7B2D8E] transition-colors"
          >
            info@dermaspaceng.com
          </a>
        </div>
      </footer>
    </div>
  )
}
