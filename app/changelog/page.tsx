import type { Metadata } from 'next'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Check } from 'lucide-react'
import { CHANGELOG, type ChangeKind } from '@/lib/changelog'

export const metadata: Metadata = {
  title: "What's New",
  description:
    'Product updates and improvements at Dermaspace — new features, refinements and fixes across the website and app.',
  alternates: { canonical: 'https://dermaspaceng.com/changelog' },
  openGraph: {
    title: "What's New | Dermaspace",
    description:
      'The latest features and improvements across the Dermaspace website and app.',
    url: 'https://dermaspaceng.com/changelog',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

// Tag styling per change type — all stay within the brand palette,
// using muted neutral tones with the brand purple for "New".
const KIND_STYLES: Record<ChangeKind, string> = {
  New: 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20',
  Improved: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
  Fixed: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
}

export default function ChangelogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-gray-100 bg-white">
          <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16 text-center">
            <span className="inline-flex items-center rounded-full bg-[#7B2D8E]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7B2D8E]">
              Changelog
            </span>
            <h1 className="mt-4 text-balance font-serif text-3xl font-semibold text-gray-900 sm:text-4xl">
              What&apos;s new at Dermaspace
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed text-gray-500 sm:text-base">
              The latest features and improvements across our website and app.
              We ship updates regularly to make booking, managing your account
              and getting help easier.
            </p>
          </div>
        </section>

        {/* Timeline of entries */}
        <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
          <ol className="relative flex flex-col gap-12 sm:gap-16">
            {CHANGELOG.map((entry) => (
              <li key={entry.id} id={entry.id} className="scroll-mt-24">
                <article>
                  {/* Meta row */}
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${KIND_STYLES[entry.kind]}`}
                    >
                      {entry.kind}
                    </span>
                    <time
                      dateTime={entry.isoDate}
                      className="text-sm font-medium text-gray-500"
                    >
                      {entry.date}
                    </time>
                  </div>

                  <h2 className="text-balance font-serif text-2xl font-semibold text-gray-900">
                    {entry.title}
                  </h2>
                  <p className="mt-2 text-pretty leading-relaxed text-gray-600">
                    {entry.description}
                  </p>

                  {/* Highlights */}
                  {entry.highlights.length ? (
                    <ul className="mt-4 flex flex-col gap-2">
                      {entry.highlights.map((h) => (
                        <li
                          key={h}
                          className="flex items-start gap-2.5 text-sm text-gray-700"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#7B2D8E]" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {/* Responsive screenshot — desktop capture on larger
                      viewports, mobile capture on phones. Both files are
                      always in the markup; CSS picks the right one so it
                      works without any client-side JS. */}
                  {entry.screenshot ? (
                    <figure className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                      {/* Desktop */}
                      <Image
                        src={entry.screenshot.desktop}
                        alt={entry.screenshot.alt}
                        width={1600}
                        height={1000}
                        sizes="(min-width: 640px) 768px, 0px"
                        className="hidden h-auto w-full sm:block"
                      />
                      {/* Mobile */}
                      <Image
                        src={entry.screenshot.mobile}
                        alt={entry.screenshot.alt}
                        width={900}
                        height={1600}
                        sizes="(max-width: 639px) 100vw, 0px"
                        className="mx-auto block h-auto w-full max-w-xs sm:hidden"
                      />
                    </figure>
                  ) : null}
                </article>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <Footer />
    </div>
  )
}
