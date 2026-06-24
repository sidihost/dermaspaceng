import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  Check,
  History,
  LifeBuoy,
  LayoutGrid,
  Mail,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { CHANGELOG, type ChangelogEntry, type ChangeKind } from '@/lib/changelog'

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

// Per-entry icon, so even screenshot-less entries feel intentional.
const ENTRY_ICONS: Record<string, LucideIcon> = {
  'activity-email-history': History,
  'personalized-help-center': LifeBuoy,
  'refreshed-services': LayoutGrid,
}

// Tag styling per change type — stays within the brand palette.
const KIND_STYLES: Record<ChangeKind, string> = {
  New: 'bg-[#7B2D8E] text-white',
  Improved: 'bg-[#7B2D8E]/10 text-[#7B2D8E]',
  Fixed: 'bg-gray-100 text-gray-600',
}

export default function ChangelogPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <Header />

      {/* Hero — same brand-purple language as the rest of the marketing
          site, with quiet white ornaments and a wave divider into white. */}
      <section className="relative overflow-hidden bg-[#7B2D8E] py-14 md:py-20">
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 h-40 w-40 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/5"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-28 w-28 -translate-x-1/3 translate-y-1/3 rounded-full bg-white/5"
        />

        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span className="text-xs font-medium uppercase tracking-widest text-white">
              What&apos;s New
            </span>
          </div>
          <h1 className="text-balance font-serif text-3xl font-semibold text-white md:text-4xl">
            Everything new at Dermaspace
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed text-white/85 md:text-base">
            A running log of the features and improvements we ship — what
            changed, why it matters, and exactly how to use it.
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 40"
            fill="none"
            preserveAspectRatio="none"
            className="h-6 w-full md:h-10"
            aria-hidden="true"
          >
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Timeline of entries */}
      <section className="flex-1 py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <ol className="relative space-y-12 md:space-y-16">
            {/* Vertical brand rail (md+) */}
            <span
              aria-hidden="true"
              className="absolute left-[15px] bottom-2 top-2 hidden w-px bg-gradient-to-b from-[#7B2D8E]/40 via-[#7B2D8E]/20 to-transparent md:block"
            />
            {CHANGELOG.map((entry, i) => (
              <EntryRow key={entry.id} entry={entry} index={i} />
            ))}
          </ol>
        </div>
      </section>

      {/* Closing CTA band */}
      <section className="bg-[#7B2D8E]">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-12 text-center md:py-14">
          <h2 className="text-balance font-serif text-2xl font-semibold text-white md:text-3xl">
            Have an idea for what we should build next?
          </h2>
          <p className="max-w-lg text-sm text-white/85">
            Ask a question or share feedback in the Help Center — every
            improvement here started with a member just like you.
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard/help"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#7B2D8E] transition-colors hover:bg-white/90"
            >
              Visit the Help Center
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

function EntryRow({
  entry,
  index,
}: {
  entry: ChangelogEntry
  index: number
}) {
  const Icon = ENTRY_ICONS[entry.id] ?? History
  // Alternate the visual side on desktop for an editorial rhythm.
  const imageFirst = index % 2 === 1

  return (
    <li id={entry.id} className="relative scroll-mt-24 md:pl-12">
      {/* Timeline node (md+) */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-1 hidden h-8 w-8 items-center justify-center rounded-full bg-[#7B2D8E] text-white shadow-sm shadow-[#7B2D8E]/30 md:flex"
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="grid items-center gap-6 md:gap-10 lg:grid-cols-2">
        {/* Copy */}
        <div className={imageFirst ? 'lg:order-2' : 'lg:order-1'}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${KIND_STYLES[entry.kind]}`}
            >
              {entry.kind}
            </span>
            <time
              dateTime={entry.isoDate}
              className="text-xs font-medium uppercase tracking-wide text-gray-400"
            >
              {entry.date}
            </time>
          </div>

          <h2 className="mt-3 text-balance font-serif text-2xl font-semibold text-gray-900">
            {entry.title}
          </h2>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-gray-600">
            {entry.description}
          </p>

          <ul className="mt-4 space-y-2">
            {entry.highlights.map((h) => (
              <li
                key={h}
                className="flex items-start gap-2.5 text-sm text-gray-700"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7B2D8E]/10">
                  <Check className="h-3 w-3 text-[#7B2D8E]" />
                </span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Visual */}
        <div className={imageFirst ? 'lg:order-1' : 'lg:order-2'}>
          {entry.screenshot ? (
            <ScreenshotFrame
              desktop={entry.screenshot.desktop}
              mobile={entry.screenshot.mobile}
              alt={entry.screenshot.alt}
            />
          ) : (
            <FeatureGraphic icon={Icon} highlights={entry.highlights} />
          )}
        </div>
      </div>
    </li>
  )
}

// Shows a desktop screenshot inside browser chrome on md+ screens, and a
// mobile screenshot inside a phone frame on small screens — matching the
// device the visitor is actually using.
function ScreenshotFrame({
  desktop,
  mobile,
  alt,
}: {
  desktop: string
  mobile: string
  alt: string
}) {
  return (
    <>
      {/* Desktop: browser frame */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-[#7B2D8E]/5 md:block">
        <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="ml-3 h-4 flex-1 rounded bg-gray-100" />
        </div>
        <Image
          src={desktop}
          alt={alt}
          width={1440}
          height={900}
          className="h-auto w-full"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      </div>

      {/* Mobile: phone frame */}
      <div className="mx-auto w-full max-w-[260px] md:hidden">
        <div className="overflow-hidden rounded-[2rem] border-[6px] border-gray-900 bg-gray-900 shadow-xl">
          <Image
            src={mobile}
            alt={alt}
            width={400}
            height={880}
            className="h-auto w-full rounded-[1.5rem]"
            sizes="260px"
          />
        </div>
      </div>
    </>
  )
}

// Polished fallback visual for entries without a screenshot (e.g. the
// signed-in / admin activity & email tooling). Keeps the page beautiful
// without fabricating a screenshot.
function FeatureGraphic({
  icon: Icon,
  highlights,
}: {
  icon: LucideIcon
  highlights: string[]
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#7B2D8E]/15 bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] p-6 text-white shadow-xl shadow-[#7B2D8E]/10 md:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
          <Icon className="h-5 w-5" />
        </span>
        <Mail className="h-5 w-5 text-white/70" />
      </div>

      <div className="mt-6 space-y-2.5">
        {highlights.map((h) => (
          <div
            key={h}
            className="flex items-center gap-3 rounded-lg bg-white/10 px-3.5 py-3 text-sm font-medium"
          >
            <Check className="h-4 w-4 shrink-0 text-white" />
            <span>{h}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
